# ADR A8: Interval Pengiriman Penagihan Kelas Pengganti

- **Status:** Diterima / Final
- **Tanggal:** 14 Oktober 2026
- **Acuan:** PRD v2.2 Bagian A.1.3 & A.1.13

## Konteks
Penagihan kelas pengganti perlu menjaga konsistensi pengiriman agar dosen menyadari kewajiban yang belum dituntaskan tanpa menimbulkan gangguan notifikasi di luar jam kerja.

## Keputusan
1. Interval penagihan tagihan pengganti disetel tetap **1 kali sehari**.
2. Waktu pengiriman diselaraskan dengan batas akhir jam tenang, yaitu **pukul 06.30 WIB**.
3. Jika tagihan baru dibuat pada siang/sore hari dan sudah melewati H-1 sesi asal, notifikasi penagihan pertama dikirim segera (kecuali bila saat itu masuk jam tenang 21.00 - 06.30 WIB, maka ditunda ke 06.30 WIB).
4. Penagihan berikutnya selalu diatur pada `jam_penagihan_berikut` (yaitu esok harinya pada 06.30 WIB).

## Konsekuensi
- Mencegah spam notifikasi berkali-kali dalam satu hari kepada dosen.
- Menjaga kepatuhan pada aturan jam tenang (Quiet Hours) sistem.
