import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

export interface AdminSessionItem {
  id: string
  tanggal: string
  mulai_at: string
  selesai_at: string
  pertemuan_ke: number
  jenis: 'reguler' | 'uts' | 'uas'
  mode: 'online' | 'offline' | 'tidak_ada' | null
  mode_source: 'dosen' | 'admin' | 'default' | null
  status: 'menunggu' | 'terkonfirmasi' | 'default_offline' | 'dibatalkan' | 'selesai'
  cutoff_at: string
  ruangan: string | null
  link_online: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  cancel_source: string | null
  restored_at: string | null
  pengganti_dari_id: string | null
  classes: {
    id: string
    jumlah_pertemuan: number
    courses: {
      id: string
      kode: string
      nama: string
    } | null
    profiles: {
      id: string
      nama: string
    } | null
    student_groups: {
      id: string
      nama: string
      cohorts: {
        id: string
        tahun: number
        nama: string
      } | null
    } | null
  } | null
}

export function useSessionsAdmin(semesterId?: string) {
  return useQuery({
    queryKey: ['admin-sessions', semesterId],
    queryFn: async () => {
      let query = supabase
        .from('sessions')
        .select(`
  id, tanggal, mulai_at, selesai_at, pertemuan_ke, jenis,
  mode, mode_source, status, cutoff_at, ruangan, link_online,
  cancelled_at, cancel_reason, cancel_source, restored_at, pengganti_dari_id,
  classes!inner (
    id, semester_id, jumlah_pertemuan,
    courses ( id, kode, nama ),
    profiles!classes_dosen_id_fkey ( id, nama ),
    student_groups ( id, nama, cohorts ( id, tahun, nama ) )
  )
`)
        .order('mulai_at', { ascending: true })

      if (semesterId) {
        query = query.eq('classes.semester_id', semesterId)
      }

      const { data, error } = await query.limit(1000)
      if (error) throw new Error(error.message)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- join types
      return (data as any) as AdminSessionItem[]
    },
    enabled: !!semesterId,
  })
}

export function useGenerateSessions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (semesterId: string) => {
      const { data, error } = await supabase.rpc('generate_sessions', {
        p_semester_id: semesterId,
      })
      if (error) throw new Error(error.message)
      return data as number
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-sessions'] })
      void qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })
}

export function useCancelSessionAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ sessionId, alasan }: { sessionId: string; alasan?: string }) => {
      const { error } = await supabase.rpc('admin_cancel_session', {
  p_session_id: sessionId,
  p_keterangan: alasan?.trim() || undefined,
})
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-sessions'] })
      void qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })
}

export function useRestoreSessionAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase.rpc('admin_restore_session', {
        p_session_id: sessionId,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-sessions'] })
      void qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })
}

export function useSetLokasiSesiAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      sessionId,
      ruangan,
      linkOnline,
    }: {
      sessionId: string
      ruangan?: string
      linkOnline?: string
    }) => {
      const { error } = await supabase.rpc('admin_set_lokasi_sesi', {
        p_session_id: sessionId,
        p_ruangan: ruangan ? ruangan.trim() : '',
        p_link_online: linkOnline ? linkOnline.trim() : '',
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-sessions'] })
    },
  })
}