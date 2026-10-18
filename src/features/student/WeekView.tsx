import { Link } from 'react-router-dom'
import type { StudentSessionItem } from './useStudentSessions'
import { ModeBadge, type SessionMode, type SessionStatus } from '../../components/ui/Badge'
import { formatDateWib, formatTimeWib } from '../../lib/time'
import { copy } from '../../lib/copy'

export function WeekView({ sessions }: { sessions: StudentSessionItem[] }) {
  const now = new Date()
  const weekSessions = sessions.filter((s) => {
    const d = new Date(s.tanggal)
    const diffDays = (d.getTime() - now.getTime()) / (1000 * 3600 * 24)
    return diffDays >= -1 && diffDays <= 7
  })

  if (weekSessions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 bg-neutral-50/50">
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
    <div className="space-y-6">
      {Object.entries(grouped).map(([tanggal, items]) => (
        <div key={tanggal} className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 border-b border-neutral-200 pb-1.5 flex items-center justify-between">
            <span>{formatDateWib(tanggal)}</span>
            <span className="text-[10px] font-medium bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">
              {items.length} sesi
            </span>
          </h2>
          <div className="space-y-2.5">
            {items.map((s) => {
              const groupTahun = s.classes?.student_groups?.cohorts?.tahun ?? ''
              const groupNama = s.classes?.student_groups?.nama ?? ''
              const groupLabel = `${groupTahun} ${groupNama}`.trim() || '-'
              const nTotal = s.classes?.jumlah_pertemuan ?? 16

              return (
                <Link
                  key={s.id}
                  to={`/mahasiswa/sesi/${s.id}`}
                  className="block rounded-xl border border-neutral-200 bg-white p-4 hover:border-neutral-400 hover:shadow-xs transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-xs font-mono font-bold text-neutral-800">
                        {formatTimeWib(s.mulai_at)} – {formatTimeWib(s.selesai_at)} WIB
                      </div>
                      <div className="font-bold text-sm text-neutral-900">
                        {s.classes?.courses?.nama}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-600">
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
                    <ModeBadge mode={s.mode as SessionMode} status={s.status as SessionStatus} />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}