import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

export function useSemesters() {
  return useQuery({
    queryKey: ['semesters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('semesters')
        .select('*')
        .order('tanggal_mulai', { ascending: false })
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useCreateSemester() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      nama: string
      tanggal_mulai: string
      tanggal_selesai: string
      aktif: boolean
    }) => {
      if (payload.aktif) {
        await supabase.from('semesters').update({ aktif: false }).eq('aktif', true)
      }
      const { error } = await supabase.from('semesters').insert(payload)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['semesters'] }),
  })
}

export function useSetActiveSemester() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (semesterId: string) => {
      await supabase.from('semesters').update({ aktif: false }).eq('aktif', true)
      const { error } = await supabase.from('semesters').update({ aktif: true }).eq('id', semesterId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['semesters'] }),
  })
}

export function useDeleteSemester() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (semesterId: string) => {
      const { error } = await supabase.from('semesters').delete().eq('id', semesterId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['semesters'] }),
  })
}