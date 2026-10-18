-- =========================================================
-- MIGRASI: Helper fungsi cron untuk status selesai
-- File: 20261019050000_cron_helpers.sql
-- =========================================================

create or replace function public.cron_selesaikan_sesi()
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  perform set_config('app.via_rpc', 'on', true);

  update public.sessions
     set status = 'selesai',
         next_reminder_at = null,
         updated_at = now()
   where selesai_at < now()
     and status in ('menunggu', 'terkonfirmasi', 'default_offline');

  get diagnostics v_count = row_count;

  perform set_config('app.via_rpc', 'off', true);
  return v_count;
end $$;

revoke all on function public.cron_selesaikan_sesi() from public, anon;
grant execute on function public.cron_selesaikan_sesi() to authenticated, service_role;
