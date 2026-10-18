# ADR A2: Batas Waktu Pengajuan dan Penjadwalan Kelas Pengganti

- **Status:** Diterima / Final
- **Tanggal:** 14 Oktober 2026
- **Acuan:** PRD v2.2 Bagian A.1.7 & A.1.13

## Konteks
Penjadwalan kelas pengganti tidak boleh dilakukan terlalu mendadak (yang menyulitkan mahasiswa untuk hadir) atau di luar rentang aktif semester akademik yang bersangkutan.

## Keputusan
1. Waktu mulai sesi pengganti (`mulai_at`) harus berjarak **minimal 2 jam** dari waktu pengajuan saat ini (`now() + interval '2 hours'`).
2. Waktu selesai sesi pengganti (`selesai_at`) harus berada sebelum atau tepat pada akhir tanggal semester aktif (`semesters.tanggal_selesai`).
3. Validasi ini diterapkan secara ketat di fungsi RPC database `validasi_jadwal_pengganti`.

## Konsekuensi
- Mencegah bentrok jadwal mendadak yang tidak realistis bagi mahasiswa dan dosen.
- Menjamin seluruh perkuliahan pengganti tuntas sebelum penutupan semester akademik resmi.
