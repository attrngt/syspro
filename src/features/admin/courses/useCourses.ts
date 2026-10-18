import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('*').order('kode')
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useCreateCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { kode: string; nama: string; sks: number }) => {
      const { error } = await supabase.from('courses').insert(payload)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['courses'] }),
  })
}

export function useDeleteCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase.from('courses').delete().eq('id', courseId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['courses'] }),
  })
}