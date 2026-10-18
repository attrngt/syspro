# ADR A4: Penagihan Harian Tagihan Kelas Pengganti

- **Status:** Diterima / Final
- **Tanggal:** 14 Oktober 2026
- **Acuan:** PRD v2.2 Bagian A.1.3 poin 3, A.1.10, A.1.13

## Konteks
Dosen yang memiliki sesi kelas yang dibatalkan karena libur atau mode "Tidak Ada" wajib diingatkan secara teratur untuk mengajukan tanggal dan jam pengganti, namun tanpa membebani dosen dengan frekuensi spam.

## Keputusan
1. Penagihan kewajiban kelas pengganti (`tagihan_pengganti`) dikirim **satu kali per hari pada pukul 06.30 WIB**.
2. Penagihan pertama dimulai pada H-1 tanggal sesi asal (atau segera pada hari dibuat jika tagihan dibuat setelah H-1).
3. Penagihan terus dikirim setiap hari pada pukul 06.30 WIB sampai dan termasuk hari tenggat waktu (*deadline*).
4. Penagihan diatur oleh Edge Function `run-reminders` yang dipanggil rutin oleh `pg_cron`.

## Konsekuensi
- Notifikasi terstruktur, terprediksi, dan menghormati jam tenang (tidak dikirim pada malam hari).
- Memberikan visibilitas harian kepada dosen hingga kewajiban pengganti ditindaklanjuti.
