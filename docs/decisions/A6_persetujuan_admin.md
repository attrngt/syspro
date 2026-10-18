# ADR A6: Pengajuan Jadwal Pengganti Wajib Disetujui Admin

- **Status:** Diterima / Final
- **Tanggal:** 14 Oktober 2026
- **Acuan:** PRD v2.2 Bagian A.1.3 poin 5, A.1.7 poin 5 & A.1.13

## Konteks
Ketika dosen mengajukan jadwal pengganti (`ajukan_pengganti`), usulan tersebut belum tentu dapat langsung terlaksana karena prodi perlu mengalokasikan ketersediaan ruangan fisik atau memverifikasi link online kelas.

## Keputusan
1. Pengajuan jadwal oleh dosen tidak otomatis membuat sesi perkuliahan aktif, melainkan mengubah status tagihan menjadi `diajukan`.
2. Admin wajib memeriksa dan menyetujui pengajuan tersebut melalui RPC `admin_setujui_pengganti(p_tagihan_id, p_ruangan, p_link_online)`.
3. Pada saat persetujuan, Admin **wajib mengisi minimal salah satu** informasi lokasi: `p_ruangan` (untuk tatap muka fisik) atau `p_link_online` (untuk perkuliahan daring).
4. Setelah disetujui, sesi pengganti konkret dibuat dan status tagihan berubah menjadi `terjadwal`.

## Konsekuensi
- Menghindari konflik alokasi ruangan fisik di kampus.
- Memastikan mahasiswa menerima informasi ruang/tautan yang valid saat menerima notifikasi sesi pengganti.
