# ADR A5: Kewenangan Admin Menjadwalkan Langsung atas Nama Dosen

- **Status:** Diterima / Final
- **Tanggal:** 14 Oktober 2026
- **Acuan:** PRD v2.2 Bagian A.1.7 poin 7 & A.1.13

## Konteks
Terkadang dosen berhalangan mengajukan jadwal secara digital di sistem (misalnya sakit atau koordinasi dilakukan langsung lewat telepon/tatap muka dengan staf prodi), atau dosen mendekati hari tenggat tanpa sempat membuka aplikasi.

## Keputusan
1. Admin memiliki hak prerogatif untuk menjadwalkan kelas pengganti secara langsung melalui RPC `admin_jadwalkan_pengganti(p_tagihan_id, p_mulai_at, p_selesai_at, p_ruangan, p_link_online)`.
2. Fungsi ini tetap menjalankan validasi bentrok jadwal (`validasi_jadwal_pengganti`), membuat sesi pengganti baru, menetapkan lokasi (ruangan atau link), dan mengubah status tagihan menjadi `terjadwal`.
3. Notifikasi `jadwal_pengganti` dikirimkan secara serentak kepada dosen pengampu dan mahasiswa kelas.

## Konsekuensi
- Menghindari kemacetan operasional akademik (*operational bottleneck*) jika dosen lambat mengajukan.
- Tetap menjaga integritas jadwal karena validasi bentrok tetap diberlakukan secara ketat.
