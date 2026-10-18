import { Link } from 'react-router-dom'
import { useLecturerTodaySessions, useLecturerTagihan } from './useLecturerSessions'
import { ModeBadge, type SessionMode, type SessionStatus } from '../../components/ui/Badge'
import { formatDateWib, formatTimeWib } from '../../lib/time'
import { copy } from '../../lib/copy'

export function LecturerHomePage() {
  const { data: sessions, isLoading: sessionsLoading } = useLecturerTodaySessions()
  const { data: tagihanList } = useLecturerTagihan()
  const todayLabel = formatDateWib(new Date())

  const pendingTagihan = (tagihanList ?? []).filter(
    (t) => t.status === 'menunggu' || t.status === 'diajukan'
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
        <h1 className="text-xl font-bold text-neutral-900">{copy.dosen.sesiHariIni}</h1>
        <span className="text-xs font-semibold px-2.5 py-1 bg-neutral-100 rounded-md text-neutral-700">
          {todayLabel}
        </span>
      </div>

      {/* Kartu Tagihan Kelas Pengganti di atas daftar jika ada (PRD A.1.11) */}
      {pendingTagihan.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/80 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
            <svg className="w-5 h-5 text-amber-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{copy.dosen.tagihanPerhatian}</span>
          </div>
          <p className="text-xs text-amber-800">
            Terdapat {pendingTagihan.length} sesi perkuliahan yang perlu diajukan kelas penggantinya.
          </p>
          <div className="pt-1">
            <Link
              to="/dosen/tagihan"
              className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors w-full sm:w-auto"
            >
              {copy.dosen.ajukanJadwalBtn} →
            </Link>
          </div>
        </div>
      )}

      {sessionsLoading ? (
        <p className="text-sm text-neutral-500 py-6 text-center">Memuat jadwal hari ini...</p>
      ) : !sessions || sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 bg-neutral-50/50">
          {copy.dosen.tidakAdaSesiHariIni}
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const cls = s.classes
            const courseName = cls?.courses?.nama ?? 'Mata Kuliah'
            const groupTahun = cls?.student_groups?.cohorts?.tahun ?? ''
            const groupNama = cls?.student_groups?.nama ?? ''
            const groupLabel = `${groupTahun} ${groupNama}`.trim() || '-'
            const nTotal = cls?.jumlah_pertemuan ?? 16

            return (
              <div
                key={s.id}
                className="rounded-xl border border-neutral-200/90 bg-white p-4 shadow-xs space-y-3 hover:border-neutral-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-neutral-900 tracking-tight">
                    {formatTimeWib(s.mulai_at)} – {formatTimeWib(s.selesai_at)} WIB
                  </div>
                  <ModeBadge mode={s.mode as SessionMode} status={s.status as SessionStatus} />
                </div>

                <div>
                  <div className="font-bold text-base text-neutral-900">{courseName}</div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-neutral-600">
                    <span className="font-medium text-neutral-800">
                      {copy.dosen.kelasLabel(groupLabel)}
                    </span>
                    <span>•</span>
                    <span>{copy.dosen.pertemuanLabel(s.pertemuan_ke, nTotal)}</span>
                    {s.pengganti_dari_id && (
                      <>
                        <span>•</span>
                        <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                          Pengganti
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {(s.ruangan || s.link_online) && (
                  <div className="text-xs bg-neutral-50 p-2.5 rounded-lg border border-neutral-100 flex items-center justify-between gap-2">
                    <span className="text-neutral-700">
                      <strong>Lokasi:</strong> {s.ruangan || 'Online'}
                    </span>
                    {s.link_online && (
                      <a
                        href={s.link_online}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline font-medium min-h-[30px] flex items-center"
                      >
                        {copy.lokasi.bukaLink} ↗
                      </a>
                    )}
                  </div>
                )}

                <div className="pt-1">
                  <Link
                    to={`/dosen/sesi/${s.id}`}
                    className="inline-flex items-center justify-center w-full min-h-[44px] rounded-lg border border-neutral-900 bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors"
                  >
                    {s.mode === null ? 'Konfirmasi Mode' : 'Ubah Mode / Detail'}
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}