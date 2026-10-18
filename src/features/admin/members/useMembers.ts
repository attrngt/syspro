import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import type { MemberCsvRow } from '../../../lib/csv'

export interface MemberItem {
  id: string
  kode: string
  nama: string
  peran: 'dosen' | 'mahasiswa'
  nim_nidn: string | null
  aktif: boolean
  activated_at: string | null
  created_at: string
  profiles: Array<{
    id: string
    role: string
    group_id: string | null
    student_groups: {
      id: string
      nama: string
      cohorts: {
        id: string
        tahun: number
        nama: string
      } | null
    } | null
  }> | null
}

export function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select(`
          id, kode, nama, peran, nim_nidn, aktif, activated_at, created_at,
          profiles (
            id, role, group_id,
            student_groups (
              id, nama,
              cohorts ( id, tahun, nama )
            )
          )
        `)
        .order('peran')
        .order('kode')
      if (error) throw new Error(error.message)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- join types
      return (data as any) as MemberItem[]
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
      void qc.invalidateQueries({ queryKey: ['classes'] })
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
    mutationFn: async ({ memberId, alasan }: { memberId: string; alasan: string }) => {
      const { data, error } = await supabase.functions.invoke<{ ok: boolean; pesan?: string }>(
        'admin-reset-member',
        { body: { member_id: memberId, alasan } }
      )
      if (error || !data?.ok) {
        throw new Error(data?.pesan ?? error?.message ?? 'Gagal mereset akses anggota')
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['members'] }),
  })
}

export function useMoveStudentGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      profileId,
      groupId,
      alasan,
    }: {
      profileId: string
      groupId: string
      alasan: string
    }) => {
      const { error } = await supabase.rpc('admin_pindah_kelompok', {
        p_profile_id: profileId,
        p_group_id: groupId,
        p_alasan: alasan,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['members'] })
      void qc.invalidateQueries({ queryKey: ['classes'] })
      void qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })
}