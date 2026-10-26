# Kreasi Digital Hub by Tara x Mattel

Situs satu halaman, dua bahasa (Indonesia di `/`, English di `/en/`).
Konten diatur di **Airtable**, dibangun otomatis oleh **GitHub Actions**, dan tayang di **GitHub Pages**:
https://hi-kreasidigital.github.io/kreasi-digital-hub-taraxmattel/

```
Airtable (isi konten) ──► GitHub Actions (06:07 & 18:07 WIB, setiap push, atau tombol manual)
                             │  ambil data, unduh & kecilkan foto (WebP), susun halaman ID + EN
                             ▼
                        GitHub Pages ──► pengunjung & Google
```

## Pengaturan sekali saja

1. **Token Airtable.** Buka https://airtable.com/create/tokens → *Create token*.
   - Scope: `data.records:read`
   - Access: base **Kreasi Digital Hub by Tara x Mattel**
   - Salin tokennya.
2. **Simpan token di GitHub.** Repo ini → *Settings* → *Secrets and variables* → *Actions* →
   *New repository secret*. Nama: `AIRTABLE_TOKEN`, isi: token tadi.
3. **Aktifkan Pages.** *Settings* → *Pages* → *Build and deployment* → Source: **GitHub Actions**.
4. **Jalankan pertama kali.** Tab *Actions* → *Terbitkan situs* → *Run workflow*.

Tanpa token, situs tetap dibangun dari `data/contoh.json` (isi awal yang sama dengan Airtable).

## Cara update konten (Airtable)

Setiap section punya tabel sendiri. Kolom berakhiran **ID** untuk versi Indonesia, **EN** untuk English.

| Tabel | Isi |
|---|---|
| 0 · Judul Section | Label, judul, dan pengantar untuk Freebies, Portfolio, Representation |
| 1 · Tentang Tara x Mattel | Paragraf hero, foto, link YouTube & Instagram |
| 2 · Freebies | Kartu freebie. Centang **Tampilkan** agar muncul |
| 3–6 · Untuk … | Section produk (Usaha, Skill, Seniman Visual, Yayasan & NGO). Centang **Segera Hadir** untuk pita merah tanpa tombol |
| 7 · Portfolio | Kartu portfolio |
| 8 · Representation | Kartu representation |
| 9 · Footer | Tagline dan hak cipta |

- Section Freebies dan Representation **disembunyikan otomatis** kalau belum ada baris yang dicentang *Tampilkan*.
- Urutan kartu mengikuti kolom **Urutan**.
- Kolom foto/thumbnail yang dikosongkan memakai gambar bawaan di `assets/img/default/`.
- Perubahan di Airtable tayang pada jadwal berikutnya (06:07 / 18:07 WIB), atau langsung lewat *Actions* → *Run workflow*.

## Menjalankan di komputer sendiri

```bash
pip install -r requirements.txt
AIRTABLE_TOKEN=patXXXX python build.py   # tanpa token: pakai data/contoh.json
python -m http.server -d dist 8000       # buka http://localhost:8000
```

## Struktur

| Berkas/folder | Isi |
|---|---|
| `site.config.json` | Alamat situs, ID base dan tabel Airtable |
| `build.py` | Ambil konten, unduh foto, susun `dist/` |
| `templates/index.html.j2` | Kerangka halaman |
| `assets/` | CSS, JS (tombol ID/EN), logo, motif, gambar bawaan |
| `data/contoh.json` | Konten cadangan |
| `.github/workflows/terbitkan.yml` | Jadwal dan langkah terbit |

Desain mengikuti brand kit Tara x Mattel: Plus Jakarta Sans (judul), DM Sans (teks), Lora italic (tagline),
navy `#0F2A4A`, ocean `#1A6AAE`, merah `#D62839` (aksen kecil), light blue `#E3EEF8`, sudut 10px.
