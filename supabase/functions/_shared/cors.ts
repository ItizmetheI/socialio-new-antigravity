// Browser origins allowed to call the browser-facing Edge Functions, and the
// only places checkout will send a customer back to. socialio.io is the
// long-term home; the workers.dev address is where the app is live today.
// Add a new domain here (and to Supabase Auth's redirect allow-list) before
// pointing it at the app.
export const ALLOWED_ORIGINS = [
  "https://socialio.io",
  "https://www.socialio.io",
  "https://socialio-new-admin.ahmedbarkat1067.workers.dev",
  "http://localhost:3000",
];

export function allowedOrigin(req: Request): string | null {
  const origin = req.headers.get("Origin");
  return origin && ALLOWED_ORIGINS.includes(origin) ? origin : null;
}

export function corsHeadersFor(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": allowedOrigin(req) ?? ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
}
