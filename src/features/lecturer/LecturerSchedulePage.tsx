import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLecturerScheduleSessions } from './useLecturerSessions'
import { ModeBadge, type SessionMode, type SessionStatus } from '../../components/ui/Badge'
import { formatDateWib, formatTimeWib } from '../../lib/time'

export function LecturerSchedulePage() {
  const { data: sessions, isLoading } = useLecturerScheduleSessions()
  const [view, setView] = useState<'minggu' | 'bulan'>('minggu')

  const now = new Date()
  const filteredSessions = sessions?.filter((s) => {
    const d = new Date(s.tanggal)
    const diffDays = (d.getTime() - now.getTime()) / (1000 * 3600 * 24)
    if (view === 'minggu') {
      return diffDays >= -1 && diffDays <= 7
    }
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Jadwal Mengajar</h1>
        <div className="flex border border-neutral-900">
          <button
            type="button"
            onClick={() => setView('minggu')}
            className={`min-h-11 px-3 text-xs font-medium ${
              view === 'minggu' ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'
            }`}
          >
            Minggu
          </button>
          <button
            type="button"
            onClick={() => setView('bulan')}
            className={`min-h-11 px-3 text-xs font-medium ${
              view === 'bulan' ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'
            }`}
          >
            Bulan
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-neutral-600">Memuat jadwal...</p>
      ) : !filteredSessions || filteredSessions.length === 0 ? (
        <div className="border border-neutral-200 p-6 text-sm text-neutral-600 text-center">
          Tidak ada sesi pada rentang {view} ini.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((s) => (
            <Link
              key={s.id}
              to={`/dosen/sesi/${s.id}`}
              className="block border border-neutral-900 p-4 hover:bg-neutral-50 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-700">
                  {formatDateWib(s.tanggal)} · {formatTimeWib(s.mulai_at)} WIB
                </span>
                <ModeBadge
                  mode={s.mode as SessionMode}
                  status={s.status as SessionStatus}
                />
              </div>
              <div className="font-bold text-sm">
                {s.classes?.courses?.nama} (Kelas {s.classes?.student_groups ? `${s.classes.student_groups.cohorts?.tahun ?? ''} ${s.classes.student_groups.nama}`.trim() : '-'})
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}