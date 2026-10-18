import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

export interface ClassItem {
  id: string
  course_id: string
  semester_id: string
  dosen_id: string
  group_id: string | null
  jumlah_pertemuan: number
  courses: {
    id: string
    kode: string
    nama: string
    sks: number
  } | null
  semesters: {
    id: string
    nama: string
    aktif: boolean
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
  class_schedules: Array<{
    id: string
    hari: number
    jam_mulai: string
    jam_selesai: string
  }>
  enrollments: Array<{
    id: string
    mahasiswa_id: string
    sumber: string
    profiles: {
      id: string
      nama: string
      member_id: string
    } | null
  }>
}

export function useClasses() {
  return useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          id, course_id, semester_id, dosen_id, group_id, jumlah_pertemuan,
          courses ( id, kode, nama, sks ),
          semesters ( id, nama, aktif ),
          profiles!classes_dosen_id_fkey ( id, nama ),
          student_groups ( id, nama, cohorts ( id, tahun, nama ) ),
          class_schedules ( id, hari, jam_mulai, jam_selesai ),
          enrollments ( id, mahasiswa_id, sumber, profiles!enrollments_mahasiswa_id_fkey ( id, nama, member_id ) )
        `)
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase join typing resolution
      return (data as any) as ClassItem[]
    },
  })
}

export function useProfilesByRole(role: 'dosen' | 'mahasiswa') {
  return useQuery({
    queryKey: ['profiles', role],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nama, role, group_id')
        .eq('role', role)
        .order('nama')
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useCreateClasses() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      course_id: string
      semester_id: string
      dosen_id: string
      group_ids: string[]
      jumlah_pertemuan?: number
    }) => {
      const jumlah_pertemuan = payload.jumlah_pertemuan ?? 16
      const rows = payload.group_ids.map((groupId) => ({
        course_id: payload.course_id,
        semester_id: payload.semester_id,
        dosen_id: payload.dosen_id,
        group_id: groupId,
        jumlah_pertemuan,
      }))
      const { error } = await supabase.from('classes').insert(rows)
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
    mutationFn: async (payload: { class_id: string; mahasiswa_id: string; sumber?: string }) => {
      const { error } = await supabase.from('enrollments').insert({
        class_id: payload.class_id,
        mahasiswa_id: payload.mahasiswa_id,
        sumber: payload.sumber ?? 'manual',
      })
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