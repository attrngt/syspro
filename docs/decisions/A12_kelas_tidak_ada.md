# ADR A12: Mode "Tidak Ada" Membatalkan Sesi dan Menghasilkan Tagihan Pengganti

- **Status:** Diimplementasikan Sesuai Spesifikasi A.1.14 (Menunggu Konfirmasi Akhir Pemangku Kepentingan)
- **Tag Kode:** `// TODO(keputusan A12)`
- **Tanggal:** 14 Oktober 2026
- **Acuan:** PRD v2.2 Bagian A.1.13 & A.1.14

## Konteks
Ketika dosen atau admin menyatakan mode perkuliahan suatu sesi sebagai "Tidak Ada" (misalnya dosen berhalangan hadir atau ada kendala mendesak), perlakuan terhadap sesi dan hak mahasiswa perlu ditentukan: apakah sesi tersebut sekadar berstatus selesai tanpa materi, atau diperlakukan setara pembatalan yang mewajibkan sesi kuliah pengganti (*make-up class*).

## Keputusan
Sesuai spesifikasi PRD v2.2 Bagian A.1.14:
1. Pemilihan mode `tidak_ada` lewat `set_session_mode`:
   - Membatalkan sesi secara otomatis dengan status `dibatalkan` dan `cancel_source = 'tidak_ada'`.
   - Mengisi kolom `mode = 'tidak_ada'` dan mencatat ke `session_confirmations`.
   - Menghentikan pengingat konfirmasi (`next_reminder_at = NULL`).
   - Mengirim notifikasi `pembatalan_sesi` ke seluruh mahasiswa kelas dengan keterangan "Kelas tidak ada".
2. Secara otomatis membuat entitas kewajiban kelas pengganti di `tagihan_pengganti` (status `menunggu`, tenggat UTS/UAS), dan penagihan harian ke dosen dimulai saat itu juga.
3. Admin dapat memulihkan sesi asal lewat `admin_restore_session` hanya jika sesi pengganti belum berstatus `terjadwal`. Jika sesi asal dipulihkan, tagihan pengganti otomatis dibatalkan (`status = 'dibatalkan'`).

## Konsekuensi
- Menjamin hak mahasiswa atas pemenuhan $N$ pertemuan tatap muka tetap terjaga meskipun dosen berhalangan.
- Seluruh kode yang menerapkan logika ini ditandai dengan komentar `// TODO(keputusan A12)` untuk memudahkan penyesuaian jika ada revisi kebijakan dari pimpinan prodi.
