import { useParams, Link } from 'react-router-dom'
import { useSessionDetail } from '../lecturer/useLecturerSessions'
import { ModeBadge, type SessionMode, type SessionStatus } from '../../components/ui/Badge'
import { formatDateWib, formatTimeWib } from '../../lib/time'
import { copy } from '../../lib/copy'

export function StudentSessionPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session, isLoading, error } = useSessionDetail(id)

  if (isLoading) {
    return <p className="text-sm text-neutral-500 py-8 text-center">Memuat detail sesi...</p>
  }

  if (error || !session) {
    return <p className="text-sm text-rose-700 py-8 text-center">Sesi tidak ditemukan.</p>
  }

  const cls = session.classes
  const courseName = cls?.courses?.nama ?? 'Mata Kuliah'
  const groupTahun = cls?.student_groups?.cohorts?.tahun ?? ''
  const groupNama = cls?.student_groups?.nama ?? ''
  const groupLabel = `${groupTahun} ${groupNama}`.trim() || '-'
  const dosenNama = cls?.profiles?.nama ?? '-'
  const nTotal = cls?.jumlah_pertemuan ?? 16

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/mahasiswa/jadwal"
          className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1 min-h-[36px]"
        >
          ← Kembali ke Jadwal
        </Link>
        <h1 className="text-2xl font-bold mt-1 text-neutral-900">Detail Pertemuan</h1>
      </div>

      <div className="rounded-xl border border-neutral-200/90 bg-white p-5 space-y-3 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-bold text-lg text-neutral-900">{courseName}</div>
            <div className="text-xs text-neutral-600 mt-0.5">
              Kelas {groupLabel} · Pertemuan {session.pertemuan_ke} dari {nTotal} · Dosen: {dosenNama}
            </div>
            {session.pengganti_dari_id && (
              <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                {copy.mahasiswa.penggantiBadge}
              </span>
            )}
          </div>
          <ModeBadge mode={session.mode as SessionMode} status={session.status as SessionStatus} />
        </div>

        <div className="pt-3 border-t border-neutral-100 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Hari, Tanggal:</span>
            <span className="font-semibold text-neutral-800">{formatDateWib(session.tanggal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Waktu Perkuliahan:</span>
            <span className="font-mono font-semibold text-neutral-800">
              {formatTimeWib(session.mulai_at)} – {formatTimeWib(session.selesai_at)} WIB
            </span>
          </div>
          {session.mode_source && (
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Sumber Konfirmasi:</span>
              <span className="font-medium text-neutral-800 capitalize">{session.mode_source}</span>
            </div>
          )}
        </div>

        {/* Tampilkan Ruangan & Link Online (PRD A.1.11) */}
        {(session.ruangan || session.link_online) && (
          <div className="text-xs bg-neutral-50 p-3 rounded-lg border border-neutral-100 flex flex-wrap items-center justify-between gap-3">
            <span className="text-neutral-800">
              <strong>{copy.lokasi.ruangan}:</strong> {session.ruangan || '-'}
            </span>
            {session.link_online ? (
              <a
                href={session.link_online}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 min-h-[36px]"
              >
                {copy.lokasi.bukaLink} ↗
              </a>
            ) : null}
          </div>
        )}

        {/* Keterangan Pembatalan jika ada */}
        {session.status === 'dibatalkan' && (
          <div className="text-xs bg-rose-50 text-rose-800 p-3 rounded-lg border border-rose-200">
            <strong>{copy.mahasiswa.dibatalkanKeterangan(session.cancel_reason ?? undefined)}</strong>
          </div>
        )}
      </div>

      {/* Riwayat Konfirmasi Mode (Hanya Lihat) */}
      <div className="space-y-3">
        <h2 className="font-bold text-sm text-neutral-900">{copy.konfirmasi.riwayat}</h2>
        {!session.session_confirmations || session.session_confirmations.length === 0 ? (
          <p className="text-xs text-neutral-500">Belum ada riwayat konfirmasi untuk sesi ini.</p>
        ) : (
          <ul className="space-y-2 text-xs">
            {session.session_confirmations.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-neutral-200 bg-white p-3 space-y-1 shadow-2xs"
              >
                <div className="font-semibold text-neutral-900">
                  {item.mode_lama ? `${item.mode_lama.toUpperCase()} → ` : ''}
                  <span className="font-bold uppercase text-neutral-900">{item.mode_baru}</span>
                </div>
                <div className="text-neutral-500">
                  Sumber: <strong className="text-neutral-700">{item.sumber}</strong> ·{' '}
                  {formatDateWib(item.created_at)} {formatTimeWib(item.created_at)} WIB
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}