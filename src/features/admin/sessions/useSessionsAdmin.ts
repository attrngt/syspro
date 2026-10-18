import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

export function useSessionsAdmin(semesterId?: string) {
  return useQuery({
    queryKey: ['admin-sessions', semesterId],
    queryFn: async () => {
      let query = supabase
        .from('sessions')
        .select(`
          id, tanggal, mulai_at, selesai_at, mode, mode_source, status, cutoff_at,
          classes (
            nama_kelas,
            courses ( kode, nama ),
            profiles!classes_dosen_id_fkey ( nama )
          )
        `)
        .order('mulai_at', { ascending: true })

      if (semesterId) {
        query = query.eq('classes.semester_id', semesterId)
      }

      const { data, error } = await query.limit(100)
      if (error) throw new Error(error.message)
      return data
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