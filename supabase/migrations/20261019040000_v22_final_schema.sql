-- =========================================================
-- MIGRASI FINAL SYSPRO v2.2 & A.1
-- File: 20261019040000_v22_final_schema.sql
-- =========================================================

-- 1. ANGKATAN (COHORTS)
create table if not exists public.cohorts (
  id          uuid primary key default gen_random_uuid(),
  tahun       smallint not null unique check (tahun between 2000 and 2100),
  nama        text not null,
  aktif       boolean not null default true,
  created_at  timestamptz not null default now()
);

-- 2. KELOMPOK DALAM ANGKATAN (STUDENT_GROUPS)
create table if not exists public.student_groups (
  id          uuid primary key default gen_random_uuid(),
  cohort_id   uuid not null references public.cohorts(id) on delete restrict,
  nama        text not null,
  created_at  timestamptz not null default now(),
  unique (cohort_id, nama)
);

-- 3. PERUBAHAN PROFILES
alter table public.profiles
  add column if not exists group_id uuid references public.student_groups(id) on delete restrict;

alter table public.profiles drop constraint if exists profiles_group_mahasiswa;
alter table public.profiles add constraint profiles_group_mahasiswa check (
  (role = 'mahasiswa' and group_id is not null)
  or (role <> 'mahasiswa' and group_id is null)
);

create index if not exists profiles_group_idx on public.profiles (group_id);

-- 4. PERUBAHAN CLASSES
alter table public.classes
  drop column if exists nama_kelas cascade;

alter table public.classes
  add column if not exists group_id uuid references public.student_groups(id) on delete restrict,
  add column if not exists jumlah_pertemuan smallint not null default 16 check (jumlah_pertemuan between 1 and 30);

alter table public.classes drop constraint if exists classes_course_id_semester_id_nama_kelas_key;
alter table public.classes drop constraint if exists classes_course_id_semester_id_group_id_key;
alter table public.classes add constraint classes_course_id_semester_id_group_id_key unique (course_id, semester_id, group_id);

create index if not exists classes_semester_group_idx on public.classes (semester_id, group_id);

-- 5. PERUBAHAN ENROLLMENTS
alter table public.enrollments
  add column if not exists sumber text not null default 'kelompok' check (sumber in ('kelompok', 'manual'));

create index if not exists enrollments_mahasiswa_idx on public.enrollments (mahasiswa_id);
create index if not exists enrollments_class_idx     on public.enrollments (class_id);

-- 6. PERUBAHAN HOLIDAYS
alter table public.holidays
  add column if not exists is_libur_kuliah boolean not null default false;

-- 7. PERUBAHAN SESSIONS
alter table public.sessions
  add column if not exists pertemuan_ke smallint,
  add column if not exists jenis text default 'reguler',
  add column if not exists pengganti_dari_id uuid references public.sessions(id) on delete set null,
  add column if not exists ruangan text,
  add column if not exists link_online text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references public.profiles(id) on delete set null,
  add column if not exists cancel_source text,
  add column if not exists cancel_reason text,
  add column if not exists restored_at timestamptz;

alter table public.sessions drop constraint if exists sessions_jenis_check;
alter table public.sessions add constraint sessions_jenis_check
  check (jenis in ('reguler', 'uts', 'uas'));

alter table public.sessions drop constraint if exists sessions_cancel_source_check;
alter table public.sessions add constraint sessions_cancel_source_check
  check (cancel_source in ('admin', 'libur', 'tidak_ada'));

alter table public.sessions drop constraint if exists sessions_schedule_id_tanggal_key;
alter table public.sessions drop constraint if exists sessions_class_id_pertemuan_ke_key;

drop index if exists public.sessions_pertemuan_aktif;
create unique index sessions_pertemuan_aktif
  on public.sessions (class_id, pertemuan_ke) where status <> 'dibatalkan';

-- 8. TAGIHAN_PENGGANTI
create table if not exists public.tagihan_pengganti (
  id                   uuid primary key default gen_random_uuid(),
  session_id           uuid not null unique references public.sessions(id) on delete cascade,
  class_id             uuid not null references public.classes(id) on delete cascade,
  dosen_id             uuid not null references public.profiles(id) on delete restrict,
  pertemuan_ke         smallint not null,
  status               text not null default 'menunggu'
                         check (status in ('menunggu', 'diajukan', 'terjadwal', 'kedaluwarsa', 'dibatalkan')),
  tenggat_at           timestamptz not null,
  next_reminder_at     timestamptz,
  reminder_count       int not null default 0,
  tenggat_notif_at     timestamptz,
  usulan_mulai_at      timestamptz,
  usulan_selesai_at    timestamptz,
  diajukan_at          timestamptz,
  diajukan_oleh        uuid references public.profiles(id) on delete set null,
  ditolak_at           timestamptz,
  ditolak_alasan       text,
  session_pengganti_id uuid unique references public.sessions(id) on delete set null,
  dijadwalkan_at       timestamptz,
  dijadwalkan_oleh     uuid references public.profiles(id) on delete set null,
  created_at           timestamptz not null default now(),
  check ((status = 'terjadwal') = (session_pengganti_id is not null)),
  check ((status = 'diajukan') = (usulan_mulai_at is not null)),
  check (usulan_selesai_at is null or usulan_selesai_at > usulan_mulai_at)
);
create index if not exists tagihan_dosen_idx on public.tagihan_pengganti (dosen_id, status);
create index if not exists tagihan_cron_idx  on public.tagihan_pengganti (next_reminder_at)
  where status = 'menunggu';

-- 9. PERUBAHAN NOTIFICATIONS
alter table public.notifications drop constraint if exists notifications_tipe_check;
alter table public.notifications add constraint notifications_tipe_check check (tipe in (
  'pengingat_dosen', 'konfirmasi_mode', 'ubah_mode', 'mode_default',
  'ringkasan_admin', 'pembatalan_sesi', 'pemulihan_sesi',
  'tagihan_pengganti', 'jadwal_pengganti', 'pengajuan_pengganti', 'info_lokasi'
));

-- =========================================================
-- 10. HELPER FUNCTIONS
-- =========================================================

create or replace function public.app_profile_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles where auth_user_id = auth.uid()
$$;

create or replace function public.app_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where auth_user_id = auth.uid()
$$;

create or replace function public.format_tanggal_jam_id(t timestamptz)
returns text language sql stable set search_path = public as $$
  select
    (array['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'])
      [extract(dow from t at time zone 'Asia/Jakarta')::int + 1]
    || ', ' || to_char(t at time zone 'Asia/Jakarta', 'DD')
    || ' ' || (array['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'])
      [extract(month from t at time zone 'Asia/Jakarta')::int]
    || ' ' || to_char(t at time zone 'Asia/Jakarta', 'YYYY')
    || ', ' || to_char(t at time zone 'Asia/Jakarta', 'HH24.MI')
$$;

-- Penerima notifikasi kelas (membaca enrollments, PRD A.1.2)
create or replace function public.daftar_penerima_kelas(p_class_id uuid)
returns setof uuid
language sql stable security definer set search_path = public as $$
  select mahasiswa_id
  from public.enrollments
  where class_id = p_class_id;
$$;

-- Mahasiswa ikut kelas untuk RLS (PRD A.1.9)
create or replace function public.mahasiswa_ikut_kelas(p_class_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.daftar_penerima_kelas(p_class_id) id
    where id = public.app_profile_id()
  );
$$;

-- Label kelompok untuk notifikasi, contoh: "2025 A"
create or replace function public.nama_kelompok(p_class_id uuid)
returns text
language sql stable security definer set search_path = public as $$
  select coh.tahun::text || ' ' || sg.nama
  from public.classes c
  join public.student_groups sg on sg.id = c.group_id
  join public.cohorts coh on coh.id = sg.cohort_id
  where c.id = p_class_id;
$$;

-- Jam penagihan berikutnya: 06.30 WIB hari WIB berikutnya
create or replace function public.jam_penagihan_berikut(t timestamptz)
returns timestamptz language sql immutable as $$
  select ((((t at time zone 'Asia/Jakarta')::date + 1) + time '06:30') at time zone 'Asia/Jakarta');
$$;

-- Format teks lokasi
create or replace function public.format_lokasi(p_ruangan text, p_link text)
returns text language sql immutable as $$
  select trim(both ' ' from
    coalesce('Ruangan: ' || nullif(trim(p_ruangan), '') || '. ', '')
    || coalesce('Link online: ' || nullif(trim(p_link), '') || '.', ''));
$$;

revoke all on function public.daftar_penerima_kelas(uuid) from public, anon, authenticated;
revoke all on function public.mahasiswa_ikut_kelas(uuid)  from public, anon;
revoke all on function public.nama_kelompok(uuid)         from public, anon;
grant execute on function public.mahasiswa_ikut_kelas(uuid) to authenticated;
grant execute on function public.nama_kelompok(uuid)        to authenticated;

-- =========================================================
-- 11. TRIGGERS
-- =========================================================

-- Trigger enrollment otomatis saat kelas dibuat (PRD A.1.6)
create or replace function public.enroll_kelompok_kelas()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.enrollments (class_id, mahasiswa_id, sumber)
  select new.id, p.id, 'kelompok'
  from public.profiles p
  where p.role = 'mahasiswa' and p.group_id = new.group_id
  on conflict (class_id, mahasiswa_id) do nothing;
  return new;
end $$;

drop trigger if exists classes_enroll_kelompok on public.classes;
create trigger classes_enroll_kelompok
  after insert on public.classes
  for each row execute function public.enroll_kelompok_kelas();

-- Trigger guard sessions
create or replace function public.guard_session_mode()
returns trigger language plpgsql as $$
begin
  if (new.mode         is distinct from old.mode
   or new.status       is distinct from old.status
   or new.cancelled_at is distinct from old.cancelled_at)
     and coalesce(current_setting('app.via_rpc', true), 'off') <> 'on' then
    raise exception 'Mode dan status sesi hanya boleh diubah lewat fungsi resmi';
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists sessions_guard_mode on public.sessions;
create trigger sessions_guard_mode
  before update on public.sessions
  for each row execute function public.guard_session_mode();

-- Trigger immutability session_confirmations
create or replace function public.guard_session_confirmations_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'Riwayat konfirmasi bersifat immutable dan tidak boleh diubah atau dihapus';
end $$;

drop trigger if exists session_confirmations_immutable on public.session_confirmations;
create trigger session_confirmations_immutable
  before update or delete on public.session_confirmations
  for each row execute function public.guard_session_confirmations_immutable();

-- =========================================================
-- 12. TAGIHAN PENGGANTI DAN PEMBATALAN INTERNAL
-- =========================================================

-- Buat tagihan pengganti saat sesi dibatalkan karena libur atau tidak_ada (PRD A.1.8)
create or replace function public.buat_tagihan(p_session_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_s       public.sessions%rowtype;
  v_c       public.classes%rowtype;
  v_uts_ke  smallint;
  v_uas_ke  smallint;
  v_uts     timestamptz;
  v_uas     timestamptz;
  v_tenggat timestamptz;
begin
  select * into v_s from public.sessions where id = p_session_id;
  select * into v_c from public.classes where id = v_s.class_id;

  select pertemuan_ke, mulai_at into v_uts_ke, v_uts
    from public.sessions
   where class_id = v_c.id and jenis = 'uts' and pengganti_dari_id is null;
  select pertemuan_ke, mulai_at into v_uas_ke, v_uas
    from public.sessions
   where class_id = v_c.id and jenis = 'uas' and pengganti_dari_id is null;

  if v_s.jenis in ('uts', 'uas') then
    v_tenggat := v_s.mulai_at;
  elsif v_uts_ke is not null and v_s.pertemuan_ke < v_uts_ke then
    v_tenggat := v_uts;
  elsif v_uas_ke is not null and v_s.pertemuan_ke < v_uas_ke then
    v_tenggat := v_uas;
  else
    v_tenggat := v_s.mulai_at;
  end if;

  insert into public.tagihan_pengganti
    (session_id, class_id, dosen_id, pertemuan_ke, tenggat_at, next_reminder_at)
  values
    (v_s.id, v_c.id, v_c.dosen_id, v_s.pertemuan_ke, v_tenggat,
     case when now() < v_tenggat
          then greatest(now(), v_s.mulai_at - interval '24 hours')
          else null end)
  on conflict (session_id) do nothing;
end $$;

revoke all on function public.buat_tagihan(uuid) from public, anon, authenticated;

-- Buka ulang tagihan jika sesi pengganti dibatalkan (PRD A.1.8)
create or replace function public.buka_ulang_tagihan(p_session_pengganti_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.tagihan_pengganti t
     set status               = 'menunggu',
         session_pengganti_id = null,
         dijadwalkan_at       = null,
         dijadwalkan_oleh     = null,
         next_reminder_at     = case when now() < t.tenggat_at then now() else null end
   where t.session_pengganti_id = p_session_pengganti_id;
end $$;

revoke all on function public.buka_ulang_tagihan(uuid) from public, anon, authenticated;

-- Pembatalan sesi internal (PRD 8.8, A.1.8, A.1.14)
create or replace function public.batalkan_sesi_internal(
  p_session_id uuid,
  p_source     text,      -- 'admin', 'libur', 'tidak_ada'
  p_keterangan text,
  p_actor      uuid
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_s     public.sessions%rowtype;
  v_mk    text;
  v_cls   public.classes%rowtype;
  v_n     int;
  v_aksi  text;
begin
  select * into v_s from public.sessions where id = p_session_id for update;

  if not found
     or v_s.status in ('dibatalkan', 'selesai')
     or now() >= v_s.mulai_at then
    return false;
  end if;

  perform set_config('app.via_rpc', 'on', true);

  update public.sessions
     set status = 'dibatalkan',
         cancelled_at = now(),
         cancelled_by = p_actor,
         cancel_source = p_source,
         cancel_reason = p_keterangan,
         next_reminder_at = null,
         updated_at = now()
   where id = p_session_id;

  perform set_config('app.via_rpc', 'off', true);

  select * into v_cls from public.classes where id = v_s.class_id;
  select co.nama into v_mk from public.courses co where co.id = v_cls.course_id;

  insert into public.notifications (user_id, session_id, tipe, judul, isi, aksi_url)
  select
    p.mahasiswa_id, p_session_id, 'pembatalan_sesi', 'Kuliah dibatalkan',
    'Dibatalkan: ' || v_mk || ', Kelas ' || public.nama_kelompok(v_cls.id)
      || ', pertemuan ' || v_s.pertemuan_ke || ' dari ' || v_cls.jumlah_pertemuan
      || ', ' || public.format_tanggal_jam_id(v_s.mulai_at) || '.'
      || coalesce(' Keterangan: ' || p_keterangan || '.', ''),
    '/mahasiswa/sesi/' || p_session_id
  from public.daftar_penerima_kelas(v_cls.id) p(mahasiswa_id);

  get diagnostics v_n = row_count;

  -- // TODO(keputusan A12): mode tidak_ada membuat tagihan pengganti sama seperti libur
  if p_source in ('libur', 'tidak_ada') and v_s.pengganti_dari_id is null then
    perform public.buat_tagihan(p_session_id);
  end if;

  if v_s.pengganti_dari_id is not null then
    perform public.buka_ulang_tagihan(p_session_id);
  end if;

  v_aksi := case p_source
    when 'admin'     then 'batalkan_sesi'
    when 'libur'     then 'batalkan_sesi_libur'
    when 'tidak_ada' then 'batalkan_sesi_tidak_ada'
  end;

  insert into public.admin_logs (actor_id, aksi, target_tipe, target_id, detail)
  values (
    p_actor,
    v_aksi,
    'session', p_session_id,
    jsonb_build_object('keterangan', p_keterangan, 'penerima', v_n)
  );

  return true;
end $$;

revoke all on function public.batalkan_sesi_internal(uuid, text, text, uuid) from public, anon, authenticated;

-- =========================================================
-- 13. GENERATOR SESI
-- =========================================================

create or replace function public.generate_sessions(p_semester_id uuid)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_sem    public.semesters%rowtype;
  v_n      int;
begin
  if public.app_role() is distinct from 'admin' then
    raise exception 'Tidak diizinkan';
  end if;

  select * into v_sem from public.semesters where id = p_semester_id;
  if not found then
    raise exception 'Semester tidak ditemukan';
  end if;
  if v_sem.tanggal_mulai <= (now() at time zone 'Asia/Jakarta')::date then
    raise exception 'Jadwal hanya bisa dibuat sebelum semester dimulai';
  end if;
  if exists (select 1 from public.sessions s
             join public.classes c on c.id = s.class_id
             where c.semester_id = p_semester_id) then
    raise exception 'Jadwal semester ini sudah dibuat';
  end if;

  with kandidat as (
    select
      cl.id               as class_id,
      cs.id               as schedule_id,
      cl.jumlah_pertemuan as n,
      d::date             as tanggal,
      cs.jam_mulai,
      cs.jam_selesai,
      row_number() over (partition by cl.id order by d::date, cs.jam_mulai) as rn
    from public.classes cl
    join public.class_schedules cs on cs.class_id = cl.id
    cross join generate_series(v_sem.tanggal_mulai, v_sem.tanggal_selesai, interval '1 day') d
    where cl.semester_id = p_semester_id
      and extract(dow from d)::smallint = cs.hari
  )
  insert into public.sessions
    (class_id, schedule_id, pertemuan_ke, jenis, tanggal, mulai_at, selesai_at, cutoff_at, next_reminder_at)
  select
    class_id, schedule_id, rn,
    case when rn = n then 'uas'
         when rn = n / 2 then 'uts'
         else 'reguler' end,
    tanggal,
    (tanggal + jam_mulai)   at time zone 'Asia/Jakarta',
    (tanggal + jam_selesai) at time zone 'Asia/Jakarta',
    (tanggal + jam_mulai)   at time zone 'Asia/Jakarta' - interval '1 hour',
    greatest(now(), (tanggal + jam_mulai) at time zone 'Asia/Jakarta' - interval '24 hours')
  from kandidat
  where rn <= n;

  get diagnostics v_n = row_count;

  -- Sesi pada tanggal libur berflag langsung dibatalkan dan membuat tagihan pengganti (PRD A.1.4)
  perform public.batalkan_sesi_internal(s.id, 'libur', h.keterangan, public.app_profile_id())
  from public.sessions s
  join public.holidays h on h.tanggal = s.tanggal and h.is_libur_kuliah
  join public.classes c on c.id = s.class_id
  where c.semester_id = p_semester_id
    and s.status = 'menunggu';

  insert into public.admin_logs (actor_id, aksi, target_tipe, target_id, detail)
  values (public.app_profile_id(), 'generate_sesi', 'semester', p_semester_id,
          jsonb_build_object('jumlah_baru', v_n));

  return v_n;
end $$;

revoke all on function public.generate_sessions(uuid) from public, anon;
grant execute on function public.generate_sessions(uuid) to authenticated;

-- =========================================================
-- 14. RPC MODE KULIAH & DEFAULT
-- =========================================================

create or replace function public.set_session_mode(p_session_id uuid, p_mode text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_me       public.profiles%rowtype;
  v_sesi     public.sessions%rowtype;
  v_cls      public.classes%rowtype;
  v_source   text;
  v_tipe     text;
  v_mk       text;
  v_label    text;
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

  select * into v_cls from public.classes where id = v_sesi.class_id;

  if v_me.role = 'admin' then
    v_source := 'admin';
  elsif v_me.role = 'dosen' and v_me.id = v_cls.dosen_id then
    v_source := 'dosen';
  else
    raise exception 'Tidak diizinkan';
  end if;

  -- Mode sama: tidak ada perubahan, riwayat, atau notifikasi
  if v_sesi.mode is not distinct from p_mode then
    return;
  end if;

  -- // TODO(keputusan A12): Penanganan cabang Tidak Ada (PRD A.1.14)
  if p_mode = 'tidak_ada' then
    perform set_config('app.via_rpc', 'on', true);

    update public.sessions
       set mode = 'tidak_ada', mode_source = v_source, updated_at = now()
     where id = p_session_id;

    perform set_config('app.via_rpc', 'off', true);

    insert into public.session_confirmations
      (session_id, actor_id, actor_role, mode_lama, mode_baru, sumber)
    values
      (p_session_id, v_me.id, v_me.role, v_sesi.mode, 'tidak_ada', v_source);

    perform public.batalkan_sesi_internal(p_session_id, 'tidak_ada', 'Kelas tidak ada', v_me.id);
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

  select co.nama into v_mk from public.courses co where co.id = v_cls.course_id;

  v_label := case p_mode when 'online' then 'Online' else 'Offline' end;
  v_tipe := case when v_sesi.mode is null then 'konfirmasi_mode' else 'ubah_mode' end;

  insert into public.notifications (user_id, session_id, tipe, judul, isi, aksi_url)
  select
    p.mahasiswa_id,
    p_session_id,
    v_tipe,
    case when v_tipe = 'ubah_mode' then 'Diubah' else 'Konfirmasi kuliah' end,
    case when v_tipe = 'ubah_mode' then 'Diubah: ' else '' end
      || v_mk || ', Kelas ' || public.nama_kelompok(v_cls.id)
      || ', pertemuan ' || v_sesi.pertemuan_ke || ' dari ' || v_cls.jumlah_pertemuan
      || ', ' || public.format_tanggal_jam_id(v_sesi.mulai_at)
      || '. Mode' || case when v_tipe = 'ubah_mode' then ' sekarang' else '' end
      || ': ' || v_label || '.',
    '/mahasiswa/sesi/' || p_session_id
  from public.daftar_penerima_kelas(v_cls.id) p(mahasiswa_id);

  insert into public.admin_logs (actor_id, aksi, target_tipe, target_id, detail)
  select v_me.id, 'set_mode', 'session', p_session_id,
         jsonb_build_object('mode_lama', v_sesi.mode, 'mode_baru', p_mode, 'sumber', v_source)
  where v_me.role = 'admin';
end $$;

revoke all on function public.set_session_mode(uuid, text) from public, anon;
grant execute on function public.set_session_mode(uuid, text) to authenticated;

-- Default mode saat cutoff
create or replace function public.apply_default_mode(p_session_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_s     public.sessions%rowtype;
  v_mk    text;
  v_cls   public.classes%rowtype;
begin
  select * into v_s from public.sessions where id = p_session_id for update;

  if not found or v_s.mode is not null or v_s.status <> 'menunggu' then
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
  values (p_session_id, null, 'system', null, 'offline', 'default');

  select * into v_cls from public.classes where id = v_s.class_id;
  select co.nama into v_mk from public.courses co where co.id = v_cls.course_id;

  insert into public.notifications (user_id, session_id, tipe, judul, isi, aksi_url)
  select
    p.mahasiswa_id, p_session_id, 'mode_default', 'Mode default',
    v_mk || ', Kelas ' || public.nama_kelompok(v_cls.id)
      || ', pertemuan ' || v_s.pertemuan_ke || ' dari ' || v_cls.jumlah_pertemuan
      || ', ' || public.format_tanggal_jam_id(v_s.mulai_at) || '. Mode default: Offline.',
    '/mahasiswa/sesi/' || p_session_id
  from public.daftar_penerima_kelas(v_cls.id) p(mahasiswa_id);

  return true;
end $$;

revoke all on function public.apply_default_mode(uuid) from public, anon, authenticated;

-- =========================================================
-- 15. RPC ADMIN: BATALKAN DAN PULIHKAN SESI
-- =========================================================

create or replace function public.admin_cancel_session(p_session_id uuid, p_keterangan text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.app_role() is distinct from 'admin' then
    raise exception 'Tidak diizinkan';
  end if;

  if not public.batalkan_sesi_internal(
       p_session_id, 'admin', nullif(trim(p_keterangan), ''), public.app_profile_id()) then
    raise exception 'Sesi tidak bisa dibatalkan (sudah dibatalkan, sudah dimulai, atau selesai)';
  end if;
end $$;

create or replace function public.admin_restore_session(p_session_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_s      public.sessions%rowtype;
  v_mk     text;
  v_cls    public.classes%rowtype;
  v_status text;
begin
  if public.app_role() is distinct from 'admin' then
    raise exception 'Tidak diizinkan';
  end if;

  select * into v_s from public.sessions where id = p_session_id for update;

  if not found or v_s.status <> 'dibatalkan' or now() >= v_s.mulai_at then
    raise exception 'Sesi tidak bisa dipulihkan';
  end if;

  if v_s.cancel_source = 'libur' and exists (
       select 1 from public.holidays h
       where h.tanggal = v_s.tanggal and h.is_libur_kuliah) then
    raise exception 'Tanggal ini masih ditetapkan sebagai hari libur perkuliahan';
  end if;

  -- // TODO(keputusan A12): Pemulihan sesi yang dibatalkan dengan Tidak Ada (PRD A.1.14)
  if v_s.cancel_source = 'tidak_ada' then
    if exists (select 1 from public.tagihan_pengganti t
                where t.session_id = p_session_id and t.status = 'terjadwal') then
      raise exception 'Kelas pengganti sudah dijadwalkan. Batalkan kelas pengganti terlebih dahulu';
    end if;

    update public.tagihan_pengganti
       set status = 'dibatalkan', next_reminder_at = null
     where session_id = p_session_id and status in ('menunggu', 'diajukan');

    perform set_config('app.via_rpc', 'on', true);
    update public.sessions
       set status = 'menunggu', mode = null, mode_source = null,
           cancelled_at = null, cancelled_by = null, cancel_source = null,
           cancel_reason = null, restored_at = now(),
           next_reminder_at = greatest(now(), mulai_at - interval '24 hours'),
           updated_at = now()
     where id = p_session_id;
    perform set_config('app.via_rpc', 'off', true);

    v_status := 'menunggu';
  else
    v_status := case
      when v_s.mode is null then 'menunggu'
      when v_s.mode_source = 'default' then 'default_offline'
      else 'terkonfirmasi' end;

    perform set_config('app.via_rpc', 'on', true);

    update public.sessions
       set status = v_status,
           cancelled_at = null,
           cancelled_by = null,
           cancel_source = null,
           cancel_reason = null,
           restored_at = now(),
           next_reminder_at = case
             when v_s.mode is null then greatest(now(), v_s.mulai_at - interval '24 hours')
             else null end,
           updated_at = now()
     where id = p_session_id;

    perform set_config('app.via_rpc', 'off', true);
  end if;

  select * into v_cls from public.classes where id = v_s.class_id;
  select co.nama into v_mk from public.courses co where co.id = v_cls.course_id;

  insert into public.notifications (user_id, session_id, tipe, judul, isi, aksi_url)
  select
    p.mahasiswa_id, p_session_id, 'pemulihan_sesi', 'Kuliah dipulihkan',
    'Dipulihkan: ' || v_mk || ', Kelas ' || public.nama_kelompok(v_cls.id)
      || ', pertemuan ' || v_s.pertemuan_ke || ' dari ' || v_cls.jumlah_pertemuan
      || ', ' || public.format_tanggal_jam_id(v_s.mulai_at) || '. Jadwal kembali aktif.',
    '/mahasiswa/sesi/' || p_session_id
  from public.daftar_penerima_kelas(v_cls.id) p(mahasiswa_id);

  insert into public.admin_logs (actor_id, aksi, target_tipe, target_id, detail)
  values (public.app_profile_id(), 'pulihkan_sesi', 'session', p_session_id,
          jsonb_build_object('status_baru', v_status));
end $$;

revoke all on function public.admin_cancel_session(uuid, text) from public, anon;
revoke all on function public.admin_restore_session(uuid)      from public, anon;
grant execute on function public.admin_cancel_session(uuid, text) to authenticated;
grant execute on function public.admin_restore_session(uuid)      to authenticated;

-- =========================================================
-- 16. VALIDASI & PENJADWALAN KELAS PENGGANTI (PRD A.1.7)
-- =========================================================

create or replace function public.validasi_jadwal_pengganti(
  p_class_id uuid, p_mulai_at timestamptz, p_selesai_at timestamptz
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_cls     public.classes%rowtype;
  v_sem     public.semesters%rowtype;
  v_tanggal date := (p_mulai_at at time zone 'Asia/Jakarta')::date;
begin
  select * into v_cls from public.classes where id = p_class_id;
  select * into v_sem from public.semesters where id = v_cls.semester_id;

  if p_selesai_at <= p_mulai_at then
    raise exception 'Jam selesai harus setelah jam mulai';
  end if;
  if p_mulai_at < now() + interval '2 hours' then
    raise exception 'Kelas pengganti minimal dijadwalkan 2 jam dari sekarang';
  end if;
  if v_tanggal > v_sem.tanggal_selesai then
    raise exception 'Kelas pengganti harus sebelum akhir semester';
  end if;
  if exists (select 1 from public.holidays h
             where h.tanggal = v_tanggal and h.is_libur_kuliah) then
    raise exception 'Tanggal tersebut hari libur perkuliahan';
  end if;
  if exists (
    select 1 from public.sessions s
    join public.classes c on c.id = s.class_id
    where c.dosen_id = v_cls.dosen_id
      and s.status not in ('dibatalkan', 'selesai')
      and tstzrange(s.mulai_at, s.selesai_at) && tstzrange(p_mulai_at, p_selesai_at)
  ) then
    raise exception 'Jadwal bentrok dengan kelas lain dosen';
  end if;
  if exists (
    select 1
    from public.enrollments e_ini
    join public.enrollments e_lain on e_lain.mahasiswa_id = e_ini.mahasiswa_id
                                  and e_lain.class_id <> p_class_id
    join public.sessions s on s.class_id = e_lain.class_id
    where e_ini.class_id = p_class_id
      and s.status not in ('dibatalkan', 'selesai')
      and tstzrange(s.mulai_at, s.selesai_at) && tstzrange(p_mulai_at, p_selesai_at)
  ) then
    raise exception 'Jadwal bentrok dengan kelas lain mahasiswa';
  end if;
end $$;

revoke all on function public.validasi_jadwal_pengganti(uuid, timestamptz, timestamptz) from public, anon, authenticated;

-- Buat sesi pengganti (internal)
create or replace function public.buat_sesi_pengganti(
  p_tagihan_id uuid, p_mulai_at timestamptz, p_selesai_at timestamptz,
  p_ruangan text, p_link_online text, p_actor uuid
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_t    public.tagihan_pengganti%rowtype;
  v_asal public.sessions%rowtype;
  v_cls  public.classes%rowtype;
  v_mk   text;
  v_baru uuid;
begin
  if nullif(trim(p_ruangan), '') is null and nullif(trim(p_link_online), '') is null then
    raise exception 'Isi ruangan atau link online';
  end if;

  select * into v_t from public.tagihan_pengganti where id = p_tagihan_id for update;
  if not found or v_t.status not in ('menunggu', 'diajukan') then
    raise exception 'Tagihan tidak bisa dijadwalkan';
  end if;

  select * into v_cls from public.classes where id = v_t.class_id;
  perform public.validasi_jadwal_pengganti(v_cls.id, p_mulai_at, p_selesai_at);

  select * into v_asal from public.sessions where id = v_t.session_id;
  select co.nama into v_mk from public.courses co where co.id = v_cls.course_id;

  insert into public.sessions
    (class_id, schedule_id, pertemuan_ke, jenis, tanggal, mulai_at, selesai_at,
     cutoff_at, next_reminder_at, pengganti_dari_id, ruangan, link_online)
  values
    (v_cls.id, v_asal.schedule_id, v_t.pertemuan_ke, v_asal.jenis,
     (p_mulai_at at time zone 'Asia/Jakarta')::date, p_mulai_at, p_selesai_at,
     p_mulai_at - interval '1 hour', greatest(now(), p_mulai_at - interval '24 hours'),
     v_asal.id, nullif(trim(p_ruangan), ''), nullif(trim(p_link_online), ''))
  returning id into v_baru;

  update public.tagihan_pengganti
     set status = 'terjadwal',
         session_pengganti_id = v_baru,
         dijadwalkan_at = now(),
         dijadwalkan_oleh = p_actor,
         next_reminder_at = null,
         usulan_mulai_at = null,
         usulan_selesai_at = null
   where id = p_tagihan_id;

  insert into public.notifications (user_id, session_id, tipe, judul, isi, aksi_url)
  select p.mahasiswa_id, v_baru, 'jadwal_pengganti', 'Kelas pengganti',
    'Kelas pengganti: ' || v_mk || ', Kelas ' || public.nama_kelompok(v_cls.id)
      || ', pertemuan ' || v_t.pertemuan_ke || ' dari ' || v_cls.jumlah_pertemuan
      || ', ' || public.format_tanggal_jam_id(p_mulai_at) || '. '
      || public.format_lokasi(p_ruangan, p_link_online),
    '/mahasiswa/sesi/' || v_baru
  from public.daftar_penerima_kelas(v_cls.id) p(mahasiswa_id);

  insert into public.notifications (user_id, session_id, tipe, judul, isi, aksi_url)
  values (v_cls.dosen_id, v_baru, 'info_lokasi', 'Lokasi kelas pengganti',
    'Kelas pengganti disetujui: ' || v_mk || ', Kelas ' || public.nama_kelompok(v_cls.id)
      || ', ' || public.format_tanggal_jam_id(p_mulai_at) || '. '
      || public.format_lokasi(p_ruangan, p_link_online),
    '/dosen/sesi/' || v_baru);

  insert into public.admin_logs (actor_id, aksi, target_tipe, target_id, detail)
  values (p_actor, 'jadwalkan_pengganti', 'session', v_baru,
          jsonb_build_object('tagihan_id', p_tagihan_id, 'asal', v_t.session_id));

  return v_baru;
end $$;

revoke all on function public.buat_sesi_pengganti(uuid, timestamptz, timestamptz, text, text, uuid) from public, anon, authenticated;

-- Dosen mengajukan jadwal pengganti
create or replace function public.ajukan_pengganti(
  p_tagihan_id uuid, p_mulai_at timestamptz, p_selesai_at timestamptz
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_me public.profiles%rowtype;
  v_t  public.tagihan_pengganti%rowtype;
  v_cls public.classes%rowtype;
  v_mk text;
begin
  select * into v_me from public.profiles where auth_user_id = auth.uid();
  if not found or v_me.role <> 'dosen' then
    raise exception 'Tidak diizinkan';
  end if;

  select * into v_t from public.tagihan_pengganti where id = p_tagihan_id for update;
  if not found or v_t.status <> 'menunggu' then
    raise exception 'Tagihan tidak bisa diajukan';
  end if;

  select * into v_cls from public.classes where id = v_t.class_id;
  if v_cls.dosen_id <> v_me.id then
    raise exception 'Tidak diizinkan';
  end if;

  perform public.validasi_jadwal_pengganti(v_cls.id, p_mulai_at, p_selesai_at);

  update public.tagihan_pengganti
     set status = 'diajukan',
         usulan_mulai_at = p_mulai_at,
         usulan_selesai_at = p_selesai_at,
         diajukan_at = now(),
         diajukan_oleh = v_me.id,
         next_reminder_at = null
   where id = p_tagihan_id;

  select co.nama into v_mk from public.courses co where co.id = v_cls.course_id;

  insert into public.notifications (user_id, session_id, tipe, judul, isi, aksi_url)
  select pr.id, v_t.session_id, 'pengajuan_pengganti', 'Pengajuan kelas pengganti',
    'Diajukan: ' || v_mk || ', Kelas ' || public.nama_kelompok(v_cls.id)
      || ', ' || public.format_tanggal_jam_id(p_mulai_at) || '. Perlu ruangan atau link online.',
    '/admin/tagihan'
  from public.profiles pr where pr.role = 'admin';

  insert into public.admin_logs (actor_id, aksi, target_tipe, target_id, detail)
  values (v_me.id, 'ajukan_pengganti', 'tagihan', p_tagihan_id,
          jsonb_build_object('mulai_at', p_mulai_at));
end $$;

-- Admin menyetujui pengajuan
create or replace function public.admin_setujui_pengganti(
  p_tagihan_id uuid, p_ruangan text, p_link_online text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_t   public.tagihan_pengganti%rowtype;
  v_me  uuid := public.app_profile_id();
begin
  if public.app_role() is distinct from 'admin' then
    raise exception 'Tidak diizinkan';
  end if;
  select * into v_t from public.tagihan_pengganti where id = p_tagihan_id;
  if not found or v_t.status <> 'diajukan' then
    raise exception 'Tagihan tidak dalam status diajukan';
  end if;
  return public.buat_sesi_pengganti(
    p_tagihan_id, v_t.usulan_mulai_at, v_t.usulan_selesai_at, p_ruangan, p_link_online, v_me);
end $$;

-- Admin menolak pengajuan
create or replace function public.admin_tolak_pengganti(p_tagihan_id uuid, p_alasan text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_t   public.tagihan_pengganti%rowtype;
  v_cls public.classes%rowtype;
  v_alasan text := nullif(trim(p_alasan), '');
begin
  if public.app_role() is distinct from 'admin' then
    raise exception 'Tidak diizinkan';
  end if;
  if v_alasan is null then
    raise exception 'Alasan penolakan wajib diisi';
  end if;

  select * into v_t from public.tagihan_pengganti where id = p_tagihan_id for update;
  if not found or v_t.status <> 'diajukan' then
    raise exception 'Tagihan tidak dalam status diajukan';
  end if;

  update public.tagihan_pengganti
     set status = 'menunggu',
         usulan_mulai_at = null,
         usulan_selesai_at = null,
         ditolak_at = now(),
         ditolak_alasan = v_alasan,
         next_reminder_at = case when now() < tenggat_at then now() else null end
   where id = p_tagihan_id;

  select * into v_cls from public.classes where id = v_t.class_id;

  insert into public.notifications (user_id, session_id, tipe, judul, isi, aksi_url)
  values (v_cls.dosen_id, v_t.session_id, 'tagihan_pengganti', 'Pengajuan ditolak',
    'Pengajuan kelas pengganti ditolak: ' || v_alasan || ' Ajukan ulang.',
    '/dosen/tagihan');

  insert into public.admin_logs (actor_id, aksi, target_tipe, target_id, detail)
  values (public.app_profile_id(), 'tolak_pengganti', 'tagihan', p_tagihan_id,
          jsonb_build_object('alasan', v_alasan));
end $$;

-- Admin menjadwalkan langsung atas nama dosen
create or replace function public.admin_jadwalkan_pengganti(
  p_tagihan_id uuid, p_mulai_at timestamptz, p_selesai_at timestamptz,
  p_ruangan text, p_link_online text
) returns uuid language plpgsql security definer set search_path = public as $$
begin
  if public.app_role() is distinct from 'admin' then
    raise exception 'Tidak diizinkan';
  end if;
  return public.buat_sesi_pengganti(
    p_tagihan_id, p_mulai_at, p_selesai_at, p_ruangan, p_link_online, public.app_profile_id());
end $$;

revoke all on function public.ajukan_pengganti(uuid, timestamptz, timestamptz) from public, anon;
revoke all on function public.admin_setujui_pengganti(uuid, text, text) from public, anon;
revoke all on function public.admin_tolak_pengganti(uuid, text) from public, anon;
revoke all on function public.admin_jadwalkan_pengganti(uuid, timestamptz, timestamptz, text, text) from public, anon;
grant execute on function public.ajukan_pengganti(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_setujui_pengganti(uuid, text, text) to authenticated;
grant execute on function public.admin_tolak_pengganti(uuid, text) to authenticated;
grant execute on function public.admin_jadwalkan_pengganti(uuid, timestamptz, timestamptz, text, text) to authenticated;

-- =========================================================
-- 17. RPC LOKASI SESI, LIBUR, SALIN SEMESTER, PINDAH KELOMPOK
-- =========================================================

-- Admin set lokasi sesi
create or replace function public.admin_set_lokasi_sesi(
  p_session_id uuid, p_ruangan text, p_link_online text
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_s   public.sessions%rowtype;
  v_cls public.classes%rowtype;
  v_mk  text;
  v_ruangan text := nullif(trim(p_ruangan), '');
  v_link    text := nullif(trim(p_link_online), '');
begin
  if public.app_role() is distinct from 'admin' then
    raise exception 'Tidak diizinkan';
  end if;

  select * into v_s from public.sessions where id = p_session_id for update;
  if not found or v_s.status in ('dibatalkan', 'selesai') or now() >= v_s.mulai_at then
    raise exception 'Lokasi tidak bisa diubah untuk sesi ini';
  end if;
  if (v_ruangan is null and v_link is null) then
    raise exception 'Isi ruangan atau link online';
  end if;
  if v_s.ruangan is not distinct from v_ruangan and v_s.link_online is not distinct from v_link then
    return;
  end if;

  update public.sessions
     set ruangan = v_ruangan, link_online = v_link, updated_at = now()
   where id = p_session_id;

  select * into v_cls from public.classes where id = v_s.class_id;
  select co.nama into v_mk from public.courses co where co.id = v_cls.course_id;

  insert into public.notifications (user_id, session_id, tipe, judul, isi, aksi_url)
  select v_cls.dosen_id, p_session_id, 'info_lokasi', 'Lokasi kuliah',
    'Lokasi kuliah: ' || v_mk || ', Kelas ' || public.nama_kelompok(v_cls.id)
      || ', pertemuan ' || v_s.pertemuan_ke || ' dari ' || v_cls.jumlah_pertemuan
      || ', ' || public.format_tanggal_jam_id(v_s.mulai_at) || '. '
      || public.format_lokasi(v_ruangan, v_link),
    '/dosen/sesi/' || p_session_id;

  insert into public.notifications (user_id, session_id, tipe, judul, isi, aksi_url)
  select p.mahasiswa_id, p_session_id, 'info_lokasi', 'Lokasi kuliah',
    'Lokasi kuliah: ' || v_mk || ', Kelas ' || public.nama_kelompok(v_cls.id)
      || ', pertemuan ' || v_s.pertemuan_ke || ' dari ' || v_cls.jumlah_pertemuan
      || ', ' || public.format_tanggal_jam_id(v_s.mulai_at) || '. '
      || public.format_lokasi(v_ruangan, v_link),
    '/mahasiswa/sesi/' || p_session_id
  from public.daftar_penerima_kelas(v_cls.id) p(mahasiswa_id);

  insert into public.admin_logs (actor_id, aksi, target_tipe, target_id, detail)
  values (public.app_profile_id(), 'set_lokasi', 'session', p_session_id,
          jsonb_build_object('ruangan', v_ruangan, 'link_online', v_link));
end $$;

-- Pratinjau libur
create or replace function public.admin_preview_libur(p_tanggal date)
returns table (akan_dibatalkan int, sudah_berlangsung int)
language sql stable security definer set search_path = public as $$
  select
    count(*) filter (where s.mulai_at > now() and s.status not in ('dibatalkan', 'selesai'))::int,
    count(*) filter (where s.mulai_at <= now())::int
  from public.sessions s
  where s.tanggal = p_tanggal
    and public.app_role() = 'admin';
$$;

-- Tambah atau ubah libur
create or replace function public.admin_upsert_holiday(
  p_tanggal date,
  p_keterangan text,
  p_libur_kuliah boolean
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_ket   text := trim(p_keterangan);
  v_sesi  uuid;
  v_n     int := 0;
  v_actor uuid := public.app_profile_id();
begin
  if public.app_role() is distinct from 'admin' then
    raise exception 'Tidak diizinkan';
  end if;
  if v_ket is null or v_ket = '' then
    raise exception 'Keterangan wajib diisi';
  end if;

  insert into public.holidays (tanggal, keterangan, is_libur_kuliah)
  values (p_tanggal, v_ket, p_libur_kuliah)
  on conflict (tanggal) do update
    set keterangan = excluded.keterangan,
        is_libur_kuliah = excluded.is_libur_kuliah;

  if p_libur_kuliah then
    for v_sesi in
      select s.id from public.sessions s
      where s.tanggal = p_tanggal
        and s.status not in ('dibatalkan', 'selesai')
        and s.mulai_at > now()
    loop
      if public.batalkan_sesi_internal(v_sesi, 'libur', v_ket, v_actor) then
        v_n := v_n + 1;
      end if;
    end loop;
  end if;

  insert into public.admin_logs (actor_id, aksi, target_tipe, detail)
  values (v_actor, 'set_libur', 'holiday',
          jsonb_build_object('tanggal', p_tanggal, 'libur_kuliah', p_libur_kuliah,
                             'sesi_dibatalkan', v_n));

  return v_n;
end $$;

-- Hapus libur
create or replace function public.admin_delete_holiday(p_tanggal date)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.app_role() is distinct from 'admin' then
    raise exception 'Tidak diizinkan';
  end if;

  delete from public.holidays where tanggal = p_tanggal;
  if not found then
    raise exception 'Libur tidak ditemukan';
  end if;

  insert into public.admin_logs (actor_id, aksi, target_tipe, detail)
  values (public.app_profile_id(), 'hapus_libur', 'holiday',
          jsonb_build_object('tanggal', p_tanggal));
end $$;

-- Salin semester
create or replace function public.admin_copy_semester(p_from uuid, p_to uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  if public.app_role() is distinct from 'admin' then
    raise exception 'Tidak diizinkan';
  end if;
  if exists (select 1 from public.classes where semester_id = p_to) then
    raise exception 'Semester tujuan sudah punya kelas';
  end if;

  with kelas_baru as (
    insert into public.classes
      (course_id, semester_id, group_id, dosen_id, jumlah_pertemuan)
    select course_id, p_to, group_id, dosen_id, jumlah_pertemuan
    from public.classes where semester_id = p_from
    returning id, course_id, group_id
  )
  insert into public.class_schedules (class_id, hari, jam_mulai, jam_selesai)
  select kb.id, cs.hari, cs.jam_mulai, cs.jam_selesai
  from kelas_baru kb
  join public.classes co on co.semester_id = p_from
                        and co.course_id = kb.course_id
                        and co.group_id = kb.group_id
  join public.class_schedules cs on cs.class_id = co.id;

  get diagnostics n = row_count;

  insert into public.admin_logs (actor_id, aksi, target_tipe, detail)
  values (public.app_profile_id(), 'salin_semester', 'semester',
          jsonb_build_object('dari', p_from, 'ke', p_to, 'jadwal_disalin', n));

  return n;
end $$;

-- Pindah kelompok (PRD A.1.6)
create or replace function public.admin_pindah_kelompok(
  p_profile_id uuid, p_group_id uuid, p_alasan text
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_lama   uuid;
  v_alasan text := nullif(trim(p_alasan), '');
begin
  if public.app_role() is distinct from 'admin' then
    raise exception 'Tidak diizinkan';
  end if;
  if v_alasan is null then
    raise exception 'Alasan wajib diisi';
  end if;

  select group_id into v_lama
    from public.profiles
   where id = p_profile_id and role = 'mahasiswa'
   for update;
  if not found then
    raise exception 'Mahasiswa tidak ditemukan';
  end if;

  if v_lama is not distinct from p_group_id then
    return;
  end if;

  -- 1. Enrollment sumber = 'kelompok' dari kelompok lama dihapus untuk kelas yang sesinya belum mulai
  delete from public.enrollments e
  where e.mahasiswa_id = p_profile_id
    and e.sumber = 'kelompok'
    and e.class_id in (
      select c.id from public.classes c
      where c.group_id = v_lama
        and not exists (
          select 1 from public.sessions s
          where s.class_id = c.id and s.mulai_at <= now() and s.status <> 'dibatalkan'
        )
    );

  -- Update profiles.group_id
  update public.profiles set group_id = p_group_id where id = p_profile_id;

  -- 2. Enrollment untuk kelas kelompok baru ditambahkan untuk semester aktif/belum selesai
  insert into public.enrollments (class_id, mahasiswa_id, sumber)
  select c.id, p_profile_id, 'kelompok'
  from public.classes c
  join public.semesters sem on sem.id = c.semester_id
  where c.group_id = p_group_id
    and sem.tanggal_selesai >= (now() at time zone 'Asia/Jakarta')::date
  on conflict (class_id, mahasiswa_id) do nothing;

  insert into public.admin_logs (actor_id, aksi, target_tipe, target_id, detail)
  values (public.app_profile_id(), 'pindah_kelompok', 'profile', p_profile_id,
          jsonb_build_object('dari', v_lama, 'ke', p_group_id, 'alasan', v_alasan));
end $$;

revoke all on function public.admin_set_lokasi_sesi(uuid, text, text) from public, anon;
revoke all on function public.admin_preview_libur(date) from public, anon;
revoke all on function public.admin_upsert_holiday(date, text, boolean) from public, anon;
revoke all on function public.admin_delete_holiday(date) from public, anon;
revoke all on function public.admin_copy_semester(uuid, uuid) from public, anon;
revoke all on function public.admin_pindah_kelompok(uuid, uuid, text) from public, anon;

grant execute on function public.admin_set_lokasi_sesi(uuid, text, text) to authenticated;
grant execute on function public.admin_preview_libur(date) to authenticated;
grant execute on function public.admin_upsert_holiday(date, text, boolean) to authenticated;
grant execute on function public.admin_delete_holiday(date) to authenticated;
grant execute on function public.admin_copy_semester(uuid, uuid) to authenticated;
grant execute on function public.admin_pindah_kelompok(uuid, uuid, text) to authenticated;

-- =========================================================
-- 18. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================

alter table public.cohorts           enable row level security;
alter table public.student_groups    enable row level security;
alter table public.tagihan_pengganti enable row level security;

-- cohorts: baca untuk semua yang login, tulis admin
drop policy if exists cohorts_select on public.cohorts;
create policy cohorts_select on public.cohorts for select using (auth.uid() is not null);
drop policy if exists cohorts_admin on public.cohorts;
create policy cohorts_admin on public.cohorts for all
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- student_groups: baca untuk semua yang login, tulis admin
drop policy if exists student_groups_select on public.student_groups;
create policy student_groups_select on public.student_groups for select using (auth.uid() is not null);
drop policy if exists student_groups_admin on public.student_groups;
create policy student_groups_admin on public.student_groups for all
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- enrollments: admin, dosen kelas, mahasiswa bersangkutan
drop policy if exists enrollments_select on public.enrollments;
create policy enrollments_select on public.enrollments for select using (
  public.app_role() = 'admin'
  or exists (
    select 1 from public.classes c
    where c.id = enrollments.class_id and c.dosen_id = public.app_profile_id()
  )
  or enrollments.mahasiswa_id = public.app_profile_id()
);
drop policy if exists enrollments_admin on public.enrollments;
create policy enrollments_admin on public.enrollments for all
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- tagihan_pengganti: admin dan dosen pada dosen_id
drop policy if exists tagihan_select on public.tagihan_pengganti;
create policy tagihan_select on public.tagihan_pengganti for select using (
  public.app_role() = 'admin'
  or tagihan_pengganti.dosen_id = public.app_profile_id()
);

-- sessions: RLS menggunakan mahasiswa_ikut_kelas dan dosen kelas (PRD A.1.9)
drop policy if exists sessions_select on public.sessions;
create policy sessions_select on public.sessions for select using (
  public.app_role() = 'admin'
  or exists (
    select 1 from public.classes c
    where c.id = sessions.class_id and c.dosen_id = public.app_profile_id()
  )
  or public.mahasiswa_ikut_kelas(sessions.class_id)
);

drop policy if exists sessions_admin_update on public.sessions;
create policy sessions_admin_update on public.sessions for update
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- session_confirmations: admin, dosen kelas, mahasiswa ikut kelas
drop policy if exists confirmations_select on public.session_confirmations;
create policy confirmations_select on public.session_confirmations for select using (
  exists (
    select 1 from public.sessions s
    where s.id = session_confirmations.session_id
      and (
        public.app_role() = 'admin'
        or exists (select 1 from public.classes c
                   where c.id = s.class_id and c.dosen_id = public.app_profile_id())
        or public.mahasiswa_ikut_kelas(s.class_id)
      )
  )
);

drop policy if exists confirmations_admin_delete on public.session_confirmations;
create policy confirmations_admin_delete on public.session_confirmations for delete
  using (public.app_role() = 'admin');

