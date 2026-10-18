# ADR A10: Penetapan Lokasi Sesi (Ruangan / Tautan Online) oleh Admin

- **Status:** Diterima / Final
- **Tanggal:** 14 Oktober 2026
- **Acuan:** PRD v2.2 Bagian A.1.1 poin 18, A.1.7 poin 8, A.1.13

## Konteks
Setiap sesi perkuliahan memerlukan kepastian lokasi pelaksanaan, baik ruangan tatap muka fisik (misalnya "Lab Multimedia 302") maupun tautan daring (misalnya Google Meet / Zoom).

## Keputusan
1. Kolom `ruangan` (text) dan `link_online` (text) disimpan pada tabel `sessions`.
2. Admin dapat mengatur atau memperbarui lokasi sesi sewaktu-waktu melalui RPC `admin_set_lokasi_sesi(p_session_id, p_ruangan, p_link_online)`.
3. Minimal salah satu dari `ruangan` atau `link_online` harus diisi saat penetapan lokasi.
4. Setiap pembaruan lokasi memicu notifikasi `info_lokasi` yang dikirim ke dosen pengampu dan seluruh mahasiswa kelas yang terdaftar (`daftar_penerima_kelas`).
5. Pada antarmuka Admin `/admin/sesi`, sesi berstatus `online` yang belum memiliki tautan `link_online` akan menampilkan badge peringatan agar Admin segera melengkapi tautan tersebut.

## Konsekuensi
- Memastikan dosen dan mahasiswa selalu memperoleh informasi lokasi teraktual.
- Mencegah kebingungan mahasiswa pada perkuliahan online akibat ketiadaan tautan meeting.
