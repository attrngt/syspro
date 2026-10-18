import { Link } from 'react-router-dom'
import { useStudentSchedule } from './useStudentSessions'
import { ModeBadge, type SessionMode, type SessionStatus } from '../../components/ui/Badge'
import { formatDateWib, formatTimeWib } from '../../lib/time'
import { copy } from '../../lib/copy'

export function StudentHomePage() {
  const { data: sessions, isLoading, isOnline, lastUpdated } = useStudentSchedule()
  const todayWib = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const todaySessions = sessions?.filter((s) => s.tanggal === todayWib) ?? []

  return (
    <div className="space-y-4">
      {!isOnline && lastUpdated && (
        <div className="border border-neutral-900 bg-neutral-100 p-3 text-xs font-medium text-neutral-800">
          {copy.offline.banner(lastUpdated)}
        </div>
      )}

      <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
        <h1 className="text-lg font-bold">Jadwal Hari Ini</h1>
        <span className="text-sm font-medium text-neutral-700">{formatDateWib(new Date())}</span>
      </div>

      {isLoading && !sessions ? (
        <p className="text-sm text-neutral-600">Memuat jadwal hari ini...</p>
      ) : todaySessions.length === 0 ? (
        <div className="border border-neutral-200 p-6 text-center text-sm text-neutral-600">
          Tidak ada jadwal kuliah hari ini.
        </div>
      ) : (
        <div className="space-y-3">
          {todaySessions.map((s) => (
            <Link
              key={s.id}
              to={`/mahasiswa/sesi/${s.id}`}
              className="block border border-neutral-900 p-4 space-y-2 hover:bg-neutral-50"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono font-medium">
                  {formatTimeWib(s.mulai_at)} – {formatTimeWib(s.selesai_at)} WIB
                </span>
                <ModeBadge
                  mode={s.mode as SessionMode}
                  status={s.status as SessionStatus}
                />
              </div>
              <div className="font-bold text-base">{s.classes?.courses?.nama}</div>
              <div className="text-xs text-neutral-600">
                Kelas {s.classes?.nama_kelas} · Dosen: {s.classes?.profiles?.nama}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}