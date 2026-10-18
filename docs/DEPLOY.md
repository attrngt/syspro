# Panduan Deployment SysPro v2.2 (Production & Staging Runbook)

Dokumen ini merupakan panduan operasional (*runbook*) lengkap untuk melakukan deployment sistem **SysPro v2.2** ke lingkungan Staging dan Produksi, disusun berdasarkan spesifikasi resmi `docs/PRD.md` Bagian 14 dan `AGENTS.md`.

---

## 1. Arsitektur Lingkungan (*Environments*)

| Lingkungan | Frontend | Backend (Supabase) | Kegunaan |
|---|---|---|---|
| **Lokal** | Vite Dev Server (`localhost:5173`) | Supabase CLI lokal (`localhost:54321`) | Pengembangan & pengujian otomatis harian |
| **Staging** | Vercel Preview (Git branch `staging`) | Project Supabase terpisah: `syspro-staging` | User Acceptance Testing (UAT) dosen, mahasiswa, & prodi |
| **Produksi** | Vercel Production (`main`) | Project Supabase terpisah: `syspro-prod` | Sistem operasional sebenarnya |

> [!WARNING]
> Gunakan dua project Supabase terpisah untuk Staging dan Produksi. Jangan pernah mencampur data pengujian dengan data produksi.

---

## 2. Prasyarat Sistem

1. Node.js versi 20 LTS atau lebih baru, dan npm.
2. Akun Supabase (dengan akses dashboard admin).
3. Akun Vercel terhubung ke repository Git proyek SysPro.
4. Supabase CLI terinstal di mesin lokal (`npm install -g supabase` atau gunakan `npx supabase`).

---

## 3. Langkah 1: Setup Proyek Supabase (Manual oleh Pengguna)

Lakukan langkah ini pada masing-masing dashboard Supabase (`syspro-staging` dan `syspro-prod`):

1. **Buat Proyek Baru:**
   - Nama proyek: `syspro-staging` / `syspro-prod`.
   - Wilayah (Region): **Southeast Asia (Singapore)** (`ap-southeast-1`).
   - Simpan database password yang kuat di password manager yang aman.
2. **Konfigurasi Ekstensi Database:**
   - Masuk ke **Database > Extensions**, pastikan ekstensi berikut aktif:
     - `pg_cron` (untuk scheduler background)
     - `pg_net` (untuk async HTTP request ke Edge Function)
     - `vault` (untuk penyimpanan aman secret cron)
     - `pgcrypto` (untuk hashing & token)
3. **Konfigurasi Autentikasi (Authentication):**
   - Masuk ke **Authentication > Providers > Email**:
     - Matikan toggle **Allow new users to sign up** (pendaftaran publik non-aktif; semua akun dibuat lewat CSV dan aktivasi kode).
     - Matikan toggle **Confirm email** (anggota memakai email internal sintetis `{kode}@anggota.internal`).
     - Atur **Minimum password length** ke 8 karakter.
   - Masuk ke **Authentication > URL Configuration**:
     - **Site URL:** Isi dengan URL domain frontend produksi Vercel (misal: `https://syspro.prodi.example.ac.id`).
     - **Redirect URLs:** Tambahkan domain preview Vercel (`https://*.vercel.app`), `http://localhost:5173`, dan domain kustom.
4. **Catat Kredensial API:**
   - Masuk ke **Settings > API**, catat informasi berikut untuk konfigurasi nanti:
     - **Project Ref** (contoh: `abcxyzabcdefghijklmn`)
     - **Project URL** (`https://<project-ref>.supabase.co`)
     - **Project API Keys**: `anon` (public) dan `service_role` (secret).

---

## 4. Langkah 2: Generate Kunci Web Push (VAPID Keys)

Di terminal lokal Anda, jalankan perintah berikut sekali saja untuk membuat pasangan kunci Web Push:

```bash
npx web-push generate-vapid-keys
```

Output akan menghasilkan:
- **Public Key**: Simpan untuk diisi ke `VITE_VAPID_PUBLIC_KEY` pada frontend dan Vercel.
- **Private Key**: Simpan untuk diisi ke secret Edge Function `VAPID_PRIVATE_KEY`.

> [!CAUTION]
> Jangan pernah membuat ulang VAPID key di lingkungan produksi setelah ada pengguna yang mengaktifkan notifikasi push. Mengganti VAPID key akan membatalkan seluruh langganan push yang telah terdaftar di browser pengguna.

---

## 5. Langkah 3: Link & Deploy Database Migrations

Dari terminal lokal workspace proyek:

1. **Login ke Supabase CLI:**
   ```bash
   npx supabase login
   ```
2. **Link Proyek:**
   ```bash
   # Ganti <project-ref> dengan project ref target (staging atau produksi)
   npx supabase link --project-ref <project-ref>
   ```
3. **Deploy Migrasi Skema:**
   ```bash
   npx supabase db push
   ```
4. **Verifikasi Status Migrasi:**
   ```bash
   npx supabase migration list
   ```
   Pastikan seluruh migrasi (termasuk `20261019040000_v22_final_schema.sql` dan `20261019050000_cron_helpers.sql`) berstatus `APPLIED`.

5. **Inisialisasi Akun Admin Awal:**
   Buka SQL Editor di Dashboard Supabase target, buat akun admin awal dengan menjalankan query:
   ```sql
   -- Ganti nilai email, password, dan nama sesuai admin resmi
   do $$
   declare
     new_user_id uuid := gen_random_uuid();
   begin
     insert into auth.users (
       instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
       confirmation_token, recovery_token, email_change_token_new, email_change,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at
     ) values (
       '00000000-0000-0000-0000-000000000000',
       new_user_id,
       'authenticated',
       'authenticated',
       'admin@prodi.example.ac.id',
       crypt('PasswordKuatAdmin123!', gen_salt('bf')),
       now(),
       '', '', '', '',
       '{"provider":"email","providers":["email"]}',
       '{"nama":"Administrator Utama"}',
       now(), now()
     );

     insert into public.profiles (id, auth_user_id, member_id, role, nama, group_id)
     values (new_user_id, new_user_id, null, 'admin', 'Administrator Utama', null);
   end $$;
   ```

---

## 6. Langkah 4: Konfigurasi Secrets Edge Function

Edge Function membutuhkan rahasia untuk push notification dan otentikasi cron. Jalankan perintah:

```bash
# Buat string acak 32-karakter untuk CRON_SECRET:
# Linux/Mac: openssl rand -hex 32
# PowerShell: -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})

npx supabase secrets set \
  VAPID_PRIVATE_KEY="<isi-vapid-private-key>" \
  VAPID_SUBJECT="mailto:it@prodi.example.ac.id" \
  CRON_SECRET="<isi-cron-secret-acak>"
```

Periksa kembali daftar secrets yang terpasang:
```bash
npx supabase secrets list
```

---

## 7. Langkah 5: Deploy Edge Functions

Deploy seluruh fungsi backend Supabase dengan flag otentikasi JWT yang sesuai dengan `supabase/config.toml`:

```bash
# Fungsi publik (aktivasi akun mandiri - rate limit internal)
npx supabase functions deploy activate-member --no-verify-jwt

# Fungsi cron background (diproteksi x-cron-secret header)
npx supabase functions deploy run-reminders --no-verify-jwt

# Fungsi terotentikasi admin & internal
npx supabase functions deploy admin-import-members
npx supabase functions deploy admin-reset-member
npx supabase functions deploy send-push
```

Uji kesehatan fungsi (harus mengembalikan kode HTTP 401 Unauthorized bila dipanggil tanpa secret yang benar):
```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/run-reminders \
  -H "x-cron-secret: secret_palsu"
```

---

## 8. Langkah 6: Penjadwalan pg_cron

Buka file [supabase/manual/cron.sql](file:///c:/Users/attar/Downloads/SysPro/supabase/manual/cron.sql):

1. Ganti `<isi-cron-secret>` dengan nilai rahasia `CRON_SECRET` yang Anda buat di Langkah 4.
2. Ganti `<project-ref>` dengan Project Ref Supabase target.
3. Jalankan seluruh skrip tersebut di **Dashboard Supabase > SQL Editor**.
4. Verifikasi bahwa cron telah aktif:
   ```sql
   select * from cron.job where jobname = 'run-reminders';
   ```

---

## 9. Langkah 7: Deploy Frontend SPA ke Vercel

1. Buka [Vercel Dashboard](https://vercel.com) > **Add New Project**.
2. Hubungkan repository Git proyek SysPro.
3. Konfigurasi build:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
4. **Environment Variables:** Masukkan nilai berikut pada tab Production dan Preview:

| Nama Variabel | Keterangan | Contoh Nilai |
|---|---|---|
| `VITE_SUPABASE_URL` | URL endpoint API Supabase | `https://abcxyz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Public Anon Key Supabase | `eyJhbGciOi...` |
| `VITE_VAPID_PUBLIC_KEY` | Public Key VAPID Web Push | `BEl62iEWg52...` |

> [!CAUTION]
> JANGAN PERNAH memasukkan `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY`, atau `CRON_SECRET` ke dalam Environment Variables di Vercel.

5. Klik **Deploy**.
6. Atur Custom Domain di **Project Settings > Domains** (misal: `syspro.prodi.example.ac.id`), lalu perbarui DNS CNAME sesuai instruksi Vercel.

---

## 10. Checklist Verifikasi Pra-Rilis (*Pre-Release Checklist*)

Sebelum membuka akses kepada seluruh dosen dan mahasiswa:

- [ ] Seluruh migrasi database berstatus `APPLIED` (`npx supabase migration list`).
- [ ] Akun admin produksi telah berhasil login di `/admin/login`.
- [ ] Cron `run-reminders` berhasil berjalan (periksa `cron.job_run_details` berstatus `succeeded`).
- [ ] Header `Cache-Control: no-cache, no-store, must-revalidate` terkonfirmasi untuk `/sw.js` via `curl -I https://domain/sw.js`.
- [ ] Tidak ada kebocoran kunci rahasia pada bundle frontend (lolos verifikasi audit `grep`).
- [ ] Import data angkatan, kelompok mahasiswa (A, B, C), mata kuliah, dan anggota berhasil diuji.
- [ ] Notifikasi Web Push terverifikasi sampai di perangkat desktop dan ponsel (Android / iOS 16.4+).
- [ ] Backup otomatis database Supabase aktif (cek di **Dashboard > Database > Backups**).

---

## 11. Prosedur Pembaruan (*Update*) dan Rollback

### Prosedur Update Rutin:
```bash
# 1. Jika ada perubahan skema database:
npx supabase db push

# 2. Jika ada perubahan Edge Function:
npx supabase functions deploy <nama-function>

# 3. Pembaruan kode frontend:
git push origin main
# Vercel akan otomatis melakukan build dan deploy
```

### Prosedur Rollback Darurat:
- **Frontend:** Masuk ke Vercel Dashboard > **Deployments** > Pilih deployment sebelumnya yang stabil > Klik **Promote to Production**.
- **Edge Function:** Checkout commit stabil sebelumnya via git, lalu jalankan `npx supabase functions deploy <nama-function>`.
- **Database:** Jika terjadi kesalahan fatal skema atau data korup, lakukan *Point-in-Time Recovery* (PITR) atau pulihkan dari backup harian di **Dashboard > Database > Backups**.
- **Cron Scheduler:** Untuk mematikan sementara pengingat otomatis dalam kondisi darurat:
  ```sql
  select cron.unschedule('run-reminders');
  ```
  Untuk mengaktifkan kembali, jalankan ulang skrip [supabase/manual/cron.sql](file:///c:/Users/attar/Downloads/SysPro/supabase/manual/cron.sql).
