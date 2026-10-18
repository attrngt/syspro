import { z } from 'npm:zod@3'
import webpush from 'npm:web-push@3.6.7'
import { corsHeaders } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'
import { isQuietHour } from '../_shared/quiet-hours.ts'

const PayloadSchema = z.object({
  notification_ids: z.array(z.string().uuid()),
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const now = new Date()
  if (isQuietHour(now)) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const vapidPublic = Deno.env.get('VITE_VAPID_PUBLIC_KEY') ?? Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:it@prodi.example.ac.id'

  if (vapidPublic && vapidPrivate) {
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)
  }

  const supabaseAdmin = createAdminClient()

  try {
    const body = await req.json()
    const parsed = PayloadSchema.safeParse(body)
    if (!parsed.success) {
      return new Response(JSON.stringify({ ok: false, pesan: 'Input tidak valid' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: notifs } = await supabaseAdmin
      .from('notifications')
      .select('id, user_id, judul, isi, aksi_url, push_sent_at')
      .in('id', parsed.data.notification_ids)
      .is('push_sent_at', null)

    let sentCount = 0

    for (const notif of notifs ?? []) {
      const { data: subs } = await supabaseAdmin
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('profile_id', notif.user_id)

      if (!subs || subs.length === 0) continue

      let anySuccess = false
      for (const sub of subs) {
        try {
          if (vapidPublic && vapidPrivate) {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              JSON.stringify({
                id: notif.id,
                judul: notif.judul,
                isi: notif.isi,
                aksi_url: notif.aksi_url ?? '/',
              })
            )
          }
          anySuccess = true
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number })?.statusCode
          if (statusCode === 404 || statusCode === 410) {
            await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
          }
        }
      }

      if (anySuccess) {
        await supabaseAdmin
          .from('notifications')
          .update({ push_sent_at: new Date().toISOString() })
          .eq('id', notif.id)
        sentCount++
      }
    }

    return new Response(JSON.stringify({ ok: true, sent: sentCount }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ ok: false, pesan: 'Kesalahan pengiriman push' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})