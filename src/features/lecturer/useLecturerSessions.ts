import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useSession } from '../auth/useSession'
import { toDateStringWib } from '../../lib/time'

export interface LecturerSessionItem {
  id: string
  tanggal: string
  mulai_at: string
  selesai_at: string
  mode: 'online' | 'offline' | 'tidak_ada' | null
  mode_source: 'dosen' | 'admin' | 'default' | null
  status: 'menunggu' | 'terkonfirmasi' | 'default_offline' | 'dibatalkan' | 'selesai'
  cutoff_at: string
  pertemuan_ke: number
  jenis: 'reguler' | 'uts' | 'uas'
  ruangan: string | null
  link_online: string | null
  pengganti_dari_id: string | null
  classes: {
    id: string
    dosen_id: string
    jumlah_pertemuan: number
    courses: {
      kode: string
      nama: string
    } | null
    student_groups: {
      id: string
      nama: string
      cohorts: {
        tahun: number
      } | null
    } | null
  } | null
}

export interface SessionDetailItem {
  id: string
  tanggal: string
  mulai_at: string
  selesai_at: string
  mode: 'online' | 'offline' | 'tidak_ada' | null
  mode_source: 'dosen' | 'admin' | 'default' | null
  status: 'menunggu' | 'terkonfirmasi' | 'default_offline' | 'dibatalkan' | 'selesai'
  cutoff_at: string
  pertemuan_ke: number
  jenis: 'reguler' | 'uts' | 'uas'
  ruangan: string | null
  link_online: string | null
  pengganti_dari_id: string | null
  cancel_reason: string | null
  classes: {
    id: string
    dosen_id: string
    jumlah_pertemuan: number
    courses: {
      kode: string
      nama: string
    } | null
    student_groups: {
      id: string
      nama: string
      cohorts: {
        tahun: number
      } | null
    } | null
    profiles: {
      nama: string
    } | null
  } | null
  session_confirmations: Array<{
    id: string
    actor_role: string
    mode_lama: string | null
    mode_baru: string
    sumber: string
    created_at: string
    profiles: {
      nama: string
    } | null
  }>
}

export interface LecturerTagihanItem {
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
}

export function useLecturerTodaySessions() {
  const { profile } = useSession()
  const todayWib = toDateStringWib(new Date())

  return useQuery({
    queryKey: ['lecturer-sessions-today', profile?.id, todayWib],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id, tanggal, mulai_at, selesai_at, mode, mode_source, status, cutoff_at,
          pertemuan_ke, jenis, ruangan, link_online, pengganti_dari_id,
          classes!inner (
            id, dosen_id, jumlah_pertemuan,
            courses ( kode, nama ),
            student_groups ( id, nama, cohorts ( tahun ) )
          )
        `)
        .eq('classes.dosen_id', profile!.id)
        .eq('tanggal', todayWib)
        .order('mulai_at', { ascending: true })

      if (error) throw new Error(error.message)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase join typing
      return (data as any) as LecturerSessionItem[]
    },
    enabled: !!profile?.id,
  })
}

export function useLecturerScheduleSessions() {
  const { profile } = useSession()

  return useQuery({
    queryKey: ['lecturer-sessions-all', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id, tanggal, mulai_at, selesai_at, mode, mode_source, status, cutoff_at,
          pertemuan_ke, jenis, ruangan, link_online, pengganti_dari_id,
          classes!inner (
            id, dosen_id, jumlah_pertemuan,
            courses ( kode, nama ),
            student_groups ( id, nama, cohorts ( tahun ) )
          )
        `)
        .eq('classes.dosen_id', profile!.id)
        .order('mulai_at', { ascending: true })

      if (error) throw new Error(error.message)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase join typing
      return (data as any) as LecturerSessionItem[]
    },
    enabled: !!profile?.id,
  })
}

export function useSessionDetail(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session-detail', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id, tanggal, mulai_at, selesai_at, mode, mode_source, status, cutoff_at,
          pertemuan_ke, jenis, ruangan, link_online, pengganti_dari_id, cancel_reason,
          classes (
            id, dosen_id, jumlah_pertemuan,
            courses ( kode, nama ),
            student_groups ( id, nama, cohorts ( tahun ) ),
            profiles!classes_dosen_id_fkey ( nama )
          ),
          session_confirmations (
            id, actor_role, mode_lama, mode_baru, sumber, created_at,
            profiles ( nama )
          )
        `)
        .eq('id', sessionId!)
        .single()

      if (error) throw new Error(error.message)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase join typing
      return (data as any) as SessionDetailItem
    },
    enabled: !!sessionId,
  })
}

export function useSetSessionMode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      sessionId,
      mode,
    }: {
      sessionId: string
      mode: 'online' | 'offline' | 'tidak_ada'
    }) => {
      // // TODO(keputusan A12): Mode tidak_ada membatalkan sesi dan membuat tagihan kelas pengganti (PRD A.1.14)
      const { error } = await supabase.rpc('set_session_mode', {
        p_session_id: sessionId,
        p_mode: mode,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['session-detail', variables.sessionId] })
      void qc.invalidateQueries({ queryKey: ['lecturer-sessions-today'] })
      void qc.invalidateQueries({ queryKey: ['lecturer-sessions-all'] })
      void qc.invalidateQueries({ queryKey: ['lecturer-tagihan'] })
      void qc.invalidateQueries({ queryKey: ['student-sessions-today'] })
      void qc.invalidateQueries({ queryKey: ['student-sessions-all'] })
      void qc.invalidateQueries({ queryKey: ['admin-sessions'] })
      void qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })
}

export function useLecturerTagihan() {
  const { profile } = useSession()

  return useQuery({
    queryKey: ['lecturer-tagihan', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tagihan_pengganti')
        .select(`
          id, session_id, class_id, dosen_id, pertemuan_ke, status, tenggat_at,
          usulan_mulai_at, usulan_selesai_at, ditolak_alasan, created_at,
          classes (
            jumlah_pertemuan,
            courses ( kode, nama ),
            student_groups ( nama, cohorts ( tahun ) )
          )
        `)
        .eq('dosen_id', profile!.id)
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase join typing
      return (data as any) as LecturerTagihanItem[]
    },
    enabled: !!profile?.id,
  })
}

export function useAjukanPengganti() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      tagihanId,
      mulaiAt,
      selesaiAt,
    }: {
      tagihanId: string
      mulaiAt: string
      selesaiAt: string
    }) => {
      const { error } = await supabase.rpc('ajukan_pengganti', {
        p_tagihan_id: tagihanId,
        p_mulai_at: mulaiAt,
        p_selesai_at: selesaiAt,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lecturer-tagihan'] })
      void qc.invalidateQueries({ queryKey: ['admin-tagihan'] })
    },
  })
}