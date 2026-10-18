import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

export interface HolidayItem {
  id: string
  tanggal: string
  keterangan: string
  is_libur_kuliah: boolean
  created_at: string
}

export function useHolidays() {
  return useQuery({
    queryKey: ['holidays'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .order('tanggal', { ascending: true })
      if (error) throw new Error(error.message)
      return data as HolidayItem[]
    },
  })
}

export function usePreviewHoliday() {
  return useMutation({
    mutationFn: async (tanggal: string) => {
      const { data, error } = await supabase.rpc('admin_preview_libur', {
        p_tanggal: tanggal,
      })
      if (error) throw new Error(error.message)
      const row = data?.[0] ?? { akan_dibatalkan: 0, sudah_berlangsung: 0 }
      return {
        akan_dibatalkan: Number(row.akan_dibatalkan),
        sudah_berlangsung: Number(row.sudah_berlangsung),
      }
    },
  })
}

export function useUpsertHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      tanggal,
      keterangan,
      isLiburKuliah,
    }: {
      tanggal: string
      keterangan: string
      isLiburKuliah: boolean
    }) => {
      const { data, error } = await supabase.rpc('admin_upsert_holiday', {
        p_tanggal: tanggal,
        p_keterangan: keterangan,
        p_libur_kuliah: isLiburKuliah,
      })
      if (error) throw new Error(error.message)
      return data as number
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['holidays'] })
      void qc.invalidateQueries({ queryKey: ['admin-stats'] })
      void qc.invalidateQueries({ queryKey: ['admin-sessions'] })
    },
  })
}

export function useDeleteHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (tanggal: string) => {
      const { error } = await supabase.rpc('admin_delete_holiday', {
        p_tanggal: tanggal,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['holidays'] })
      void qc.invalidateQueries({ queryKey: ['admin-stats'] })
      void qc.invalidateQueries({ queryKey: ['admin-sessions'] })
    },
  })
}