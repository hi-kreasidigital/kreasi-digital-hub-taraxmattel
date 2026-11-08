// Small HTML/text helpers -- direct ports of the old Python generator so pages render the same.
import { BASE_PATH, SITE_BASE_URL } from "./config";

export type Lang = "id" | "en";
export const LANGS: Lang[] = ["id", "en"];
export const HTML_LANG: Record<Lang, string> = { id: "id", en: "en" };
export const OG_LOCALE: Record<Lang, string> = { id: "id_ID", en: "en_US" };
const PREFIX: Record<Lang, string> = { id: "", en: "/en" };
const SEG = {
  solusi: { id: "solusi", en: "solutions" },
  untuk: { id: "untuk", en: "for" },
  studi: { id: "studi-kasus", en: "case-studies" },
  blog: { id: "blog", en: "blog" },
} as const;
export type Kind = keyof typeof SEG | "home";

export const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** *word* -> accent colour */
export const hl = (s: unknown) => esc(s).replace(/\*(.+?)\*/g, '<span class="hl">$1</span>');
export const plain = (s: unknown) => String(s ?? "").replace(/\*(.+?)\*/g, "$1");

/** internal URL that respects BASE_PATH (github.io/<repo>) */
export function u(path: string | null | undefined): string {
  if (!path || /^(https?:\/\/|#|mailto:|tel:)/.test(path)) return path ?? "";
  return `${BASE_PATH}${path}`;
}
export const absUrl = (path: string) => (path.startsWith("http") ? path : `${SITE_BASE_URL}${path}`);

export function route(kind: Kind, lang: Lang, slug?: string | null): string {
  if (kind === "home") return PREFIX[lang] + "/";
  const base = `${PREFIX[lang]}/${SEG[kind][lang]}/`;
  return base + (slug ? `${slug}/` : "");
}

export const slugify = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "halaman";

export const lines = (text: string | null | undefined) =>
  (text ?? "").split("\n").map((l) => l.trim().replace(/^[-•]+/, "").trim()).filter(Boolean);

function inlineMd(s: string) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g, (_m, t, url) =>
      `<a href="${url.startsWith("http") ? url : u(url)}">${t}</a>`);
}

/** mini markdown: blank line = paragraph, "## ", "### ", "- " list, "1. " list, **bold**, [link](url) */
export function mdToHtml(text: string | null | undefined): string {
  const out: string[] = [];
  for (const block of (text ?? "").trim().split(/\n\s*\n/)) {
    const bl = block.trim().split("\n").map((l) => l.replace(/\s+$/, "")).filter((l) => l.trim());
    if (!bl.length) continue;
    const buf: string[] = [];
    const flush = () => { if (buf.length) { out.push("<p>" + buf.map(inlineMd).join(" ") + "</p>"); buf.length = 0; } };
    let i = 0;
    while (i < bl.length) {
      const ln = bl[i].trim();
      if (ln.startsWith("### ")) { flush(); out.push(`<h3>${inlineMd(ln.slice(4))}</h3>`); i++; }
      else if (ln.startsWith("## ")) { flush(); out.push(`<h2>${inlineMd(ln.slice(3))}</h2>`); i++; }
      else if (/^[-*] /.test(ln)) {
        flush(); const items: string[] = [];
        while (i < bl.length && /^[-*] /.test(bl[i].trim())) { items.push(inlineMd(bl[i].trim().slice(2))); i++; }
        out.push("<ul>" + items.map((x) => `<li>${x}</li>`).join("") + "</ul>");
      } else if (/^\d+[.)] /.test(ln)) {
        flush(); const items: string[] = [];
        while (i < bl.length && /^\d+[.)] /.test(bl[i].trim())) { items.push(inlineMd(bl[i].trim().replace(/^\d+[.)] /, ""))); i++; }
        out.push("<ol>" + items.map((x) => `<li>${x}</li>`).join("") + "</ol>");
      } else { buf.push(ln); i++; }
    }
    flush();
  }
  return out.join("\n");
}

export const paragraphs = (text: string | null | undefined) =>
  (text ?? "").trim().split(/\n\s*\n/).filter((p) => p.trim()).map((p) => `<p>${inlineMd(p.trim())}</p>`).join("");

/** same encoding as Python urllib.parse.quote (keeps "/", encodes !'()*) */
export const pyQuote = (s: string) =>
  encodeURIComponent(s).replace(/%2F/g, "/").replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());

export function fmtDate(d: string | null | undefined, lang: Lang) {
  if (!d) return "";
  const [y, m, dd] = d.slice(0, 10).split("-").map(Number);
  if (!y || !m || !dd) return d;
  const bulan = {
    id: ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"],
    en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  };
  return lang === "id" ? `${dd} ${bulan.id[m - 1]} ${y}` : `${bulan.en[m - 1]} ${dd}, ${y}`;
}

export const ICON = {
  wa: '<svg viewBox="0 0 448 512" aria-hidden="true"><path fill="currentColor" d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3 18.6-68.1-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>',
  arrow: '<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M11.3 4.3a1 1 0 0 1 1.4 0l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 1 1-1.4-1.4l3.3-3.3H3a1 1 0 1 1 0-2h11.6l-3.3-3.3a1 1 0 0 1 0-1.4z"/></svg>',
  check: '<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4l3.3 3.3 7.3-7.3a1 1 0 0 1 1.4 0z"/></svg>',
  store: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M3 9l1.5-5h15L21 9M3 9h18M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M5 12v8h14v-8M10 20v-5h4v5"/></svg>',
  school: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 3l9 5-9 5-9-5 9-5zM6 10v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5M21 8v6"/></svg>',
  people: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1M16 3.1a4 4 0 0 1 0 7.8M22 21v-1a6 6 0 0 0-4-5.7"/></svg>',
  quote: '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M9.3 6C5.3 8 3 11.5 3 16.3V26h9v-9H7.2c0-3.4 1.6-5.8 4.3-7.2L9.3 6zm15 0c-4 2-6.3 5.5-6.3 10.3V26h9v-9h-4.8c0-3.4 1.6-5.8 4.3-7.2L24.3 6z"/></svg>',
} as const;
export const AUD_ICONS = ["store", "school", "people"] as const;
