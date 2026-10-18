import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

export interface AdminTagihanItem {
  id: string
  session_id: string
  class_id: string
  dosen_id: string
  pertemuan_ke: number
  status: 'menunggu' | 'diajukan' | 'terjadwal' | 'kedaluwarsa' | 'dibatalkan'
  tenggat_at: string
  usulan_mulai_at: string | null
  usulan_selesai_at: string | null
  ditolak_alasan: string | null
  session_pengganti_id: string | null
  created_at: string
  classes: {
    jumlah_pertemuan: number
    courses: {
      kode: string
      nama: string
    } | null
    student_groups: {
      nama: string
      cohorts: {
        tahun: number
      } | null
    } | null
  } | null
  profiles: {
    nama: string
  } | null
}

export function useAdminTagihan() {
  return useQuery({
    queryKey: ['admin-tagihan'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tagihan_pengganti')
        .select(`
          id, session_id, class_id, dosen_id, pertemuan_ke, status, tenggat_at,
          usulan_mulai_at, usulan_selesai_at, ditolak_alasan, session_pengganti_id,
          created_at,
          classes (
            jumlah_pertemuan,
            courses ( kode, nama ),
            student_groups ( nama, cohorts ( tahun ) )
          ),
          profiles!tagihan_pengganti_dosen_id_fkey ( nama )
        `)
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase join typing
      return (data as any) as AdminTagihanItem[]
    },
  })
}

export function useAdminSetujuiPengganti() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      tagihanId,
      ruangan,
      linkOnline,
    }: {
      tagihanId: string
      ruangan?: string | null
      linkOnline?: string | null
    }) => {
      const { data, error } = await supabase.rpc('admin_setujui_pengganti', {
        p_tagihan_id: tagihanId,
        p_ruangan: ruangan ? ruangan.trim() : '',
        p_link_online: linkOnline ? linkOnline.trim() : '',
      })
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-tagihan'] })
      void qc.invalidateQueries({ queryKey: ['admin-sessions'] })
      void qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })
}

export function useAdminTolakPengganti() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      tagihanId,
      alasan,
    }: {
      tagihanId: string
      alasan: string
    }) => {
      const { error } = await supabase.rpc('admin_tolak_pengganti', {
        p_tagihan_id: tagihanId,
        p_alasan: alasan.trim(),
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-tagihan'] })
    },
  })
}

export function useAdminJadwalkanPengganti() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      tagihanId,
      mulaiAt,
      selesaiAt,
      ruangan,
      linkOnline,
    }: {
      tagihanId: string
      mulaiAt: string
      selesaiAt: string
      ruangan?: string | null
      linkOnline?: string | null
    }) => {
      const { data, error } = await supabase.rpc('admin_jadwalkan_pengganti', {
        p_tagihan_id: tagihanId,
        p_mulai_at: mulaiAt,
        p_selesai_at: selesaiAt,
        p_ruangan: ruangan ? ruangan.trim() : '',
        p_link_online: linkOnline ? linkOnline.trim() : '',
      })
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-tagihan'] })
      void qc.invalidateQueries({ queryKey: ['admin-sessions'] })
      void qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })
}
