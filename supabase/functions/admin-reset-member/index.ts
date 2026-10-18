import { z } from 'npm:zod@3'
import { corsHeaders } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'

const ResetSchema = z.object({
  member_id: z.string().uuid(),
  alasan: z.string().min(1, 'Alasan reset akses wajib diisi'),
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ ok: false, pesan: 'Tidak diizinkan' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseAdmin = createAdminClient()
  const token = authHeader.replace('Bearer ', '')
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)

  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ ok: false, pesan: 'Tidak diizinkan' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: callerProfile } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', userData.user.id)
    .single()

  if (!callerProfile || callerProfile.role !== 'admin') {
    return new Response(JSON.stringify({ ok: false, pesan: 'Tidak diizinkan' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    const parsed = ResetSchema.safeParse(body)
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          ok: false,
          pesan: parsed.error.issues[0]?.message ?? 'Input tidak valid',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const { member_id, alasan } = parsed.data

    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, auth_user_id')
      .eq('member_id', member_id)
      .single()

    if (!targetProfile) {
      return new Response(JSON.stringify({ ok: false, pesan: 'Anggota tidak ditemukan' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (targetProfile.auth_user_id) {
      await supabaseAdmin.auth.admin.deleteUser(targetProfile.auth_user_id)
    }

    await supabaseAdmin
      .from('profiles')
      .update({ auth_user_id: null })
      .eq('id', targetProfile.id)

    await supabaseAdmin
      .from('members')
      .update({ activated_at: null })
      .eq('id', member_id)

    // Catat ke admin_logs dengan aksi reset_akses, simpan alasan, dan JANGAN mencatat data pribadi/kode rahasia
    await supabaseAdmin.from('admin_logs').insert({
      actor_id: callerProfile.id,
      aksi: 'reset_akses',
      target_tipe: 'member',
      target_id: member_id,
      detail: { alasan },
    })

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ ok: false, pesan: 'Terjadi kesalahan server' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})