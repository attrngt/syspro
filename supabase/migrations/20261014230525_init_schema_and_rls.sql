-- =========================================================
-- EXTENSIONS
-- =========================================================
create extension if not exists "pgcrypto";

-- =========================================================
-- 1. MEMBERS: daftar resmi dari admin (dosen dan mahasiswa)
-- =========================================================
create table public.members (
  id           uuid primary key default gen_random_uuid(),
  kode         text not null unique check (kode ~ '^[0-9]{10}$'),
  nama         text not null,
  peran        text not null check (peran in ('dosen', 'mahasiswa')),
  nim_nidn     text,
  aktif        boolean not null default true,
  activated_at timestamptz,
  created_at   timestamptz not null default now()
);

-- =========================================================
-- 2. PROFILES: satu baris per pengguna
-- =========================================================
create table public.profiles (
  id           uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  member_id    uuid unique references public.members(id) on delete restrict,
  role         text not null check (role in ('admin', 'dosen', 'mahasiswa')),
  nama         text not null,
  created_at   timestamptz not null default now(),
  constraint profiles_member_admin check (
    (role = 'admin' and member_id is null) or
    (role <> 'admin' and member_id is not null)
  )
);

-- =========================================================
-- 3. SEMESTERS
-- =========================================================
create table public.semesters (
  id               uuid primary key default gen_random_uuid(),
  nama             text not null,
  tanggal_mulai    date not null,
  tanggal_selesai  date not null,
  aktif            boolean not null default false,
  created_at       timestamptz not null default now(),
  check (tanggal_selesai >= tanggal_mulai)
);
create unique index semesters_satu_aktif on public.semesters (aktif) where aktif;

-- =========================================================
-- 4. COURSES (mata kuliah)
-- =========================================================
create table public.courses (
  id         uuid primary key default gen_random_uuid(),
  kode       text not null unique,
  nama       text not null,
  sks        smallint not null check (sks between 1 and 6),
  created_at timestamptz not null default now()
);

-- =========================================================
-- 5. CLASSES (kelas per mata kuliah per semester)
-- =========================================================
create table public.classes (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete restrict,
  semester_id uuid not null references public.semesters(id) on delete cascade,
  dosen_id    uuid not null references public.profiles(id) on delete restrict,
  nama_kelas  text not null,
  created_at  timestamptz not null default now(),
  unique (course_id, semester_id, nama_kelas)
);
create index classes_dosen_idx on public.classes (dosen_id);
create index classes_semester_idx on public.classes (semester_id);

-- =========================================================
-- 6. CLASS_SCHEDULES (jadwal rutin)
-- =========================================================
create table public.class_schedules (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  hari        smallint not null check (hari between 0 and 6),
  jam_mulai   time not null,
  jam_selesai time not null,
  check (jam_selesai > jam_mulai)
);
create index class_schedules_class_idx on public.class_schedules (class_id);

-- =========================================================
-- 7. ENROLLMENTS (mahasiswa di kelas)
-- =========================================================
create table public.enrollments (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references public.classes(id) on delete cascade,
  mahasiswa_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (class_id, mahasiswa_id)
);
create index enrollments_mahasiswa_idx on public.enrollments (mahasiswa_id);
create index enrollments_class_idx on public.enrollments (class_id);

-- =========================================================
-- 8. HOLIDAYS (libur dan UAS)
-- =========================================================
create table public.holidays (
  id         uuid primary key default gen_random_uuid(),
  tanggal    date not null unique,
  keterangan text not null,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 9. SESSIONS (pertemuan konkret)
-- =========================================================
create table public.sessions (
  id                uuid primary key default gen_random_uuid(),
  class_id          uuid not null references public.classes(id) on delete cascade,
  schedule_id       uuid not null references public.class_schedules(id) on delete cascade,
  tanggal           date not null,
  mulai_at          timestamptz not null,
  selesai_at        timestamptz not null,
  mode              text check (mode in ('online', 'offline', 'tidak_ada')),
  mode_source       text check (mode_source in ('dosen', 'admin', 'default')),
  status            text not null default 'menunggu' check (
                      status in ('menunggu', 'terkonfirmasi', 'default_offline', 'dibatalkan', 'selesai')),
  cutoff_at         timestamptz not null,
  next_reminder_at  timestamptz,
  reminder_count    int not null default 0,
  escalated_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (schedule_id, tanggal),
  check (selesai_at > mulai_at),
  check (cutoff_at = mulai_at - interval '1 hour'),
  check (mode_source is null or mode is not null)
);

create index sessions_cron_idx on public.sessions (next_reminder_at)
  where status = 'menunggu' and mode is null;
create index sessions_mulai_idx on public.sessions (mulai_at);
create index sessions_class_idx on public.sessions (class_id);

-- =========================================================
-- 10. SESSION_CONFIRMATIONS (riwayat, append-only)
-- =========================================================
create table public.session_confirmations (
  id          bigint generated always as identity primary key,
  session_id  uuid not null references public.sessions(id) on delete cascade,
  actor_id    uuid references public.profiles(id) on delete set null,
  actor_role  text not null check (actor_role in ('dosen', 'admin', 'system')),
  mode_lama   text check (mode_lama in ('online', 'offline', 'tidak_ada')),
  mode_baru   text not null check (mode_baru in ('online', 'offline', 'tidak_ada')),
  sumber      text not null check (sumber in ('dosen', 'admin', 'default')),
  created_at  timestamptz not null default now()
);
create index session_confirmations_session_idx on public.session_confirmations (session_id, created_at);

create or replace function public.tolak_ubah_riwayat()
returns trigger language plpgsql as $$
begin
  raise exception 'Riwayat tidak boleh diubah atau dihapus';
end $$;

create trigger session_confirmations_immutable
  before update or delete on public.session_confirmations
  for each row execute function public.tolak_ubah_riwayat();

-- =========================================================
-- 11. NOTIFICATIONS (inbox)
-- =========================================================
create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  session_id   uuid references public.sessions(id) on delete cascade,
  tipe         text not null check (tipe in (
                 'pengingat_dosen', 'konfirmasi_mode', 'ubah_mode',
                 'mode_default', 'ringkasan_admin')),
  judul        text not null,
  isi          text not null,
  aksi_url     text,
  read_at      timestamptz,
  push_sent_at timestamptz,
  created_at   timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_push_pending_idx on public.notifications (created_at)
  where push_sent_at is null;

-- =========================================================
-- 12. PUSH_SUBSCRIPTIONS
-- =========================================================
create table public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index push_subscriptions_profile_idx on public.push_subscriptions (profile_id);

-- =========================================================
-- 13. ADMIN_LOGS
-- =========================================================
create table public.admin_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles(id) on delete set null,
  aksi        text not null,
  target_tipe text,
  target_id   uuid,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- =========================================================
-- 14. LOGIN_ATTEMPTS (hanya service role)
-- =========================================================
create table public.login_attempts (
  id          bigint generated always as identity primary key,
  kode_or_ip  text not null,
  success     boolean not null,
  created_at  timestamptz not null default now()
);
create index login_attempts_lookup_idx on public.login_attempts (kode_or_ip, created_at desc);

-- =========================================================
-- FUNGSI HELPER & TRIGGERS
-- =========================================================
create or replace function public.app_profile_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles where auth_user_id = auth.uid()
$$;

create or replace function public.app_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where auth_user_id = auth.uid()
$$;

-- Trigger Guard untuk sessions.mode (PRD 8.7)
create or replace function public.guard_session_mode()
returns trigger language plpgsql as $$
begin
  if new.mode is distinct from old.mode
     and coalesce(current_setting('app.via_rpc', true), 'off') <> 'on' then
    raise exception 'Mode hanya boleh diubah lewat set_session_mode';
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger sessions_guard_mode
  before update on public.sessions
  for each row execute function public.guard_session_mode();

-- Trigger saat libur ditambah: batalkan sesi di tanggal tersebut (PRD 5.9)
-- TODO(keputusan): Apakah mahasiswa mendapat notifikasi pembatalan? (PRD Bagian 19.2)
create or replace function public.cancel_sessions_on_holiday()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.sessions
     set status = 'dibatalkan',
         next_reminder_at = null,
         updated_at = now()
   where tanggal = new.tanggal
     and status <> 'selesai';
  return new;
end $$;

create trigger holidays_cancel_sessions
  after insert on public.holidays
  for each row execute function public.cancel_sessions_on_holiday();

-- =========================================================
-- FUNGSI RPC: GENERATE SESSIONS (PRD 8.5)
-- =========================================================
create or replace function public.generate_sessions(p_semester_id uuid)
returns int
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  if public.app_role() is distinct from 'admin' then
    raise exception 'Tidak diizinkan';
  end if;

  with tanggal_semester as (
    select d::date as tanggal, extract(dow from d)::smallint as hari
    from public.semesters s,
         generate_series(s.tanggal_mulai, s.tanggal_selesai, interval '1 day') d
    where s.id = p_semester_id
      and d::date not in (select tanggal from public.holidays)
  ),
  kandidat as (
    select
      cl.id  as class_id,
      cs.id  as schedule_id,
      ts.tanggal,
      (ts.tanggal + cs.jam_mulai)   at time zone 'Asia/Jakarta' as mulai_at,
      (ts.tanggal + cs.jam_selesai) at time zone 'Asia/Jakarta' as selesai_at
    from public.classes cl
    join public.class_schedules cs on cs.class_id = cl.id
    join tanggal_semester ts on ts.hari = cs.hari
    where cl.semester_id = p_semester_id
  )
  insert into public.sessions
    (class_id, schedule_id, tanggal, mulai_at, selesai_at, cutoff_at, next_reminder_at)
  select
    class_id, schedule_id, tanggal, mulai_at, selesai_at,
    mulai_at - interval '1 hour',
    greatest(now(), mulai_at - interval '24 hours')
  from kandidat
  where mulai_at > now()
  on conflict (schedule_id, tanggal) do nothing;

  get diagnostics n = row_count;

  insert into public.admin_logs (actor_id, aksi, target_tipe, target_id, detail)
  values (public.app_profile_id(), 'generate_sesi', 'semester', p_semester_id,
          jsonb_build_object('jumlah_baru', n));

  return n;
end $$;

revoke all on function public.generate_sessions(uuid) from public;
grant execute on function public.generate_sessions(uuid) to authenticated;

-- =========================================================
-- FUNGSI RPC: SET SESSION MODE (PRD 8.6)
-- =========================================================
create or replace function public.set_session_mode(p_session_id uuid, p_mode text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_me      public.profiles%rowtype;
  v_sesi    public.sessions%rowtype;
  v_dosen   uuid;
  v_source  text;
  v_tipe    text;
  v_judul   text;
  v_info    text;
  v_label   text;
begin
  if p_mode not in ('online', 'offline', 'tidak_ada') then
    raise exception 'Mode tidak valid';
  end if;

  select * into v_me from public.profiles where auth_user_id = auth.uid();
  if not found then
    raise exception 'Tidak diizinkan';
  end if;

  select * into v_sesi from public.sessions where id = p_session_id for update;
  if not found then
    raise exception 'Sesi tidak ditemukan';
  end if;

  if v_sesi.status in ('dibatalkan', 'selesai') or now() >= v_sesi.mulai_at then
    raise exception 'Sesi sudah dikunci';
  end if;

  select dosen_id into v_dosen from public.classes where id = v_sesi.class_id;

  if v_me.role = 'admin' then
    v_source := 'admin';
  elsif v_me.role = 'dosen' and v_me.id = v_dosen then
    v_source := 'dosen';
  else
    raise exception 'Tidak diizinkan';
  end if;

  if v_sesi.mode is not distinct from p_mode then
    return;
  end if;

  perform set_config('app.via_rpc', 'on', true);

  update public.sessions
     set mode = p_mode,
         mode_source = v_source,
         status = 'terkonfirmasi',
         next_reminder_at = null,
         updated_at = now()
   where id = p_session_id;

  perform set_config('app.via_rpc', 'off', true);

  insert into public.session_confirmations
    (session_id, actor_id, actor_role, mode_lama, mode_baru, sumber)
  values
    (p_session_id, v_me.id, v_me.role, v_sesi.mode, p_mode, v_source);

  select c.nama_kelas, co.nama
    into v_info, v_judul
    from public.classes c
    join public.courses co on co.id = c.course_id
   where c.id = v_sesi.class_id;

  v_label := case p_mode
    when 'online' then 'Online'
    when 'offline' then 'Offline'
    else 'Tidak Ada' end;

  if v_sesi.mode is null then
    v_tipe := 'konfirmasi_mode';
  else
    v_tipe := 'ubah_mode';
  end if;

  insert into public.notifications (user_id, session_id, tipe, judul, isi, aksi_url)
  select
    e.mahasiswa_id,
    p_session_id,
    v_tipe,
    case when v_tipe = 'ubah_mode' then 'Diubah' else 'Konfirmasi kuliah' end,
    case when v_tipe = 'ubah_mode' then 'Diubah: ' else '' end
      || v_judul || ', Kelas ' || v_info || ', '
      || to_char(v_sesi.mulai_at at time zone 'Asia/Jakarta', 'HH24.MI')
      || '. Mode' || case when v_tipe = 'ubah_mode' then ' sekarang' else '' end
      || ': ' || v_label || '.',
    '/mahasiswa/sesi/' || p_session_id
  from public.enrollments e
  where e.class_id = v_sesi.class_id;

  insert into public.admin_logs (actor_id, aksi, target_tipe, target_id, detail)
  select v_me.id, 'set_mode', 'session', p_session_id,
         jsonb_build_object('mode_lama', v_sesi.mode, 'mode_baru', p_mode, 'sumber', v_source)
  where v_me.role = 'admin';
end $$;

revoke all on function public.set_session_mode(uuid, text) from public;
grant execute on function public.set_session_mode(uuid, text) to authenticated;

-- =========================================================
-- FUNGSI RPC: APPLY DEFAULT MODE (PRD 11.4 - Service Role)
-- =========================================================
create or replace function public.apply_default_mode(p_session_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_sesi  public.sessions%rowtype;
  v_judul text;
  v_info  text;
begin
  select * into v_sesi from public.sessions where id = p_session_id for update;
  if not found or v_sesi.mode is not null or v_sesi.status <> 'menunggu' then
    return false;
  end if;

  perform set_config('app.via_rpc', 'on', true);

  update public.sessions
     set mode = 'offline',
         mode_source = 'default',
         status = 'default_offline',
         next_reminder_at = null,
         updated_at = now()
   where id = p_session_id;

  perform set_config('app.via_rpc', 'off', true);

  insert into public.session_confirmations
    (session_id, actor_id, actor_role, mode_lama, mode_baru, sumber)
  values
    (p_session_id, null, 'system', null, 'offline', 'default');

  select c.nama_kelas, co.nama
    into v_info, v_judul
    from public.classes c
    join public.courses co on co.id = c.course_id
   where c.id = v_sesi.class_id;

  insert into public.notifications (user_id, session_id, tipe, judul, isi, aksi_url)
  select
    e.mahasiswa_id,
    p_session_id,
    'mode_default',
    'Mode default',
    v_judul || ', Kelas ' || v_info || ', '
      || to_char(v_sesi.mulai_at at time zone 'Asia/Jakarta', 'HH24.MI')
      || '. Mode default: Offline.',
    '/mahasiswa/sesi/' || p_session_id
  from public.enrollments e
  where e.class_id = v_sesi.class_id;

  return true;
end $$;

revoke all on function public.apply_default_mode(uuid) from public;
grant execute on function public.apply_default_mode(uuid) to service_role;

-- =========================================================
-- KEAMANAN DAN RLS (PRD Bagian 9)
-- =========================================================
alter table public.members               enable row level security;
alter table public.profiles              enable row level security;
alter table public.semesters             enable row level security;
alter table public.courses               enable row level security;
alter table public.classes               enable row level security;
alter table public.class_schedules       enable row level security;
alter table public.enrollments           enable row level security;
alter table public.holidays              enable row level security;
alter table public.sessions              enable row level security;
alter table public.session_confirmations enable row level security;
alter table public.notifications         enable row level security;
alter table public.push_subscriptions    enable row level security;
alter table public.admin_logs            enable row level security;
alter table public.login_attempts        enable row level security;

-- 1. members: admin saja
create policy members_admin on public.members for all
  using (public.app_role() = 'admin')
  with check (public.app_role() = 'admin');

-- 2. profiles: pemilik atau admin (select), pemilik hanya boleh update kolom nama
create policy profiles_select on public.profiles for select
  using (id = public.app_profile_id() or public.app_role() = 'admin');

create policy profiles_update_own on public.profiles for update
  using (id = public.app_profile_id() or public.app_role() = 'admin')
  with check (id = public.app_profile_id() or public.app_role() = 'admin');

revoke update on public.profiles from authenticated;
grant update (nama) on public.profiles to authenticated;

-- 3. semesters, courses, holidays, classes, class_schedules: baca semua login, tulis admin
create policy semesters_select on public.semesters for select to authenticated using (true);
create policy semesters_admin_write on public.semesters for all
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

create policy courses_select on public.courses for select to authenticated using (true);
create policy courses_admin_write on public.courses for all
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

create policy holidays_select on public.holidays for select to authenticated using (true);
create policy holidays_admin_write on public.holidays for all
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

create policy classes_select on public.classes for select to authenticated using (true);
create policy classes_admin_write on public.classes for all
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

create policy class_schedules_select on public.class_schedules for select to authenticated using (true);
create policy class_schedules_admin_write on public.class_schedules for all
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- 4. enrollments: admin, dosen kelas, atau mahasiswa bersangkutan
create policy enrollments_select on public.enrollments for select using (
  public.app_role() = 'admin'
  or mahasiswa_id = public.app_profile_id()
  or exists (
    select 1 from public.classes c
    where c.id = enrollments.class_id and c.dosen_id = public.app_profile_id()
  )
);
create policy enrollments_admin_insert on public.enrollments for insert
  with check (public.app_role() = 'admin');
create policy enrollments_admin_delete on public.enrollments for delete
  using (public.app_role() = 'admin');

-- 5. sessions: admin, dosen pengampu, atau mahasiswa terdaftar
create policy sessions_select on public.sessions for select using (
  public.app_role() = 'admin'
  or exists (
    select 1 from public.classes c
    where c.id = sessions.class_id and c.dosen_id = public.app_profile_id()
  )
  or exists (
    select 1 from public.enrollments e
    where e.class_id = sessions.class_id and e.mahasiswa_id = public.app_profile_id()
  )
);

create policy sessions_admin_update on public.sessions for update
  using (public.app_role() = 'admin')
  with check (public.app_role() = 'admin');

-- 6. session_confirmations: admin, dosen kelas, mahasiswa kelas
create policy session_confirmations_select on public.session_confirmations for select using (
  public.app_role() = 'admin'
  or exists (
    select 1 from public.sessions s
    join public.classes c on c.id = s.class_id
    where s.id = session_confirmations.session_id and c.dosen_id = public.app_profile_id()
  )
  or exists (
    select 1 from public.sessions s
    join public.enrollments e on e.class_id = s.class_id
    where s.id = session_confirmations.session_id and e.mahasiswa_id = public.app_profile_id()
  )
);

-- 7. notifications: pemilik saja
create policy notifications_select on public.notifications for select
  using (user_id = public.app_profile_id());

create policy notifications_mark_read on public.notifications for update
  using (user_id = public.app_profile_id())
  with check (user_id = public.app_profile_id());

create policy notifications_delete on public.notifications for delete
  using (user_id = public.app_profile_id());

revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- 8. push_subscriptions: pemilik saja
create policy push_sub_own on public.push_subscriptions for all
  using (profile_id = public.app_profile_id())
  with check (profile_id = public.app_profile_id());

-- 9. admin_logs: admin saja (baca)
create policy admin_logs_select on public.admin_logs for select
  using (public.app_role() = 'admin');