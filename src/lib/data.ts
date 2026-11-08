// Loads all content for this site from Supabase ONCE per build (anon key = published rows only)
// and shapes it the way the old build.py did, so the page markup stays the same.
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { CONTENT_SNAPSHOT, SITE_ID, SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";
import { DEFAULT_TEXT } from "./defaultText";

export type Lang = "id" | "en";
type Row = Record<string, any>;

const snapshot: Record<string, Row[]> | null = CONTENT_SNAPSHOT ? JSON.parse(readFileSync(CONTENT_SNAPSHOT, "utf8")) : null;
const db = snapshot ? null : createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });

async function all(table: string): Promise<Row[]> {
  // the snapshot may contain drafts; the live database never returns them to the anon key
  if (snapshot) return (snapshot[table] ?? []).filter((r) => r.site_id === SITE_ID && (r.status === undefined || r.status === "published"));
  const { data, error } = await db!.from(table).select("*").eq("site_id", SITE_ID);
  if (error) throw new Error(`Supabase ${table}: ${error.message}`);
  return data ?? [];
}

const [texts, sectionRows, freebieRows, portfolioRows, repRows] = await Promise.all([
  all("site_texts"), all("page_sections"), all("freebies"), all("portfolio_items"), all("representations"),
]);

// ------------------------------------------------------------------ helpers
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const published = (rows: Row[]) => rows.filter((r) => r.status === "published");
/** like build.py visible(): published rows, ordered by Urutan (empty last) */
const ordered = (rows: Row[]) =>
  published(rows).sort((a, b) =>
    (a.sort_order == null ? 1 : 0) - (b.sort_order == null ? 1 : 0) ||
    (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
    str(a.created_at).localeCompare(str(b.created_at)) || str(a.id).localeCompare(str(b.id)));

/** bilingual column, no fallback (the old template showed only the chosen language) */
export const L = (r: Row | undefined, base: string, lang: Lang) => (r ? str(r[`${base}_${lang}`]) : "");

const TEXT = new Map(texts.map((r) => [r.key as string, r]));
/** fixed site text; falls back to EN->ID, then the built-in default */
export function T(key: string, lang: Lang): string {
  const r = TEXT.get(key);
  const v = r ? str(r[`text_${lang}`]).trim() : "";
  if (v) return v;
  if (r && lang === "en" && str(r.text_id).trim()) return str(r.text_id).trim();
  const d = DEFAULT_TEXT[key];
  if (d) return lang === "id" ? d[0] : d[1];
  return "";
}
/** section heading text exactly as stored for that language (empty = not shown / use the fallback given) */
export const S = (key: string, lang: Lang) => str(TEXT.get(key)?.[`text_${lang}`]);

const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
/** image stored in the database, else the built-in default under public/assets/img/default/ (like build.py) */
function img(v: unknown, fallback?: string): string | null {
  const s = str(v).trim();
  if (s) return s;
  if (fallback && existsSync(new URL(`../../public/assets/${fallback}`, import.meta.url))) return `assets/${fallback}`;
  return null;
}

// ------------------------------------------------------------------ content
const sections = new Map(sectionRows.map((r) => [r.key as string, r]));
const aboutRow = sections.get("about") ?? {};
export const about = { ...aboutRow, foto: img(aboutRow.image, "img/default/potret-tara-mattel.webp") } as Row;

// key, background, decorative motifs (top right, bottom left) -- same as build.py PRODUCTS
const PRODUCTS: [string, string, string, string | null][] = [
  ["usaha", "ocean", "kompas-white", "ombak-white"],
  ["skill", "mist", "kemudi-navy", null],
  ["seni", "navy", "jangkar-white", "ombak-white"],
  ["ngo", "mist", "mercusuar-navy", null],
];
export const products = PRODUCTS.flatMap(([key, bg, tr, bl]) => {
  const r = sections.get(key);
  if (!r || r.status !== "published") return [];
  return [{ ...r, key, bg, deco_tr: tr, deco_bl: bl, thumb: img(r.image, `img/default/${slug(str(r.name))}.webp`) }];
});

export const freebies = ordered(freebieRows).map((r) => ({ ...r, cover: img(r.cover) }));
export const portfolio = ordered(portfolioRows).map((r) => ({ ...r, thumb: img(r.thumbnail, `img/default/${slug(str(r.title))}.webp`) }));
export const reps = ordered(repRows).map((r) => ({ ...r, foto: img(r.photo) }));

/** for version.txt: what the content looked like when this build was made */
export const IS_SNAPSHOT = !!snapshot;
