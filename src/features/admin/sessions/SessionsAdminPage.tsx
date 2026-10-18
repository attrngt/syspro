import { useState } from 'react'
import { useSemesters } from '../semesters/useSemesters'
import { useSessionsAdmin, useGenerateSessions } from './useSessionsAdmin'
import { useSetSessionMode } from '../../lecturer/useLecturerSessions'
import { ModeBadge, type SessionMode, type SessionStatus } from '../../../components/ui/Badge'
import { formatTimeWib, formatDateWib } from '../../../lib/time'

export function SessionsAdminPage() {
  const { data: semesters } = useSemesters()
  const activeSemester = semesters?.find((s) => s.aktif)
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>(activeSemester?.id ?? '')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const targetSemesterId = selectedSemesterId || activeSemester?.id

  const { data: sessions, isLoading } = useSessionsAdmin(targetSemesterId)
  const generateMutation = useGenerateSessions()
  const setModeMutation = useSetSessionMode()

  const [message, setMessage] = useState<string | null>(null)

  function handleGenerate() {
    if (!targetSemesterId) return
    setMessage(null)
    generateMutation.mutate(targetSemesterId, {
      onSuccess: (count) => {
        setMessage(`Berhasil men-generate ${count} sesi baru untuk semester ini.`)
      },
      onError: (err) => {
        setMessage(`Gagal: ${err.message}`)
      },
    })
  }

  function handleAdminChangeMode(sessionId: string, mode: 'online' | 'offline' | 'tidak_ada') {
    setMessage(null)
    setModeMutation.mutate(
      { sessionId, mode },
      {
        onSuccess: () => setMessage('Mode sesi berhasil diperbarui oleh Admin.'),
        onError: (err) => setMessage(`Gagal mengubah mode: ${err.message}`),
      }
    )
  }

  const filteredSessions = sessions?.filter((s) =>
    statusFilter === 'all' ? true : s.status === statusFilter
  )

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pantau & Konfirmasi Sesi Kuliah</h1>
          <p className="text-sm text-neutral-600 mt-1">
            Generate sesi otomatis, filter per status, atau konfirmasi mode atas nama dosen.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-h-11 px-3 border border-neutral-900 bg-white text-sm"
          >
            <option value="all">Semua Status</option>
            <option value="menunggu">Menunggu</option>
            <option value="terkonfirmasi">Terkonfirmasi</option>
            <option value="default_offline">Default Offline</option>
            <option value="dibatalkan">Dibatalkan</option>
            <option value="selesai">Selesai</option>
          </select>

          <select
            value={targetSemesterId}
            onChange={(e) => setSelectedSemesterId(e.target.value)}
            className="min-h-11 px-3 border border-neutral-900 bg-white text-sm"
          >
            <option value="">-- Pilih Semester --</option>
            {semesters?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama} {s.aktif ? '(Aktif)' : ''}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!targetSemesterId || generateMutation.isPending}
            className="min-h-11 px-5 bg-neutral-900 text-white text-sm font-medium disabled:opacity-50"
          >
            {generateMutation.isPending ? 'Memproses...' : 'Generate Sesi Semester'}
          </button>
        </div>
      </div>

      {message && (
        <div className="p-4 border border-neutral-900 bg-white text-sm font-medium">
          {message}
        </div>
      )}

      <div className="border border-neutral-900 bg-white">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-900 bg-neutral-100">
              <th className="p-3 font-bold">Tanggal & Jam (WIB)</th>
              <th className="p-3 font-bold">Mata Kuliah & Kelas</th>
              <th className="p-3 font-bold">Dosen</th>
              <th className="p-3 font-bold">Mode & Sumber</th>
              <th className="p-3 font-bold">Konfirmasi Admin</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-4 text-neutral-600">Memuat sesi...</td>
              </tr>
            ) : !filteredSessions || filteredSessions.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-neutral-600">
                  Tidak ada sesi yang sesuai filter.
                </td>
              </tr>
            ) : (
              filteredSessions.map((s) => {
                const locked =
                  s.status === 'dibatalkan' ||
                  s.status === 'selesai' ||
                  new Date() >= new Date(s.mulai_at)

                return (
                  <tr key={s.id} className="border-b border-neutral-200">
                    <td className="p-3">
                      <div className="font-medium">{formatDateWib(s.tanggal)}</div>
                      <div className="text-xs font-mono text-neutral-600">
                        {formatTimeWib(s.mulai_at)} – {formatTimeWib(s.selesai_at)}
                      </div>
                    </td>
                    <td className="p-3">
                      {s.classes?.courses?.kode} - {s.classes?.courses?.nama} (Kelas{' '}
                      {s.classes?.nama_kelas})
                    </td>
                    <td className="p-3">{s.classes?.profiles?.nama}</td>
                    <td className="p-3 space-y-1">
                      <ModeBadge
                        mode={s.mode as SessionMode}
                        status={s.status as SessionStatus}
                      />
                      {s.mode_source && (
                        <div className="text-xs text-neutral-500">Sumber: {s.mode_source}</div>
                      )}
                    </td>
                    <td className="p-3">
                      {locked ? (
                        <span className="text-xs text-neutral-500">Terkunci</span>
                      ) : (
                        <div className="flex gap-1">
                          {(['online', 'offline', 'tidak_ada'] as const).map((m) => (
                            <button
                              key={m}
                              type="button"
                              disabled={setModeMutation.isPending || s.mode === m}
                              onClick={() => handleAdminChangeMode(s.id, m)}
                              className={`min-h-11 px-2.5 border text-xs font-medium capitalize ${
                                s.mode === m
                                  ? 'bg-neutral-900 text-white border-neutral-900'
                                  : 'border-neutral-900 bg-white hover:bg-neutral-100'
                              }`}
                            >
                              {m.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}