import { useEffect, useRef, useState } from "react";
import { GoogleLogin, googleLogout, useGoogleOneTapLogin, CredentialResponse } from "@react-oauth/google";
import { isTauri } from "../../lib/isTauri";
import {
  clearToken,
  decodeEmail,
  getToken,
  getTokenExpiresIn,
  isRecentlyVerified,
  markVerified,
  saveToken,
  verifyStoredToken,
} from "./auth";
import { useConfigStore } from "../../store/configStore";

const ALLOWED_EMAIL = import.meta.env.VITE_ALLOWED_EMAIL as string;

// Skip auth when running locally (Tauri desktop or local pnpm dev with VITE_SAZED_URL set)
const isLocal = isTauri || !!(import.meta.env.VITE_SAZED_URL as string | undefined);

// Enriches settings once authed but must never gate access on it — a slow or
// stalled request here (easy to hit on mobile, e.g. right after returning
// from Google's own sign-in flow) used to leave the sign-in screen sitting
// with no feedback, which is what made people think the tap didn't register
// and try again. Fire-and-forget instead of awaited.
function fetchConfigInBackground(googleToken: string): void {
  fetch("/api/config", { headers: { Authorization: `Bearer ${googleToken}` } })
    .then((res) => (res.ok ? (res.json() as Promise<{ sazedUrl: string; apiKey: string }>) : null))
    .then((data) => {
      if (data) useConfigStore.getState().setConfig(data.sazedUrl, data.apiKey);
    })
    .catch(() => {
      // Config fetch failed — app falls back to any available defaults.
    });
}

// How long before expiry to attempt a silent token refresh (10 minutes)
const REFRESH_BEFORE_EXPIRY_MS = 10 * 60 * 1000;

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [wrongAccount, setWrongAccount] = useState(false);
  const loggingIn = useRef(false);

  function authorize(token: string) {
    if (!isLocal) fetchConfigInBackground(token);
    setAuthed(true);
  }

  function handleCredential(credential: string) {
    if (loggingIn.current) return;
    loggingIn.current = true;
    setSigningIn(true);
    const email = decodeEmail(credential);
    if (email !== ALLOWED_EMAIL) {
      googleLogout();
      setWrongAccount(true);
      setSigningIn(false);
      loggingIn.current = false;
      return;
    }
    saveToken(credential);
    markVerified();
    authorize(credential);
    loggingIn.current = false;
  }

  // Silent background re-auth: fires automatically when token is near expiry or missing.
  // auto_select means Google will re-auth without any UI if the browser session allows it.
  useGoogleOneTapLogin({
    disabled: isLocal,
    auto_select: true,
    onSuccess: (res: CredentialResponse) => {
      if (res.credential) handleCredential(res.credential);
    },
    onError: () => {},
  });

  useEffect(() => {
    if (isLocal) {
      setChecking(false);
      return;
    }
    const token = getToken();
    if (!token) {
      setChecking(false);
      return;
    }
    // Skip the Google network call if we verified recently — show app instantly
    if (isRecentlyVerified()) {
      authorize(token);
      setChecking(false);
      return;
    }
    verifyStoredToken(token).then((email) => {
      if (email === ALLOWED_EMAIL) {
        markVerified();
        authorize(token);
      } else {
        clearToken();
      }
      setChecking(false);
    });
  }, []);

  // Schedule a silent re-auth attempt before the token expires
  useEffect(() => {
    if (!authed || isLocal) return;
    const expiresIn = getTokenExpiresIn();
    const delay = expiresIn - REFRESH_BEFORE_EXPIRY_MS;
    if (delay <= 0) return;
    const timer = setTimeout(() => {
      // Clearing the token lets useGoogleOneTap's next trigger save a fresh one.
      // One Tap is always active, so it will fire and call handleCredential automatically.
      clearToken();
    }, delay);
    return () => clearTimeout(timer);
  }, [authed]);

  if (checking) return null;
  if (isLocal || authed) return <>{children}</>;

  return (
    <div className="flex h-dvh w-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
      <h1 className="font-display text-3xl text-ink" style={{ letterSpacing: "-0.02em" }}>
        sazed
      </h1>

      {wrongAccount ? (
        <>
          <p className="text-[0.9375rem] text-muted">That account isn&rsquo;t authorized.</p>
          <button
            type="button"
            onClick={() => {
              googleLogout();
              setWrongAccount(false);
            }}
            className="rounded-md px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface hover:text-ink"
          >
            Try a different account
          </button>
        </>
      ) : (
        <>
          <p className="text-[0.9375rem] text-muted">Sign in to continue.</p>
          <div className="mt-2 flex min-h-10 items-center justify-center">
            {signingIn ? (
              <p className="text-sm text-muted">Signing you in&hellip;</p>
            ) : (
              <GoogleLogin
                theme="filled_black"
                shape="pill"
                size="large"
                onSuccess={(res) => {
                  if (res.credential) handleCredential(res.credential);
                }}
                onError={() => {}}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
