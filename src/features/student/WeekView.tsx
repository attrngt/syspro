import { Link } from 'react-router-dom'
import type { StudentSessionItem } from './useStudentSessions'
import { ModeBadge, type SessionMode, type SessionStatus } from '../../components/ui/Badge'
import { formatDateWib, formatTimeWib } from '../../lib/time'

export function WeekView({ sessions }: { sessions: StudentSessionItem[] }) {
  const now = new Date()
  const weekSessions = sessions.filter((s) => {
    const d = new Date(s.tanggal)
    const diffDays = (d.getTime() - now.getTime()) / (1000 * 3600 * 24)
    return diffDays >= -1 && diffDays <= 7
  })

  if (weekSessions.length === 0) {
    return (
      <div className="border border-neutral-200 p-6 text-center text-sm text-neutral-600">
        Tidak ada jadwal kuliah dalam 7 hari ke depan.
      </div>
    )
  }

  // Kelompokkan per tanggal
  const grouped = weekSessions.reduce<Record<string, StudentSessionItem[]>>((acc, item) => {
    const key = item.tanggal
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([tanggal, items]) => (
        <div key={tanggal} className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-600 border-b border-neutral-200 pb-1">
            {formatDateWib(tanggal)}
          </h2>
          <div className="space-y-2">
            {items.map((s) => (
              <Link
                key={s.id}
                to={`/mahasiswa/sesi/${s.id}`}
                className="block border border-neutral-900 p-4 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="text-xs font-mono font-medium text-neutral-700">
                      {formatTimeWib(s.mulai_at)} – {formatTimeWib(s.selesai_at)} WIB
                    </div>
                    <div className="font-bold text-sm text-neutral-900">
                      {s.classes?.courses?.nama}
                    </div>
                    <div className="text-xs text-neutral-600">
                      Kelas {s.classes?.nama_kelas}
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
        </div>
      ))}
    </div>
  )
}