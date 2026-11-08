#!/usr/bin/env python3
"""One-time copy of the Airtable base "Kreasi Digital Hub by Tara x Mattel" into Supabase.

Run by .github/workflows/migrate-airtable.yml with the repo's AIRTABLE_TOKEN secret:
  1. read every Airtable table (read only, Airtable is never changed)
  2. map the rows to the Supabase tables (site_texts, page_sections, freebies,
     portfolio_items, representations)
  3. download the photos and shrink them to WebP exactly like the old build.py did
  4. post rows + photos to the airtable-import-taraxmattel Edge Function, which checks
     the token, uploads the photos to media/taraxmattel/airtable/ and upserts the rows
  5. print a fingerprint per table, to compare with Supabase (see docs/CMS.md)

  python scripts/airtable_import.py            # import
  python scripts/airtable_import.py --dry-run  # map + fingerprints only, nothing sent
"""
import base64
import hashlib
import io
import json
import os
import sys
import urllib.parse
import urllib.request

BASE_ID = "appiFXiUuNc4GB1vx"
TABLES = {
    "judul_section": "tblDwCQSf55iuLOms",
    "tentang": "tbliysDmuK965xkWg",
    "freebies": "tblVf0ldn2TbWJAaU",
    "usaha": "tblnnJ0I7xyse9BsL",
    "skill": "tblfpSuJt8ji6iSWe",
    "seni": "tbloGt4g4lulRQVpG",
    "ngo": "tblHVIh1P7J96nyHM",
    "portfolio": "tbl90sF5B46bwdwIh",
    "representation": "tbllNPiWnL0wjNuYx",
    "footer": "tblSm9VXA8qLPM5AR",
}
FUNCTION_URL = os.environ.get(
    "FUNCTION_URL", "https://vqtcrdcpzmkahwvdsbmn.supabase.co/functions/v1/airtable-import-taraxmattel")

# Fixed texts that lived in build.py (UI dict + site name). They become editable site_texts.
SITE_NAME = "Kreasi Digital Hub by Tara x Mattel"
UI = {
    "id": {"lang_label": "Pilih bahasa", "free": "GRATIS", "download": "Download gratis", "view": "Lihat",
           "soon": "Segera hadir", "portrait_alt": "Potret 3D Tara dan Mattel di dalam cincin kompas",
           "thumb_alt": "Tampilan", "skip": "Lompat ke konten", "prev": "Sebelumnya", "next": "Berikutnya",
           "zoom_label": "Perbesar gambar", "zoom_hint": "Klik gambar untuk memperbesar", "close": "Tutup",
           "description": "Tara dan Mattel berbagi cerita jujur dan langkah nyata soal mengenal diri, keluarga, pekerjaan, dan uang. Freebies, produk digital, dan karya kami ada di sini."},
    "en": {"lang_label": "Choose language", "free": "FREE", "download": "Free download", "view": "View",
           "soon": "Coming soon", "portrait_alt": "3D portrait of Tara and Mattel inside the compass ring",
           "thumb_alt": "Preview of", "skip": "Skip to content", "prev": "Previous", "next": "Next",
           "zoom_label": "Enlarge image", "zoom_hint": "Click the image to enlarge", "close": "Close",
           "description": "Tara and Mattel share honest stories and real steps about knowing yourself, family, work and money. Our freebies, digital products and work, all in one place."},
}
PRODUCT_KEYS = ["usaha", "skill", "seni", "ngo"]


def airtable_rows(token, table_id):
    rows, offset = [], None
    while True:
        q = {"pageSize": "100"}
        if offset:
            q["offset"] = offset
        url = f"https://api.airtable.com/v0/{BASE_ID}/{table_id}?{urllib.parse.urlencode(q)}"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.load(r)
        for rec in data.get("records", []):
            f = dict(rec.get("fields", {}))
            f["_id"] = rec["id"]
            rows.append(f)
        offset = data.get("offset")
        if not offset:
            return rows


# ---------------------------------------------------------------- photos (same settings as build.py)
IMAGES = []  # [{path, content_type, data}]


def keep_image(row, field, folder, max_w, download=True):
    """Shrink the first attachment to WebP and return a 'media:<path>' placeholder."""
    atts = row.get(field) or []
    if not atts or not atts[0].get("url"):
        return None
    att = atts[0]
    path = f"taraxmattel/airtable/{folder}/{att['id']}.webp"
    if not download:
        return "media:" + path
    from PIL import Image
    with urllib.request.urlopen(att["url"], timeout=60) as r:
        raw = r.read()
    im = Image.open(io.BytesIO(raw))
    im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
    if im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=84, method=6)
    IMAGES.append({"path": path, "content_type": "image/webp", "data": base64.b64encode(buf.getvalue()).decode()})
    print(f"  photo {folder}: {len(raw) // 1024} KB -> {len(buf.getvalue()) // 1024} KB")
    return "media:" + path


# ---------------------------------------------------------------- mapping
def s(v):
    if v is None:
        return None
    if isinstance(v, dict) and "name" in v:  # single select
        v = v["name"]
    return v if isinstance(v, str) else str(v)


def num(v):
    return int(round(v)) if isinstance(v, (int, float)) and not isinstance(v, bool) else None


def shown(r):
    return "published" if r.get("Tampilkan") else "draft"


def build_rows(content, download=True):
    texts = []

    def text(key, id_, en, group, note=None):
        texts.append({"key": key, "text_id": id_, "text_en": en, "group_name": group, "note": note, "airtable_id": None})

    for r in content["judul_section"]:
        sec = (s(r.get("Section")) or "").strip().lower()
        if not sec:
            continue
        for part, col in (("label", "Label"), ("title", "Judul"), ("lead", "Pengantar")):
            text(f"{sec}.{part}", s(r.get(f"{col} ID")), s(r.get(f"{col} EN")), "section",
                 f"Section {s(r.get('Section'))}: {col.lower()}")
    foot = content["footer"][0] if content["footer"] else {}
    text("footer.tagline", s(foot.get("Tagline ID")), s(foot.get("Tagline EN")), "footer")
    text("footer.copyright", s(foot.get("Hak Cipta")), None, "footer", "Satu teks untuk kedua bahasa (EN kosong = sama dengan ID).")
    text("meta.title", SITE_NAME, SITE_NAME, "meta", "Judul halaman di Google dan tab browser.")
    text("meta.description", UI["id"]["description"], UI["en"]["description"], "meta", "Deskripsi di hasil Google dan saat link dibagikan.")
    for k in UI["id"]:
        if k != "description":
            text(f"ui.{k}", UI["id"][k], UI["en"][k], "ui")

    sections = []
    about = content["tentang"][0] if content["tentang"] else None
    if about:
        sections.append({
            "key": "about", "status": "published", "airtable_id": about["_id"], "name": s(about.get("Nama")),
            "label_id": s(about.get("Judul Section ID")), "label_en": s(about.get("Judul Section EN")),
            "tagline_id": None, "tagline_en": None,
            "body_id": s(about.get("Paragraf ID")), "body_en": s(about.get("Paragraf EN")),
            "image": keep_image(about, "Foto", "tentang", 720, download),
            "button_id": s(about.get("Tombol YouTube ID")), "button_en": s(about.get("Tombol YouTube EN")),
            "link": s(about.get("Link YouTube")),
            "button2_id": s(about.get("Tombol Instagram ID")), "button2_en": s(about.get("Tombol Instagram EN")),
            "link2": s(about.get("Link Instagram")), "coming_soon": False,
        })
    for key in PRODUCT_KEYS:
        rows = content[key]
        if not rows:
            continue
        r = rows[0]  # the old site used only the first row of each product table
        sections.append({
            "key": key, "status": shown(r), "airtable_id": r["_id"], "name": s(r.get("Nama Produk")),
            "label_id": s(r.get("Judul Section ID")), "label_en": s(r.get("Judul Section EN")),
            "tagline_id": s(r.get("Keterangan ID")), "tagline_en": s(r.get("Keterangan EN")),
            "body_id": s(r.get("Paragraf ID")), "body_en": s(r.get("Paragraf EN")),
            "image": keep_image(r, "Thumbnail", key, 1200, download),
            "button_id": s(r.get("Tombol ID")), "button_en": s(r.get("Tombol EN")), "link": s(r.get("Link")),
            "button2_id": None, "button2_en": None, "link2": None,
            "coming_soon": bool(r.get("Segera Hadir")),
        })

    freebies = [{
        "airtable_id": r["_id"], "status": shown(r), "sort_order": num(r.get("Urutan")),
        "name_id": s(r.get("Nama ID")) or "", "name_en": s(r.get("Nama EN")),
        "format_id": s(r.get("Format ID")), "format_en": s(r.get("Format EN")),
        "description_id": s(r.get("Keterangan ID")), "description_en": s(r.get("Keterangan EN")),
        "cover": keep_image(r, "Cover", "freebie", 900, download), "download_url": s(r.get("Link Download")),
    } for r in content["freebies"]]

    portfolio = [{
        "airtable_id": r["_id"], "status": shown(r), "sort_order": num(r.get("Urutan")),
        "title": s(r.get("Judul")) or "", "kind": s(r.get("Jenis")),
        "description_id": s(r.get("Keterangan ID")), "description_en": s(r.get("Keterangan EN")),
        "thumbnail": keep_image(r, "Thumbnail", "portfolio", 1000, download), "link": s(r.get("Link")),
    } for r in content["portfolio"]]

    reps = [{
        "airtable_id": r["_id"], "status": shown(r), "sort_order": num(r.get("Urutan")),
        "name": s(r.get("Nama")) or "",
        "description_id": s(r.get("Keterangan ID")), "description_en": s(r.get("Keterangan EN")),
        "photo": keep_image(r, "Foto", "representation", 600, download), "link": s(r.get("Link")),
    } for r in content["representation"]]

    return {"site_texts": texts, "page_sections": sections, "freebies": freebies,
            "portfolio_items": portfolio, "representations": reps}


# ---------------------------------------------------------------- fingerprints
# Same recipe as the SQL check in docs/CMS.md: per row, the listed columns joined with "|"
# (empty values skipped, like concat_ws), rows sorted by the sort column, joined with "\n", md5.
FINGERPRINT = {
    "site_texts": ("key", ["key", "text_id", "text_en"]),
    "page_sections": ("key", ["key", "status", "name", "label_id", "label_en", "tagline_id", "tagline_en", "body_id",
                              "body_en", "button_id", "button_en", "link", "button2_id", "button2_en", "link2", "coming_soon"]),
    "freebies": ("airtable_id", ["airtable_id", "status", "sort_order", "name_id", "name_en", "format_id", "format_en",
                                 "description_id", "description_en", "download_url"]),
    "portfolio_items": ("airtable_id", ["airtable_id", "status", "sort_order", "title", "kind", "description_id",
                                        "description_en", "link"]),
    "representations": ("airtable_id", ["airtable_id", "status", "sort_order", "name", "description_id",
                                        "description_en", "link"]),
}


def fp_value(v):
    if isinstance(v, bool):
        return "true" if v else "false"
    return str(v)


def fingerprint(table, rows):
    sort, cols = FINGERPRINT[table]
    # Postgres "order by <text>" with the C collation == Python byte order; the SQL check uses collate "C"
    lines = ["|".join(fp_value(r[c]) for c in cols if r.get(c) is not None)
             for r in sorted(rows, key=lambda r: (r.get(sort) or "").encode())]
    return hashlib.md5("\n".join(lines).encode()).hexdigest()


def main():
    dry = "--dry-run" in sys.argv
    token = os.environ.get("AIRTABLE_TOKEN", "").strip()
    if not token:
        sys.exit("AIRTABLE_TOKEN is missing")
    content = {k: airtable_rows(token, t) for k, t in TABLES.items()}
    for k, v in content.items():
        print(f"Airtable {k}: {len(v)} rows")
    rows = build_rows(content, download=not dry)
    for t, r in rows.items():
        print(f"fingerprint {t}: rows={len(r)} md5={fingerprint(t, r)}")
    if dry:
        return
    payload = json.dumps({"airtable_token": token, "images": IMAGES, "rows": rows}).encode()
    req = urllib.request.Request(FUNCTION_URL, data=payload, method="POST",
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            print("function:", r.status, r.read().decode())
    except urllib.error.HTTPError as e:
        sys.exit(f"function: HTTP {e.code} {e.read().decode()}")


if __name__ == "__main__":
    main()
