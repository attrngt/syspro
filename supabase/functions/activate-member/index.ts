import { z } from 'npm:zod@3'
import { corsHeaders } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'

const ActivateSchema = z.object({
  kode: z.string().regex(/^[0-9]{10}$/),
  password: z.string().min(8),
})

const GENERIC_ERROR = { ok: false, pesan: 'Kode atau status tidak valid.' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseAdmin = createAdminClient()
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  try {
    const body = await req.json()
    const parsed = ActivateSchema.safeParse(body)

    if (!parsed.success) {
      return new Response(JSON.stringify(GENERIC_ERROR), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { kode, password } = parsed.data
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()

    // Cek rate limit (> 5 gagal dalam 15 menit untuk kode atau IP)
    const { count: failedCount } = await supabaseAdmin
      .from('login_attempts')
      .select('*', { count: 'exact', head: true })
      .in('kode_or_ip', [kode, clientIp])
      .eq('success', false)
      .gte('created_at', fifteenMinsAgo)

    if ((failedCount ?? 0) >= 5) {
      return new Response(JSON.stringify(GENERIC_ERROR), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Cek member aktif dan belum diaktivasi
    const { data: member } = await supabaseAdmin
      .from('members')
      .select('id, nama, peran, aktif, activated_at')
      .eq('kode', kode)
      .single()

    const { data: profile } = member
      ? await supabaseAdmin
          .from('profiles')
          .select('id, auth_user_id')
          .eq('member_id', member.id)
          .single()
      : { data: null }

    if (!member || !member.aktif || member.activated_at || !profile || profile.auth_user_id) {
      await supabaseAdmin.from('login_attempts').insert([
        { kode_or_ip: kode, success: false },
        { kode_or_ip: clientIp, success: false },
      ])
      return new Response(JSON.stringify(GENERIC_ERROR), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Buat user di Supabase Auth dengan email sintetis
    const syntheticEmail = `${kode}@anggota.internal`
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: syntheticEmail,
      password,
      email_confirm: true,
    })

    if (authErr || !authData.user) {
      await supabaseAdmin.from('login_attempts').insert({ kode_or_ip: kode, success: false })
      return new Response(JSON.stringify(GENERIC_ERROR), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update profiles.auth_user_id dan members.activated_at
    await supabaseAdmin
      .from('profiles')
      .update({ auth_user_id: authData.user.id })
      .eq('id', profile.id)

    await supabaseAdmin
      .from('members')
      .update({ activated_at: new Date().toISOString() })
      .eq('id', member.id)

    await supabaseAdmin.from('login_attempts').insert({ kode_or_ip: kode, success: true })

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify(GENERIC_ERROR), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})