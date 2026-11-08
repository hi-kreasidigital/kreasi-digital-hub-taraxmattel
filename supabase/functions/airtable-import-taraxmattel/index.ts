// One-time (re-runnable) copy of the Airtable base "Kreasi Digital Hub by Tara x Mattel" into Supabase.
//
// Called by .github/workflows/migrate-airtable.yml. The workflow script
// (scripts/airtable_import.py) reads Airtable with the repo's AIRTABLE_TOKEN secret,
// maps the rows to the Supabase tables and shrinks the photos to WebP exactly like
// the old build.py did, then posts everything here together with that token.
// This function only accepts the request if the token can read the fixed Airtable
// base below, so nobody else can call it. It only writes rows for site
// 'taraxmattel', only into the tables listed in ALLOWED, and only uploads under
// media/taraxmattel/airtable/. Rows are upserted by airtable_id (site_texts by key),
// so running it again refreshes Supabase -- until the site is switched over
// (sites.import_locked = true), after which it refuses to run so edits made in the
// admin dashboard can never be overwritten. Airtable itself is never changed.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SITE = "taraxmattel";
const BASE_ID = "appiFXiUuNc4GB1vx";
const PROBE_TABLE = "tbliysDmuK965xkWg"; // "1 · Tentang Tara x Mattel"
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const PUBLIC_MEDIA = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/media/`;

// table -> upsert conflict target
const ALLOWED: Record<string, string> = {
  site_texts: "site_id,key",
  page_sections: "site_id,key",
  freebies: "site_id,airtable_id",
  portfolio_items: "site_id,airtable_id",
  representations: "site_id,airtable_id",
};
// image columns that may carry "media:<path>" placeholders, replaced by the uploaded file's public URL
const IMAGE_COLS = ["image", "cover", "thumbnail", "photo"];

type Payload = {
  airtable_token?: string;
  images?: { path: string; content_type: string; data: string }[];
  rows?: Record<string, Record<string, unknown>[]>;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  try {
    const body = (await req.json()) as Payload;
    if (!body.airtable_token) return Response.json({ error: "missing airtable_token" }, { status: 401 });

    // proves the caller holds a token that can read THIS base
    const probe = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${PROBE_TABLE}?pageSize=1`, {
      headers: { Authorization: `Bearer ${body.airtable_token}` },
    });
    if (!probe.ok) return Response.json({ error: "Airtable token rejected" }, { status: 401 });

    const { data: site } = await db.from("sites").select("import_locked").eq("id", SITE).single();
    if (site?.import_locked) {
      return Response.json({ error: "Import is locked: the site already runs on Supabase." }, { status: 409 });
    }

    const report: Record<string, number> = {};

    // ---- photos (already resized to WebP by the workflow)
    const uploaded = new Map<string, string>();
    for (const img of body.images ?? []) {
      if (!/^taraxmattel\/airtable\/[a-z-]+\/[A-Za-z0-9]+\.webp$/.test(img.path)) {
        throw new Error(`refused image path ${img.path}`);
      }
      const bytes = Uint8Array.from(atob(img.data), (c) => c.charCodeAt(0));
      const { error } = await db.storage.from("media").upload(img.path, bytes, {
        contentType: img.content_type || "image/webp",
        upsert: true,
      });
      if (error) throw new Error(`upload ${img.path}: ${error.message}`);
      uploaded.set(img.path, PUBLIC_MEDIA + img.path);
    }
    report.images = uploaded.size;

    // ---- rows
    for (const [table, rows] of Object.entries(body.rows ?? {})) {
      const onConflict = ALLOWED[table];
      if (!onConflict) throw new Error(`refused table ${table}`);
      if (!rows.length) { report[table] = 0; continue; }
      const clean = rows.map((r) => {
        const row: Record<string, unknown> = { ...r, site_id: SITE };
        for (const c of IMAGE_COLS) {
          const v = row[c];
          if (typeof v === "string" && v.startsWith("media:")) {
            const url = uploaded.get(v.slice(6));
            if (!url) throw new Error(`${table}.${c}: image ${v} was not uploaded`);
            row[c] = url;
          }
        }
        return row;
      });
      const { data, error } = await db.from(table).upsert(clean, { onConflict }).select("id");
      if (error) throw new Error(`${table}: ${error.message}`);
      report[table] = data?.length ?? 0;
    }

    return Response.json({ ok: true, imported: report });
  } catch (e) {
    return Response.json({ ok: false, error: String((e as Error).message ?? e) }, { status: 500 });
  }
});
