// The content version this build was made from. The scheduled workflow compares it with
// Supabase and skips the rebuild when nothing changed.
import { createClient } from "@supabase/supabase-js";
import { CONTENT_SNAPSHOT, SITE_ID, SUPABASE_ANON_KEY, SUPABASE_URL } from "../lib/config";
export async function GET() {
  if (CONTENT_SNAPSHOT) return new Response("snapshot");
  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data } = await db.rpc("site_content_version", { p_site: SITE_ID });
  return new Response(String(data ?? ""));
}
