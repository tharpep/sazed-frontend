declare const process: { env: Record<string, string | undefined> };

export const config = { runtime: "edge" };

export default async function handler(request: Request): Promise<Response> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // The client ID the token must have been issued to. VITE_GOOGLE_CLIENT_ID is the one the
  // build already uses for sign-in; GOOGLE_CLIENT_ID can override it for the function alone.
  // Without one there is nothing to check the audience against, so refuse rather than skip it.
  const clientId = process.env.GOOGLE_CLIENT_ID ?? process.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return Response.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const token = auth.slice(7);

  // Verify the Google ID token server-side — signature check happens on Google's servers
  const verify = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`
  );
  if (!verify.ok) {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }

  // A valid signature only proves Google issued the token, to some app. Without the audience
  // check, an ID token for this account from any other OAuth client (another site's "Sign in
  // with Google") was enough to get the master API key below.
  const claims = (await verify.json()) as Record<string, unknown>;
  if (claims.aud !== clientId) {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }
  const emailVerified = claims.email_verified === true || claims.email_verified === "true";
  if (!emailVerified || claims.email !== process.env.ALLOWED_EMAIL) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return Response.json({
    sazedUrl: process.env.SAZED_URL,
    apiKey: process.env.SAZED_API_KEY,
  });
}
