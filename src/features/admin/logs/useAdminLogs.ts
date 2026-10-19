import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

export interface ModeChangeLogItem {
  id: number
  actor_role: string
  mode_lama: string | null
  mode_baru: string
  sumber: string
  created_at: string
  profiles: {
    nama: string
  } | null
  sessions: {
    tanggal: string
    mulai_at: string
    classes: {
      courses: {
        kode: string
        nama: string
      } | null
      student_groups: {
        id: string
        nama: string
        cohorts: {
          tahun: number
          nama: string
        } | null
      } | null
    } | null
  } | null
}

export function useModeChangeLogs() {
  return useQuery({
    queryKey: ['admin-mode-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_confirmations')
        .select(`
          id, actor_role, mode_lama, mode_baru, sumber, created_at,
          profiles ( nama ),
          sessions (
            tanggal, mulai_at,
            classes (
              courses ( kode, nama ),
              student_groups ( id, nama, cohorts ( tahun, nama ) )
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw new Error(error.message)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase join typing
      return (data as any) as ModeChangeLogItem[]
    },
  })
}

export function useSystemAdminLogs() {
  return useQuery({
    queryKey: ['admin-system-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_logs')
        .select(`
          id, aksi, target_tipe, target_id, detail, created_at,
          profiles ( nama )
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw new Error(error.message)
      return data
    },
  })
}