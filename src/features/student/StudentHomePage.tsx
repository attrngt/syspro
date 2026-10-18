import { Link } from 'react-router-dom'
import { useStudentSchedule } from './useStudentSessions'
import { ModeBadge, type SessionMode, type SessionStatus } from '../../components/ui/Badge'
import { formatDateWib, formatTimeWib, toDateStringWib } from '../../lib/time'
import { copy } from '../../lib/copy'

export function StudentHomePage() {
  const { data: sessions, isLoading, isOnline, lastUpdated } = useStudentSchedule()
  const todayWib = toDateStringWib(new Date())
  const todaySessions = sessions?.filter((s) => s.tanggal === todayWib) ?? []

  return (
    <div className="space-y-4">
      {!isOnline && lastUpdated && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs font-semibold text-amber-900 shadow-xs flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{copy.offline.banner(lastUpdated)}</span>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
        <h1 className="text-xl font-bold text-neutral-900">{copy.mahasiswa.jadwalHariIni}</h1>
        <span className="text-xs font-semibold px-2.5 py-1 bg-neutral-100 rounded-md text-neutral-700">
          {formatDateWib(new Date())}
        </span>
      </div>

      {isLoading && !sessions ? (
        <p className="text-sm text-neutral-500 py-8 text-center">Memuat jadwal kuliah...</p>
      ) : todaySessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 bg-neutral-50/50">
          {copy.mahasiswa.tidakAdaKuliahHariIni}
        </div>
      ) : (
        <div className="space-y-3">
          {todaySessions.map((s) => {
            const groupTahun = s.classes?.student_groups?.cohorts?.tahun ?? ''
            const groupNama = s.classes?.student_groups?.nama ?? ''
            const groupLabel = `${groupTahun} ${groupNama}`.trim() || '-'
            const nTotal = s.classes?.jumlah_pertemuan ?? 16

            return (
              <Link
                key={s.id}
                to={`/mahasiswa/sesi/${s.id}`}
                className="block rounded-xl border border-neutral-200/90 bg-white p-4 space-y-2 hover:border-neutral-400 hover:shadow-xs transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-neutral-900 tracking-tight">
                    {formatTimeWib(s.mulai_at)} – {formatTimeWib(s.selesai_at)} WIB
                  </span>
                  <ModeBadge mode={s.mode as SessionMode} status={s.status as SessionStatus} />
                </div>
                <div>
                  <div className="font-bold text-base text-neutral-900">{s.classes?.courses?.nama}</div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-neutral-600">
                    <span className="font-medium text-neutral-800">Kelas {groupLabel}</span>
                    <span>•</span>
                    <span>Pertemuan {s.pertemuan_ke} dari {nTotal}</span>
                    {s.pengganti_dari_id && (
                      <>
                        <span>•</span>
                        <span className="text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          {copy.mahasiswa.penggantiBadge}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {s.classes?.profiles?.nama && (
                  <div className="text-xs text-neutral-500 pt-0.5">
                    Dosen: {s.classes.profiles.nama}
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}