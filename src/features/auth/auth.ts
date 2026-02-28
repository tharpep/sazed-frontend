const TOKEN_KEY = "sazed_auth_token";
const EXPIRY_KEY = "sazed_auth_expiry";
const VERIFIED_KEY = "sazed_auth_verified_at";

// Google ID tokens expire in 1 hour — we mirror that
const TOKEN_TTL_MS = 60 * 60 * 1000;
// Skip server-side re-verification if we verified with Google within this window
const SKIP_VERIFY_WINDOW_MS = 30 * 60 * 1000;

export function saveToken(credential: string): void {
  localStorage.setItem(TOKEN_KEY, credential);
  localStorage.setItem(EXPIRY_KEY, String(Date.now() + TOKEN_TTL_MS));
}

export function getToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(EXPIRY_KEY);
  if (!token || !expiry) return null;
  if (Date.now() > Number(expiry)) {
    clearToken();
    return null;
  }
  return token;
}

export function getTokenExpiresIn(): number {
  const expiry = localStorage.getItem(EXPIRY_KEY);
  if (!expiry) return 0;
  return Math.max(0, Number(expiry) - Date.now());
}

export function markVerified(): void {
  localStorage.setItem(VERIFIED_KEY, String(Date.now()));
}

export function isRecentlyVerified(): boolean {
  const ts = localStorage.getItem(VERIFIED_KEY);
  if (!ts) return false;
  return Date.now() - Number(ts) < SKIP_VERIFY_WINDOW_MS;
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  localStorage.removeItem(VERIFIED_KEY);
}

// Used only during the OAuth callback (token just issued by Google, signature is implicit)
export function decodeEmail(credential: string): string | null {
  try {
    const payload = credential.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as Record<string, unknown>;
    return typeof decoded.email === "string" ? decoded.email : null;
  } catch {
    return null;
  }
}

// Used on page load to verify a stored token — Google checks the signature server-side
export async function verifyStoredToken(credential: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
    );
    if (!res.ok) {
      clearToken();
      return null;
    }
    const data = (await res.json()) as Record<string, unknown>;
    return typeof data.email === "string" ? data.email : null;
  } catch {
    return null;
  }
}
