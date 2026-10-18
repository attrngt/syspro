import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

export function useClasses() {
  return useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          id, nama_kelas, course_id, semester_id, dosen_id,
          courses ( kode, nama ),
          semesters ( nama, aktif ),
          profiles!classes_dosen_id_fkey ( nama ),
          class_schedules ( id, hari, jam_mulai, jam_selesai ),
          enrollments ( id, mahasiswa_id, profiles!enrollments_mahasiswa_id_fkey ( nama ) )
        `)
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useProfilesByRole(role: 'dosen' | 'mahasiswa') {
  return useQuery({
    queryKey: ['profiles', role],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nama, role')
        .eq('role', role)
        .order('nama')
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useCreateClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      course_id: string
      semester_id: string
      dosen_id: string
      nama_kelas: string
    }) => {
      const { error } = await supabase.from('classes').insert(payload)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['classes'] }),
  })
}

export function useDeleteClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (classId: string) => {
      const { error } = await supabase.from('classes').delete().eq('id', classId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['classes'] }),
  })
}

export function useAddSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      class_id: string
      hari: number
      jam_mulai: string
      jam_selesai: string
    }) => {
      const { error } = await supabase.from('class_schedules').insert(payload)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['classes'] }),
  })
}

export function useDeleteSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (scheduleId: string) => {
      const { error } = await supabase.from('class_schedules').delete().eq('id', scheduleId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['classes'] }),
  })
}

export function useEnrollStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { class_id: string; mahasiswa_id: string }) => {
      const { error } = await supabase.from('enrollments').insert(payload)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['classes'] }),
  })
}

export function useUnenrollStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase.from('enrollments').delete().eq('id', enrollmentId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['classes'] }),
  })
}