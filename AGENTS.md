# AGENTS.md: Instruksi untuk Agent Pengembang SysPro

> File ini adalah sumber kebenaran untuk agent AI di IDE (Antigravity, Cursor, Claude Code, dll.) dalam mengerjakan proyek **SysPro**. Baca seluruh file sebelum menulis kode. Jika ada instruksi dari chat yang bertentangan dengan file ini, tanyakan dulu sebelum mengubah perilaku sistem.
>
> Dokumen acuan lengkap: `docs/PRD.md` (v2.2). Jika ada konflik antara file ini dan PRD, PRD yang menang sampai ada keputusan tertulis, dan file ini harus diperbarui.

---

## 1. Identitas Proyek

- **Nama:** SysPro
- **Deskripsi:** PWA sistem informasi internal Program Studi Produksi Media untuk jadwal kuliah satu semester, konfirmasi mode kuliah (Online, Offline, Tidak Ada) oleh dosen atau admin, pembatalan sesi, dan tanggal libur perkuliahan. Mahasiswa dikelompokkan per angkatan dan kelompok (A, B, C).
- **Bahasa UI dan pesan ke pengguna:** Bahasa Indonesia.
- **Zona waktu tampilan:** Asia/Jakarta (WIB, UTC+7). Semua data waktu disimpan sebagai `timestamptz` (UTC).
- **Dokumen acuan:** `docs/PRD.md`, `docs/FLOW.md`, `docs/ERD.md`.

---

## 2. Stack Teknis (Wajib Dipatuhi)

| Lapisan | Teknologi |
|---|---|
| Frontend | React 18+, TypeScript (strict), Vite, `vite-plugin-pwa` (strategi `injectManifest`) |
| Routing | React Router |
| State server | TanStack Query (dengan persist ke IndexedDB) |
| Styling | Tailwind CSS (token warna di `src/styles/index.css`) |
| Validasi form dan input | Zod |
| Backend dan DB | Supabase (Postgres 15, Auth, RLS, Edge Functions, pg_cron, pg_net, Vault) |
| Notifikasi | Web Push (VAPID) via Service Worker, dikirim dari Edge Function |
| Deploy frontend | Vercel (framework preset: Vite) |
| Testing | Vitest (unit), pgTAP (RLS dan fungsi), Playwright (smoke test) |

**Jangan** menambahkan library baru tanpa alasan tertulis di pesan commit. **Jangan** memakai Next.js. Frontend adalah SPA. **Jangan** membuat API route di Vercel. Logika server ada di Supabase.

---

## 3. Aturan Wajib untuk Agent

1. **Jangan pernah** memasukkan `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY`, atau `CRON_SECRET` ke kode frontend, variabel `VITE_*`, atau commit.
2. **RLS wajib aktif** di setiap tabel di schema `public`. Tabel baru tanpa RLS dianggap bug.
3. **Logika mode, status, pembatalan, libur, pengelompokan, dan notifikasi hanya berjalan di server** (database function, pg_cron, Edge Function). Frontend hanya menampilkan dan mengirim niat.
4. **Jangan pernah mengubah `sessions.mode`, `sessions.status`, atau `sessions.cancelled_at` lewat UPDATE langsung.** Gunakan fungsi resmi yang menyetel `app.via_rpc` (PRD 8.5).
5. **Jangan mengubah aturan bisnis** di bagian 6 tanpa menandainya dan memperbarui PRD. Jika ragu, tanyakan.
6. **Jangan membuat fitur di luar cakupan v1** (bagian 14).
7. **Setiap perubahan skema** dibuat sebagai file migrasi baru di `supabase/migrations/` dengan format `YYYYMMDDHHMM_deskripsi.sql`. Jangan mengedit migrasi yang sudah pernah dijalankan.
8. **Setiap logika jam tenang, pengingat, default, pembatalan, dan generator sesi** wajib punya unit test atau pgTAP.
9. **TypeScript strict.** Tidak ada `any` tanpa komentar alasan.
10. **Pesan error login dan aktivasi selalu generik.** Jangan membocorkan apakah kode anggota terdaftar.
11. **Penamaan:** nama tabel dan kolom database mengikuti PRD (snake_case, campuran Bahasa Indonesia dan Inggris sesuai PRD). Kode TypeScript memakai Bahasa Inggris, camelCase atau PascalCase.
12. **Jangan menulis data pribadi ke log.** Log hanya memuat ID. Jangan pernah mencatat kode anggota lengkap atau password.
13. **Jangan mengasumsikan keputusan terbuka.** Gunakan `TODO(keputusan N)` atau `// ASSUMPTION:` (bagian 16).
14. **Jangan menulis jumlah mata kuliah, jumlah pertemuan, jumlah kelompok, atau jumlah mahasiswa sebagai konstanta** di kode atau migrasi. Nilai ini berasal dari data semester dan kelompok. Satu-satunya pengecualian adalah nilai default kolom `classes.jumlah_pertemuan` (16).
15. **Penerima notifikasi kelas selalu lewat `daftar_penerima_kelas(class_id)`**, yang membaca tabel `enrollments`. Jangan menulis join ke `profiles.group_id` untuk menentukan penerima. Enrollment dibuat otomatis dari kelompok, dan bisa ditambah manual untuk lintas kelompok.
16. **Perpindahan kelompok mahasiswa hanya lewat RPC `admin_pindah_kelompok`** dengan alasan wajib. Jangan mengubah `profiles.group_id` lewat UPDATE langsung dari kode aplikasi.

---

## 4. Peran dan Akses

| Peran | Cara login | Beranda | Kemampuan utama |
|---|---|---|---|
| `admin` | Email dan password di `/admin/login` | `/admin` | Kelola semester, angkatan, kelompok, mata kuliah, kelas, jadwal, anggota, libur. Pantau sesi. Konfirmasi dan ubah mode atas nama dosen. Batalkan dan pulihkan sesi. Pindah kelompok dan reset akses anggota. Lihat log. |
| `dosen` | Kode anggota 10 digit dan password di `/login` | `/dosen` | Lihat sesi mengajar untuk semua kelompok yang diampu. Konfirmasi dan ubah mode sebelum sesi dimulai. |
| `mahasiswa` | Kode anggota 10 digit dan password di `/login` | `/mahasiswa` | Lihat jadwal satu semester untuk kelompoknya sendiri. Lihat mode dan riwayat. Terima notifikasi. |

**Dashboard hanya untuk admin.** Dosen dan mahasiswa punya beranda sendiri (`/dosen` dan `/mahasiswa`).

Akses dikontrol dengan:
- Komponen `RequireAuth` dan `RequireRole` di `src/app/guards/`.
- Policy RLS di database. Guard frontend hanya untuk UX. Keamanan sebenarnya di RLS.

Setelah login, pengguna diarahkan ke beranda sesuai peran. Akses ke rute milik peran lain diarahkan ke beranda peran mereka atau halaman 403.

---

## 5. Peta Rute

**Publik**

| Rute | Fungsi |
|---|---|
| `/login` | Login kode anggota 10 digit dan password |
| `/aktivasi` | Aktivasi akun anggota |
| `/admin/login` | Login admin (email dan password) |

**Dosen** (`RequireRole: dosen`)

| Rute | Fungsi |
|---|---|
| `/dosen` | Beranda: sesi hari ini dengan status, tombol konfirmasi untuk yang menunggu |
| `/dosen/jadwal` | Seluruh pertemuan kelas yang diajar, per kelompok, tampilan minggu dan bulan |
| `/dosen/sesi/:id` | Detail sesi, pilih mode, simpan, riwayat |
| `/dosen/notifikasi` | Daftar notifikasi |

**Mahasiswa** (`RequireRole: mahasiswa`)

| Rute | Fungsi |
|---|---|
| `/mahasiswa` | Beranda: jadwal hari ini dan mode terkini untuk kelompoknya |
| `/mahasiswa/jadwal` | Jadwal satu semester, tampilan minggu (default) dan bulan |
| `/mahasiswa/sesi/:id` | Detail sesi dan riwayat (hanya lihat, termasuk keterangan pembatalan) |
| `/mahasiswa/notifikasi` | Daftar notifikasi dengan penanda belum dibaca |

**Bersama** (semua peran yang sudah login)

| Rute | Fungsi |
|---|---|
| `/profil` | Aktifkan notifikasi, panduan instal PWA (termasuk iOS), ganti password |

**Admin** (`RequireRole: admin`)

| Rute | Fungsi |
|---|---|
| `/admin` | Ringkasan: sesi hari ini, menunggu, default, dibatalkan, peringatan kekurangan pertemuan |
| `/admin/semester` | CRUD semester, tombol salin dari semester sebelumnya, generate sesi |
| `/admin/angkatan` | CRUD angkatan dan kelompok (A, B, C). Wajib ada sebelum import |
| `/admin/mata-kuliah` | CRUD mata kuliah |
| `/admin/kelas` | Kelas per semester: mata kuliah, kelompok (bisa banyak sekaligus), dosen, jadwal rutin, jumlah pertemuan N |
| `/admin/anggota` | Import CSV, filter per angkatan dan kelompok, statistik per kelompok, pindah kelompok, nonaktifkan, reset akses |
| `/admin/libur` | Tanggal merah dan libur, flag libur perkuliahan, pratinjau dampak |
| `/admin/sesi` | Pantau sesi, filter status, konfirmasi atas nama dosen, batalkan, pulihkan |
| `/admin/log` | Riwayat `admin_logs` |

---

## 6. Aturan Bisnis (Sumber Kebenaran)

Ringkasan. Detail ada di PRD bagian 5.

### 6.1 Mode Kuliah

- Nilai: `online`, `offline`, `tidak_ada`. Label: Online, Offline, Tidak Ada.
- `mode = null` berarti belum ada mode, tampil sebagai "Menunggu".
- `mode_source`: `dosen`, `admin`, atau `default`.

### 6.2 Konfirmasi dan Perubahan

- Dosen pengampu kelas atau admin dapat mengonfirmasi dan mengubah mode **sebelum** `mulai_at`.
- Setiap perubahan mode menulis satu baris ke `session_confirmations`. Tidak boleh diubah atau dihapus.
- Mode sama dengan sebelumnya: tidak ada riwayat dan tidak ada notifikasi.
- Konfirmasi pertama memicu `konfirmasi_mode`. Perubahan berikutnya, termasuk dari default, memicu `ubah_mode` berjudul "Diubah".
- Dosen hanya mengonfirmasi kelas yang ia ajar dan sesi yang belum mulai. Tidak ada tombol massal lintas kelas. Pengingat H-1 mengikuti 6.4, per sesi.

### 6.3 Default Mode

- Default adalah **Offline**.
- Hanya berlaku jika tidak ada konfirmasi dari dosen maupun admin sampai cutoff (`mulai_at - 1 jam`).
- Dijalankan lewat `apply_default_mode(id)`. Fungsi ini idempotent.
- Menghasilkan `mode_default` ke mahasiswa kelompok kelas dan masuk ringkasan admin.

### 6.4 Pengingat ke Dosen

| Parameter | Nilai |
|---|---|
| Pengingat pertama | `mulai_at - 24 jam`, tepat pada jam mulai |
| Interval | 5 jam |
| Cutoff | `mulai_at - 1 jam` |
| Penerima | Dosen pengampu kelas (`classes.dosen_id`) |

Sesi dibuat kurang dari 24 jam sebelum mulai: pengingat pertama segera (atau 06.30 jika jam tenang).

### 6.5 Jam Tenang

- **21.00 sampai 06.30 WIB.** Push tidak dikirim. Notifikasi tetap masuk ke `notifications`.
- Slot pengingat yang jatuh di jam tenang digeser ke 06.30 WIB.
- Berlaku untuk semua penerima dan tipe notifikasi.
- Hanya lewat fungsi `isQuietHour` dan `nextAllowedPushTime` di `_shared/quiet-hours.ts`.

### 6.6 Pembatalan Sesi

- Hanya admin, lewat RPC `admin_cancel_session`. Pengecualian: mode "Tidak Ada" oleh dosen atau admin lewat `set_session_mode` juga membatalkan sesi (`cancel_source = 'tidak_ada'`) dan membuat tagihan pengganti (A.1.14).
- Hanya untuk sesi yang belum mulai dan belum `dibatalkan` atau `selesai`.
- Keterangan opsional. Jika diisi, masuk ke isi notifikasi.
- Efek: `status = 'dibatalkan'`, `next_reminder_at = null`, sesi tidak bisa dikonfirmasi atau diubah.
- Notifikasi `pembatalan_sesi` ke mahasiswa kelompok kelas. Log `batalkan_sesi`.

### 6.7 Pemulihan Sesi

- Hanya admin, lewat RPC `admin_restore_session`.
- Ditolak jika `mulai_at` sudah lewat, atau jika `cancel_source = 'libur'` dan tanggal masih berflag libur perkuliahan.
- Status kembali: `menunggu`, `default_offline`, atau `terkonfirmasi`, sesuai kondisi sebelumnya.
- Notifikasi `pemulihan_sesi`. Log `pulihkan_sesi`.

### 6.8 Tanggal Merah dan Libur

- Tanggal merah dicatat manual di `holidays` dengan keterangan wajib.
- **Sistem tidak membaca kalender nasional.** Tanggal merah saja tidak membatalkan sesi.
- Hanya `is_libur_kuliah = true` yang membatalkan sesi, lewat RPC `admin_upsert_holiday`.
- Sesi yang sudah berlangsung tidak terpengaruh.
- Mematikan flag atau menghapus libur **tidak** memulihkan sesi otomatis.
- Admin selalu melihat pratinjau (`admin_preview_libur`) sebelum menyimpan libur dengan flag.
- Setiap sesi yang dibatalkan karena libur membuat satu **tagihan pengganti** (`tagihan_pengganti`) untuk dosen pengampu. Penagihan dikirim sekali per hari WIB pada pukul 06.30, mulai H-1 sesi asal (atau segera jika tagihan dibuat setelah itu), sampai dan termasuk hari tenggat. Tenggat adalah jam mulai UTS untuk pertemuan sebelum UTS, dan jam mulai UAS untuk pertemuan sesudah UTS. Penagihan berhenti saat dosen mengajukan (`diajukan`).
- Dosen mengajukan kelas pengganti lewat `ajukan_pengganti`. Pengajuan wajib disetujui admin lewat `admin_setujui_pengganti`, yang juga mengisi ruangan atau link online. Admin dapat menolak lewat `admin_tolak_pengganti` dengan alasan wajib, atau menjadwalkan langsung lewat `admin_jadwalkan_pengganti`.
- Setiap sesi punya `ruangan` atau `link_online` yang ditetapkan admin lewat `admin_set_lokasi_sesi`. Perubahan lokasi dikirim sebagai `info_lokasi` ke dosen dan mahasiswa kelas.
- Jadwal pengganti tidak boleh bentrok dengan kelas lain dosen maupun kelas lain yang diikuti mahasiswa kelas tersebut. Sesi pengganti memakai `pertemuan_ke` yang sama dengan sesi asal.

### 6.9 Pengingat ke Admin

- Sesi yang memakai default masuk ringkasan. Dikirim sekali per hari pada run pertama setelah 06.30 WIB.
- Sesi dibatalkan tidak memicu default, ringkasan, atau eskalasi.

### 6.10 Zona Waktu

- Simpan semua waktu sebagai `timestamptz` (UTC).
- Hitung hari dan jam rutin di `Asia/Jakarta` saat membuat sesi.
- Tampilan selalu WIB. Gunakan `format_tanggal_jam_id` di database dan `lib/time.ts` di frontend.

### 6.11 Angkatan dan Kelompok

- Angkatan persisten lintas semester. Kelompok (A, B, C, dst.) terikat pada angkatan. Jumlah kelompok tidak dikunci.
- Setiap mahasiswa punya tepat satu `profiles.group_id`. Dosen dan admin tidak punya.
- Import CSV tidak membuat angkatan atau kelompok. Baris yang merujuk kelompok yang belum ada ditolak.
- Mahasiswa hanya melihat dan menerima notifikasi untuk kelas dengan `group_id` yang sama.
- Pindah kelompok hanya lewat `admin_pindah_kelompok` dengan alasan wajib.

### 6.12 Jumlah Pertemuan dan Generator

- Setiap kelas punya `jumlah_pertemuan` (N). Default 16. Admin mengubahnya per kelas.
- Setiap sesi punya `pertemuan_ke` (1..N) dan `jenis` (`reguler`, `uts`, `uas`, `pengganti`).
- Generator membuat **tepat N** sesi per kelas pada tanggal jadwal rutin. Generator tidak melewati tanggal libur. Sesi pada tanggal libur berflag langsung dibatalkan dan membuat tagihan pengganti.
- Generator hanya dijalankan sebelum `tanggal_mulai` semester dan hanya sekali per semester.
- Satu kelas dengan dua jadwal per minggu mendapat N total.
- UTS di pertemuan ke-⌊N/2⌋ (`jenis = 'uts'`). UAS di pertemuan ke-N (`jenis = 'uas'`). Keduanya termasuk dalam N.
- Nomor pertemuan sesi yang dibatalkan tetap dihitung. Sesi pengganti mewarisi nomor sesi asal.
- `TODO(konfirmasi A1)`: generator membuat sesi pada tanggal libur lalu membatalkannya. Ini mengubah aturan lama "tanggal libur tidak menghasilkan sesi".
- `TODO(konfirmasi A2)`: batas kelas pengganti (minimal 2 jam dari sekarang, sebelum akhir semester).

---

## 7. Autentikasi

### 7.1 Anggota (Dosen dan Mahasiswa)

- Kode 10 digit adalah **identifier**, bukan rahasia. Login selalu kode dan password.
- Email sintetis: `{kode}@anggota.internal`. Tidak pernah dikirimi surat.
- Admin mengimpor anggota via CSV dengan kolom: `kode, nama, peran, nim_nidn, angkatan, kelas`.
  - Mahasiswa: `angkatan` dan `kelas` wajib, dan harus sudah terdaftar di `cohorts` dan `student_groups`.
  - Dosen: `angkatan` dan `kelas` harus kosong.

**Aktivasi (`/aktivasi`):**
1. Anggota memasukkan kode 10 digit.
2. Edge Function `activate-member` memeriksa: kode ada di `members`, `aktif = true`, dan belum punya `auth_user_id`.
3. Jika lolos, anggota membuat password. Function membuat `auth.users`, mengisi `profiles.auth_user_id` dan `members.activated_at`.
4. Jika tidak lolos, pesan generik: "Kode atau status tidak valid."

**Login (`/login`):** `signInWithPassword({ email: kode + '@anggota.internal', password })`. Frontend hanya menampilkan kolom kode dan password.

**Pembatasan percobaan:** gagal lebih dari 5 kali dalam 15 menit untuk satu kode atau IP, kunci sementara 15 menit.

**Sesi:** 30 hari dengan refresh token.

### 7.2 Reset Akses

- Hanya admin. Anggota tidak bisa reset sendiri.
- Edge Function `admin-reset-member` menerima `member_id` dan `alasan`. Alasan wajib.
- Menghapus `auth.users` terkait, mengosongkan `auth_user_id` dan `activated_at`, mencatat ke `admin_logs`.

### 7.3 Admin

- Login email dan password di `/admin/login`.
- Akun dibuat manual (Dashboard atau seed). Tidak memakai kode anggota.
- Role disimpan di `profiles.role` dan dicek di RLS.

---

## 8. Model Data

Detail lengkap di PRD bagian 8.

| Tabel | Fungsi | Kolom penting |
|---|---|---|
| `members` | Daftar resmi anggota | `kode`, `nama`, `peran`, `aktif`, `activated_at` |
| `profiles` | Profil terhubung ke `auth.users` | `auth_user_id`, `member_id`, `role`, `nama`, `group_id` |
| `cohorts` | Angkatan | `tahun` (unik), `nama`, `aktif` |
| `student_groups` | Kelompok dalam angkatan | `cohort_id`, `nama` (unik per angkatan) |
| `semesters` | Periode semester | `tanggal_mulai`, `tanggal_selesai`, `aktif` |
| `courses` | Mata kuliah | `kode`, `nama`, `sks` |
| `classes` | Mata kuliah × semester × kelompok | `course_id`, `semester_id`, `group_id`, `dosen_id`, `jumlah_pertemuan` |
| `class_schedules` | Jadwal rutin | `class_id`, `hari` (0 = Minggu), `jam_mulai`, `jam_selesai` |
| `holidays` | Tanggal merah dan libur | `tanggal`, `keterangan`, `is_libur_kuliah` |
| `sessions` | Pertemuan konkret | `class_id`, `pertemuan_ke`, `jenis`, `mode`, `mode_source`, `status`, `cutoff_at`, `next_reminder_at`, `reminder_count`, `cancelled_*`, `restored_at` |
| `session_confirmations` | Riwayat mode (append-only) | `session_id`, `actor_id`, `actor_role`, `mode_lama`, `mode_baru`, `sumber` |
| `notifications` | Inbox per pengguna | `user_id`, `session_id`, `tipe`, `judul`, `isi`, `read_at`, `push_sent_at` |
| `push_subscriptions` | Perangkat untuk Web Push | `profile_id`, `endpoint`, `p256dh`, `auth` |
| `admin_logs` | Log aksi admin | `actor_id`, `aksi`, `target_tipe`, `target_id`, `detail` |
| `login_attempts` | Pembatasan percobaan | `kode_or_ip`, `success` (service role saja) |

| `enrollments` | Penerima dan akses kelas (sumber: `kelompok` atau `manual`) | `class_id`, `mahasiswa_id`, `sumber` |
| `tagihan_pengganti` | Kewajiban dosen mengajukan kelas pengganti | `session_id`, `class_id`, `dosen_id`, `pertemuan_ke`, `status` (`menunggu`, `diajukan`, `terjadwal`, `kedaluwarsa`), `tenggat_at`, `next_reminder_at`, `usulan_*`, `session_pengganti_id` |

**Nilai `sessions.status`:** `menunggu`, `terkonfirmasi`, `default_offline`, `dibatalkan`, `selesai`.
**Nilai `sessions.jenis`:** `reguler`, `uts`, `uas`. Penanda sesi pengganti adalah `pengganti_dari_id` yang terisi.
**Nilai `sessions.cancel_source`:** `admin`, `libur`.
**Nilai `notifications.tipe`:** `pengingat_dosen`, `konfirmasi_mode`, `ubah_mode`, `mode_default`, `ringkasan_admin`, `pembatalan_sesi`, `pemulihan_sesi`, `tagihan_pengganti`, `jadwal_pengganti`, `pengajuan_pengganti`, `info_lokasi`.
**Nilai `admin_logs.aksi` yang dipakai:** `generate_sesi`, `salin_semester`, `pindah_kelompok`, `set_mode`, `batalkan_sesi`, `batalkan_sesi_libur`, `pulihkan_sesi`, `set_libur`, `hapus_libur`, `reset_akses`, `import_anggota`, `ringkasan_admin_terkirim`.

**Indeks wajib:**
- `sessions (next_reminder_at)` parsial untuk status `menunggu` dan mode null.
- `sessions (mulai_at)`, `sessions (class_id)`, `sessions (tanggal)`.
- `profiles (group_id)`.
- `classes (semester_id, group_id)`.
- `class_schedules (class_id)`.
- `members (kode)` unik.

**Helper penting (jangan diduplikasi di kode lain):**
- `daftar_penerima_kelas(class_id)`: penerima notifikasi kelas.
- `mahasiswa_ikut_kelas(class_id)`: dipakai di RLS.
- `nama_kelompok(class_id)`: label "2025 A" untuk notifikasi.
- `format_tanggal_jam_id(timestamptz)`: format tanggal Indonesia.

**Trigger penting:**
- `guard_session_mode`: melindungi `mode`, `status`, `cancelled_at`.
- `session_confirmations_immutable`: menolak UPDATE dan DELETE.

---

## 9. Scheduler dan Notifikasi (Server)

### 9.1 Cron

- pg_cron memanggil Edge Function `run-reminders` setiap **5 menit** dengan header `x-cron-secret`.
- Satu run melakukan: (a) pengingat dosen, (b) default saat cutoff, (c) status selesai, (d) penagihan harian tagihan pengganti, (e) tenggat terlewat dan kedaluwarsa tagihan, (f) ringkasan admin pada pagi hari.

### 9.2 Logika Inti (Pseudocode)

Implementasi di `supabase/functions/_shared/reminder-policy.ts` sebagai fungsi murni.

```
pilih sesi dengan status = 'menunggu', mode IS NULL, next_reminder_at <= now()
  FOR UPDATE SKIP LOCKED

untuk setiap sesi:
  jika now >= cutoff_at:
      panggil apply_default_mode(id)
      lanjut

  jika now < mulai_at - 24 jam:
      lewati
      lanjut

  jika isQuietHour(now):
      next_reminder_at = nextAllowedPushTime(now)
      jika next_reminder_at >= cutoff_at: next_reminder_at = null
      lanjut

  buat notifikasi pengingat_dosen untuk classes.dosen_id
  reminder_count += 1

  berikutnya = now + 5 jam
  jika berikutnya >= cutoff_at: next_reminder_at = null
  sebaliknya:
      jika isQuietHour(berikutnya): berikutnya = nextAllowedPushTime(berikutnya)
      jika berikutnya >= cutoff_at: next_reminder_at = null
      sebaliknya: next_reminder_at = berikutnya
```

Pekerjaan lain dalam satu run:
- Sesi dengan `selesai_at < now()` dan status `terkonfirmasi`, `default_offline`, atau `menunggu` diubah menjadi `selesai` lewat fungsi resmi.
- Ringkasan admin dikirim sekali per hari pada run pertama setelah 06.30 WIB.

Sesi `dibatalkan` tidak pernah masuk kueri karena filter `status = 'menunggu'`.

### 9.3 Fan-Out Notifikasi

- Penerima kelas **selalu** diambil dari `daftar_penerima_kelas(class_id)`.
- Fan-out dilakukan dalam satu transaksi di fungsi resmi.
- Fungsi yang memakai pola ini: `set_session_mode`, `batalkan_sesi_internal`, `apply_default_mode`, `admin_restore_session`.

### 9.4 Pengiriman Push (`send-push`)

- Jika `isQuietHour(now)`, kembalikan `{ skipped: true }`. Notifikasi tetap di inbox.
- Kirim dalam batch 50 subscription per panggilan. Kegagalan per endpoint dicatat per ID notifikasi, tanpa menghentikan batch.
- Respons 404 atau 410: hapus subscription.
- Set `push_sent_at` setelah berhasil. Lewati yang sudah punya `push_sent_at`.

### 9.5 Kasus Uji Wajib

Lihat PRD bagian 15.2 dan 15.3. Kasus minimal:

| Kasus | Ekspektasi |
|---|---|
| Sesi 08.00, sekarang H-1 08.00 | Pengingat pertama dibuat |
| Sesi 08.00, sekarang H-1 23.00 | Tidak ada push, slot digeser ke 06.30 |
| Sesi 08.00, sekarang H 07.00 | Default Offline, tidak ada pengingat |
| Sesi dibatalkan, `next_reminder_at` lama | Tidak ada pengingat |
| Sesi dibatalkan karena libur, cron jalan | Tidak ada notifikasi, tidak ada default |
| Sesi dipulihkan, mode null, sudah lewat cutoff | Default berlaku run berikutnya |
| Dua run cron bersamaan | Tidak ada pengingat atau default ganda |
| Libur ditetapkan, 3 belum mulai dan 1 sudah mulai | Hanya 3 dibatalkan |
| Konfirmasi kelompok A | Mahasiswa kelompok B tidak menerima notifikasi |
| Generator kelas dengan N = 16 | Tepat 16 sesi, `pertemuan_ke` 1..16 |
| Generator dengan libur memotong jadwal | Total tetap N (opsi 14a) |

---

## 10. Keamanan (RLS)

| Tabel | Siapa bisa SELECT | Siapa bisa INSERT/UPDATE/DELETE |
|---|---|---|
| `profiles` | Pemilik, admin | Service role (insert). Pemilik update `nama`. Admin pindah kelompok lewat RPC. |
| `members` | Admin | Admin |
| `cohorts`, `student_groups` | Semua yang login | Admin |
| `semesters`, `courses`, `classes`, `class_schedules` | Semua yang login | Admin |
| `holidays` | Semua yang login | Hanya lewat RPC admin |
| `sessions` | Admin, dosen pengampu, mahasiswa kelompok kelas (`mahasiswa_ikut_kelas`) | Hanya lewat fungsi resmi. Tidak ada UPDATE langsung. |
| `session_confirmations` | Admin, dosen pengampu, mahasiswa kelompok kelas | Hanya lewat fungsi. Tidak ada UPDATE/DELETE. |
| `notifications` | Pemilik | Lewat fungsi. Pemilik hanya update `read_at`. |
| `push_subscriptions` | Pemilik | Pemilik |
| `admin_logs` | Admin | Lewat fungsi |
| `login_attempts` | Tidak ada | Service role saja |

**Aturan pengujian:** setiap policy wajib punya pgTAP yang mencoba akses dari empat peran (admin, dosen, mahasiswa, anonim). Harus lulus sebelum merge.

**Fungsi `SECURITY DEFINER`** (`search_path` dikunci, grant hanya ke `authenticated` kecuali yang disebut): `set_session_mode`, `admin_cancel_session`, `admin_restore_session`, `admin_upsert_holiday`, `admin_delete_holiday`, `admin_copy_semester`, `admin_pindah_kelompok`, `generate_sessions`. `apply_default_mode`, `batalkan_sesi_internal`, dan `daftar_penerima_kelas` tidak diberi grant ke `authenticated`.

---

## 11. Frontend: Konvensi

### 11.1 Struktur Folder

```
src/
├── main.tsx
├── App.tsx
├── sw.ts                        service worker (injectManifest)
├── app/
│   ├── router.tsx
│   ├── guards/                  RequireAuth.tsx, RequireRole.tsx, GuestOnly.tsx
│   └── providers/               AuthProvider.tsx, QueryProvider.tsx, ToastProvider.tsx
├── layouts/
│   ├── AppShell.tsx             bottom nav (dosen dan mahasiswa)
│   ├── AdminLayout.tsx          sidebar desktop (admin)
│   ├── AuthLayout.tsx
│   └── OfflineBanner.tsx
├── features/
│   ├── auth/                    LoginPage, ActivatePage, AdminLoginPage, useSession, useLogin
│   ├── lecturer/                LecturerHomePage, LecturerSchedulePage, SessionConfirmPage,
│   │                            ModeSelector, SessionCard (dengan label kelompok), useLecturerSessions,
│   │                            useSetSessionMode
│   ├── student/                 StudentHomePage, StudentSchedulePage, StudentSessionPage,
│   │                            WeekView, MonthView, SessionCard, useStudentSessions
│   ├── notifications/           NotificationListPage, NotificationItem, useNotifications,
│   │                            useMarkRead, usePushSubscription
│   ├── profile/                 ProfilePage, InstallGuide, ChangePasswordForm, NotificationToggle
│   └── admin/
│       ├── AdminHomePage.tsx
│       ├── semesters/           SemesterListPage, SemesterForm, CopySemesterDialog,
│       │                        useSemesters, useGenerateSessions
│       ├── cohorts/             CohortListPage, StudentGroupEditor, useCohorts
│       ├── courses/             CourseListPage, CourseForm, useCourses
│       ├── classes/             ClassListPage, ClassForm (pilih banyak kelompok sekaligus),
│       │                        ScheduleEditor, useClasses
│       ├── members/             MemberListPage, ImportCsv, GroupStatsPanel,
│       │                        PindahKelompokDialog, ResetAccessDialog, useMembers
│       ├── holidays/            HolidayPage, HolidayForm, HolidayPreview, useHolidays
│       ├── sessions/            AdminSessionsPage, SessionTable, CancelSessionModal,
│       │                        RestoreSessionButton, AdminModeDialog, KekuranganBanner, useAdminSessions
│       └── logs/                AdminLogPage, useAdminLogs
├── components/ui/               Button, Card, Badge, StatusBadge, Modal, Input, Select,
│                                Skeleton, Table, EmptyState
├── lib/
│   ├── supabase.ts              client (anon key saja)
│   ├── push.ts
│   ├── time.ts                  format WIB
│   ├── csv.ts
│   ├── errors.ts                mapping pesan error RPC ke copy
│   └── copy.ts                  semua teks UI
├── types/
│   ├── database.types.ts        hasil `supabase gen types`, jangan diedit manual
│   └── domain.ts
├── schemas/                     auth, holiday, session, member, cohort (Zod)
├── styles/index.css
└── test/                        setup.ts, fixtures.ts
supabase/
├── migrations/                  satu file per perubahan
├── functions/
│   ├── _shared/                 cors.ts, supabase-admin.ts, validate.ts, quiet-hours.ts,
│   │                            reminder-policy.ts, *.test.ts
│   ├── activate-member/
│   ├── admin-import-members/
│   ├── admin-reset-member/
│   ├── run-reminders/
│   └── send-push/
├── seed.sql
└── tests/                       pgTAP: rls/, functions/, helpers/
docs/
├── PRD.md
├── FLOW.md
├── ERD.md
├── BACKLOG.md
└── decisions/
```

### 11.2 Aturan Kode Frontend

- Akses data **hanya lewat hook** di `features/*/use*.ts` yang memakai TanStack Query. Komponen tidak memanggil `supabase.from()` langsung.
- Perubahan mode, pembatalan, pemulihan, libur, salin semester, dan pindah kelompok **hanya lewat `supabase.rpc(...)`** dari hook.
- Komponen di `components/ui/` tidak boleh mengimpor `lib/supabase.ts`.
- Semua format tanggal dan jam lewat `lib/time.ts`. Jangan memakai `toLocaleString()` langsung.
- Semua teks UI di `lib/copy.ts`.
- Target sentuh minimal 44 px. Kontras WCAG AA.
- Mobile-first. Admin desktop-first tetapi tetap usable di tablet.
- Label kelompok di UI selalu dibentuk dari data, misalnya "Kelas 2025 A". Jangan menulis "A" atau "2025" sebagai konstanta.

### 11.3 Desain Minimalis

- Monokrom. Satu warna aksen per status.
- Status: Online (biru solid), Offline (hijau solid), Tidak Ada (abu-abu solid), Menunggu (kuning outline), Default Offline (hijau outline putus-putus), Dibatalkan (teks dicoret, abu-abu).
- Satu tindakan utama per layar.
- Tanpa gradien, bayangan tebal, atau animasi tidak perlu.

### 11.4 PWA

- `vite-plugin-pwa` dengan strategi `injectManifest` (`src/sw.ts`).
- `registerType: 'prompt'`, dengan banner "Versi baru tersedia. Muat ulang".
- Ikon 192, 512, maskable, dan apple-touch-icon.
- Offline: shell dan data terakhir, dengan label "Data terakhir diperbarui {waktu}". Aksi tulis dinonaktifkan saat offline.
- Permintaan izin notifikasi **hanya** lewat tombol "Aktifkan notifikasi".

### 11.5 Vercel

- `vercel.json` berisi rewrite SPA dan header `no-cache` untuk `sw.js`.
- Environment variable: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`.

---

## 12. Backend: Konvensi

### 12.1 Aturan Edge Function

- Setiap function memvalidasi input dengan Zod.
- Function yang memerlukan login memeriksa JWT.
- Function admin memeriksa `profiles.role = 'admin'` dari JWT, bukan dari body.
- `run-reminders` memeriksa `x-cron-secret`. Tanpa header yang benar, respons 401.
- `admin-import-members` memvalidasi angkatan dan kelompok terhadap tabel `cohorts` dan `student_groups`. Tidak membuat data master baru.
- Log hanya memuat ID. Tidak ada kode lengkap atau password.

### 12.2 Aturan Migrasi

- Nama file: `YYYYMMDDHHMM_deskripsi.sql`.
- Satu migrasi per perubahan logis.
- Fungsi diperbarui dengan `create or replace`, bukan dengan mengedit migrasi lama.
- Sebelum migrasi yang mengubah constraint, verifikasi nama constraint dengan `\d`.
- Migrasi yang menghapus `enrollments` harus dijalankan setelah semua policy yang memakainya diganti.

### 12.3 Seed dan Data Dummy

- Seed: 1 angkatan (2025), kelompok A/B/C, 1 semester aktif, 9 mata kuliah, 27 kelas, 150 mahasiswa dummy, 2 dosen, 1 admin, 2 tanggal libur (satu dengan flag).
- Kode dummy diawali `9`, misalnya `9000000001`.
- Seed tidak boleh berisi data asli.

---

## 13. Lingkungan dan Rahasia

| Variabel | Tempat | Boleh di frontend? |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env.local`, Vercel | Ya |
| `VITE_SUPABASE_ANON_KEY` | `.env.local`, Vercel | Ya |
| `VITE_VAPID_PUBLIC_KEY` | `.env.local`, Vercel | Ya |
| `SUPABASE_SERVICE_ROLE_KEY` | Otomatis di Edge Function | **Tidak** |
| `VAPID_PRIVATE_KEY` | Secret Edge Function | **Tidak** |
| `VAPID_SUBJECT` | Secret Edge Function | **Tidak** |
| `CRON_SECRET` | Secret Edge Function dan Vault | **Tidak** |

- `.env.example` berisi nama variabel tanpa nilai. Wajib ada di repo.
- `.env.local`, `supabase/.env.local`, dan file rahasia lain wajib ada di `.gitignore`.

---

## 14. Di Luar Cakupan v1 (Jangan Dikerjakan)

- Absensi mahasiswa
- Nilai dan KRS
- Pemesanan ruangan (kecuali ada keputusan tambah tabel `rooms`)
- Integrasi SIAKAD atau kalender nasional
- Notifikasi via email atau WhatsApp
- Filter jadwal per mata kuliah (ditunda ke v1.1)
- Reset password mandiri oleh anggota
- Verifikasi dua langkah admin
- Undang admin lewat UI
- Tombol "terapkan ke semua kelompok" di detail sesi dosen (ditolak, lihat keputusan final 18)

Jika ada permintaan di luar daftar ini, catat di `docs/BACKLOG.md` dan jangan implementasikan.

---

## 15. Keputusan yang Sudah Final

Jangan diubah tanpa instruksi tertulis.

1. Dashboard hanya untuk admin. Dosen dan mahasiswa punya beranda sendiri.
2. Jam tenang 21.00 sampai 06.30 WIB. Push ditunda, inbox tetap terisi.
3. Default mode Offline, hanya berlaku jika tidak ada konfirmasi sampai cutoff.
4. Admin boleh mengonfirmasi dan mengubah mode atas nama dosen.
5. Reset akses hanya oleh admin, dengan alasan wajib.
6. Pengingat dimulai H-1 pada jam yang sama dengan jam mulai, berulang setiap 5 jam sampai H-1 jam.
7. Login anggota memakai kode dan password. Kode tidak pernah dipakai sendirian.
8. Vite + React SPA, bukan Next.js.
9. Libur tidak membatalkan sesi otomatis. Hanya flag `is_libur_kuliah` yang berpengaruh.
10. Pembatalan dan pemulihan sesi hanya oleh admin. Keduanya tercatat di `admin_logs`.
11. Mematikan flag atau menghapus libur tidak memulihkan sesi otomatis.
12. Tanggal merah tidak dibaca dari kalender nasional. Semua dicatat manual.
13. Mahasiswa dikelompokkan per angkatan dan kelompok (A, B, C). Kelompok menentukan kelas dan penerima notifikasi. Tabel `enrollments` dihapus dari v1.
14. Jumlah pertemuan N disimpan per kelas dengan default 16. Tidak dikunci sebagai konstanta. Generator membuat tepat N per kelas.
15. Salin konfigurasi dari semester sebelumnya tersedia. Tanggal dan sesi tidak ikut disalin.
16. Libur yang memotong jadwal menghasilkan tagihan pengganti untuk dosen. Dosen menjadwalkan sendiri, tanpa geser otomatis. Pengganti mewarisi nomor pertemuan sesi asal. Penagihan harian pukul 06.30 WIB sampai hari tenggat UTS atau UAS, berhenti saat diajukan. Pengajuan wajib disetujui admin, yang juga menetapkan ruangan atau link online.
17. UTS di pertemuan ke-⌊N/2⌋ dan UAS di pertemuan ke-N. Keduanya termasuk dalam N.
18. Dosen hanya mengonfirmasi kelas yang ia ajar dan sesi yang belum mulai. Tidak ada konfirmasi massal lintas kelas.
19. Enrollment adalah sumber akses dan penerima notifikasi. Enrollment awal dibuat dari kelompok, dan bisa ditambah manual untuk lintas kelompok.
20. Kelas pengganti minimal 2 jam dari sekarang dan harus sebelum akhir semester.
21. Mode "Tidak Ada" oleh dosen atau admin membatalkan sesi dan membuat tagihan pengganti, sama seperti libur.

---

## 16. Keputusan yang Masih Terbuka

Jika agent menemui kasus yang bergantung pada keputusan berikut, **tanyakan dulu**. Jangan mengasumsikan. Tulis asumsi dengan `// ASSUMPTION:` atau `TODO(keputusan N):`.

1. Pembatalan mendesak di jam tenang: apakah boleh push dikecualikan?
2. Keterangan pembatalan manual: wajib atau opsional?
3. Dosen perlu notifikasi saat sesinya dibatalkan atau terkena libur?
4. Pemulihan sesi: perlu alasan tertulis?
5. Mahasiswa melihat riwayat mode sebelum pembatalan di detail sesi?
6. Dosen memilih mode sama dengan default: `mode_source` tetap `default` atau berubah ke `dosen`?
7. Notifikasi mahasiswa di jam tenang: push ditunda atau in-app saja?
8. Sesi praktik dan teori di hari yang sama: terpisah atau digabung?
9. Perlu tabel `rooms`?
10. Admin boleh mengubah jam satu sesi tanpa mengubah jadwal rutin?
11. **Konfirmasi A12:** mode "Tidak Ada" membatalkan sesi otomatis dan membuat tagihan pengganti. A1 sampai A11 sudah dikonfirmasi.

---

## 17. Urutan Kerja yang Disarankan

Kerjakan berurutan. Jangan melompati fase.

| Fase | Output | Selesai jika |
|---|---|---|
| 0. Setup | Repo, Vite PWA, Supabase staging, Vercel preview, lint, typecheck | Build dan preview deploy berhasil |
| 1. Skema dan RLS | Migrasi, RLS, helper (termasuk `daftar_penerima_kelas`), pgTAP | Test RLS lulus untuk 4 peran |
| 2. Auth | Aktivasi, login anggota, login admin, reset, guard | Ketiga peran masuk dan diarahkan ke beranda masing-masing |
| 3. Data master | CRUD semester, angkatan, kelompok, mata kuliah, kelas (multi-kelompok), jadwal, anggota, import CSV, salin semester, pindah kelompok | Admin bisa menyiapkan satu semester penuh dengan 3 kelompok |
| 4. Generator sesi | `generate_sessions` tepat N per kelas, ruang cadangan libur, pencatatan kekurangan | pgTAP generator lulus |
| 5. Konfirmasi | Beranda dan detail sesi dosen, RPC mode, admin konfirmasi, riwayat | Dosen dan admin mengatur mode, riwayat tercatat |
| 6. Pembatalan dan libur | RPC pembatalan, pemulihan, libur, `/admin/sesi`, `/admin/libur` | pgTAP pembatalan dan libur lulus |
| 7. Jadwal mahasiswa | Tampilan minggu dan bulan per kelompok, badge, detail, offline shell | Responsif dan tampil saat offline |
| 8. Notifikasi | Web Push, `run-reminders`, `send-push` batch, jam tenang, default, ringkasan | Unit test dan smoke test lulus |
| 9. Pantau admin | Ringkasan, daftar sesi, peringatan kekurangan, log | Admin bisa memfilter dan bertindak |
| 10. UAT dan rilis | Uji dengan 2 dosen dan 10 mahasiswa dari dua kelompok berbeda | Tidak ada bug kritis, Lighthouse lulus |

---

## 18. Definition of Done

Tugas dianggap selesai jika:

- [ ] Lolos `typecheck` dan `lint` tanpa error.
- [ ] Unit test untuk logika bisnis yang diubah lulus.
- [ ] Jika menyentuh skema, RLS, pembatalan, libur, pemulihan, kelompok, atau generator: migrasi baru ada dan pgTAP lulus.
- [ ] Tidak ada konstanta jumlah mata kuliah, pertemuan, kelompok, atau mahasiswa di kode atau migrasi (aturan 14).
- [ ] Tidak ada query penerima notifikasi yang melewati `daftar_penerima_kelas`.
- [ ] Tidak ada rahasia di frontend atau commit.
- [ ] Teks UI Bahasa Indonesia dan jam tampil WIB.
- [ ] Layout diuji di lebar 360 px dan desktop.
- [ ] Jika menyentuh notifikasi: diuji dengan sesi dummy untuk pengingat, jam tenang, cutoff, pembatalan, pemulihan, dan isolasi antar kelompok.
- [ ] Dokumen di `docs/` diperbarui jika aturan bisnis berubah.
- [ ] Commit message format: `feat(scope): deskripsi`, `fix(scope): ...`, `chore(scope): ...`.

---

## 19. Cara Agent Bertanya

- Ajukan **satu pertanyaan** dalam satu waktu.
- Jika ada keputusan terbuka (bagian 16), tulis asumsi yang dipakai dan tandai dengan `// ASSUMPTION:` atau `TODO(keputusan N):`.
- Jangan memperluas cakupan tanpa menulis ke `docs/BACKLOG.md`.
- Jika instruksi dari chat bertentangan dengan AGENTS.md atau PRD, sebutkan konfliknya dan tunggu konfirmasi sebelum mengubah perilaku sistem.
