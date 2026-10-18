# ADR A9: Penghentian Penagihan Saat Pengajuan Diajukan

- **Status:** Diterima / Final
- **Tanggal:** 14 Oktober 2026
- **Acuan:** PRD v2.2 Bagian A.1.3 poin 3 & A.1.13

## Konteks
Setelah dosen mengajukan usulan jadwal kelas pengganti, tanggung jawab verifikasi dan penetapan ruangan berpindah ke pihak Admin. Dosen tidak boleh terus-menerus ditagih saat bola berada di tangan Admin.

## Keputusan
1. Penagihan harian ke dosen **seketika berhenti** saat dosen memanggil `ajukan_pengganti` dan status tagihan berubah menjadi `diajukan`.
2. Nilai `tagihan_pengganti.next_reminder_at` diatur menjadi `NULL`.
3. Admin menerima notifikasi pengajuan baru (`pengajuan_pengganti`) untuk segera ditinjau di `/admin/tagihan`.
4. Jika admin kemudian menolak pengajuan (`admin_tolak_pengganti`), status kembali menjadi `menunggu` dan penagihan harian kepada dosen diaktifkan kembali.

## Konsekuensi
- Menghindarkan dosen dari teguran/notifikasi tagihan yang tidak adil saat usulan jadwal sudah diajukan.
- Mendorong Admin untuk segera memproses pengajuan yang masuk.
