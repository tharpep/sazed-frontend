export const config = { runtime: "edge" };

export default async function handler(request: Request): Promise<Response> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = auth.slice(7);

  // Verify the Google ID token server-side — signature check happens on Google's servers
  const verify = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`
  );
  if (!verify.ok) {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }

  const claims = (await verify.json()) as Record<string, unknown>;
  if (claims.email !== process.env.ALLOWED_EMAIL) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return Response.json({
    sazedUrl: process.env.SAZED_URL,
    apiKey: process.env.SAZED_API_KEY,
  });
}
