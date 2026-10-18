import { Link } from 'react-router-dom'
import { useLecturerTodaySessions } from './useLecturerSessions'
import { ModeBadge, type SessionMode, type SessionStatus } from '../../components/ui/Badge'
import { formatDateWib, formatTimeWib } from '../../lib/time'

export function LecturerHomePage() {
  const { data: sessions, isLoading } = useLecturerTodaySessions()
  const todayLabel = formatDateWib(new Date())

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
        <h1 className="text-lg font-bold">Hari ini</h1>
        <span className="text-sm font-medium text-neutral-700">{todayLabel}</span>
      </div>

      {isLoading ? (
        <p className="text-sm text-neutral-600">Memuat jadwal hari ini...</p>
      ) : !sessions || sessions.length === 0 ? (
        <div className="border border-neutral-200 p-6 text-center text-sm text-neutral-600">
          Tidak ada sesi mengajar hari ini.
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <div key={s.id} className="border border-neutral-900 p-4 space-y-3">
              <div className="text-sm font-mono font-medium">
                {formatTimeWib(s.mulai_at)} – {formatTimeWib(s.selesai_at)}
              </div>
              <div>
                <div className="font-bold text-base">{s.classes?.courses?.nama}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-neutral-700">Kelas {s.classes?.nama_kelas}</span>
                  <ModeBadge
                    mode={s.mode as SessionMode}
                    status={s.status as SessionStatus}
                  />
                </div>
              </div>

              <div className="pt-1">
                <Link
                  to={`/dosen/sesi/${s.id}`}
                  className="inline-flex items-center justify-center w-full min-h-11 border border-neutral-900 bg-neutral-900 text-white text-sm font-medium"
                >
                  {s.mode === null ? 'Konfirmasi' : 'Ubah / Detail'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}