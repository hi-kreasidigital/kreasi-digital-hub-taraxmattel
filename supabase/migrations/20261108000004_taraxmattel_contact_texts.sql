-- Tara x Mattel: texts for the contact section and the "Hubungi kami" header button.
-- Inserted once; editors change them in the admin (Teks Situs, group "contact").
insert into public.site_texts (site_id, key, text_id, text_en, group_name, note) values
  ('taraxmattel', 'contact.cta', 'Hubungi kami', 'Contact us', 'contact', null),
  ('taraxmattel', 'contact.eyebrow', 'Custom', 'Custom', 'contact', null),
  ('taraxmattel', 'contact.title', 'Butuh fitur atau sistem khusus untuk usaha kamu?', 'Need a special feature or system for your business?', 'contact', null),
  ('taraxmattel', 'contact.lead', 'Kalau alur kerjamu belum tertangani tools yang ada, ceritakan saja. Kami pelajari prosesnya, lalu kirim usulan fitur dan penawaran harga.', 'If your workflow isn’t covered by our tools yet, just tell us. We’ll study the process and send a feature proposal with a quote.', 'contact', null),
  ('taraxmattel', 'contact.points', 'Tambah fitur di tools yang sudah kamu pakai
Sistem baru sesuai alur kerja usahamu
Laporan atau dashboard dengan format khusus', 'Add features to tools you already use
A new system built around your workflow
Reports or dashboards in a custom format', 'contact', 'Satu baris = satu poin.'),
  ('taraxmattel', 'contact.name', 'Nama', 'Name', 'contact', null),
  ('taraxmattel', 'contact.namePh', 'Nama kamu', 'Your name', 'contact', null),
  ('taraxmattel', 'contact.business', 'Jenis usaha', 'Type of business', 'contact', null),
  ('taraxmattel', 'contact.businessPh', 'Pilih jenis usaha', 'Choose your business type', 'contact', null),
  ('taraxmattel', 'contact.options', 'Jasa Profesional
Kuliner & F&B
Retail & Perdagangan
Grosir & Distributor
Kecantikan & Perawatan
Kebugaran & Kelas
Kesehatan
Pendidikan
Kreatif & Acara
Otomotif & Servis
Properti & Konstruksi
Produksi
Organisasi
Lainnya', 'Professional Services
Food & Beverage
Retail & Trade
Wholesale & Distribution
Beauty & Care
Fitness & Classes
Health
Education
Creative & Events
Automotive & Repairs
Property & Construction
Production
Organizations
Other', 'contact', 'Satu baris = satu pilihan.'),
  ('taraxmattel', 'contact.email', 'Email', 'Email', 'contact', null),
  ('taraxmattel', 'contact.emailPh', 'nama@email.com', 'name@email.com', 'contact', null),
  ('taraxmattel', 'contact.phone', 'No. WhatsApp (opsional)', 'WhatsApp number (optional)', 'contact', null),
  ('taraxmattel', 'contact.phonePh', '08xx-xxxx-xxxx', '+62 8xx-xxxx-xxxx', 'contact', null),
  ('taraxmattel', 'contact.need', 'Ceritakan kebutuhanmu', 'Tell us what you need', 'contact', null),
  ('taraxmattel', 'contact.needPh', 'Mis. kami butuh sistem antrean servis yang terhubung ke kasir', 'e.g. we need a service queue system connected to the cashier', 'contact', null),
  ('taraxmattel', 'contact.submit', 'Kirim pesan', 'Send message', 'contact', null),
  ('taraxmattel', 'contact.sending', 'Mengirim...', 'Sending...', 'contact', null),
  ('taraxmattel', 'contact.ok', 'Terima kasih! Pesanmu sudah kami terima. Kami akan membalas lewat email.', 'Thank you! We received your message and will reply by email.', 'contact', null),
  ('taraxmattel', 'contact.err', 'Maaf, pesan gagal terkirim. Coba lagi sebentar lagi.', 'Sorry, the message could not be sent. Please try again in a moment.', 'contact', null),
  ('taraxmattel', 'contact.invalid', 'Lengkapi nama, jenis usaha, email, dan kebutuhanmu dulu ya.', 'Please fill in your name, business type, email and what you need.', 'contact', null)
on conflict (site_id, key) do nothing;
