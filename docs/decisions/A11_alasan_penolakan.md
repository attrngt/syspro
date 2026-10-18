# ADR A11: Penolakan Pengajuan Jadwal Pengganti Wajib Disertai Alasan

- **Status:** Diterima / Final
- **Tanggal:** 14 Oktober 2026
- **Acuan:** PRD v2.2 Bagian A.1.7 poin 6 & A.1.13

## Konteks
Apabila Admin menolak usulan jadwal pengganti yang diajukan oleh dosen (misalnya karena ruangan penuh pada jam tersebut atau bertabrakan dengan kegiatan fakultas), dosen harus mengetahui alasan penolakan secara jelas agar dapat memilih waktu alternatif yang tepat.

## Keputusan
1. RPC `admin_tolak_pengganti(p_tagihan_id, p_alasan)` mewajibkan parameter `p_alasan` (tidak boleh kosong atau whitespace).
2. Alasan penolakan disimpan ke kolom `tagihan_pengganti.ditolak_alasan`.
3. Dosen menerima notifikasi bahwa usulan jadwal ditolak beserta keterangan alasan tersebut.
4. Pada halaman dosen `/dosen/tagihan`, kartu tagihan menampilkan alasan penolakan dengan jelas dan menyediakan tombol untuk mengajukan jadwal ulang.

## Konsekuensi
- Menjamin komunikasi transparan dan efisien antara Admin prodi dan dosen pengampu.
- Mengurangi siklus salah tebak waktu pengajuan ulang.
