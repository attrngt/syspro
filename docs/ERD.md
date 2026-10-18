# Entity Relationship Diagram (ERD) - SysPro v2.2

Dokumen ini memuat diagram hubungan entitas relasional lengkap untuk database SysPro v2.2, mencakup modul baru: angkatan (`cohorts`), kelompok mahasiswa (`student_groups`), keanggotaan kelas lintas kelompok (`enrollments`), dan sistem kewajiban kelas pengganti (`tagihan_pengganti`).

---

## 1. Diagram Relasi Mermaid

```mermaid
erDiagram
    COHORTS ||--o{ STUDENT_GROUPS : "memiliki"
    COHORTS ||--o{ PROFILES : "angkatan"
    STUDENT_GROUPS ||--o{ PROFILES : "kelompok mahasiswa"
    STUDENT_GROUPS ||--o{ CLASSES : "kelas kelompok"
    
    MEMBERS ||--o| PROFILES : "akun anggota"
    
    SEMESTERS ||--o{ CLASSES : "periode kelas"
    COURSES ||--o{ CLASSES : "mata kuliah"
    PROFILES ||--o{ CLASSES : "dosen pengampu"
    
    CLASSES ||--o{ CLASS_SCHEDULES : "jadwal rutin"
    CLASSES ||--o{ ENROLLMENTS : "daftar peserta"
    PROFILES ||--o{ ENROLLMENTS : "mahasiswa terdaftar"
    
    CLASSES ||--o{ SESSIONS : "sesi pertemuan"
    SESSIONS ||--o| SESSIONS : "pengganti dari"
    SESSIONS ||--o{ SESSION_CONFIRMATIONS : "riwayat konfirmasi"
    PROFILES ||--o{ SESSION_CONFIRMATIONS : "dikonfirmasi oleh"
    
    SESSIONS ||--o| TAGIHAN_PENGGANTI : "memicu tagihan"
    CLASSES ||--o{ TAGIHAN_PENGGANTI : "kelas terkait"
    PROFILES ||--o{ TAGIHAN_PENGGANTI : "dosen tertagih"
    TAGIHAN_PENGGANTI |o--o| SESSIONS : "sesi pengganti dijadwalkan"
    
    PROFILES ||--o{ NOTIFICATIONS : "inbox notifikasi"
    SESSIONS |o--o{ NOTIFICATIONS : "sesi terkait"
    PROFILES ||--o{ PUSH_SUBSCRIPTIONS : "perangkat push"
    PROFILES |o--o{ ADMIN_LOGS : "aktor admin"

    MEMBERS {
        uuid id PK
        varchar kode UK "10 digit angka"
        varchar nama
        varchar peran "dosen / mahasiswa"
        varchar nim_nidn
        boolean aktif
        timestamptz activated_at
        timestamptz created_at
    }

    PROFILES {
        uuid id PK
        uuid auth_user_id UK
        uuid member_id FK
        varchar role "admin / dosen / mahasiswa"
        varchar nama
        uuid group_id FK "wajib untuk mahasiswa"
        timestamptz created_at
        timestamptz updated_at
    }

    COHORTS {
        uuid id PK
        int tahun UK
        varchar nama
        boolean aktif
        timestamptz created_at
    }

    STUDENT_GROUPS {
        uuid id PK
        uuid cohort_id FK
        varchar nama "A, B, C (unik per angkatan)"
        timestamptz created_at
    }

    SEMESTERS {
        uuid id PK
        varchar nama
        date tanggal_mulai
        date tanggal_selesai
        boolean aktif
        timestamptz created_at
    }

    COURSES {
        uuid id PK
        varchar kode UK
        varchar nama
        int sks
        timestamptz created_at
    }

    CLASSES {
        uuid id PK
        uuid semester_id FK
        uuid course_id FK
        uuid group_id FK
        uuid dosen_id FK
        int jumlah_pertemuan "Default 16"
        timestamptz created_at
    }

    CLASS_SCHEDULES {
        uuid id PK
        uuid class_id FK
        int hari "0=Minggu .. 6=Sabtu"
        time jam_mulai
        time jam_selesai
    }

    ENROLLMENTS {
        uuid id PK
        uuid class_id FK
        uuid mahasiswa_id FK
        varchar sumber "kelompok / manual"
        timestamptz created_at
    }

    HOLIDAYS {
        uuid id PK
        date tanggal UK
        varchar keterangan
        boolean is_libur_kuliah
        timestamptz created_at
    }

    SESSIONS {
        uuid id PK
        uuid class_id FK
        date tanggal
        timestamptz mulai_at
        timestamptz selesai_at
        int pertemuan_ke "1..N"
        varchar jenis "reguler / uts / uas"
        varchar mode "online / offline / tidak_ada"
        varchar mode_source "dosen / admin / default"
        varchar status "menunggu / terkonfirmasi / default_offline / dibatalkan / selesai"
        timestamptz cutoff_at
        timestamptz next_reminder_at
        int reminder_count
        timestamptz cancelled_at
        varchar cancel_reason
        varchar cancel_source "admin / libur / tidak_ada"
        timestamptz restored_at
        uuid pengganti_dari_id FK
        varchar ruangan
        varchar link_online
        timestamptz created_at
        timestamptz updated_at
    }

    SESSION_CONFIRMATIONS {
        bigint id PK
        uuid session_id FK
        uuid actor_id FK
        varchar actor_role "admin / dosen / system"
        varchar mode_lama
        varchar mode_baru
        varchar sumber "dosen / admin / default"
        timestamptz created_at
    }

    TAGIHAN_PENGGANTI {
        uuid id PK
        uuid session_id FK UK
        uuid class_id FK
        uuid dosen_id FK
        int pertemuan_ke
        varchar status "menunggu / diajukan / terjadwal / kedaluwarsa / dibatalkan"
        timestamptz tenggat_at
        timestamptz next_reminder_at
        timestamptz usulan_mulai_at
        timestamptz usulan_selesai_at
        text ditolak_alasan
        uuid session_pengganti_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        uuid session_id FK
        varchar tipe
        varchar judul
        text isi
        varchar aksi_url
        timestamptz read_at
        timestamptz push_sent_at
        timestamptz created_at
    }

    PUSH_SUBSCRIPTIONS {
        uuid id PK
        uuid profile_id FK
        text endpoint UK
        text p256dh
        text auth
        text user_agent
        timestamptz last_seen_at
        timestamptz created_at
    }

    ADMIN_LOGS {
        bigint id PK
        uuid actor_id FK
        varchar aksi
        varchar target_tipe
        varchar target_id
        jsonb detail
        timestamptz created_at
    }

    LOGIN_ATTEMPTS {
        bigint id PK
        varchar kode_or_ip
        boolean success
        timestamptz created_at
    }
```

---

## 2. Aturan Relasi Kunci & Constraints

1. **Kelompok vs Enrollment:**
   - Mahasiswa terikat pada tepat satu kelompok (`profiles.group_id`). Dosen dan admin bernilai NULL.
   - Pembuatan kelas baru di `classes` otomatis memicu trigger `classes_enroll_kelompok` yang meng-enroll seluruh mahasiswa dengan `profiles.group_id = classes.group_id` dengan `sumber = 'kelompok'`.
   - Admin dapat menambah mahasiswa lintas kelompok dengan `sumber = 'manual'`.
   - Fungsi `daftar_penerima_kelas(class_id)` **selalu membaca dari tabel `enrollments`** untuk menjamin mahasiswa lintas kelompok tetap menerima jadwal dan notifikasi.

2. **Integritas Sesi:**
   - Pertemuan aktif per kelas bersifat unik melalui partial unique index:
     `create unique index sessions_pertemuan_aktif on public.sessions (class_id, pertemuan_ke) where status <> 'dibatalkan';`
   - Sesi pengganti mewarisi nilai `pertemuan_ke` dari sesi yang dibatalkan dan mengisi `pengganti_dari_id`.

3. **Perlindungan Kolom Sensitif (Trigger `guard_session_mode`):**
   - Kolom `mode`, `status`, dan `cancelled_at` pada tabel `sessions` dilarang di-UPDATE secara langsung oleh kode aplikasi atau klien. Modifikasi hanya diizinkan melalui RPC resmi berstatus `SECURITY DEFINER` yang mengeset `set local app.via_rpc = 'on'`.

4. **Immutability Riwayat (`session_confirmations_immutable`):**
   - Tabel `session_confirmations` bersifat append-only. Operasi `UPDATE` dan `DELETE` ditolak secara mutlak oleh trigger.
