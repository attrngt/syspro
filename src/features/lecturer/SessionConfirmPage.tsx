import { useState, type FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSessionDetail, useSetSessionMode } from './useLecturerSessions'
import { ModeSelector, type SelectableMode } from './ModeSelector'
import { ModeBadge, type SessionMode, type SessionStatus } from '../../components/ui/Badge'
import { formatDateWib, formatTimeWib } from '../../lib/time'
import { copy } from '../../lib/copy'

export function SessionConfirmPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session, isLoading, error } = useSessionDetail(id)
  const setModeMutation = useSetSessionMode()

  const [selectedMode, setSelectedMode] = useState<SelectableMode | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  if (isLoading) {
    return <p className="text-sm text-neutral-600">Memuat detail sesi...</p>
  }

  if (error || !session) {
    return <p className="text-sm text-red-700">Sesi tidak ditemukan.</p>
  }

  // Gunakan pilihan user jika sudah diklik, atau fallback ke mode dari database
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

    setModeMutation.mutate(
      { sessionId: id, mode: activeMode },
      {
        onSuccess: () => setFeedback({ type: 'ok', text: copy.konfirmasi.berhasil }),
        onError: (err) => setFeedback({ type: 'err', text: err.message }),
      }
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/dosen" className="text-xs underline text-neutral-700 inline-block py-1">
          ← Kembali
        </Link>
        <h1 className="text-xl font-bold mt-1">{copy.konfirmasi.judul}</h1>
      </div>

      <div className="border border-neutral-900 p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-bold text-base">{session.classes?.courses?.nama}</div>
            <div className="text-xs text-neutral-600">
              Kelas {session.classes?.nama_kelas} · {formatDateWib(session.tanggal)}
            </div>
          </div>
          <ModeBadge
            mode={session.mode as SessionMode}
            status={session.status as SessionStatus}
          />
        </div>
        <div className="text-sm font-mono pt-1">
          {formatTimeWib(session.mulai_at)} – {formatTimeWib(session.selesai_at)} WIB
        </div>
      </div>

      {isLocked ? (
        <div className="border border-neutral-300 bg-neutral-100 p-4 text-sm font-medium text-neutral-700">
          {copy.konfirmasi.terkunci}. Mode tidak dapat diubah lagi.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <ModeSelector
            value={activeMode}
            onChange={setSelectedMode}
            disabled={setModeMutation.isPending}
          />

          {feedback && (
            <p
              className={`text-sm font-medium ${
                feedback.type === 'ok' ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {feedback.text}
            </p>
          )}

          <button
            type="submit"
            disabled={!activeMode || setModeMutation.isPending}
            className="w-full min-h-12 bg-neutral-900 text-white text-sm font-bold disabled:opacity-50"
          >
            {setModeMutation.isPending ? 'Menyimpan...' : copy.konfirmasi.simpan}
          </button>
        </form>
      )}

      {/* Riwayat Perubahan Mode (PRD 4.2 & 5.2) */}
      <div className="pt-4 border-t border-neutral-200 space-y-3">
        <h2 className="font-bold text-sm">Riwayat Perubahan Mode</h2>
        {!session.session_confirmations || session.session_confirmations.length === 0 ? (
          <p className="text-xs text-neutral-600">Belum ada riwayat konfirmasi.</p>
        ) : (
          <ul className="space-y-2 text-xs">
            {session.session_confirmations.map((item) => (
              <li key={item.id} className="border border-neutral-200 p-3 space-y-1">
                <div className="font-medium text-neutral-900">
                  {item.mode_lama ? `${item.mode_lama} → ` : ''}
                  <span className="font-bold uppercase">{item.mode_baru}</span>
                </div>
                <div className="text-neutral-600">
                  Sumber: {item.sumber} ({item.profiles?.nama ?? item.actor_role}) ·{' '}
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