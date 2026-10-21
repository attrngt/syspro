import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { toDateStringWib } from '../../lib/time'

export interface PerluPerhatianSession {
  id: string
  tanggal: string
  mulai_at: string
  selesai_at: string
  mode: string | null
  status: string
  pertemuan_ke: number
  classes: {
    jumlah_pertemuan: number
    courses: { kode: string; nama: string } | null
    student_groups: { nama: string; cohorts: { tahun: number } | null } | null
    profiles: { nama: string } | null
  } | null
}

const KOSONG = {
  hariIni: 0,
  menunggu: 0,
  defaultOffline: 0,
  dibatalkan: 0,
  kekuranganPertemuan: 0,
  perluPerhatian: [] as PerluPerhatianSession[],
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const today = toDateStringWib(new Date())

      // 1. Semester aktif
      const { data: semesterAktif, error: semErr } = await supabase
        .from('semesters')
        .select('id')
        .eq('aktif', true)
        .maybeSingle()
      if (semErr) throw new Error(semErr.message)
      if (!semesterAktif) return KOSONG

      // 2. Kelas di semester aktif
      const { data: kelas, error: kelasErr } = await supabase
        .from('classes')
        .select('id, jumlah_pertemuan')
        .eq('semester_id', semesterAktif.id)
      if (kelasErr) throw new Error(kelasErr.message)
      const classIds = (kelas ?? []).map((c) => c.id)
      if (classIds.length === 0) return KOSONG

      // 3. Semua query sesi dibatasi ke kelas semester aktif
      const [
        sessionsTodayRes,
        waitingRes,
        defaultRes,
        cancelledRes,
        sessionsCountRes,
        attentionRes,
      ] = await Promise.all([
        supabase.from('sessions').select('*', { count: 'exact', head: true })
          .in('class_id', classIds).eq('tanggal', today),
        supabase.from('sessions').select('*', { count: 'exact', head: true })
          .in('class_id', classIds).eq('status', 'menunggu'),
        supabase.from('sessions').select('*', { count: 'exact', head: true })
          .in('class_id', classIds).eq('status', 'default_offline'),
        supabase.from('sessions').select('*', { count: 'exact', head: true })
          .in('class_id', classIds).eq('status', 'dibatalkan'),
        supabase.from('sessions').select('class_id')
          .in('class_id', classIds).neq('status', 'dibatalkan')
          .limit(10000),
        supabase.from('sessions')
          .select(`
            id, tanggal, mulai_at, selesai_at, mode, status, pertemuan_ke,
            classes (
              jumlah_pertemuan,
              courses ( kode, nama ),
              student_groups ( nama, cohorts ( tahun ) ),
              profiles!classes_dosen_id_fkey ( nama )
            )
          `)
          .in('class_id', classIds)
          .in('status', ['menunggu', 'default_offline'])
          .order('mulai_at', { ascending: true })
          .limit(10),
      ])

      // 4. Hitung kekurangan pertemuan (sesi aktif per kelas)
      const sessionCountsPerClass = new Map<string, number>()
      for (const s of sessionsCountRes.data ?? []) {
        sessionCountsPerClass.set(s.class_id, (sessionCountsPerClass.get(s.class_id) ?? 0) + 1)
      }

      let kekuranganPertemuan = 0
      for (const cl of kelas ?? []) {
        const count = sessionCountsPerClass.get(cl.id) ?? 0
        if (count > 0 && count < cl.jumlah_pertemuan) kekuranganPertemuan++
      }

      return {
        hariIni: sessionsTodayRes.count ?? 0,
        menunggu: waitingRes.count ?? 0,
        defaultOffline: defaultRes.count ?? 0,
        dibatalkan: cancelledRes.count ?? 0,
        kekuranganPertemuan,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase join return type
        perluPerhatian: (attentionRes.data as any) as PerluPerhatianSession[],
      }
    },
  })
}