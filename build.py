#!/usr/bin/env python3
"""Bangun situs Kreasi Digital Hub by Tara x Mattel ke folder dist/.

Konten diambil dari Airtable bila AIRTABLE_TOKEN tersedia, kalau tidak
memakai data/contoh.json. Foto dari Airtable diunduh dan dikecilkan ke WebP
supaya situs tetap tampil walau tautan foto Airtable sudah kedaluwarsa.

Pemakaian:  python build.py
"""
import hashlib
import io
import json
import os
import re
import shutil
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone

from jinja2 import Environment, FileSystemLoader, select_autoescape
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(ROOT, "dist")
CONFIG = json.load(open(os.path.join(ROOT, "site.config.json"), encoding="utf-8"))
API = "https://api.airtable.com/v0"


# ---------------------------------------------------------------- data
def airtable_rows(token, table_id):
    """All records of one table, as plain {field name: value} dicts."""
    rows, offset = [], None
    while True:
        q = {"pageSize": "100"}
        if offset:
            q["offset"] = offset
        url = f"{API}/{CONFIG['airtable_base_id']}/{table_id}?{urllib.parse.urlencode(q)}"
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


def load_content():
    token = os.environ.get("AIRTABLE_TOKEN", "").strip()
    if not token:
        print("→ Sumber konten: data/contoh.json (AIRTABLE_TOKEN belum diatur)")
        return json.load(open(os.path.join(ROOT, "data", "contoh.json"), encoding="utf-8")), False
    print("→ Sumber konten: Airtable")
    content = {}
    for key, table_id in CONFIG["tables"].items():
        content[key] = airtable_rows(token, table_id)
        print(f"  {key}: {len(content[key])} baris")
    return content, True


# ---------------------------------------------------------------- images
def save_image(att, folder, max_w):
    """Download an Airtable attachment and store it as WebP under dist/media/."""
    url = att.get("url")
    if not url:
        return None
    key = hashlib.sha1((att.get("id", "") + url.split("?")[0]).encode()).hexdigest()[:12]
    rel = f"media/{folder}-{key}.webp"
    out = os.path.join(DIST, rel)
    if os.path.exists(out):
        return rel
    try:
        with urllib.request.urlopen(url, timeout=60) as r:
            raw = r.read()
        im = Image.open(io.BytesIO(raw))
        im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
        if im.width > max_w:
            im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        im.save(out, "WEBP", quality=84, method=6)
        return rel
    except Exception as e:  # keep building with the default image
        print(f"  ! foto gagal diunduh ({folder}): {e}")
        return None


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")


def pick_image(row, field, folder, max_w, default=None):
    atts = row.get(field) or []
    if atts:
        rel = save_image(atts[0], folder, max_w)
        if rel:
            return rel
    if default and os.path.exists(os.path.join(ROOT, "assets", default)):
        return "assets/" + default
    return None


# ---------------------------------------------------------------- shaping
def first(rows):
    return rows[0] if rows else {}


def visible(rows):
    out = [r for r in rows if r.get("Tampilkan")]
    return sorted(out, key=lambda r: (r.get("Urutan") is None, r.get("Urutan") or 0))


PRODUCTS = [
    # key, background, decorative motifs (top right, bottom left)
    ("usaha", "ocean", "kompas-white", "ombak-white"),
    ("skill", "mist", "kemudi-navy", None),
    ("seni", "navy", "jangkar-white", "ombak-white"),
    ("ngo", "mist", "mercusuar-navy", None),
]


def shape(content):
    heads = {r.get("Section", ""): r for r in content.get("judul_section", [])}
    about = first(content.get("tentang", []))
    about["foto"] = pick_image(about, "Foto", "tentang", 720, "img/default/potret-tara-mattel.webp")

    freebies = visible(content.get("freebies", []))
    for r in freebies:
        r["cover"] = pick_image(r, "Cover", "freebie", 900)

    products = []
    for key, bg, tr, bl in PRODUCTS:
        r = first(content.get(key, []))
        if not r or not r.get("Tampilkan"):
            continue
        r["key"], r["bg"], r["deco_tr"], r["deco_bl"] = key, bg, tr, bl
        r["thumb"] = pick_image(r, "Thumbnail", key, 1200, f"img/default/{slug(r.get('Nama Produk'))}.webp")
        products.append(r)

    portfolio = visible(content.get("portfolio", []))
    for r in portfolio:
        r["thumb"] = pick_image(r, "Thumbnail", "portfolio", 1000, f"img/default/{slug(r.get('Judul'))}.webp")

    reps = visible(content.get("representation", []))
    for r in reps:
        r["foto"] = pick_image(r, "Foto", "representation", 600)

    return {
        "heads": heads,
        "about": about,
        "freebies": freebies,
        "products": products,
        "portfolio": portfolio,
        "reps": reps,
        "footer": first(content.get("footer", [])),
    }


# ---------------------------------------------------------------- render
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


def main():
    content, live = load_content()
    if os.path.isdir(DIST):
        shutil.rmtree(DIST)
    os.makedirs(DIST)
    shutil.copytree(os.path.join(ROOT, "assets"), os.path.join(DIST, "assets"))

    data = shape(content)
    # cache busting: a new version string whenever the CSS or JS changes
    ver = hashlib.sha1(b"".join(open(os.path.join(ROOT, "assets", f), "rb").read()
                                for f in ("css/site.css", "js/site.js"))).hexdigest()[:10]
    env = Environment(loader=FileSystemLoader(os.path.join(ROOT, "templates")),
                      autoescape=select_autoescape(["html", "j2"]), trim_blocks=True, lstrip_blocks=True)
    tpl = env.get_template("index.html.j2")
    site_url = CONFIG["site_url"].rstrip("/") + "/"
    for lang, prefix, out in (("id", "", "index.html"), ("en", "../", "en/index.html")):
        L = lang.upper()
        html = tpl.render(lang=lang, L=L, r=prefix, ui=UI[lang], ver=ver, site=CONFIG, site_url=site_url,
                          built=datetime.now(timezone.utc).isoformat(timespec="minutes"), **data)
        path = os.path.join(DIST, out)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        open(path, "w", encoding="utf-8").write(html)

    open(os.path.join(DIST, ".nojekyll"), "w").close()
    open(os.path.join(DIST, "robots.txt"), "w").write(f"User-agent: *\nAllow: /\nSitemap: {site_url}sitemap.xml\n")
    today = datetime.now(timezone.utc).date().isoformat()
    open(os.path.join(DIST, "sitemap.xml"), "w").write(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
        + "".join(
            f'  <url><loc>{site_url}{p}</loc><lastmod>{today}</lastmod>'
            f'<xhtml:link rel="alternate" hreflang="id" href="{site_url}"/>'
            f'<xhtml:link rel="alternate" hreflang="en" href="{site_url}en/"/></url>\n'
            for p in ("", "en/"))
        + "</urlset>\n")
    print(f"✓ Selesai: 2 halaman (ID dan EN) di dist/ · konten {'Airtable' if live else 'contoh'}")


if __name__ == "__main__":
    try:
        main()
    except urllib.error.HTTPError as e:
        print(f"✗ Airtable menolak permintaan ({e.code}). Cek AIRTABLE_TOKEN dan akses ke base.", file=sys.stderr)
        sys.exit(1)
