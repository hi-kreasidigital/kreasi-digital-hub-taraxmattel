// Fallback for every fixed text key, used when site_texts has no value for it.
// [Bahasa Indonesia, English]. Copied from the old build.py and the Airtable base at migration time.
export const DEFAULT_TEXT: Record<string, [string, string]> = {
  "meta.title": ["Kreasi Digital Hub by Tara x Mattel", "Kreasi Digital Hub by Tara x Mattel"],
  "meta.description": [
    "Tara dan Mattel berbagi cerita jujur dan langkah nyata soal mengenal diri, keluarga, pekerjaan, dan uang. Freebies, produk digital, dan karya kami ada di sini.",
    "Tara and Mattel share honest stories and real steps about knowing yourself, family, work and money. Our freebies, digital products and work, all in one place.",
  ],
  "ui.lang_label": ["Pilih bahasa", "Choose language"],
  "ui.free": ["GRATIS", "FREE"],
  "ui.download": ["Download gratis", "Free download"],
  "ui.view": ["Lihat", "View"],
  "ui.soon": ["Segera hadir", "Coming soon"],
  "ui.portrait_alt": ["Potret 3D Tara dan Mattel di dalam cincin kompas", "3D portrait of Tara and Mattel inside the compass ring"],
  "ui.thumb_alt": ["Tampilan", "Preview of"],
  "ui.skip": ["Lompat ke konten", "Skip to content"],
  "ui.prev": ["Sebelumnya", "Previous"],
  "ui.next": ["Berikutnya", "Next"],
  "ui.zoom_label": ["Perbesar gambar", "Enlarge image"],
  "ui.zoom_hint": ["Klik gambar untuk memperbesar", "Click the image to enlarge"],
  "ui.close": ["Tutup", "Close"],
  "footer.tagline": ["Cerita jujur, langkah nyata.", "Honest stories, real steps."],
  "footer.copyright": ["© 2026 Kreasi Digital Hub by Tara x Mattel", "© 2026 Kreasi Digital Hub by Tara x Mattel"],
  "notFound.title": ["Halaman tidak ditemukan", "Page not found"],
  "notFound.lead": ["Maaf, halaman yang kamu cari tidak ada atau sudah pindah.", "Sorry, the page you are looking for does not exist or has moved."],
  "notFound.cta": ["Kembali ke beranda", "Back to the homepage"],
};
