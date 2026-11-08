// Admin dashboard content model. Each entry = one menu item / one Supabase table.
// To support a new site: add its id to `sites` on the tables it uses, or add new
// table entries (the table needs a site_id column + the standard RLS policies).
//
// Field types: text | textarea | markdown | number | checkbox | date | url | image | select | fk
// pair: true -> two columns "<name>_id" (Bahasa Indonesia) and "<name>_en" (English)
//
// This copy lives in hi-kreasidigital/kreasi-digital-hub-taraxmattel (site "taraxmattel").
// The other sites' tables are edited from their own /admin/ page.

export type Field = {
  name: string;
  label: string;
  type: "text" | "textarea" | "markdown" | "number" | "checkbox" | "date" | "url" | "image" | "select" | "fk";
  pair?: boolean;
  required?: boolean;
  hint?: string;
  options?: string[];
  fk?: { table: string; label: string };
  rows?: number;
};
export type Link = { label: string; table: string; self: string; other: string; otherTable: string; otherLabel: string };
export type TableDef = {
  table: string;
  label: string;
  group: string;
  sites: string[] | "all";
  single?: boolean;          // one row per site (site_settings)
  key?: string;              // primary key column (default "id")
  title: string;             // column shown as the row title in lists
  listCols?: string[];
  orderBy?: string;
  fields: Field[];
  links?: Link[];
  help?: string;
};

const SHOWN: Field = { name: "status", label: "Status", type: "select", options: ["draft", "published", "idea", "archived"], hint: "Published = tampil di website (dulu: centang Tampilkan)." };
const ORDER: Field = { name: "sort_order", label: "Urutan", type: "number", hint: "Angka kecil tampil lebih dulu." };
const TXM = ["taraxmattel"];

export const TABLES: TableDef[] = [
  // ---------------------------------------------------------------- Kreasi Digital Hub by Tara x Mattel
  {
    table: "page_sections", label: "Bagian Halaman", group: "Konten", sites: TXM, title: "key",
    listCols: ["status", "name", "label_id"], orderBy: "key",
    help: "Satu baris = satu bagian tetap di halaman: 'about' (Tentang, paling atas) dan produk 'usaha', 'skill', 'seni', 'ngo'. Warna latar dan motif mengikuti Key. 'about' harus Published.",
    fields: [
      SHOWN,
      { name: "key", label: "Key", type: "select", options: ["about", "usaha", "skill", "seni", "ngo"], required: true, hint: "Jangan diubah." },
      { name: "label", label: "Judul section (label kecil di atas)", type: "text", pair: true },
      { name: "name", label: "Nama produk (judul besar)", type: "text", hint: "Produk saja. Juga menentukan mockup bawaan bila Gambar kosong." },
      { name: "tagline", label: "Keterangan (baris miring)", type: "text", pair: true, hint: "Produk saja." },
      { name: "body", label: "Paragraf", type: "textarea", pair: true, rows: 7 },
      { name: "image", label: "Gambar", type: "image", hint: "About: foto (kosong = potret 3D bawaan). Produk: thumbnail rasio 4:3 (kosong = mockup bawaan)." },
      { name: "button", label: "Teks tombol", type: "text", pair: true, hint: "About: tombol YouTube. Produk: tombol muncul bila Teks tombol dan Link diisi." },
      { name: "link", label: "Link tombol", type: "url", hint: "About: link YouTube (juga dipakai di footer)." },
      { name: "button2", label: "Teks tombol kedua (About saja)", type: "text", pair: true, hint: "Tombol Instagram." },
      { name: "link2", label: "Link tombol kedua (About saja)", type: "url", hint: "Link Instagram (juga dipakai di footer)." },
      { name: "coming_soon", label: "Segera hadir (pita merah)", type: "checkbox", hint: "Produk saja." },
    ],
  },
  {
    table: "freebies", label: "Freebies", group: "Konten", sites: TXM, title: "name_id",
    listCols: ["status", "sort_order", "format_id"], orderBy: "sort_order",
    help: "Kartu freebie. Section Freebies otomatis disembunyikan selama belum ada yang Published.",
    fields: [
      SHOWN, ORDER,
      { name: "name", label: "Nama", type: "text", pair: true, required: true },
      { name: "format", label: "Format (mis. PDF + Google Sheet)", type: "text", pair: true },
      { name: "description", label: "Keterangan", type: "textarea", pair: true, rows: 3 },
      { name: "cover", label: "Cover", type: "image" },
      { name: "download_url", label: "Link download", type: "url" },
    ],
  },
  {
    table: "portfolio_items", label: "Portfolio", group: "Konten", sites: TXM, title: "title",
    listCols: ["status", "sort_order", "kind"], orderBy: "sort_order",
    fields: [
      SHOWN, ORDER,
      { name: "title", label: "Judul", type: "text", required: true },
      { name: "kind", label: "Jenis", type: "text", hint: "Mis. Website." },
      { name: "description", label: "Keterangan", type: "textarea", pair: true, rows: 3 },
      { name: "thumbnail", label: "Thumbnail", type: "image", hint: "Rasio 4:3 paling pas. Kosong = mockup bawaan (khusus 3 website awal)." },
      { name: "link", label: "Link", type: "url" },
    ],
  },
  {
    table: "representations", label: "Representation", group: "Konten", sites: TXM, title: "name",
    listCols: ["status", "sort_order"], orderBy: "sort_order",
    help: "Kartu representation. Section otomatis disembunyikan selama belum ada yang Published.",
    fields: [
      SHOWN, ORDER,
      { name: "name", label: "Nama", type: "text", required: true, hint: "Format: Judul | Sumber. Bagian setelah | tampil sebagai sumber." },
      { name: "description", label: "Keterangan", type: "textarea", pair: true, rows: 5 },
      { name: "photo", label: "Foto", type: "image", hint: "Persegi (1:1) paling pas." },
      { name: "link", label: "Link", type: "url", hint: "Harus diawali https://. Kosong = kartu tidak bisa diklik." },
    ],
  },
  // ---------------------------------------------------------------- shared
  {
    table: "site_texts", label: "Teks Situs", group: "Pengaturan", sites: "all", title: "key",
    listCols: ["group_name", "text_id"], orderBy: "key",
    help: "Teks tetap: label/judul/pengantar section Freebies, Portfolio, Representation; footer; judul & deskripsi halaman (meta) untuk Google; label kecil (ui.*). Jangan ubah Key. EN kosong = memakai teks ID (kecuali judul section).",
    fields: [
      { name: "key", label: "Key", type: "text", required: true, hint: "Kode yang dibaca website. Jangan diubah." },
      { name: "text", label: "Teks", type: "textarea", pair: true, rows: 3 },
      { name: "group_name", label: "Grup", type: "text" },
      { name: "note", label: "Catatan untuk editor", type: "textarea", rows: 2 },
    ],
  },
];

export const tablesFor = (site: string) => TABLES.filter((t) => t.sites === "all" || t.sites.includes(site));
/** expand pair fields into concrete column names */
export const columnsOf = (f: Field) => (f.pair ? [`${f.name}_id`, `${f.name}_en`] : [f.name]);
