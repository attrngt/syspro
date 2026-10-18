# ADR A3: Perpindahan Kelompok Mahasiswa Wajib Lewat RPC Khusus dengan Alasan

- **Status:** Diterima / Final
- **Tanggal:** 14 Oktober 2026
- **Acuan:** PRD v2.2 Bagian A.1.6 & A.1.13, AGENTS.md Aturan 16

## Konteks
Perpindahan kelompok mahasiswa (misalnya dari Kelas 2025 A ke Kelas 2025 B) memengaruhi entitas `profiles.group_id`, data keanggotaan kelas pada `enrollments`, serta distribusi notifikasi perkuliahan. Operasi UPDATE langsung dari kode frontend berisiko merusak integritas relasi dan menghilangkan jejak audit.

## Keputusan
1. Dilarang mengubah `profiles.group_id` lewat operasi `UPDATE` langsung dari kode aplikasi.
2. Perpindahan kelompok **hanya dapat dilakukan oleh Admin** melalui RPC resmi `admin_pindah_kelompok(p_mahasiswa_id, p_group_baru_id, p_alasan)`.
3. Parameter `p_alasan` bersifat wajib (tidak boleh kosong atau hanya spasi).
4. RPC ini secara otomatis:
   - Memperbarui `profiles.group_id`.
   - Menghapus enrollment kelompok lama pada kelas semester aktif yang belum selesai.
   - Menambahkan enrollment kelompok baru untuk kelas-kelas kelompok tujuan.
   - Mencatat aksi pemindahan secara lengkap ke tabel `admin_logs` dengan aksi `pindah_kelompok`.

## Konsekuensi
- Menjamin audit trail lengkap atas alasan mutasi mahasiswa.
- Sinkronisasi enrollment dan hak notifikasi mahasiswa selalu konsisten.
