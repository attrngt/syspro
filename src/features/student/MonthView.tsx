import { Link } from 'react-router-dom'
import type { StudentSessionItem } from './useStudentSessions'
import { ModeBadge, type SessionMode, type SessionStatus } from '../../components/ui/Badge'
import { formatDateWib, formatTimeWib } from '../../lib/time'

export function MonthView({ sessions }: { sessions: StudentSessionItem[] }) {
  const now = new Date()
  const monthSessions = sessions.filter((s) => {
    const d = new Date(s.tanggal)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  if (monthSessions.length === 0) {
    return (
      <div className="border border-neutral-200 p-6 text-center text-sm text-neutral-600">
        Tidak ada jadwal kuliah pada bulan ini.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {monthSessions.map((s) => (
        <Link
          key={s.id}
          to={`/mahasiswa/sesi/${s.id}`}
          className="block border border-neutral-900 p-3.5 hover:bg-neutral-50 transition-colors"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-mono text-neutral-600">
                {formatDateWib(s.tanggal)} · {formatTimeWib(s.mulai_at)} WIB
              </div>
              <div className="font-bold text-sm mt-0.5">
                {s.classes?.courses?.nama} (Kelas {s.classes?.nama_kelas})
              </div>
            </div>
            <ModeBadge
              mode={s.mode as SessionMode}
              status={s.status as SessionStatus}
            />
          </div>
        </Link>
      ))}
    </div>
  )
}