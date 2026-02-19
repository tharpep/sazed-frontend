import { useEffect, useState } from "react";
import { GoogleLogin, googleLogout } from "@react-oauth/google";
import { isTauri } from "../../lib/isTauri";
import { clearToken, decodeEmail, getToken, saveToken, verifyStoredToken } from "./auth";
import styles from "./AuthGate.module.css";

const ALLOWED_EMAIL = import.meta.env.VITE_ALLOWED_EMAIL as string;

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [wrongAccount, setWrongAccount] = useState(false);

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
        setAuthed(true);
      } else {
        clearToken();
      }
      setChecking(false);
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
            setAuthed(true);
          }}
          onError={() => {}}
        />
      </div>
    </div>
  );
}
