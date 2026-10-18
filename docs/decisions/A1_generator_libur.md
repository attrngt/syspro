# ADR A1: Generator Membuat Sesi pada Tanggal Libur dan Membatalkannya

- **Status:** Diterima / Final
- **Tanggal:** 14 Oktober 2026
- **Acuan:** PRD v2.2 Bagian A.1.4 & A.1.13

## Konteks
Pada versi awal v2.1, generator sesi melewati (*skip*) tanggal libur perkuliahan (`is_libur_kuliah = true`) dan menggeser tanggal perkuliahan ke hari setelah tanggal selesai semester. Namun, pendekatan ini menimbulkan inkonsistensi jumlah pertemuan semesteran dan mengaburkan jejak histori kalender akademik.

## Keputusan
1. Generator sesi (`generate_sessions`) membentuk tepat $N$ pertemuan per kelas pada tanggal jadwal rutin kalender akademik tanpa melewati tanggal libur.
2. Sesi perkuliahan yang jatuh pada tanggal dengan flag `is_libur_kuliah = true` tetap dibuat dengan nomor pertemuan rutinnya, namun statusnya **langsung diset menjadi `dibatalkan`** dengan `cancel_source = 'libur'`.
3. Generator secara otomatis memanggil `buat_tagihan(session_id)` untuk setiap sesi yang dibatalkan tersebut, menghasilkan entitas kewajiban kelas pengganti di tabel `tagihan_pengganti`.
4. Mahasiswa terdaftar menerima notifikasi pembatalan sesi, dan dosen pengampu menerima notifikasi tagihan kelas pengganti.

## Konsekuensi
- Menjamin nomor pertemuan ($1..N$) tetap terpetakan secara utuh pada kalender akademik.
- Beban pengalihan pertemuan dialihkan ke mekanisme penjadwalan kelas pengganti oleh dosen pengampu dan admin.
