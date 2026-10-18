# Diagram Alur Sistem (FLOW) - SysPro v2.2

Dokumen ini memvisualisasikan seluruh alur bisnis utama sistem SysPro v2.2 menggunakan diagram Mermaid, sesuai dengan spesifikasi di `docs/PRD.md` dan `AGENTS.md`.

---

## 1. Alur Autentikasi dan Aktivasi Anggota

Anggota (Dosen dan Mahasiswa) diimpor oleh Admin terlebih dahulu via CSV. Akun autentikasi diaktifkan secara mandiri oleh anggota melalui halaman `/aktivasi`.

```mermaid
sequenceDiagram
    autonumber
    actor Pengguna as Dosen / Mahasiswa
    participant UI as Frontend (/aktivasi & /login)
    participant Edge as Edge Function (activate-member)
    participant DB as Database (Supabase)
    participant Auth as Supabase Auth (GoTrue)

    Note over Pengguna, UI: Langkah 1: Aktivasi Akun
    Pengguna->>UI: Input kode anggota (10 digit) & klik Periksa
    UI->>Edge: POST /activate-member { kode }
    Edge->>DB: Periksa rate limit di login_attempts (max 5 gagal / 15 mnt)
    alt Percobaan melebihi batas (rate limited)
        Edge-->>UI: 429 Too Many Requests ("Terlalu banyak percobaan. Coba lagi dalam 15 menit.")
    else Dalam batas
        Edge->>DB: SELECT id, aktif, activated_at FROM members WHERE kode = ?
        alt Kode tidak ada / non-aktif / sudah aktif
            Edge-->>UI: 400 Bad Request ("Kode atau status tidak valid.")
        else Lolos verifikasi
            Edge-->>UI: 200 OK { valid: true }
            Pengguna->>UI: Input password baru (min. 8 karakter) & konfirmasi
            UI->>Edge: POST /activate-member { kode, password }
            Edge->>Auth: Admin createUser({ email: kode + '@anggota.internal', password })
            Edge->>DB: UPDATE members SET activated_at = now() WHERE id = ?
            Edge->>DB: UPDATE profiles SET auth_user_id = user.id WHERE member_id = ?
            Edge-->>UI: 200 OK ("Aktivasi berhasil.")
            UI->>UI: Redirect ke /login
        end
    end

    Note over Pengguna, UI: Langkah 2: Login Anggota
    Pengguna->>UI: Input kode 10 digit & password
    UI->>Auth: signInWithPassword({ email: kode + '@anggota.internal', password })
    alt Berhasil
        Auth-->>UI: Session Token & JWT
        UI->>DB: Query profiles untuk membaca role
        UI->>UI: Redirect sesuai peran (/dosen atau /mahasiswa)
    else Gagal
        Auth-->>UI: Error autentikasi
        UI-->>Pengguna: Pesan generik: "Kode anggota atau password salah."
    end
```

---

## 2. Alur Konfirmasi dan Perubahan Mode Kuliah

Dosen pengampu kelas atau Admin dapat mengonfirmasi atau mengubah mode sesi kuliah (Online, Offline, Tidak Ada) sebelum waktu mulai (`mulai_at`).

```mermaid
sequenceDiagram
    autonumber
    actor Aktor as Dosen Pengampu / Admin
    participant UI as Frontend (/dosen/sesi/:id atau /admin/sesi)
    participant RPC as RPC set_session_mode
    participant DB as Tabel sessions & session_confirmations
    participant Notif as Tabel notifications & Web Push

    Aktor->>UI: Pilih mode (online / offline / tidak_ada) & Simpan
    UI->>RPC: set_session_mode(p_session_id, p_mode)
    RPC->>DB: Cek status sesi & waktu (wajib belum mulai, status bukan dibatalkan/selesai)
    
    alt Sesi sudah mulai atau dibatalkan
        RPC-->>UI: Error: "Sesi sudah mulai atau telah dibatalkan."
    else Mode sama dengan sebelumnya
        RPC-->>UI: No-op / Sukses tanpa perubahan riwayat
    else Mode 'tidak_ada' (TODO: Keputusan A12)
        Note over RPC, DB: Mengikuti PRD A.1.14: Tidak Ada = Pembatalan Sesi & Tagihan Pengganti
        RPC->>DB: UPDATE sessions: status='dibatalkan', cancel_source='tidak_ada', next_reminder_at=NULL
        RPC->>DB: INSERT INTO tagihan_pengganti (status='menunggu', tenggat_at UTS/UAS)
        RPC->>DB: INSERT INTO session_confirmations
        RPC->>Notif: Fan-out notifikasi pembatalan_sesi & tagihan_pengganti
        RPC-->>UI: Sukses: Sesi dibatalkan dan tagihan pengganti dibuat
    else Mode 'online' atau 'offline'
        RPC->>DB: UPDATE sessions: mode = p_mode, mode_source = actor_role, status = 'terkonfirmasi'
        RPC->>DB: INSERT INTO session_confirmations (immutable history)
        RPC->>Notif: Fan-out notifikasi (konfirmasi_mode atau ubah_mode) ke daftar_penerima_kelas
        RPC-->>UI: Sukses: Mode berhasil disimpan
    end
```

---

## 3. Alur Siklus Tagihan Kelas Pengganti (Replacement Classes)

Tagihan kelas pengganti tercipta otomatis saat sesi dibatalkan karena libur perkuliahan (`is_libur_kuliah = true`) atau saat dosen/admin memilih mode "Tidak Ada".

```mermaid
stateDiagram-v2
    [*] --> Menunggu: Sesi dibatalkan (Libur / Tidak Ada)
    
    Menunggu --> Diajukan: Dosen mengajukan jadwal pengganti (ajukan_pengganti)
    Menunggu --> Terjadwal: Admin menjadwalkan langsung atas nama dosen (admin_jadwalkan_pengganti)
    Menunggu --> Kedaluwarsa: Melewati tenggat UTS/UAS tanpa pengajuan (pg_cron check)
    Menunggu --> Dibatalkan: Sesi asal dipulihkan oleh Admin (admin_restore_session)

    state Diajukan {
        [*] --> MenungguPersetujuan
        MenungguPersetujuan --> Ditolak: Admin menolak dengan alasan (admin_tolak_pengganti)
        Ditolak --> MenungguPersetujuan: Dosen mengajukan ulang jadwal baru
    }

    Diajukan --> Terjadwal: Admin menyetujui jadwal & tentukan ruangan/link (admin_setujui_pengganti)
    Diajukan --> Kedaluwarsa: Melewati tenggat UTS/UAS tanpa persetujuan

    Terjadwal --> [*]: Sesi pengganti selesai dilaksanakan
    Kedaluwarsa --> [*]: Hak kelas pengganti gugur
    Dibatalkan --> [*]: Sesi asal pulih ke jadwal reguler
```

### Detail Interaksi Pengajuan dan Persetujuan Pengganti

```mermaid
sequenceDiagram
    autonumber
    actor Dosen as Dosen Pengampu
    actor Admin as Admin
    participant DB as Database RPC
    participant Notif as Notifikasi

    Note over Dosen, DB: 1. Dosen Mengajukan Jadwal
    Dosen->>DB: ajukan_pengganti(tagihan_id, usulan_mulai_at, usulan_selesai_at)
    DB->>DB: validasi_jadwal_pengganti (tidak bentrok jadwal dosen & kelas mahasiswa)
    DB->>DB: UPDATE tagihan_pengganti SET status = 'diajukan'
    DB->>Notif: Kirim notifikasi pengajuan_pengganti ke Admin

    alt Admin Menolak Usulan
        Admin->>DB: admin_tolak_pengganti(tagihan_id, alasan_wajib)
        DB->>DB: UPDATE tagihan_pengganti SET status = 'menunggu', ditolak_alasan = alasan
        DB->>Notif: Kirim notifikasi ke Dosen dengan alasan penolakan
    else Admin Menyetujui Usulan
        Admin->>DB: admin_setujui_pengganti(tagihan_id, ruangan, link_online)
        DB->>DB: buat_sesi_pengganti(...)
        DB->>DB: UPDATE tagihan_pengganti SET status = 'terjadwal', session_pengganti_id = new_session.id
        DB->>Notif: Kirim notifikasi jadwal_pengganti ke Dosen & Mahasiswa
    end
```

---

## 4. Alur Manajemen Libur dan Dampak Perkuliahan

Hanya hari libur dengan centang **Libur Perkuliahan** (`is_libur_kuliah = true`) yang membatalkan sesi dan menagih sesi pengganti.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin
    participant UI as Frontend (/admin/libur)
    participant RPC as RPC Database
    participant DB as Tabel sessions & tagihan_pengganti
    participant Notif as Notifikasi

    Admin->>UI: Input tanggal, keterangan, centang [x] Libur Perkuliahan
    UI->>RPC: admin_preview_libur(p_tanggal)
    RPC-->>UI: Return daftar sesi yang terdampak (belum mulai & belum dibatalkan)
    UI-->>Admin: Tampilkan modal konfirmasi pratinjau dampak
    
    Admin->>UI: Konfirmasi Simpan Libur
    UI->>RPC: admin_upsert_holiday(tanggal, keterangan, is_libur_kuliah=true)
    loop Setiap sesi terdampak pada tanggal tersebut
        RPC->>DB: batalkan_sesi_internal(session_id, cancel_source='libur', alasan=keterangan)
        RPC->>DB: UPDATE sessions SET status='dibatalkan', cancel_source='libur', next_reminder_at=NULL
        RPC->>DB: buat_tagihan(session_id) -> INSERT tagihan_pengganti
        RPC->>Notif: Kirim notifikasi pembatalan_sesi ke mahasiswa & tagihan_pengganti ke dosen
    end
    RPC->>DB: INSERT INTO admin_logs (aksi='set_libur')
    RPC-->>UI: Sukses: Libur tersimpan dan sesi dibatalkan
```

---

## 5. Alur Pemulihan Sesi Kuliah (`admin_restore_session`)

Admin dapat memulihkan sesi yang sebelumnya dibatalkan, dengan syarat tanggal sesi tidak sedang dalam status libur perkuliahan dan sesi belum lewat waktu mulai.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin
    participant UI as Frontend (/admin/sesi)
    participant RPC as admin_restore_session
    participant DB as Tabel sessions & tagihan_pengganti
    participant Notif as Notifikasi

    Admin->>UI: Klik "Pulihkan Sesi"
    UI->>RPC: admin_restore_session(session_id)
    RPC->>DB: Cek apakah mulai_at sudah lewat (jika ya, tolak)
    RPC->>DB: Cek jika cancel_source='libur', apakah tanggal masih libur kuliah (jika ya, tolak)
    
    RPC->>DB: Kembalikan status sesi ('terkonfirmasi', 'default_offline', atau 'menunggu')
    RPC->>DB: UPDATE sessions: cancelled_at=NULL, cancel_reason=NULL, restored_at=now()
    RPC->>DB: Jika ada tagihan_pengganti terkait, UPDATE status='dibatalkan'
    RPC->>Notif: Fan-out notifikasi pemulihan_sesi ke mahasiswa
    RPC->>DB: INSERT INTO admin_logs (aksi='pulihkan_sesi')
    RPC-->>UI: Sukses: Sesi dipulihkan
```

---

## 6. Alur Cron Scheduler Pengingat dan Default Otomatis (`run-reminders`)

pg_cron menjalankan Edge Function `run-reminders` setiap 5 menit.

```mermaid
flowchart TD
    Start([pg_cron: setiap 5 menit]) --> AuthCheck{Header x-cron-secret valid?}
    AuthCheck -- Tidak --> Ret401[Return 401 Unauthorized]
    AuthCheck -- Ya --> QuerySessions[Kueri sesi status='menunggu' AND mode IS NULL AND next_reminder_at <= now\nFOR UPDATE SKIP LOCKED]

    QuerySessions --> LoopSession{Ada sesi menunggu?}
    
    LoopSession -- Ya --> CheckCutoff{now >= cutoff_at?}
    CheckCutoff -- Ya --> ApplyDefault[apply_default_mode: Set mode='offline', mode_source='default', status='default_offline']
    ApplyDefault --> FanoutDefault[Notifikasi mode_default ke Mahasiswa & catat untuk Ringkasan Admin]
    FanoutDefault --> LoopSession

    CheckCutoff -- Tidak --> CheckQuiet{isQuietHour: 21.00 - 06.30 WIB?}
    CheckQuiet -- Ya --> ShiftQuiet[Geser next_reminder_at ke 06.30 WIB besok]
    ShiftQuiet --> LoopSession

    CheckQuiet -- Tidak --> SendReminder[Kirim notifikasi pengingat_dosen ke dosen pengampu\nreminder_count += 1]
    SendReminder --> CalcNext[Hitung waktu pengingat berikutnya: now + 5 jam]
    CalcNext --> CheckNextCutoff{berikutnya >= cutoff_at?}
    CheckNextCutoff -- Ya --> ClearNext[next_reminder_at = NULL]
    CheckNextCutoff -- Tidak --> SaveNext[next_reminder_at = berikutnya disesuaikan jam tenang]
    ClearNext --> LoopSession
    SaveNext --> LoopSession

    LoopSession -- Selesai --> BillCheck[Pemeriksaan Tagihan Pengganti]
    BillCheck --> BillRemind[Kirim penagihan harian 06.30 WIB untuk tagihan status='menunggu']
    BillRemind --> BillExpire[Tandai status='kedaluwarsa' jika now >= tenggat_at]

    BillExpire --> CheckFinish[UPDATE sessions status='selesai' untuk sesi lewat selesai_at]
    CheckFinish --> CheckAdminSummary{Run pertama setelah 06.30 WIB?}
    CheckAdminSummary -- Ya --> SendSummary[Kirim ringkasan_admin ke seluruh Admin]
    CheckAdminSummary -- Tidak --> End([Selesai])
    SendSummary --> End
```
