-- =========================================================
-- SEED DATA DEVELOPMENT SYSPRO (PRD 8.12 & AGENTS.md 12.3)
-- =========================================================

-- 1. Buat akun Auth untuk Admin, 2 Dosen, dan 1 Mahasiswa pertama (Password: password123)
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@prodi.internal', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9000000001@anggota.internal', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9000000002@anggota.internal', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9000000101@anggota.internal', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}')
on conflict (id) do nothing;

-- 2. Angkatan 2025
insert into public.cohorts (id, tahun, nama, aktif) values
  ('11111111-0000-0000-0000-000000002025', 2025, 'Angkatan 2025', true)
on conflict (id) do nothing;

-- 3. Kelompok A, B, C dalam Angkatan 2025
insert into public.student_groups (id, cohort_id, nama) values
  ('22222222-0000-0000-0000-00000000000a', '11111111-0000-0000-0000-000000002025', 'A'),
  ('22222222-0000-0000-0000-00000000000b', '11111111-0000-0000-0000-000000002025', 'B'),
  ('22222222-0000-0000-0000-00000000000c', '11111111-0000-0000-0000-000000002025', 'C')
on conflict (id) do nothing;

-- 4. Members & Profiles: 2 Dosen
insert into public.members (id, kode, nama, peran, nim_nidn, aktif, activated_at) values
  ('10000000-0000-0000-0000-000000000001', '9000000001', 'Dr. Hendra Wijaya', 'dosen', '0011223301', true, now()),
  ('10000000-0000-0000-0000-000000000002', '9000000002', 'Maya Sari, M.Sn.', 'dosen', '0011223302', true, now())
on conflict (id) do nothing;

insert into public.profiles (id, auth_user_id, member_id, role, nama, group_id) values
  ('20000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', null, 'admin', 'Admin Prodi', null),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'dosen', 'Dr. Hendra Wijaya', null),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'dosen', 'Maya Sari, M.Sn.', null)
on conflict (id) do nothing;

-- 5. 150 Mahasiswa Dummy (50 kelompok A, 50 kelompok B, 50 kelompok C)
do $$
declare
  i int;
  v_member_id uuid;
  v_profile_id uuid;
  v_kode text;
  v_nama text;
  v_nim text;
  v_group_id uuid;
  v_auth uuid;
begin
  for i in 1..150 loop
    v_member_id := ('10000000-0000-0000-0000-' || lpad(to_hex(i + 100), 12, '0'))::uuid;
    v_profile_id := ('20000000-0000-0000-0000-' || lpad(to_hex(i + 100), 12, '0'))::uuid;
    v_kode := '9000' || lpad((100 + i)::text, 6, '0');
    v_nama := 'Mahasiswa ' || i;
    v_nim := '2501' || lpad(i::text, 4, '0');

    if i <= 50 then
      v_group_id := '22222222-0000-0000-0000-00000000000a';
    elsif i <= 100 then
      v_group_id := '22222222-0000-0000-0000-00000000000b';
    else
      v_group_id := '22222222-0000-0000-0000-00000000000c';
    end if;

    if i = 1 then
      v_auth := '00000000-0000-0000-0000-000000000004';
      v_nama := 'Budi Santoso';
    else
      v_auth := null;
    end if;

    insert into public.members (id, kode, nama, peran, nim_nidn, aktif, activated_at)
    values (v_member_id, v_kode, v_nama, 'mahasiswa', v_nim, true, case when i = 1 then now() else null end)
    on conflict (id) do nothing;

    insert into public.profiles (id, auth_user_id, member_id, role, nama, group_id)
    values (v_profile_id, v_auth, v_member_id, 'mahasiswa', v_nama, v_group_id)
    on conflict (id) do nothing;
  end loop;
end $$;

-- 6. 1 Semester Aktif dengan tanggal mulai di masa depan (agar bisa di-generate)
insert into public.semesters (id, nama, tanggal_mulai, tanggal_selesai, aktif) values
  ('30000000-0000-0000-0000-000000000001', 'Ganjil 2026/2027',
   (now() at time zone 'Asia/Jakarta')::date + 7,
   (now() at time zone 'Asia/Jakarta')::date + 140,
   true)
on conflict (id) do nothing;

-- 7. 9 Mata Kuliah
insert into public.courses (id, kode, nama, sks) values
  ('40000000-0000-0000-0000-000000000001', 'PM101', 'Produksi Video Lanjut', 3),
  ('40000000-0000-0000-0000-000000000002', 'PM102', 'Storytelling Multimedia', 3),
  ('40000000-0000-0000-0000-000000000003', 'PM103', 'Tata Suara dan Audio Digital', 2),
  ('40000000-0000-0000-0000-000000000004', 'PM104', 'Sinematografi Digital', 3),
  ('40000000-0000-0000-0000-000000000005', 'PM105', 'Animasi dan Motion Graphics', 3),
  ('40000000-0000-0000-0000-000000000006', 'PM106', 'Manajemen Produksi Media', 2),
  ('40000000-0000-0000-0000-000000000007', 'PM107', 'Penulisan Naskah Media Kreatif', 3),
  ('40000000-0000-0000-0000-000000000008', 'PM108', 'Pascaproduksi dan Editing', 3),
  ('40000000-0000-0000-0000-000000000009', 'PM109', 'Etika dan Hukum Media', 2)
on conflict (id) do nothing;

-- 8. 27 Kelas (9 Mata Kuliah x 3 Kelompok) & Jadwal Rutin
-- Trigger classes_enroll_kelompok otomatis membuat enrollment untuk seluruh mahasiswa di kelompok tersebut!
do $$
declare
  v_mk record;
  v_grp record;
  v_dosen uuid;
  v_class_id uuid;
  v_sched_id uuid;
  v_idx int := 0;
  v_hari smallint;
  v_jam_mulai time;
  v_jam_selesai time;
begin
  for v_mk in select id, row_number() over (order by id) as rn from public.courses loop
    for v_grp in select id, nama from public.student_groups order by nama loop
      v_idx := v_idx + 1;
      v_class_id := ('50000000-0000-0000-0000-' || lpad(to_hex(v_idx), 12, '0'))::uuid;
      v_sched_id := ('60000000-0000-0000-0000-' || lpad(to_hex(v_idx), 12, '0'))::uuid;
      
      -- Selang-seling dosen 1 dan 2
      if (v_idx % 2 = 1) then
        v_dosen := '20000000-0000-0000-0000-000000000001';
      else
        v_dosen := '20000000-0000-0000-0000-000000000002';
      end if;

      v_hari := ((v_idx % 5) + 1)::smallint; -- Senin s/d Jumat (1..5)
      if (v_grp.nama = 'A') then
        v_jam_mulai := '08:00'::time;
        v_jam_selesai := '10:30'::time;
      elsif (v_grp.nama = 'B') then
        v_jam_mulai := '10:45'::time;
        v_jam_selesai := '13:15'::time;
      else
        v_jam_mulai := '13:30'::time;
        v_jam_selesai := '16:00'::time;
      end if;

      insert into public.classes (id, course_id, semester_id, group_id, dosen_id, jumlah_pertemuan)
      values (v_class_id, v_mk.id, '30000000-0000-0000-0000-000000000001', v_grp.id, v_dosen, 16)
      on conflict (id) do nothing;

      insert into public.class_schedules (id, class_id, hari, jam_mulai, jam_selesai)
      values (v_sched_id, v_class_id, v_hari, v_jam_mulai, v_jam_selesai)
      on conflict (id) do nothing;
    end loop;
  end loop;
end $$;

-- 9. 2 Tanggal Libur (satu is_libur_kuliah = true, satu false)
insert into public.holidays (tanggal, keterangan, is_libur_kuliah) values
  (((now() at time zone 'Asia/Jakarta')::date + 14), 'Hari Libur Perkuliahan Nasional', true),
  (((now() at time zone 'Asia/Jakarta')::date + 28), 'Peringatan Hari Besar Non-Akademik', false)
on conflict (tanggal) do update
  set keterangan = excluded.keterangan,
      is_libur_kuliah = excluded.is_libur_kuliah;