import { createContext, useContext } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { copy } from '../../lib/copy'

export type UserRole = 'admin' | 'dosen' | 'mahasiswa'

export interface UserProfile {
  id: string
  role: UserRole
  nama: string
  member_id: string | null
  group_id?: string | null
}

export interface AuthContextValue {
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useSession() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useSession harus dipakai di dalam AuthProvider')
  }
  return context
}

export function getHomeRouteByRole(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin'
    case 'dosen':
      return '/dosen'
    case 'mahasiswa':
      return '/mahasiswa'
  }
}

export function useMemberLogin() {
  return useMutation({
    mutationFn: async ({ kode, password }: { kode: string; password: string }) => {
      const email = `${kode}@anggota.internal`
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        throw new Error(copy.auth.gagalGenerik)
      }
    },
  })
}

export function useAdminLogin() {
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        throw new Error(copy.auth.gagalLoginAdmin)
      }
    },
  })
}

export function useActivateMember() {
  return useMutation({
    mutationFn: async ({ kode, password }: { kode: string; password: string }) => {
      const { data, error } = await supabase.functions.invoke<{ ok: boolean; pesan?: string }>(
        'activate-member',
        { body: { kode, password } }
      )
      if (error || !data?.ok) {
        throw new Error(copy.aktivasi.gagal)
      }
      const email = `${kode}@anggota.internal`
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        throw new Error(copy.aktivasi.gagal)
      }
    },
  })
}