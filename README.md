# Kreasi Digital Hub by Tara x Mattel

Situs satu halaman, dua bahasa (Indonesia di `/`, English di `/en/`).
Konten diatur di **dashboard admin** (`/admin/`, login lewat email), disimpan di **Supabase**,
dibangun oleh **GitHub Actions** (Astro) dan tayang di GitHub Pages, lalu di
**https://taraxmattel.kreasidigitalhub.com** (Cloudflare Pages) setelah secret Cloudflare dipasang.

```
/admin/ (ubah konten) ──► Supabase ──► GitHub Actions: tombol "Terbitkan perubahan", setiap push,
                                         atau otomatis tiap 10 menit bila ada perubahan
                                            ▼
                                       situs statis ──► pengunjung & Google
```

## Cara update konten

1. Buka `/admin/`, ketik email, klik link yang dikirim ke email.
2. Menu **Bagian Halaman** (Tentang + 4 section produk), **Freebies**, **Portfolio**, **Representation**,
   dan **Teks Situs** (judul section, footer, judul & deskripsi untuk Google).
3. Klik **Simpan**. Hanya baris berstatus **published** yang tampil.
4. Klik **Terbitkan perubahan**. Situs diperbarui dalam beberapa menit.

Section Freebies dan Representation disembunyikan otomatis kalau belum ada baris yang published.
Gambar yang dikosongkan memakai gambar bawaan di `public/assets/img/default/`.

Detail teknis (tabel, keamanan, konfigurasi, deploy): [docs/CMS.md](docs/CMS.md).

Desain mengikuti brand kit Tara x Mattel: Plus Jakarta Sans (judul), DM Sans (teks), Lora italic (tagline),
navy `#0F2A4A`, ocean `#1A6AAE`, merah `#D62839` (aksen kecil), light blue `#E3EEF8`, sudut 10px.
