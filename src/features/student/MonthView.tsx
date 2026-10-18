import { Link } from 'react-router-dom'
import type { StudentSessionItem } from './useStudentSessions'
import { ModeBadge, type SessionMode, type SessionStatus } from '../../components/ui/Badge'
import { formatDateWib, formatTimeWib } from '../../lib/time'
import { copy } from '../../lib/copy'

export function MonthView({ sessions }: { sessions: StudentSessionItem[] }) {
  const now = new Date()
  const monthSessions = sessions.filter((s) => {
    const d = new Date(s.tanggal)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  if (monthSessions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 bg-neutral-50/50">
        Tidak ada jadwal kuliah pada bulan ini.
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {monthSessions.map((s) => {
        const groupTahun = s.classes?.student_groups?.cohorts?.tahun ?? ''
        const groupNama = s.classes?.student_groups?.nama ?? ''
        const groupLabel = `${groupTahun} ${groupNama}`.trim() || '-'
        const nTotal = s.classes?.jumlah_pertemuan ?? 16

        return (
          <Link
            key={s.id}
            to={`/mahasiswa/sesi/${s.id}`}
            className="block rounded-xl border border-neutral-200 bg-white p-3.5 hover:border-neutral-400 hover:shadow-xs transition-all"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-mono text-neutral-500">
                  {formatDateWib(s.tanggal)} · {formatTimeWib(s.mulai_at)} WIB
                </div>
                <div className="font-bold text-sm text-neutral-900 mt-0.5">
                  {s.classes?.courses?.nama} (Kelas {groupLabel})
                </div>
                <div className="text-xs text-neutral-600 mt-0.5 flex items-center gap-2">
                  <span>Pertemuan {s.pertemuan_ke} dari {nTotal}</span>
                  {s.pengganti_dari_id && (
                    <span className="text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                      {copy.mahasiswa.penggantiBadge}
                    </span>
                  )}
                </div>
              </div>
              <ModeBadge mode={s.mode as SessionMode} status={s.status as SessionStatus} />
            </div>
          </Link>
        )
      })}
    </div>
  )
}