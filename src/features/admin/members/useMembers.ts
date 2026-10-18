import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import type { MemberCsvRow } from '../../../lib/csv'

export function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('peran')
        .order('kode')
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useImportMembers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (rows: MemberCsvRow[]) => {
      const { data, error } = await supabase.functions.invoke<{
        ok: boolean
        berhasil: number
        gagal: Array<{ baris: number; kode: string; alasan: string }>
        pesan?: string
      }>('admin-import-members', {
        body: { rows },
      })
      if (error || !data?.ok) {
        throw new Error(data?.pesan ?? error?.message ?? 'Gagal mengimpor anggota')
      }
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['members'] })
      void qc.invalidateQueries({ queryKey: ['profiles'] })
    },
  })
}

export function useToggleMemberActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, aktif }: { id: string; aktif: boolean }) => {
      const { error } = await supabase.from('members').update({ aktif }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['members'] }),
  })
}

export function useResetMemberAccess() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { data, error } = await supabase.functions.invoke<{ ok: boolean; pesan?: string }>(
        'admin-reset-member',
        { body: { member_id: memberId } }
      )
      if (error || !data?.ok) {
        throw new Error(data?.pesan ?? error?.message ?? 'Gagal mereset akses anggota')
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['members'] }),
  })
}