// Build-time settings. Everything here is PUBLIC (safe to ship in HTML):
// the Supabase anon/publishable key can only read published content because of RLS.
// Override any value with an environment variable of the same name. The workflow passes
// unset repo variables as empty strings, so an empty value means "use the default"
// (except BASE_PATH, where empty means "site at the root of the domain").
const raw = (k: string): string | undefined =>
  (typeof process !== "undefined" ? process.env?.[k] : undefined) ?? (import.meta.env as Record<string, string>)[k];
const env = (k: string, d = "") => (raw(k) ?? "").trim() || d;

export const SITE_ID = env("SITE_ID", "taraxmattel");
export const SUPABASE_URL = env("PUBLIC_SUPABASE_URL", "https://vqtcrdcpzmkahwvdsbmn.supabase.co");
export const SUPABASE_ANON_KEY = env(
  "PUBLIC_SUPABASE_ANON_KEY",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdGNyZGNwem1rYWh3dmRzYm1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQwNTM5MjgsImV4cCI6MjEwOTYyOTkyOH0.KKGX1HlMCn4RV9pdjR0966X6SNrcOm-j9OCwAYPhMsE",
);

// Where the site lives. On GitHub Pages: https://hi-kreasidigital.github.io/kreasi-digital-hub-taraxmattel
// + BASE_PATH "/kreasi-digital-hub-taraxmattel". On the custom domain (Cloudflare):
// SITE_BASE_URL=https://taraxmattel.kreasidigitalhub.com, BASE_PATH empty. The workflow sets both.
export const SITE_BASE_URL = env("SITE_BASE_URL", "https://hi-kreasidigital.github.io/kreasi-digital-hub-taraxmattel").replace(/\/+$/, "");
let bp = (raw("BASE_PATH") ?? "/kreasi-digital-hub-taraxmattel").trim().replace(/\/+$/, "");
if (bp && !bp.startsWith("/")) bp = "/" + bp;
export const BASE_PATH = bp;

// Google Search Console HTML-tag verification (empty = no tag; the old site had none).
export const GOOGLE_SITE_VERIFICATION = env("GOOGLE_SITE_VERIFICATION", "");

// Forms post to the submit-form Edge Function. This site has no form yet; if one is added it
// must carry the Turnstile widget (Turnstile is ON in Supabase for every site).
export const FORM_ENDPOINT = (() => {
  const v = env("FORM_ENDPOINT", `${SUPABASE_URL}/functions/v1/submit-form`);
  return v.toLowerCase() === "off" ? "" : v;
})();
export const TURNSTILE_SITE_KEY = env("PUBLIC_TURNSTILE_SITE_KEY", "0x4AAAAAAF3qT9quLfdT6qWp");
// Only needed outside Cloudflare Pages (on Pages, Web Analytics is switched on in the project).
export const CF_ANALYTICS_TOKEN = env("PUBLIC_CF_ANALYTICS_TOKEN", "");

// Offline builds only: path to a JSON snapshot of the database instead of reading Supabase.
export const CONTENT_SNAPSHOT = env("CONTENT_SNAPSHOT", "");
