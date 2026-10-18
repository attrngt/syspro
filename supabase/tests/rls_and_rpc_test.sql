begin;
select plan(8);

-- Bersihkan sesi sementara di dalam transaksi test agar tidak bentrok dengan data lain
alter table public.session_confirmations disable trigger session_confirmations_immutable;
delete from public.session_confirmations;
delete from public.sessions;
alter table public.session_confirmations enable trigger session_confirmations_immutable;
-- Setup 1 sesi di masa depan (besok) dan 1 sesi yang sudah lewat untuk pengujian
insert into public.sessions (
  id, class_id, schedule_id, tanggal, mulai_at, selesai_at, cutoff_at, next_reminder_at
) values
  (
    '70000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
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
    current_date - 1,
    now() - interval '5 hours',
    now() - interval '3 hours',
    now() - interval '6 hours',
    null
  );

-- Masukkan 1 notifikasi untuk Mahasiswa Budi (20000000-0000-0000-0000-000000000003)
insert into public.notifications (id, user_id, tipe, judul, isi)
values ('80000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'konfirmasi_mode', 'Tes', 'Isi tes');

-- =========================================================
-- KASUS 1: Anonim mengakses members -> 0 baris
-- =========================================================
set local role anon;
select is(
  (select count(*)::int from public.members),
  0,
  'Anonim tidak bisa membaca tabel members'
);

-- =========================================================
-- KASUS 2: Mahasiswa mencoba generate_sessions -> Error Tidak diizinkan
-- =========================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000004","role":"authenticated"}', true);

select throws_ok(
  $$ select public.generate_sessions('30000000-0000-0000-0000-000000000001') $$,
  'Tidak diizinkan',
  'Mahasiswa ditolak saat memanggil generate_sessions'
);

-- =========================================================
-- KASUS 3: Dosen B (bukan pengampu Kelas A) mencoba set_session_mode -> Error Tidak diizinkan
-- =========================================================
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}', true);

select throws_ok(
  $$ select public.set_session_mode('70000000-0000-0000-0000-000000000001', 'online') $$,
  'Tidak diizinkan',
  'Dosen yang bukan pengampu ditolak saat set_session_mode'
);

-- =========================================================
-- KASUS 4: Dosen B membaca notifikasi milik Mahasiswa Budi -> 0 baris
-- =========================================================
select is(
  (select count(*)::int from public.notifications where id = '80000000-0000-0000-0000-000000000001'),
  0,
  'Pengguna lain tidak bisa membaca notifikasi yang bukan miliknya'
);

-- =========================================================
-- KASUS 5: Dosen A (pengampu) set_session_mode sebelum mulai_at -> Berhasil, riwayat +1
-- =========================================================
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select lives_ok(
  $$ select public.set_session_mode('70000000-0000-0000-0000-000000000001', 'online') $$,
  'Dosen pengampu berhasil set_session_mode sebelum mulai_at'
);

select is(
  (select count(*)::int from public.session_confirmations where session_id = '70000000-0000-0000-0000-000000000001'),
  1,
  'Riwayat session_confirmations bertambah 1 baris'
);

-- =========================================================
-- KASUS 6: Dosen A (pengampu) set_session_mode setelah mulai_at -> Error Sesi sudah dikunci
-- =========================================================
select throws_ok(
  $$ select public.set_session_mode('70000000-0000-0000-0000-000000000002', 'online') $$,
  'Sesi sudah dikunci',
  'Dosen pengampu ditolak mengubah mode setelah mulai_at lewat'
);

-- =========================================================
-- KASUS 7 & 8: Admin mencoba update langsung sessions.mode tanpa RPC & hapus riwayat -> Error Trigger Guard
-- =========================================================
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select throws_ok(
  $$ update public.sessions set mode = 'offline' where id = '70000000-0000-0000-0000-000000000001' $$,
  'Mode hanya boleh diubah lewat set_session_mode',
  'Trigger guard menolak perubahan mode langsung tanpa RPC'
);

select * from finish();
rollback;