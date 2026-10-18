# Status Implementasi SysPro

> Dokumen audit awal dan pelacakan kemajuan implementasi proyek **SysPro** berdasarkan `AGENTS.md`, `docs/PRD.md` (v2.2 dengan prioritas A.1 > A > B), dan arahan pengerjaan.
> Tanggal Audit Awal: 19 Oktober 2026

---

## 1. Inventaris File dan Status terhadap PRD v2.2 & A.1

Status:
- `SESUAI`: Sudah memenuhi spesifikasi PRD v2.2 / A.1.
- `PERLU DIUBAH`: File sudah ada tetapi masih berbasis spesifikasi lama (v2.1) atau belum lengkap.
- `BELUM ADA`: File belum ada dan wajib dibuat sesuai PRD & AGENTS.md.

### 1.1 Konfigurasi dan Tooling

| File | Status | Keterangan |
|---|---|---|
| `package.json` | PERLU DIUBAH | Perlu penambahan script: `test:db`, `e2e`, `gen:types`. Perlu dependensi `@playwright/test` untuk pengujian e2e. |
| `vite.config.ts` | SESUAI | Menggunakan VitePWA strategi `injectManifest`, `src/sw.ts`, `registerType: 'prompt'`. |
| `tsconfig.json` | SESUAI | File konfigurasi referensi root. |
| `tsconfig.app.json` | PERLU DIUBAH | Perlu penambahan `"strict": true` eksplisit sesuai aturan wajib AGENTS.md. |
| `tsconfig.node.json` | SESUAI | Konfigurasi node untuk file vite dan script. |
| `vercel.json` | SESUAI | Rewrite SPA `/(.*)` ke `/index.html` dan header `no-cache` untuk `/sw.js`. |
| `.gitignore` | PERLU DIUBAH | Perlu dipastikan memuat `.env*.local` dan `supabase/.env.local`. |
| `.env.example` | SESUAI | Memuat variabel frontend tanpa nilai: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`. |
| `eslint.config.js` | SESUAI | Konfigurasi Flat ESLint dengan TypeScript dan React Hooks. |

### 1.2 Database dan Supabase

| File / Objek | Status | Keterangan |
|---|---|---|
| `supabase/config.toml` | PERLU DIUBAH | Pastikan `verify_jwt` untuk semua Edge Function sesuai spesifikasi (`activate-member`: false, `run-reminders`: false, lainnya: true). |
| `supabase/migrations/20261014230525_init_schema_and_rls.sql` | SESUAI (LAMA) | Migrasi awal berbasis v2.1. Sesuai AGENTS.md aturan 7, file ini tidak boleh diedit. |
| `supabase/migrations/20261019000000_v22_final_schema.sql` | BELUM ADA | Migrasi baru untuk menambahkan `cohorts`, `student_groups`, `tagihan_pengganti`, alter `profiles`, `classes`, `sessions`, `holidays`, `notifications`, trigger, generator tepat N, RPC tagihan, pembatalan A.1.14, dan RLS baru. |
| `supabase/seed.sql` | PERLU DIUBAH | Saat ini hanya memuat 3 kelas dan 1 mahasiswa lama. Perlu diganti sesuai PRD 8.12 (1 angkatan 2025, kelompok A/B/C, 9 matkul, 27 kelas, 150 mahasiswa dummy kode awalan 9, 2 dosen, 1 admin, 2 libur). |
| `supabase/tests/rls_and_rpc_test.sql` | PERLU DIUBAH | Saat ini hanya 8 pengujian parsial. Wajib diperluas untuk mencakup seluruh kasus PRD 15.2 dan A.1.12 untuk 4 peran (admin, dosen, mahasiswa, anonim). |

### 1.3 Edge Functions & Logika Murni

| File | Status | Keterangan |
|---|---|---|
| `supabase/functions/_shared/quiet-hours.ts` | SESUAI | Logika jam tenang 21.00 - 06.30 WIB (`isQuietHour`, `nextAllowedPushTime`). |
| `supabase/functions/_shared/reminder-policy.ts` | PERLU DIUBAH | Perlu ditambahkan logika penagihan harian tagihan pengganti (A.1.10 langkah 1), tenggat terlewat (langkah 2), dan kedaluwarsa semester (langkah 3). |
| `supabase/functions/_shared/quiet-hours.test.ts` | BELUM ADA | Unit test fungsi murni jam tenang. |
| `supabase/functions/_shared/reminder-policy.test.ts` | BELUM ADA | Unit test fungsi murni pengingat dan penagihan tagihan pengganti. |
| `supabase/functions/activate-member/index.ts` | PERLU DIUBAH | Perlu verifikasi rate limiting (login_attempts), Zod 10 digit, dan respon generik. |
| `supabase/functions/admin-import-members/index.ts` | PERLU DIUBAH | Perlu disesuaikan untuk CSV 6 kolom (`kode, nama, peran, nim_nidn, angkatan, kelas`) dan validasi kelompok ke `student_groups`. |
| `supabase/functions/admin-reset-member/index.ts` | PERLU DIUBAH | Perlu verifikasi alasan wajib, pencatatan ke `admin_logs`, tanpa logging data rahasia. |
| `supabase/functions/run-reminders/index.ts` | PERLU DIUBAH | Wajib mencakup: pengingat dosen, default cutoff, penagihan harian tagihan, tenggat terlewat, kedaluwarsa, sesi selesai, dan ringkasan admin pagi. Header `x-cron-secret` 401 jika tidak cocok. |
| `supabase/functions/send-push/index.ts` | PERLU DIUBAH | Cek jam tenang, batch 50, hapus 404/410, set `push_sent_at`. |

### 1.4 Frontend

| File / Folder | Status | Keterangan |
|---|---|---|
| `src/main.tsx` & `src/App.tsx` | SESUAI | Entry point React. |
| `src/sw.ts` | SESUAI | Service worker Web Push handler & notificationclick. |
| `src/styles/index.css` | SESUAI | Konfigurasi CSS Tailwind. |
| `src/types/database.types.ts` | PERLU DIUBAH | Perlu di-generate ulang dengan `gen:types` setelah migrasi baru dijalankan. |
| `src/lib/copy.ts` | PERLU DIUBAH | Semua string UI wajib Bahasa Indonesia dan dipusatkan di sini (saat ini baru 38 baris). |
| `src/lib/time.ts` & `src/lib/time.test.ts` | SESUAI | Format waktu Asia/Jakarta (WIB). |
| `src/lib/csv.ts` & `src/lib/csv.test.ts` | PERLU DIUBAH | Validasi format CSV 6 kolom untuk import anggota. |
| `src/lib/errors.ts` | BELUM ADA | Pemetaan pesan error RPC ke string copy Bahasa Indonesia. |
| `src/lib/push.ts` | SESUAI | Helper registrasi push notification Web Push. |
| `src/schemas/` | BELUM ADA | Skema validasi form Zod (auth, member, cohort, class, holiday, session). |
| `src/components/ui/` | PERLU DIUBAH | Baru ada `Badge.tsx`. Perlu: `Button`, `Card`, `StatusBadge`, `Modal`, `Input`, `Select`, `Skeleton`, `Table`, `EmptyState`. |
| `src/app/router.tsx` | PERLU DIUBAH | Perlu dilengkapi seluruh rute dosen, mahasiswa, admin (termasuk tagihan dan angkatan). |
| `src/app/guards/` | PERLU DIUBAH | `RequireAuth` dan `RequireRole` ada; perlu `GuestOnly`. |
| `src/app/providers/` | PERLU DIUBAH | `AuthProvider` dan `QueryProvider` ada; perlu IndexedDB persister dan `ToastProvider`. |
| `src/features/auth/` | SESUAI / LENGKAP | Login, Aktivasi, AdminLogin. |
| `src/features/lecturer/` | PERLU DIUBAH | Perlu penambahan halaman `/dosen/tagihan`, pembaruan kartu beranda dengan tagihan pengganti & label kelompok "Kelas 2025 A", serta detail sesi dengan opsi "Tidak Ada" (TODO A12) dan lokasi/link. |
| `src/features/student/` | PERLU DIUBAH | Menampilkan label "Pengganti", badge mode baru, lokasi kuliah, dan offline label "Data terakhir diperbarui {waktu}". |
| `src/features/admin/semesters/` | PERLU DIUBAH | Tombol salin semester (`admin_copy_semester`) dan generate sesi. |
| `src/features/admin/cohorts/` | BELUM ADA | CRUD angkatan (`cohorts`) dan kelompok (`student_groups`). Wajib ada sebelum import anggota. |
| `src/features/admin/classes/` | PERLU DIUBAH | Multi-kelompok sekaligus, jumlah pertemuan N, enrollment manual. |
| `src/features/admin/members/` | PERLU DIUBAH | Import CSV 6 kolom, filter angkatan & kelompok, modal Pindah Kelompok (`admin_pindah_kelompok`, alasan wajib), modal Reset Akses. |
| `src/features/admin/holidays/` | PERLU DIUBAH | Flag `is_libur_kuliah`, pratinjau `admin_preview_libur`. |
| `src/features/admin/sessions/` | PERLU DIUBAH | Batalkan, pulihkan, atur lokasi (`admin_set_lokasi_sesi`), peringatan online tanpa link. |
| `src/features/admin/tagihan/` | BELUM ADA | Halaman 4 tab (Diajukan, Menunggu, Terjadwal, Kedaluwarsa) untuk persetujuan kelas pengganti. |
| `src/features/admin/logs/` | SESUAI | Menampilkan riwayat `admin_logs`. |
| `public/icons/` | BELUM ADA | Ikon Web App PWA (icon-192, icon-512, maskable, apple-touch-icon). Dibuat placeholder. |

### 1.5 Dokumentasi dan Pengujian

| Dokumen | Status | Keterangan |
|---|---|---|
| `docs/PRD.md` | SESUAI | Spesifikasi produk v2.2 + A.1. |
| `docs/ERD.md` | BELUM ADA | Diagram Mermaid relasi entitas lengkap. |
| `docs/FLOW.md` | BELUM ADA | Diagram Mermaid alur pengguna dan proses. |
| `docs/BACKLOG.md` | BELUM ADA | Fitur di luar cakupan v1. |
| `docs/decisions/` | BELUM ADA | Catatan satu file per keputusan final A.1 dan A.1.14. |
| `docs/DEPLOY.md` | BELUM ADA | Runbook deployment staging dan produksi. |
| `e2e/` (Playwright) | BELUM ADA | Smoke test skenario PRD 15.4. |

---

## 2. Daftar Gap per Tahap Pengerjaan

### Tahap 0: Setup Proyek dan Tooling
- [ ] Menambahkan script `test:db`, `e2e`, `gen:types` ke `package.json`.
- [ ] Memasang dependensi `@playwright/test` untuk e2e.
- [ ] Menambahkan `"strict": true` ke `tsconfig.app.json`.
- [ ] Memperbarui `.gitignore` agar memuat `.env*.local` dan `supabase/.env.local`.
- [ ] Memeriksa `supabase/config.toml` terkait `verify_jwt`.
- [ ] Memastikan Docker dan Supabase lokal berjalan (Sudah aktif & terverifikasi).
- [ ] Verifikasi typecheck, lint, test, build.

### Tahap 1: Database, Fungsi, RLS, Seed, dan Tes pgTAP
- [ ] Membuat migrasi baru `supabase/migrations/20261019000000_v22_final_schema.sql`:
  - DDL tabel: `cohorts`, `student_groups`, `enrollments`, `tagihan_pengganti`.
  - Alter tabel: `profiles` (tambah `group_id`), `classes` (tambah `group_id`, `jumlah_pertemuan`), `holidays` (tambah `is_libur_kuliah`), `sessions` (tambah `pertemuan_ke`, `jenis`, `pengganti_dari_id`, `ruangan`, `link_online`, pembatalan, `restored_at`), `notifications` (tipe baru).
  - Helper: `app_profile_id`, `app_role`, `format_tanggal_jam_id`, `daftar_penerima_kelas`, `mahasiswa_ikut_kelas`, `nama_kelompok`, `jam_penagihan_berikut`, `format_lokasi`.
  - Trigger: `classes_enroll_kelompok`, update `guard_session_mode`, `session_confirmations_immutable`.
  - Generator: `generate_sessions` tepat N per kelas, UTS di pertemuan ⌊N/2⌋, UAS di N, sesi libur otomatis batal & buat tagihan pengganti.
  - RPC Mode & Pembatalan: `set_session_mode` (dengan cabang `tidak_ada` A.1.14, diberi TODO A12), `batalkan_sesi_internal`, `apply_default_mode`, `admin_cancel_session`, `admin_restore_session`.
  - RPC Tagihan: `buat_tagihan`, `buka_ulang_tagihan`, `validasi_jadwal_pengganti`, `buat_sesi_pengganti`, `ajukan_pengganti`, `admin_setujui_pengganti`, `admin_tolak_pengganti`, `admin_jadwalkan_pengganti`.
  - RPC Libur, Lokasi, Pindah Kelompok, Semester: `admin_preview_libur`, `admin_upsert_holiday`, `admin_delete_holiday`, `admin_copy_semester`, `admin_pindah_kelompok`, `admin_set_lokasi_sesi`.
  - RLS komprehensif pada seluruh tabel dan penguncian search_path public.
- [ ] Memperbarui `supabase/seed.sql` sesuai PRD 8.12.
- [ ] Memperbarui `supabase/tests/rls_and_rpc_test.sql` mencakup seluruh PRD 15.2 dan A.1.12.
- [ ] Menjalankan `npx supabase db reset` dan `npx supabase test db` (target: 100% lulus).
- [ ] Menjalankan `npm run gen:types` untuk memperbarui `src/types/database.types.ts`.

### Tahap 2: Edge Functions dan Logika Murni
- [ ] Menulis unit test Vitest untuk `quiet-hours.ts` dan `reminder-policy.ts` di `supabase/functions/_shared/`.
- [ ] Memperbarui logika penagihan tagihan pengganti (langkah 1, 2, 3 di A.1.10) pada `reminder-policy.ts`.
- [ ] Menulis unit test untuk `src/lib/time.ts` dan `src/lib/csv.ts`.
- [ ] Memperbarui Edge Functions: `activate-member`, `admin-import-members`, `admin-reset-member`, `run-reminders`, `send-push`.
- [ ] Memverifikasi `npm run test` dan fungsi curl header `x-cron-secret` untuk `run-reminders`.

### Tahap 3: Frontend
- [ ] Menyediakan komponen UI standar (`Button`, `Card`, `StatusBadge`, `Modal`, `Input`, `Select`, `Skeleton`, `Table`, `EmptyState`) di `src/components/ui/`.
- [ ] Membuat skema validasi Zod di `src/schemas/`.
- [ ] Menyusun `src/lib/copy.ts` secara komprehensif untuk seluruh teks Bahasa Indonesia.
- [ ] Menyediakan `src/lib/errors.ts` untuk pemetaan pesan RPC ke copy UI.
- [ ] Mengintegrasikan IndexedDB persister pada TanStack Query di `src/app/providers/QueryProvider.tsx`.
- [ ] Menambahkan `ToastProvider` dan `GuestOnly` guard.
- [ ] Mengimplementasikan rute dan halaman lengkap:
  - Auth: `/login`, `/aktivasi`, `/admin/login`, `/profil`.
  - Dosen: `/dosen`, `/dosen/jadwal`, `/dosen/sesi/:id`, `/dosen/tagihan`, `/dosen/notifikasi`.
  - Mahasiswa: `/mahasiswa`, `/mahasiswa/jadwal`, `/mahasiswa/sesi/:id`, `/mahasiswa/notifikasi`.
  - Admin: `/admin`, `/admin/semester`, `/admin/angkatan`, `/admin/mata-kuliah`, `/admin/kelas`, `/admin/anggota`, `/admin/libur`, `/admin/sesi`, `/admin/tagihan`, `/admin/log`.
- [ ] Menyediakan placeholder ikon PWA di `public/icons/`.
- [ ] Menyiapkan dan menjalankan Playwright smoke test (`npm run e2e`).

### Tahap 4: Dokumentasi Repo
- [ ] Membuat `docs/ERD.md` (Mermaid diagram).
- [ ] Membuat `docs/FLOW.md` (Alur PRD bagian 6).
- [ ] Membuat `docs/BACKLOG.md` (Daftar fitur di luar cakupan v1).
- [ ] Membuat `docs/decisions/` (Satu file per keputusan final A1 - A11 dan A.1.14/A12).
- [ ] Membuat `docs/DEPLOY.md` (Runbook deploy).

### Tahap 5: Kesiapan Deploy
- [ ] Menyiapkan `supabase/manual/cron.sql`.
- [ ] Memvalidasi bundle `npm run build` dan preview.
- [ ] Audit keamanan string: memastikan tidak ada `SERVICE_ROLE`, `VAPID_PRIVATE`, atau `CRON_SECRET` di `src/` maupun `dist/`.

---

## 3. Daftar Risiko dan Mitigasi

1. **Migrasi Lama Sudah Berjalan:**
   - *Risiko:* Perubahan langsung pada `20261014230525_init_schema_and_rls.sql` melanggar aturan AGENTS.md dan merusak integritas migrasi lokal/staging.
   - *Mitigasi:* Menggunakan file migrasi baru `20261019000000_v22_final_schema.sql` dengan klausa `alter table`, `create table if not exists`, serta `create or replace function`.
2. **Nama Constraint Postgres Otomatis:**
   - *Risiko:* Postgres menamai constraint secara otomatis (misal `sessions_class_id_pertemuan_ke_key` atau `classes_course_id_semester_id_nama_kelas_key`), yang dapat menyebabkan error saat `drop constraint` jika namanya berbeda.
   - *Mitigasi:* Menambahkan pengecekan idempotent `alter table ... drop constraint if exists ...`.
3. **Trigger Immutability Memblokir Reset Test:**
   - *Risiko:* Trigger `session_confirmations_immutable` menolak `DELETE`/`UPDATE` dan dapat menggagalkan setup test pgTAP.
   - *Mitigasi:* Menggunakan pola disable/enable trigger di awal dan akhir transaksi test seperti yang sudah berjalan di `rls_and_rpc_test.sql`.
4. **Kebocoran Rahasia Produksi:**
   - *Risiko:* Service role key atau private key push tidak sengaja terbawa ke frontend bundle.
   - *Mitigasi:* Audit grepping otomatis di tahap 5 dan aturan ketat hanya `VITE_*` yang diakses di frontend.
5. **Keputusan Terbuka A12 (Kelas Tidak Ada):**
   - *Risiko:* Keputusan A12 belum difinalisasi oleh pengguna.
   - *Mitigasi:* Mengimplementasikan logika sesuai PRD A.1.14 dan menandai semua bagian kode terkait dengan komentar eksplisit `// TODO(keputusan A12)`.
