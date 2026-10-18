import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
      const [sessionsRes, waitingRes, defaultRes, attentionRes] = await Promise.all([
        supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('tanggal', today),
        supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('status', 'menunggu'),
        supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('status', 'default_offline'),
        supabase
          .from('sessions')
          .select(`
            id, tanggal, mulai_at, selesai_at, mode, status,
            classes (
              nama_kelas,
              courses ( kode, nama ),
              profiles!classes_dosen_id_fkey ( nama )
            )
          `)
          .in('status', ['menunggu', 'default_offline'])
          .order('mulai_at', { ascending: true })
          .limit(10),
      ])
      return {
        hariIni: sessionsRes.count ?? 0,
        menunggu: waitingRes.count ?? 0,
        defaultOffline: defaultRes.count ?? 0,
        perluPerhatian: attentionRes.data ?? [],
      }
    },
  })
}