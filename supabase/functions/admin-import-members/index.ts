import { z } from 'npm:zod@3'
import { corsHeaders } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'

const RowSchema = z.object({
  kode: z.string().regex(/^[0-9]{10}$/, 'Kode harus 10 digit angka'),
  nama: z.string().min(1, 'Nama wajib diisi'),
  peran: z.enum(['dosen', 'mahasiswa'], {
    errorMap: () => ({ message: 'Peran harus dosen atau mahasiswa' }),
  }),
  nim_nidn: z.string().optional().nullable(),
})

const ImportPayloadSchema = z.object({
  rows: z.array(z.record(z.unknown())),
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
    const payloadParsed = ImportPayloadSchema.safeParse(body)
    if (!payloadParsed.success) {
      return new Response(JSON.stringify({ ok: false, pesan: 'Format request tidak valid' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let berhasil = 0
    const gagal: Array<{ baris: number; kode: string; alasan: string }> = []

    for (let i = 0; i < payloadParsed.data.rows.length; i++) {
      const rawRow = payloadParsed.data.rows[i]
      const parsedRow = RowSchema.safeParse(rawRow)

      if (!parsedRow.success) {
        gagal.push({
          baris: i + 1,
          kode: String(rawRow.kode ?? '-'),
          alasan: parsedRow.error.issues.map((iss) => iss.message).join(', '),
        })
        continue
      }

      const { kode, nama, peran, nim_nidn } = parsedRow.data

      const { data: memberData, error: memberErr } = await supabaseAdmin
        .from('members')
        .upsert(
          { kode, nama, peran, nim_nidn: nim_nidn ?? null, aktif: true },
          { onConflict: 'kode' }
        )
        .select('id')
        .single()

      if (memberErr || !memberData) {
        gagal.push({
          baris: i + 1,
          kode,
          alasan: memberErr?.message ?? 'Gagal menyimpan member',
        })
        continue
      }

      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('member_id', memberData.id)
        .maybeSingle()

      if (existingProfile) {
        await supabaseAdmin
          .from('profiles')
          .update({ nama, role: peran })
          .eq('id', existingProfile.id)
      } else {
        const { error: profErr } = await supabaseAdmin.from('profiles').insert({
          member_id: memberData.id,
          role: peran,
          nama,
          auth_user_id: null,
        })
        if (profErr) {
          gagal.push({
            baris: i + 1,
            kode,
            alasan: profErr.message,
          })
          continue
        }
      }

      berhasil++
    }

    await supabaseAdmin.from('admin_logs').insert({
      actor_id: callerProfile.id,
      aksi: 'import_anggota',
      target_tipe: 'members',
      target_id: null,
      detail: { berhasil, gagal_count: gagal.length },
    })

    return new Response(JSON.stringify({ ok: true, berhasil, gagal }), {
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