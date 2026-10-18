import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

export function useHolidays() {
  return useQuery({
    queryKey: ['holidays'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .order('tanggal', { ascending: true })
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useCreateHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { tanggal: string; keterangan: string }) => {
      const { error } = await supabase.from('holidays').insert(payload)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['holidays'] }),
  })
}

export function useDeleteHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('holidays').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['holidays'] }),
  })
}