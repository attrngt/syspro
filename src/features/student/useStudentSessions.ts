import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useSession } from '../auth/useSession'
import { formatDateWib, formatTimeWib } from '../../lib/time'

export interface StudentSessionItem {
  id: string
  tanggal: string
  mulai_at: string
  selesai_at: string
  mode: string | null
  mode_source: string | null
  status: string
  classes: {
    id: string
    nama_kelas: string
    courses: {
      kode: string
      nama: string
    } | null
    profiles: {
      nama: string
    } | null
  } | null
}

const CACHE_KEY_DATA = 'syspro_student_schedule_cache'
const CACHE_KEY_TIME = 'syspro_student_schedule_updated_at'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

export function useStudentSchedule() {
  const { profile } = useSession()
  const isOnline = useOnlineStatus()

  const query = useQuery({
    queryKey: ['student-sessions', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id, tanggal, mulai_at, selesai_at, mode, mode_source, status,
          classes (
            id, nama_kelas,
            courses ( kode, nama ),
            profiles!classes_dosen_id_fkey ( nama )
          )
        `)
        .order('mulai_at', { ascending: true })

      if (error) throw new Error(error.message)

      const nowStr = `${formatDateWib(new Date())} ${formatTimeWib(new Date())} WIB`
      try {
        localStorage.setItem(CACHE_KEY_DATA, JSON.stringify(data))
        localStorage.setItem(CACHE_KEY_TIME, nowStr)
      } catch {
        // Abaikan jika storage penuh
      }

      return data as StudentSessionItem[]
    },
    enabled: !!profile?.id,
    initialData: () => {
      try {
        const raw = localStorage.getItem(CACHE_KEY_DATA)
        return raw ? (JSON.parse(raw) as StudentSessionItem[]) : undefined
      } catch {
        return undefined
      }
    },
  })

  const lastUpdated =
    typeof window !== 'undefined' ? localStorage.getItem(CACHE_KEY_TIME) : null

  return {
    ...query,
    isOnline,
    lastUpdated,
  }
}