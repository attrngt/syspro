begin;
select plan(48);

-- =========================================================
-- SETUP FIXTURES UNTUK TEST TRANSAKSI
-- =========================================================
set local role postgres;

-- Nonaktifkan trigger immutable sementara untuk membersihkan sesi lama di sesi test
alter table public.session_confirmations disable trigger session_confirmations_immutable;
delete from public.notifications;
delete from public.session_confirmations;
delete from public.tagihan_pengganti;
delete from public.sessions;
alter table public.session_confirmations enable trigger session_confirmations_immutable;

-- Buat 1 sesi masa depan (besok) dan 1 sesi masa lalu untuk Kelas A (PM101, Dosen Hendra 20000000-0000-0000-0000-000000000001)
insert into public.sessions (
  id, class_id, schedule_id, pertemuan_ke, jenis, tanggal, mulai_at, selesai_at, cutoff_at, next_reminder_at
) values
  (
    '70000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    1,
    'reguler',
    current_date + 1,
    now() + interval '1 day',
    now() + interval '1 day 2 hours',
    now() + interval '23 hours',
    now()
  ),
  (
    '70000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    2,
    'reguler',
    current_date - 1,
    now() - interval '5 hours',
    now() - interval '3 hours',
    now() - interval '6 hours',
    null
  );

-- Masukkan 1 notifikasi untuk Mahasiswa Budi (20000000-0000-0000-0000-000000000065 = hex 101)
insert into public.notifications (id, user_id, session_id, tipe, judul, isi)
values (
  '80000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000065',
  '70000000-0000-0000-0000-000000000001',
  'konfirmasi_mode',
  'Tes',
  'Isi tes'
);

-- =========================================================
-- KASUS 1-3: AKSES ANONIM
-- =========================================================
set local role anon;

select is(
  (select count(*)::int from public.members),
  0,
  '1. Anonim tidak bisa membaca tabel members'
);

select is(
  (select count(*)::int from public.profiles),
  0,
  '2. Anonim tidak bisa membaca tabel profiles'
);

select is(
  (select count(*)::int from public.cohorts),
  0,
  '3. Anonim tidak bisa membaca tabel cohorts'
);

-- =========================================================
-- KASUS 4-8: MAHASISWA (Budi Santoso, 00000000-0000-0000-0000-000000000004)
-- =========================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000004","role":"authenticated"}', true);

select throws_ok(
  $$ select public.generate_sessions('30000000-0000-0000-0000-000000000001') $$,
  'Tidak diizinkan',
  '4. Mahasiswa ditolak saat memanggil generate_sessions'
);

select throws_ok(
  $$ select public.set_session_mode('70000000-0000-0000-0000-000000000001', 'online') $$,
  'Tidak diizinkan',
  '5. Mahasiswa ditolak saat memanggil set_session_mode'
);

select is(
  (select count(*)::int from public.notifications where user_id <> '20000000-0000-0000-0000-000000000065'),
  0,
  '6. Mahasiswa tidak bisa membaca notifikasi milik pengguna lain'
);

select ok(
  (select count(*) > 0 from public.sessions where id = '70000000-0000-0000-0000-000000000001'),
  '7. Mahasiswa dapat membaca sesi dari kelas yang diikutinya'
);

select is(
  (select count(*)::int from public.sessions where class_id = '50000000-0000-0000-0000-000000000002'),
  0,
  '8. Mahasiswa tidak bisa membaca sesi kelas yang tidak diikutinya'
);

-- =========================================================
-- KASUS 9-12: DOSEN (Dosen 2: Maya Sari, sub: 00000000-0000-0000-0000-000000000003)
-- Dosen 2 bukan pengampu Kelas 50000000-0000-0000-0000-000000000001
-- =========================================================
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}', true);

select throws_ok(
  $$ select public.set_session_mode('70000000-0000-0000-0000-000000000001', 'online') $$,
  'Tidak diizinkan',
  '9. Dosen bukan pengampu ditolak saat set_session_mode'
);

-- Dosen 1: Dr. Hendra Wijaya (sub: 00000000-0000-0000-0000-000000000002) adalah pengampu
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select lives_ok(
  $$ select public.set_session_mode('70000000-0000-0000-0000-000000000001', 'online') $$,
  '10. Dosen pengampu berhasil set_session_mode sebelum mulai_at'
);

select is(
  (select count(*)::int from public.session_confirmations where session_id = '70000000-0000-0000-0000-000000000001'),
  1,
  '11. Riwayat session_confirmations bertambah 1 baris'
);

select throws_ok(
  $$ select public.set_session_mode('70000000-0000-0000-0000-000000000002', 'online') $$,
  'Sesi sudah dikunci',
  '12. Dosen pengampu ditolak mengubah mode setelah mulai_at lewat'
);

-- =========================================================
-- KASUS 13-20: ADMIN (sub: 00000000-0000-0000-0000-000000000001)
-- =========================================================
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select throws_ok(
  $$ update public.sessions set mode = 'offline' where id = '70000000-0000-0000-0000-000000000001' $$,
  'Mode dan status sesi hanya boleh diubah lewat fungsi resmi',
  '13. Trigger guard menolak perubahan mode langsung tanpa RPC'
);

select throws_ok(
  $$ delete from public.session_confirmations where session_id = '70000000-0000-0000-0000-000000000001' $$,
  'Riwayat konfirmasi bersifat immutable dan tidak boleh diubah atau dihapus',
  '14. Trigger guard menolak penghapusan riwayat session_confirmations'
);

select lives_ok(
  $$ select public.admin_cancel_session('70000000-0000-0000-0000-000000000001', 'Dosen berhalangan hadir') $$,
  '15. Admin berhasil membatalkan sesi lewat admin_cancel_session'
);

select is(
  (select status from public.sessions where id = '70000000-0000-0000-0000-000000000001'),
  'dibatalkan',
  '16. Status sesi berubah menjadi dibatalkan'
);

select lives_ok(
  $$ select public.admin_restore_session('70000000-0000-0000-0000-000000000001') $$,
  '17. Admin berhasil memulihkan sesi lewat admin_restore_session'
);

select is(
  (select status from public.sessions where id = '70000000-0000-0000-0000-000000000001'),
  'terkonfirmasi',
  '18. Status sesi kembali terkonfirmasi setelah dipulihkan'
);

select lives_ok(
  $$ select public.admin_set_lokasi_sesi('70000000-0000-0000-0000-000000000001', 'R.401', 'https://meet.google.com/abc') $$,
  '19. Admin mengatur lokasi sesi lewat admin_set_lokasi_sesi'
);

select is(
  (select ruangan from public.sessions where id = '70000000-0000-0000-0000-000000000001'),
  'R.401',
  '20. Ruangan sesi berhasil diperbarui'
);

-- =========================================================
-- KASUS 21-34: TAGIHAN PENGGANTI & PENJADWALAN
-- =========================================================

-- Setup tagihan pengganti menggunakan role postgres
set local role postgres;
select set_config('app.via_rpc', 'on', true);
update public.sessions set status = 'dibatalkan', cancelled_at = now(), cancel_source = 'admin', cancel_reason = 'Dibatalkan' where id = '70000000-0000-0000-0000-000000000001';
select set_config('app.via_rpc', 'off', true);

insert into public.tagihan_pengganti (
  id, session_id, class_id, dosen_id, pertemuan_ke, status, tenggat_at, next_reminder_at
) values (
  '90000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  1,
  'menunggu',
  now() + interval '30 days',
  now()
);

-- Dosen 2 mencoba mengajukan tagihan milik Dosen 1 -> ditolak
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select throws_ok(
  $$ select public.ajukan_pengganti('90000000-0000-0000-0000-000000000001', now() + interval '3 days', now() + interval '3 days 2 hours') $$,
  'Tidak diizinkan',
  '21. Dosen lain ditolak saat mengajukan tagihan dosen lain'
);

-- Dosen 1 mengajukan jadwal tidak valid (jam selesai <= jam mulai)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$ select public.ajukan_pengganti('90000000-0000-0000-0000-000000000001', now() + interval '3 days 2 hours', now() + interval '3 days 1 hour') $$,
  'Jam selesai harus setelah jam mulai',
  '22. Validasi jadwal menolak jam selesai <= jam mulai'
);

select throws_ok(
  $$ select public.ajukan_pengganti('90000000-0000-0000-0000-000000000001', now() + interval '1 hour', now() + interval '3 hours') $$,
  'Kelas pengganti minimal dijadwalkan 2 jam dari sekarang',
  '23. Validasi jadwal menolak jadwal kurang dari 2 jam dari sekarang'
);

-- Dosen 1 mengajukan jadwal valid
select lives_ok(
  $$ select public.ajukan_pengganti('90000000-0000-0000-0000-000000000001', now() + interval '3 days', now() + interval '3 days 2 hours') $$,
  '24. Dosen pengampu berhasil mengajukan jadwal pengganti'
);

select is(
  (select status from public.tagihan_pengganti where id = '90000000-0000-0000-0000-000000000001'),
  'diajukan',
  '25. Tagihan berstatus diajukan setelah diajukan dosen'
);

-- Admin menyetujui tanpa ruangan dan tanpa link online -> Error
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$ select public.admin_setujui_pengganti('90000000-0000-0000-0000-000000000001', null, null) $$,
  'Isi ruangan atau link online',
  '26. Admin menyetujui tanpa ruangan atau link ditolak'
);

-- Admin menyetujui dengan ruangan
select ok(
  (select public.admin_setujui_pengganti('90000000-0000-0000-0000-000000000001', 'Lab Audio', null) is not null),
  '27. Admin menyetujui pengajuan dan sesi pengganti berhasil dibuat'
);

select is(
  (select status from public.tagihan_pengganti where id = '90000000-0000-0000-0000-000000000001'),
  'terjadwal',
  '28. Tagihan berstatus terjadwal'
);

-- Mahasiswa mengecek notifikasi jadwal_pengganti yang masuk ke inbox-nya
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
select ok(
  (select count(*) > 0 from public.notifications where tipe = 'jadwal_pengganti'),
  '29. Notifikasi jadwal_pengganti dibuat untuk mahasiswa'
);

-- Test penolakan pengajuan: Buat tagihan kedua berstatus diajukan
set local role postgres;
select set_config('app.via_rpc', 'on', true);
update public.sessions set status = 'dibatalkan', cancelled_at = now(), cancel_source = 'libur' where id = '70000000-0000-0000-0000-000000000002';
select set_config('app.via_rpc', 'off', true);

insert into public.tagihan_pengganti (
  id, session_id, class_id, dosen_id, pertemuan_ke, status, tenggat_at, usulan_mulai_at, usulan_selesai_at
) values (
  '90000000-0000-0000-0000-000000000002',
  '70000000-0000-0000-0000-000000000002',
  '50000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  2,
  'diajukan',
  now() + interval '30 days',
  now() + interval '4 days',
  now() + interval '4 days 2 hours'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select throws_ok(
  $$ select public.admin_tolak_pengganti('90000000-0000-0000-0000-000000000002', '   ') $$,
  'Alasan penolakan wajib diisi',
  '30. Admin menolak tanpa alasan ditolak'
);

select lives_ok(
  $$ select public.admin_tolak_pengganti('90000000-0000-0000-0000-000000000002', 'Ruangan lab sedang renovasi') $$,
  '31. Admin menolak pengajuan dengan alasan tertulis'
);

select is(
  (select status from public.tagihan_pengganti where id = '90000000-0000-0000-0000-000000000002'),
  'menunggu',
  '32. Status tagihan kembali menunggu setelah ditolak'
);

-- Dosen membaca notifikasi penolakan yang diterimanya
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select ok(
  (select count(*) > 0 from public.notifications where judul = 'Pengajuan ditolak'),
  '33. Dosen menerima notifikasi penolakan dengan alasan'
);

-- Admin jadwalkan langsung atas nama dosen
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select ok(
  (select public.admin_jadwalkan_pengganti(
    '90000000-0000-0000-0000-000000000002',
    now() + interval '5 days',
    now() + interval '5 days 2 hours',
    'R.202',
    null
  ) is not null),
  '34. Admin berhasil menjadwalkan langsung atas nama dosen'
);

-- =========================================================
-- KASUS 35-39: MODE TIDAK_ADA (PRD A.1.14 / KEPUTUSAN A12)
-- =========================================================

-- Buat sesi baru untuk test Tidak Ada
set local role postgres;
insert into public.sessions (
  id, class_id, schedule_id, pertemuan_ke, jenis, tanggal, mulai_at, selesai_at, cutoff_at, next_reminder_at
) values (
  '70000000-0000-0000-0000-000000000003',
  '50000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  3,
  'reguler',
  current_date + 10,
  now() + interval '10 days',
  now() + interval '10 days 2 hours',
  now() + interval '10 days' - interval '1 hour',
  now()
);

-- Dosen set mode 'tidak_ada'
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select lives_ok(
  $$ select public.set_session_mode('70000000-0000-0000-0000-000000000003', 'tidak_ada') $$,
  '35. Dosen menyatakan mode tidak_ada'
);

select is(
  (select cancel_source from public.sessions where id = '70000000-0000-0000-0000-000000000003'),
  'tidak_ada',
  '36. Sesi dibatalkan dengan cancel_source = tidak_ada'
);

select ok(
  (select count(*) = 1 from public.tagihan_pengganti where session_id = '70000000-0000-0000-0000-000000000003' and status = 'menunggu'),
  '37. Tagihan pengganti otomatis dibuat untuk sesi tidak_ada'
);

-- Admin memulihkan sesi tidak_ada (belum terjadwal)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$ select public.admin_restore_session('70000000-0000-0000-0000-000000000003') $$,
  '38. Admin memulihkan sesi tidak_ada yang belum terjadwal'
);

select is(
  (select status from public.tagihan_pengganti where session_id = '70000000-0000-0000-0000-000000000003'),
  'dibatalkan',
  '39. Tagihan pengganti dibatalkan saat sesi tidak_ada dipulihkan'
);

-- =========================================================
-- KASUS 40-43: PINDAH KELOMPOK, LIBUR & PREVIEW
-- =========================================================

-- Mahasiswa Budi (20000000-0000-0000-0000-000000000065) pindah dari Kelompok A ke B
select lives_ok(
  $$ select public.admin_pindah_kelompok(
    '20000000-0000-0000-0000-000000000065',
    '22222222-0000-0000-0000-00000000000b',
    'Permintaan pertukaran kelompok kuliah kerja'
  ) $$,
  '40. Admin berhasil memindahkan kelompok mahasiswa'
);

select is(
  (select group_id from public.profiles where id = '20000000-0000-0000-0000-000000000065'),
  '22222222-0000-0000-0000-00000000000b'::uuid,
  '41. Profil mahasiswa memiliki group_id baru'
);

select is(
  (select count(*)::int from public.admin_preview_libur(current_date + 1)),
  1,
  '42. Pratinjau libur admin_preview_libur menghasilkan 1 baris rekap'
);

select lives_ok(
  $$ select public.admin_upsert_holiday(current_date + 40, 'Dies Natalis', false);
     select public.admin_delete_holiday(current_date + 40); $$,
  '43. Admin upsert holiday dan delete holiday berhasil'
);

-- =========================================================
-- KASUS 44-46: RLS ISOLASI
-- =========================================================

-- Dosen Maya (Dosen 2) melihat tagihan_pengganti miliknya saja
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is(
  (select count(*)::int from public.tagihan_pengganti where dosen_id = '20000000-0000-0000-0000-000000000001'),
  0,
  '44. Dosen 2 tidak bisa membaca tagihan milik Dosen 1'
);

-- Authenticated membaca cohorts
select ok(
  (select count(*) > 0 from public.cohorts),
  '45. Pengguna terautentikasi dapat membaca cohorts'
);

-- Mahasiswa membaca enrollments dirinya saja
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
select is(
  (select count(*)::int from public.enrollments where mahasiswa_id <> '20000000-0000-0000-0000-000000000065'),
  0,
  '46. Mahasiswa tidak bisa membaca enrollment milik mahasiswa lain'
);

-- =========================================================
-- KASUS 47-48: GENERATOR SESI TEPAT N, UTS & UAS
-- =========================================================

-- Setup semester & kelas baru via postgres
set local role postgres;
insert into public.semesters (id, nama, tanggal_mulai, tanggal_selesai, aktif)
values ('30000000-0000-0000-0000-000000000099', 'Genap 2026/2027', current_date + 200, current_date + 350, false);

insert into public.classes (id, course_id, semester_id, group_id, dosen_id, jumlah_pertemuan)
values (
  '50000000-0000-0000-0000-000000000099',
  '40000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000099',
  '22222222-0000-0000-0000-00000000000a',
  '20000000-0000-0000-0000-000000000001',
  16
);

insert into public.class_schedules (id, class_id, hari, jam_mulai, jam_selesai)
values ('60000000-0000-0000-0000-000000000099', '50000000-0000-0000-0000-000000000099', 1, '08:00', '10:30');

-- Jalankan generate_sessions sebagai admin
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select is(
  (select public.generate_sessions('30000000-0000-0000-0000-000000000099')),
  16,
  '47. Generator membentuk tepat 16 sesi per kelas'
);

select ok(
  (select exists (
    select 1 from public.sessions
    where class_id = '50000000-0000-0000-0000-000000000099' and pertemuan_ke = 8 and jenis = 'uts'
  ) and exists (
    select 1 from public.sessions
    where class_id = '50000000-0000-0000-0000-000000000099' and pertemuan_ke = 16 and jenis = 'uas'
  )),
  '48. Pertemuan 8 bertipe uts dan pertemuan 16 bertipe uas'
);

select * from finish();
rollback;