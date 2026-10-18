import { useParams, Link } from 'react-router-dom'
import { useSessionDetail } from '../lecturer/useLecturerSessions'
import { ModeBadge, type SessionMode, type SessionStatus } from '../../components/ui/Badge'
import { formatDateWib, formatTimeWib } from '../../lib/time'

export function StudentSessionPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session, isLoading, error } = useSessionDetail(id)

  if (isLoading) {
    return <p className="text-sm text-neutral-600">Memuat detail sesi...</p>
  }

  if (error || !session) {
    return <p className="text-sm text-red-700">Sesi tidak ditemukan.</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/mahasiswa/jadwal" className="text-xs underline text-neutral-700 inline-block py-1">
          ← Kembali ke Jadwal
        </Link>
        <h1 className="text-xl font-bold mt-1">Detail Pertemuan</h1>
      </div>

      <div className="border border-neutral-900 p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-bold text-base">{session.classes?.courses?.nama}</div>
            <div className="text-xs text-neutral-600 mt-0.5">
              Kelas {session.classes?.nama_kelas} · Dosen: {session.classes?.profiles?.nama}
            </div>
          </div>
          <ModeBadge
            mode={session.mode as SessionMode}
            status={session.status as SessionStatus}
          />
        </div>

        <div className="pt-2 border-t border-neutral-200 text-xs space-y-1">
          <div>
            <span className="text-neutral-600">Hari/Tanggal:</span>{' '}
            <span className="font-medium">{formatDateWib(session.tanggal)}</span>
          </div>
          <div>
            <span className="text-neutral-600">Waktu:</span>{' '}
            <span className="font-mono font-medium">
              {formatTimeWib(session.mulai_at)} – {formatTimeWib(session.selesai_at)} WIB
            </span>
          </div>
          {session.mode_source && (
            <div>
              <span className="text-neutral-600">Dikonfirmasi oleh:</span>{' '}
              <span className="font-medium capitalize">{session.mode_source}</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-bold text-sm">Riwayat Perubahan Mode</h2>
        {!session.session_confirmations || session.session_confirmations.length === 0 ? (
          <p className="text-xs text-neutral-600">Belum ada riwayat konfirmasi untuk sesi ini.</p>
        ) : (
          <ul className="space-y-2 text-xs">
            {session.session_confirmations.map((item) => (
              <li key={item.id} className="border border-neutral-200 p-3 space-y-1">
                <div className="font-medium text-neutral-900">
                  {item.mode_lama ? `${item.mode_lama} → ` : ''}
                  <span className="font-bold uppercase">{item.mode_baru}</span>
                </div>
                <div className="text-neutral-600">
                  Sumber: {item.sumber} · {formatDateWib(item.created_at)}{' '}
                  {formatTimeWib(item.created_at)} WIB
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}