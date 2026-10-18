-- ==============================================================================
-- SYSPRO v2.2 - PENJADWALAN CRON PENGINGAT (pg_cron & pg_net via Vault)
-- ==============================================================================
-- File ini dijalankan MANUAL di SQL Editor Supabase per environment (Staging & Production).
-- JANGAN masukkan file ini ke migrasi otomatis karena <project-ref> dan secret
-- berbeda untuk setiap lingkungan.
-- ==============================================================================

-- 1. Simpan CRON_SECRET di Supabase Vault (nilai harus persis sama dengan secret Edge Function CRON_SECRET)
select vault.create_secret('<isi-cron-secret>', 'cron_secret', 'Secret untuk autentikasi run-reminders');

-- 2. Hapus job lama jika sebelumnya sudah pernah dijadwalkan
do $$
begin
  if exists (select 1 from cron.job where jobname = 'run-reminders') then
    perform cron.unschedule('run-reminders');
  end if;
end $$;

-- 3. Jadwalkan trigger run-reminders setiap 5 menit
select cron.schedule(
  'run-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/run-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ==============================================================================
-- Verifikasi & Monitoring Cron:
-- ==============================================================================
-- Lihat status penjadwalan:
--   select * from cron.job where jobname = 'run-reminders';
--
-- Pantau riwayat eksekusi (tunggu 5-10 menit):
--   select * from cron.job_run_details where jobid = (select jobid from cron.job where jobname = 'run-reminders') order by start_time desc limit 10;
--
-- Untuk menghentikan sementara:
--   select cron.unschedule('run-reminders');
-- ==============================================================================
