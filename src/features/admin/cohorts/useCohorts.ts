import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

export interface Cohort {
  id: string
  tahun: number
  nama: string
  aktif: boolean
  created_at: string
}

export interface StudentGroup {
  id: string
  cohort_id: string
  nama: string
  created_at: string
  cohorts?: Cohort | null
}

export function useCohorts() {
  return useQuery({
    queryKey: ['admin-cohorts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cohorts')
        .select('*')
        .order('tahun', { ascending: false })
      if (error) throw new Error(error.message)
      return data as Cohort[]
    },
  })
}

export function useStudentGroups() {
  return useQuery({
    queryKey: ['admin-student-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_groups')
        .select('*, cohorts ( tahun, nama )')
        .order('nama', { ascending: true })
      if (error) throw new Error(error.message)
      return data as StudentGroup[]
    },
  })
}

export function useCreateCohort() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ tahun, nama }: { tahun: number; nama: string }) => {
      const { error } = await supabase.from('cohorts').insert({ tahun, nama, aktif: true })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-cohorts'] })
    },
  })
}

export function useCreateStudentGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ cohortId, nama }: { cohortId: string; nama: string }) => {
      const { error } = await supabase
        .from('student_groups')
        .insert({ cohort_id: cohortId, nama: nama.trim().toUpperCase() })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-student-groups'] })
    },
  })
}
