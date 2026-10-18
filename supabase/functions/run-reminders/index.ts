import { corsHeaders } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'
import { isQuietHour } from '../_shared/quiet-hours.ts'
import {
  evaluateSessionReminder,
  evaluateTagihanBilling,
  evaluateTagihanDeadline,
  evaluateTagihanExpiry,
  tanggalWib,
} from '../_shared/reminder-policy.ts'

interface JoinedCohort {
  tahun: number
}

interface JoinedStudentGroup {
  nama: string
  cohorts: JoinedCohort | null
}

interface JoinedCourse {
  nama: string
}

interface JoinedSemester {
  tanggal_selesai: string
}

interface JoinedClassInfo {
  id?: string
  dosen_id?: string
  jumlah_pertemuan?: number
  courses?: JoinedCourse | null
  student_groups?: JoinedStudentGroup | null
  semesters?: JoinedSemester | null
}

function formatWibHHMM(isoStr: string | Date): string {
  const date = typeof isoStr === 'string' ? new Date(isoStr) : isoStr
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(':', '.')
}

function formatTanggalWib(isoStr: string | Date): string {
  const date = typeof isoStr === 'string' ? new Date(isoStr) : isoStr
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const cronSecret = Deno.env.get('CRON_SECRET') ?? ''
  const providedSecret = req.headers.get('x-cron-secret') ?? ''

  if (!cronSecret || providedSecret !== cronSecret) {
    return new Response(JSON.stringify({ ok: false, pesan: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseAdmin = createAdminClient()

  // Support override waktu untuk testing staging via header 'x-test-now' (PRD 15.5)
  const testNowHeader = req.headers.get('x-test-now')
  const now = testNowHeader ? new Date(testNowHeader) : new Date()
  const nowIso = now.toISOString()
  const todayWib = tanggalWib(now)

  // =========================================================
  // 1. TANDAI SESI SELESAI (PRD 5.10, 11.6 & RPC RESMI)
  // =========================================================
  await supabaseAdmin.rpc('cron_selesaikan_sesi')

  // =========================================================
  // 2. PENGINGAT DOSEN & DEFAULT CUTOFF (PRD 11.3)
  // =========================================================
  const { data: candidateSessions } = await supabaseAdmin
    .from('sessions')
    .select(`
      id, mulai_at, selesai_at, cutoff_at, next_reminder_at, reminder_count, mode, status, pertemuan_ke,
      classes (
        id, dosen_id, jumlah_pertemuan,
        courses ( nama ),
        student_groups (
          nama,
          cohorts ( tahun )
        )
      )
    `)
    .eq('status', 'menunggu')
    .is('mode', null)
    .lte('next_reminder_at', nowIso)

  let remindersCreated = 0
  let defaultsApplied = 0

  for (const s of candidateSessions ?? []) {
    const decision = evaluateSessionReminder(
      {
        mulaiAt: new Date(s.mulai_at),
        cutoffAt: new Date(s.cutoff_at),
        nextReminderAt: s.next_reminder_at ? new Date(s.next_reminder_at) : null,
        reminderCount: s.reminder_count,
        mode: s.mode,
        status: s.status,
      },
      now
    )

    if (decision.type === 'apply_default') {
      const { data: applied } = await supabaseAdmin.rpc('apply_default_mode', {
        p_session_id: s.id,
      })
      if (applied) defaultsApplied++
    } else if (decision.type === 'defer_quiet_hours') {
      await supabaseAdmin
        .from('sessions')
        .update({
          next_reminder_at: decision.nextReminderAt
            ? decision.nextReminderAt.toISOString()
            : null,
        })
        .eq('id', s.id)
    } else if (decision.type === 'send_reminder') {
      const cls = s.classes as unknown as JoinedClassInfo | null
      const courseName = cls?.courses?.nama ?? 'Mata Kuliah'
      const groupTahun = cls?.student_groups?.cohorts?.tahun ?? ''
      const groupNama = cls?.student_groups?.nama ?? ''
      const groupLabel = `${groupTahun} ${groupNama}`.trim() || '-'
      const dosenId = cls?.dosen_id
      const nTotal = cls?.jumlah_pertemuan ?? 16

      if (dosenId) {
        await supabaseAdmin.from('notifications').insert({
          user_id: dosenId,
          session_id: s.id,
          tipe: 'pengingat_dosen',
          judul: 'Konfirmasi kuliah',
          isi: `Konfirmasi kuliah: ${courseName}, Kelas ${groupLabel}, pertemuan ${s.pertemuan_ke} dari ${nTotal}, ${formatWibHHMM(s.mulai_at)}–${formatWibHHMM(s.selesai_at)}.`,
          aksi_url: `/dosen/sesi/${s.id}`,
        })
      }

      await supabaseAdmin
        .from('sessions')
        .update({
          reminder_count: decision.newReminderCount,
          next_reminder_at: decision.nextReminderAt
            ? decision.nextReminderAt.toISOString()
            : null,
        })
        .eq('id', s.id)

      remindersCreated++
    }
  }

  // =========================================================
  // 3. TAGIHAN PENGGANTI: LANGKAH 1 PENAGIHAN HARIAN (PRD A.1.10)
  // =========================================================
  const { data: candidateTagihan } = await supabaseAdmin
    .from('tagihan_pengganti')
    .select(`
      id, session_id, class_id, dosen_id, pertemuan_ke, status, tenggat_at, next_reminder_at, reminder_count,
      classes (
        jumlah_pertemuan,
        courses ( nama ),
        student_groups (
          nama,
          cohorts ( tahun )
        )
      )
    `)
    .eq('status', 'menunggu')
    .lte('next_reminder_at', nowIso)

  let tagihanBilled = 0

  for (const t of candidateTagihan ?? []) {
    const decision = evaluateTagihanBilling(
      {
        status: t.status as 'menunggu' | 'diajukan' | 'terjadwal' | 'kedaluwarsa' | 'dibatalkan',
        tenggatAt: new Date(t.tenggat_at),
        nextReminderAt: t.next_reminder_at ? new Date(t.next_reminder_at) : null,
        reminderCount: t.reminder_count,
      },
      now
    )

    if (decision.type === 'stop_billing') {
      await supabaseAdmin
        .from('tagihan_pengganti')
        .update({ next_reminder_at: null })
        .eq('id', t.id)
    } else if (decision.type === 'send_billing') {
      const cls = t.classes as unknown as JoinedClassInfo | null
      const courseName = cls?.courses?.nama ?? 'Mata Kuliah'
      const groupTahun = cls?.student_groups?.cohorts?.tahun ?? ''
      const groupNama = cls?.student_groups?.nama ?? ''
      const groupLabel = `${groupTahun} ${groupNama}`.trim() || '-'
      const nTotal = cls?.jumlah_pertemuan ?? 16

      await supabaseAdmin.from('notifications').insert({
        user_id: t.dosen_id,
        session_id: t.session_id,
        tipe: 'tagihan_pengganti',
        judul: 'Tagihan kelas pengganti',
        isi: `Kewajiban kelas pengganti: ${courseName}, Kelas ${groupLabel}, pertemuan ${t.pertemuan_ke} dari ${nTotal}. Tenggat: ${formatTanggalWib(t.tenggat_at)}. Segera ajukan jadwal.`,
        aksi_url: '/dosen/tagihan',
      })

      await supabaseAdmin
        .from('tagihan_pengganti')
        .update({
          reminder_count: decision.newReminderCount,
          next_reminder_at: decision.nextReminderAt ? decision.nextReminderAt.toISOString() : null,
        })
        .eq('id', t.id)

      tagihanBilled++
    }
  }

  // =========================================================
  // 4. TAGIHAN PENGGANTI: LANGKAH 2 TENGGAT TERLEWAT (PRD A.1.10)
  // =========================================================
  const { data: missedDeadlines } = await supabaseAdmin
    .from('tagihan_pengganti')
    .select(`
      id, session_id, class_id, dosen_id, status, tenggat_at, tenggat_notif_at,
      classes (
        courses ( nama ),
        student_groups ( nama, cohorts ( tahun ) )
      )
    `)
    .in('status', ['menunggu', 'diajukan'])
    .lte('tenggat_at', nowIso)
    .is('tenggat_notif_at', null)

  const { data: admins } = await supabaseAdmin.from('profiles').select('id').eq('role', 'admin')

  for (const m of missedDeadlines ?? []) {
    const decision = evaluateTagihanDeadline(
      {
        status: m.status as 'menunggu' | 'diajukan' | 'terjadwal' | 'kedaluwarsa' | 'dibatalkan',
        tenggatAt: new Date(m.tenggat_at),
        tenggatNotifAt: m.tenggat_notif_at ? new Date(m.tenggat_notif_at) : null,
      },
      now
    )

    if (decision.type === 'notify_missed_deadline') {
      const cls = m.classes as unknown as JoinedClassInfo | null
      const courseName = cls?.courses?.nama ?? 'Mata Kuliah'
      const groupTahun = cls?.student_groups?.cohorts?.tahun ?? ''
      const groupNama = cls?.student_groups?.nama ?? ''
      const groupLabel = `${groupTahun} ${groupNama}`.trim() || '-'

      // Notifikasi ke dosen
      await supabaseAdmin.from('notifications').insert({
        user_id: m.dosen_id,
        session_id: m.session_id,
        tipe: 'tagihan_pengganti',
        judul: 'Tenggat terlewat',
        isi: `Tenggat terlewat: ${courseName}, Kelas ${groupLabel}. Ajukan kelas pengganti sekarang.`,
        aksi_url: '/dosen/tagihan',
      })

      // Notifikasi ke semua admin
      for (const adm of admins ?? []) {
        await supabaseAdmin.from('notifications').insert({
          user_id: adm.id,
          session_id: m.session_id,
          tipe: 'ringkasan_admin',
          judul: 'Tenggat kelas pengganti terlewat',
          isi: `Dosen belum mengajukan kelas pengganti untuk ${courseName}, Kelas ${groupLabel}. Tenggat sudah terlewat.`,
          aksi_url: '/admin/tagihan',
        })
      }

      await supabaseAdmin
        .from('tagihan_pengganti')
        .update({
          tenggat_notif_at: nowIso,
          next_reminder_at: null,
        })
        .eq('id', m.id)
    }
  }

  // =========================================================
  // 5. TAGIHAN PENGGANTI: LANGKAH 3 KEDALUWARSA (PRD A.1.10)
  // =========================================================
  const { data: pendingTagihan } = await supabaseAdmin
    .from('tagihan_pengganti')
    .select(`
      id, status,
      classes (
        semesters ( tanggal_selesai )
      )
    `)
    .in('status', ['menunggu', 'diajukan'])

  for (const pt of pendingTagihan ?? []) {
    const cls = pt.classes as unknown as JoinedClassInfo | null
    const semTglSelesai = cls?.semesters?.tanggal_selesai
    if (semTglSelesai) {
      const decision = evaluateTagihanExpiry(
        {
          status: pt.status as 'menunggu' | 'diajukan' | 'terjadwal' | 'kedaluwarsa' | 'dibatalkan',
          semesterTanggalSelesai: semTglSelesai,
        },
        now
      )

      if (decision.type === 'expire_tagihan') {
        await supabaseAdmin
          .from('tagihan_pengganti')
          .update({
            status: 'kedaluwarsa',
            next_reminder_at: null,
          })
          .eq('id', pt.id)
      }
    }
  }

  // =========================================================
  // 6. RINGKASAN ADMIN PAGI HARI (PRD 5.8 & 11.5)
  // =========================================================
  if (!isQuietHour(now)) {
    const { data: existingDigest } = await supabaseAdmin
      .from('admin_logs')
      .select('id')
      .eq('aksi', 'ringkasan_admin_terkirim')
      .contains('detail', { tanggal: todayWib })
      .maybeSingle()

    if (!existingDigest) {
      const { data: defaultSessions } = await supabaseAdmin
        .from('sessions')
        .select(`
          id, tanggal,
          classes (
            courses ( nama ),
            student_groups ( nama, cohorts ( tahun ) )
          )
        `)
        .eq('status', 'default_offline')
        .eq('tanggal', todayWib)

      if (defaultSessions && defaultSessions.length > 0) {
        const daftar = defaultSessions
          .map((ds) => {
            const cls = ds.classes as unknown as JoinedClassInfo | null
            const courseName = cls?.courses?.nama ?? ''
            const groupTahun = cls?.student_groups?.cohorts?.tahun ?? ''
            const groupNama = cls?.student_groups?.nama ?? ''
            return `${courseName} (Kelas ${groupTahun} ${groupNama})`.trim()
          })
          .join(', ')

        for (const adm of admins ?? []) {
          await supabaseAdmin.from('notifications').insert({
            user_id: adm.id,
            tipe: 'ringkasan_admin',
            judul: 'Ringkasan Mode Default',
            isi: `Sesi dengan mode default Offline hari ini: ${daftar}.`,
            aksi_url: '/admin/sesi',
          })
        }

        await supabaseAdmin.from('admin_logs').insert({
          aksi: 'ringkasan_admin_terkirim',
          detail: { tanggal: todayWib, jumlah: defaultSessions.length },
        })
      }
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      remindersCreated,
      defaultsApplied,
      tagihanBilled,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
})