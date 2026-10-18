# Backlog Pengembangan SysPro (Fitur di Luar Cakupan v1)

Dokumen ini mencatat seluruh fitur, integrasi, dan kapabilitas yang secara eksplisit berada di luar cakupan rilis SysPro v1 (berdasarkan `docs/PRD.md` Bagian 2.3 dan `AGENTS.md` Bagian 14).

Fitur-fitur di bawah ini **tidak boleh diimplementasikan pada versi v1** dan disimpan untuk iterasi/versi mendatang.

---

## 1. Modul Akademik Lanjutan (Future Release)

- **Absensi Mahasiswa & Dosen:**
  - Pencatatan kehadiran digital per sesi perkuliahan (QR code scan, geotagging, atau checklist manual oleh dosen).
  - Laporan rekapitulasi persentase kehadiran per mahasiswa dan batas syarat mengikuti ujian.
- **Nilai, Kartu Rencana Studi (KRS), dan Transkrip:**
  - Penginputan nilai tugas, kuis, UTS, dan UAS.
  - Pengambilan rencana studi semesteran oleh mahasiswa.
- **Sistem Pembayaran dan Keuangan:**
  - Integrasi virtual account / billing tagihan SPP & UKT perkuliahan.

---

## 2. Manajemen Fasilitas dan Ruangan Fisik

- **Sistem Pemesanan Ruangan Mandiri (Room Booking Engine):**
  - Entitas mandiri `rooms` dengan kapasitas, fasilitas proyektor/AC, dan ketersediaan waktu.
  - Algoritma pencegahan bentrok penggunaan ruangan lintas program studi atau fakultas.
  - Saat ini pada v1, data `ruangan` disimpan sebagai teks penanda lokasi manual yang diisi oleh admin lewat `admin_set_lokasi_sesi`.

---

## 3. Integrasi Pihak Ketiga (Integrations)

- **Integrasi SIAKAD / PD-DIKTI:**
  - Sinkronisasi data mahasiswa, dosen, mata kuliah, dan KRS otomatis melalui REST API / database replication dari SIAKAD institusi.
- **Integrasi Kalender Libur Nasional Otomatis:**
  - Fetching API tanggal merah resmi Surat Keputusan Bersama (SKB 3 Menteri) via Google Calendar / API publik. (Pada v1, tanggal libur dimasukkan manual oleh admin di `/admin/libur`).
- **Sinkronisasi Kalender Personal:**
  - Integrasi Google Calendar / Apple iCal (.ics feed) agar jadwal kuliah otomatis masuk ke kalender pribadi dosen dan mahasiswa.
- **Integrasi Otomatis Video Conference:**
  - Pembuatan tautan Zoom / Google Meet otomatis saat mode "Online" dipilih. (Pada v1, tautan online dimasukkan manual melalui field `link_online`).

---

## 4. Kanal Notifikasi Alternatif

- **Notifikasi WhatsApp / Telegram Gateway:**
  - Pengiriman pengingat harian dan perubahan mode via WhatsApp Business API / bot Telegram.
- **Notifikasi Email Transaksional:**
  - Pengiriman rekapitulasi jadwal mingguan atau notifikasi pembatalan via email institusi. (Pada v1, notifikasi hanya via in-app inbox dan Web Push).

---

## 5. Keamanan dan Autentikasi Mandiri

- **Self-Service Password Reset:**
  - Fitur reset password mandiri melalui tautan konfirmasi email / OTP nomor telepon bagi anggota yang lupa password. (Pada v1, reset akses hanya dapat dilakukan oleh Admin via RPC `admin-reset-member`).
- **Two-Factor Authentication (2FA / MFA):**
  - Autentikasi 2 langkah (TOTP Google Authenticator / SMS) untuk login Admin.
- **Undang Admin lewat Antarmuka UI:**
  - Penambahan akun admin baru melalui form UI aplikasi. (Pada v1, akun admin dibuat manual di auth Supabase atau seed).

---

## 6. Penyempurnaan Antarmuka & UX (v1.1)

- **Filter Jadwal Kuliah Berdasarkan Mata Kuliah Spesifik:**
  - Fitur filter multi-select mata kuliah pada tampilan jadwal mingguan/bulanan mahasiswa dan dosen.
- **Konfirmasi Massal Lintas Kelas:**
  - Tombol aksi satu kali klik untuk mengonfirmasi mode beberapa kelas berbeda sekaligus. (Ditolak pada v1 demi mencegah salah konfirmasi lintas kelas).
