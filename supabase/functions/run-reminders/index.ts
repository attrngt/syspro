import { corsHeaders } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'
import { isQuietHour } from '../_shared/quiet-hours.ts'
import { evaluateSessionReminder } from '../_shared/reminder-policy.ts'

function formatWibHHMM(isoStr: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(new Date(isoStr))
    .replace(':', '.')
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
  const now = new Date()
  const nowIso = now.toISOString()

  // 1. Tandai sesi yang sudah melewati selesai_at menjadi 'selesai' (PRD 5.10 & 11.6)
  await supabaseAdmin
    .from('sessions')
    .update({ status: 'selesai', next_reminder_at: null })
    .lt('selesai_at', nowIso)
    .in('status', ['menunggu', 'terkonfirmasi', 'default_offline'])

  // 2. Ambil sesi yang masih menunggu dan next_reminder_at <= now
  const { data: candidates } = await supabaseAdmin
    .from('sessions')
    .select(`
      id, mulai_at, selesai_at, cutoff_at, next_reminder_at, reminder_count, mode, status,
      classes (
        nama_kelas, dosen_id,
        courses ( nama )
      )
    `)
    .eq('status', 'menunggu')
    .is('mode', null)
    .lte('next_reminder_at', nowIso)

  let remindersCreated = 0
  let defaultsApplied = 0

  for (const s of candidates ?? []) {
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
      const courseName = s.classes?.courses?.nama ?? 'Mata Kuliah'
      const className = s.classes?.nama_kelas ?? '-'
      const dosenId = s.classes?.dosen_id

      if (dosenId) {
        await supabaseAdmin.from('notifications').insert({
          user_id: dosenId,
          session_id: s.id,
          tipe: 'pengingat_dosen',
          judul: 'Konfirmasi kuliah',
          isi: `Konfirmasi kuliah: ${courseName}, ${formatWibHHMM(s.mulai_at)}–${formatWibHHMM(
            s.selesai_at
          )}, Kelas ${className}.`,
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

  // 3. Ringkasan Admin sekali sehari setelah 06.30 WIB (PRD 5.8 & 11.5)
  if (!isQuietHour(now)) {
    const todayWib = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
    const { data: existingDigest } = await supabaseAdmin
      .from('admin_logs')
      .select('id')
      .eq('aksi', 'ringkasan_admin_terkirim')
      .contains('detail', { tanggal: todayWib })
      .maybeSingle()

    if (!existingDigest) {
      const { data: defaultSessions } = await supabaseAdmin
        .from('sessions')
        .select('id, tanggal, classes ( nama_kelas, courses ( nama ) )')
        .eq('status', 'default_offline')
        .eq('tanggal', todayWib)

      if (defaultSessions && defaultSessions.length > 0) {
        const { data: admins } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('role', 'admin')

        const daftar = defaultSessions
          .map((ds) => `${ds.classes?.courses?.nama} (Kelas ${ds.classes?.nama_kelas})`)
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
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
})