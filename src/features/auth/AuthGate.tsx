import { useEffect, useRef, useState } from "react";
import { GoogleLogin, googleLogout, useGoogleOneTap } from "@react-oauth/google";
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
import styles from "./AuthGate.module.css";

const ALLOWED_EMAIL = import.meta.env.VITE_ALLOWED_EMAIL as string;

// Skip auth when running locally (Tauri desktop or local pnpm dev with VITE_SAZED_URL set)
const isLocal = isTauri || !!(import.meta.env.VITE_SAZED_URL as string | undefined);

async function fetchConfig(googleToken: string): Promise<void> {
  try {
    const res = await fetch("/api/config", {
      headers: { Authorization: `Bearer ${googleToken}` },
    });
    if (!res.ok) return;
    const data = (await res.json()) as { sazedUrl: string; apiKey: string };
    useConfigStore.getState().setConfig(data.sazedUrl, data.apiKey);
  } catch {
    // Config fetch failed — app will fall back to any available defaults
  }
}

// How long before expiry to attempt a silent token refresh (10 minutes)
const REFRESH_BEFORE_EXPIRY_MS = 10 * 60 * 1000;

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [wrongAccount, setWrongAccount] = useState(false);
  const loggingIn = useRef(false);

  async function authorize(token: string) {
    if (!isLocal) await fetchConfig(token);
    setAuthed(true);
  }

  function handleCredential(credential: string) {
    if (loggingIn.current) return;
    loggingIn.current = true;
    const email = decodeEmail(credential);
    if (email !== ALLOWED_EMAIL) {
      googleLogout();
      setWrongAccount(true);
      loggingIn.current = false;
      return;
    }
    saveToken(credential);
    markVerified();
    authorize(credential).finally(() => {
      loggingIn.current = false;
    });
  }

  // Silent background re-auth: fires automatically when token is near expiry or missing.
  // auto_select means Google will re-auth without any UI if the browser session allows it.
  useGoogleOneTap({
    disabled: isLocal,
    auto_select: true,
    onSuccess: (res) => {
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
      authorize(token).finally(() => setChecking(false));
      return;
    }
    verifyStoredToken(token).then((email) => {
      if (email === ALLOWED_EMAIL) {
        markVerified();
        authorize(token).finally(() => setChecking(false));
      } else {
        clearToken();
        setChecking(false);
      }
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

  if (wrongAccount) {
    return (
      <div className={styles.screen}>
        <div className={styles.card}>
          <span className={styles.title}>sazed</span>
          <p className={styles.sub}>That account isn't authorized.</p>
          <button
            className={styles.retry}
            onClick={() => {
              googleLogout();
              setWrongAccount(false);
            }}
          >
            try a different account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <span className={styles.title}>sazed</span>
        <p className={styles.sub}>Sign in to continue.</p>
        <GoogleLogin
          onSuccess={(res) => {
            if (res.credential) handleCredential(res.credential);
          }}
          onError={() => {}}
        />
      </div>
    </div>
  );
}
