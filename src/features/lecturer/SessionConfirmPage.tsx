import { useState, type FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSessionDetail, useSetSessionMode } from './useLecturerSessions'
import { ModeSelector, type SelectableMode } from './ModeSelector'
import { ModeBadge, type SessionMode, type SessionStatus } from '../../components/ui/Badge'
import { formatDateWib, formatTimeWib } from '../../lib/time'
import { copy } from '../../lib/copy'
import { mapErrorMessage } from '../../lib/errors'

export function SessionConfirmPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session, isLoading, error } = useSessionDetail(id)
  const setModeMutation = useSetSessionMode()

  const [selectedMode, setSelectedMode] = useState<SelectableMode | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

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
  const nTotal = cls?.jumlah_pertemuan ?? 16

  // Fallback ke mode dari database jika belum diubah
  const activeMode: SelectableMode | null =
    selectedMode ?? ((session.mode as SelectableMode | null) ?? null)

  const isLocked =
    session.status === 'dibatalkan' ||
    session.status === 'selesai' ||
    new Date() >= new Date(session.mulai_at)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!id || !activeMode || isLocked) return
    setFeedback(null)

    // // TODO(keputusan A12): Mode "Tidak Ada" membatalkan sesi dan membuat tagihan kelas pengganti (PRD A.1.14)
    setModeMutation.mutate(
      { sessionId: id, mode: activeMode },
      {
        onSuccess: () => setFeedback({ type: 'ok', text: copy.konfirmasi.berhasil }),
        onError: (err) => setFeedback({ type: 'err', text: mapErrorMessage(err) }),
      }
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/dosen"
          className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1 min-h-[36px]"
        >
          ← Kembali ke Beranda
        </Link>
        <h1 className="text-2xl font-bold mt-1 text-neutral-900">{copy.konfirmasi.judul}</h1>
      </div>

      <div className="rounded-xl border border-neutral-200/90 bg-white p-5 space-y-3 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-bold text-lg text-neutral-900">{courseName}</div>
            <div className="text-xs text-neutral-600 mt-0.5">
              Kelas {groupLabel} · Pertemuan {session.pertemuan_ke} dari {nTotal} ·{' '}
              {formatDateWib(session.tanggal)}
            </div>
          </div>
          <ModeBadge mode={session.mode as SessionMode} status={session.status as SessionStatus} />
        </div>

        <div className="text-sm font-semibold text-neutral-800 pt-1">
          {formatTimeWib(session.mulai_at)} – {formatTimeWib(session.selesai_at)} WIB
        </div>

        {/* Tampilkan Ruangan & Tombol Link Online (PRD A.1.11) */}
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
            ) : (
              <span className="text-amber-700 font-medium">Link online belum diatur admin</span>
            )}
          </div>
        )}

        {session.status === 'dibatalkan' && (
          <div className="text-xs bg-rose-50 text-rose-800 p-3 rounded-lg border border-rose-200">
            <strong>Sesi Dibatalkan.</strong>
            {session.cancel_reason && <span> Keterangan: {session.cancel_reason}</span>}
          </div>
        )}
      </div>

      {isLocked ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
          {copy.konfirmasi.terkunci}. Mode perkuliahan tidak dapat diubah lagi.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-neutral-600 font-medium">{copy.konfirmasi.keterangan}</p>
          <ModeSelector
            value={activeMode}
            onChange={setSelectedMode}
            disabled={setModeMutation.isPending}
          />

          {feedback && (
            <p
              className={`text-sm font-semibold p-3 rounded-lg ${
                feedback.type === 'ok'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {feedback.text}
            </p>
          )}

          <button
            type="submit"
            disabled={!activeMode || setModeMutation.isPending}
            className="w-full min-h-[48px] rounded-lg bg-neutral-900 text-white text-sm font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {setModeMutation.isPending ? 'Menyimpan...' : copy.konfirmasi.simpan}
          </button>
        </form>
      )}

      {/* Riwayat Perubahan Mode (PRD 4.2 & 5.2) */}
      <div className="pt-4 border-t border-neutral-200 space-y-3">
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
                  Sumber: <strong className="text-neutral-700">{item.sumber}</strong> (
                  {item.profiles?.nama ?? item.actor_role}) ·{' '}
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