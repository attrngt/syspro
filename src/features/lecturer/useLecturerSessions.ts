import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useSession } from '../auth/useSession'

export function useLecturerTodaySessions() {
  const { profile } = useSession()
  const todayWib = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

  return useQuery({
    queryKey: ['lecturer-sessions-today', profile?.id, todayWib],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id, tanggal, mulai_at, selesai_at, mode, mode_source, status, cutoff_at,
          classes!inner (
            id, nama_kelas, dosen_id,
            courses ( kode, nama )
          )
        `)
        .eq('classes.dosen_id', profile!.id)
        .eq('tanggal', todayWib)
        .order('mulai_at', { ascending: true })

      if (error) throw new Error(error.message)
      return data
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
          classes!inner (
            id, nama_kelas, dosen_id,
            courses ( kode, nama )
          )
        `)
        .eq('classes.dosen_id', profile!.id)
        .order('mulai_at', { ascending: true })

      if (error) throw new Error(error.message)
      return data
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
          classes (
            id, nama_kelas, dosen_id,
            courses ( kode, nama ),
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
      return data
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
      void qc.invalidateQueries({ queryKey: ['admin-sessions'] })
      void qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })
}