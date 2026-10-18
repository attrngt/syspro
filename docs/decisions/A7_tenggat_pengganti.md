# ADR A7: Penentuan Waktu Tenggat (Deadline) Tagihan Pengganti

- **Status:** Diterima / Final
- **Tanggal:** 14 Oktober 2026
- **Acuan:** PRD v2.2 Bagian A.1.3 poin 4 & A.1.13

## Konteks
Kewajiban kelas pengganti harus memiliki batasan waktu penyelesaian yang tegas agar materi perkuliahan tidak tertinggal sebelum masa evaluasi ujian semester.

## Keputusan
1. Untuk sesi yang terpotong pada **pertemuan sebelum UTS** (pertemuan 1 sampai $\lfloor N/2 \rfloor - 1$):
   - Waktu tenggat (`tenggat_at`) adalah **waktu jam mulai sesi UTS kelas tersebut**.
2. Untuk sesi yang terpotong pada **pertemuan sesudah UTS** (pertemuan $\lfloor N/2 \rfloor + 1$ sampai $N - 1$):
   - Waktu tenggat (`tenggat_at`) adalah **waktu jam mulai sesi UAS kelas tersebut**.
3. Jika sesi UTS atau UAS itu sendiri yang terpotong karena libur:
   - Tenggat waktu adalah **jam mulai sesi UTS / UAS asal yang terpotong tersebut**.
4. Jika sampai batas `tenggat_at` dosen belum mengajukan jadwal atau admin belum menjadwalkan, cron mengubah status tagihan menjadi `kedaluwarsa`.

## Konsekuensi
- Menjamin mahasiswa telah menyelesaikan materi pengganti sebelum menghadapi ujian evaluasi (UTS/UAS).
- Memberikan kepastian status akademik bila kewajiban pengganti gagal dipenuhi hingga masa ujian.
