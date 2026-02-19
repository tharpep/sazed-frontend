import { useEffect, useState } from "react";
import { GoogleLogin, googleLogout } from "@react-oauth/google";
import { isTauri } from "../../lib/isTauri";
import { clearToken, decodeEmail, getToken, saveToken, verifyStoredToken } from "./auth";
import { useConfigStore } from "../../store/configStore";
import styles from "./AuthGate.module.css";

const ALLOWED_EMAIL = import.meta.env.VITE_ALLOWED_EMAIL as string;

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

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [wrongAccount, setWrongAccount] = useState(false);

  async function authorize(token: string) {
    if (!isTauri) await fetchConfig(token);
    setAuthed(true);
  }

  useEffect(() => {
    if (isTauri) {
      setChecking(false);
      return;
    }
    const token = getToken();
    if (!token) {
      setChecking(false);
      return;
    }
    verifyStoredToken(token).then((email) => {
      if (email === ALLOWED_EMAIL) {
        authorize(token).finally(() => setChecking(false));
      } else {
        clearToken();
        setChecking(false);
      }
    });
  }, []);

  if (checking) return null;
  if (isTauri || authed) return <>{children}</>;

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
          useOneTap
          onSuccess={(res) => {
            if (!res.credential) return;
            const email = decodeEmail(res.credential);
            if (email !== ALLOWED_EMAIL) {
              googleLogout();
              setWrongAccount(true);
              return;
            }
            saveToken(res.credential);
            void authorize(res.credential);
          }}
          onError={() => {}}
        />
      </div>
    </div>
  );
}
