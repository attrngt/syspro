import { useState } from 'react'
import { useSemesters } from '../semesters/useSemesters'
import {
  useSessionsAdmin,
  useGenerateSessions,
  useCancelSessionAdmin,
  useRestoreSessionAdmin,
  useSetLokasiSesiAdmin,
  type AdminSessionItem,
} from './useSessionsAdmin'
import { useSetSessionMode } from '../../lecturer/useLecturerSessions'
import { ModeBadge, Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { formatTimeWib, formatDateWib } from '../../../lib/time'
import { copy } from '../../../lib/copy'

export function SessionsAdminPage() {
  const { data: semesters } = useSemesters()
  const activeSemester = semesters?.find((s) => s.aktif)
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>(activeSemester?.id ?? '')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const targetSemesterId = selectedSemesterId || activeSemester?.id

  const { data: sessions, isLoading } = useSessionsAdmin(targetSemesterId)
  const generateMutation = useGenerateSessions()
  const setModeMutation = useSetSessionMode()
  const cancelMutation = useCancelSessionAdmin()
  const restoreMutation = useRestoreSessionAdmin()
  const setLokasiMutation = useSetLokasiSesiAdmin()

  const [message, setMessage] = useState<{ text: string; isError?: boolean } | null>(null)

  // Modal Batalkan Sesi
  const [cancellingSession, setCancellingSession] = useState<AdminSessionItem | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  // Modal Atur Lokasi
  const [locatingSession, setLocatingSession] = useState<AdminSessionItem | null>(null)
  const [inputRuangan, setInputRuangan] = useState('')
  const [inputLinkOnline, setInputLinkOnline] = useState('')
  const [lokasiError, setLokasiError] = useState<string | null>(null)

  function handleGenerate() {
    if (!targetSemesterId) return
    setMessage(null)
    generateMutation.mutate(targetSemesterId, {
      onSuccess: (count) => {
        setMessage({ text: `Berhasil men-generate ${count} sesi baru untuk semester ini.` })
      },
      onError: (err) => {
        setMessage({ text: `Gagal: ${err.message}`, isError: true })
      },
    })
  }

  function handleAdminChangeMode(sessionId: string, mode: 'online' | 'offline' | 'tidak_ada') {
    setMessage(null)
    setModeMutation.mutate(
      { sessionId, mode },
      {
        onSuccess: () => setMessage({ text: 'Mode sesi berhasil diperbarui oleh Admin.' }),
        onError: (err) => setMessage({ text: `Gagal mengubah mode: ${err.message}`, isError: true }),
      }
    )
  }

  function handleCancelSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!cancellingSession) return

    cancelMutation.mutate(
      { sessionId: cancellingSession.id, alasan: cancelReason.trim() },
      {
        onSuccess: () => {
          setMessage({ text: 'Sesi berhasil dibatalkan.' })
          setCancellingSession(null)
          setCancelReason('')
        },
        onError: (err) => {
          setMessage({ text: `Gagal membatalkan sesi: ${err.message}`, isError: true })
        },
      }
    )
  }

  function handleRestore(sessionId: string) {
    setMessage(null)
    restoreMutation.mutate(sessionId, {
      onSuccess: () => setMessage({ text: 'Sesi berhasil dipulihkan.' }),
      onError: (err) => setMessage({ text: `Gagal memulihkan sesi: ${err.message}`, isError: true }),
    })
  }

  function handleLokasiSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLokasiError(null)
    if (!locatingSession) return
    if (!inputRuangan.trim() && !inputLinkOnline.trim()) {
      setLokasiError('Minimal isi salah satu antara Ruangan atau Link Online.')
      return
    }

    setLokasiMutation.mutate(
      {
        sessionId: locatingSession.id,
        ruangan: inputRuangan.trim(),
        linkOnline: inputLinkOnline.trim(),
      },
      {
        onSuccess: () => {
          setMessage({ text: 'Lokasi sesi berhasil diperbarui.' })
          setLocatingSession(null)
          setInputRuangan('')
          setInputLinkOnline('')
        },
        onError: (err) => setLokasiError(err.message),
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
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{copy.admin.sessions.title}</h1>
          <p className="text-sm text-neutral-600 mt-1">{copy.admin.sessions.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-h-11 px-3 border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
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
            className="min-h-11 px-3 border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
          >
            <option value="">-- Pilih Semester --</option>
            {semesters?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama} {s.aktif ? '(Aktif)' : ''}
              </option>
            ))}
          </select>

          <Button
            onClick={handleGenerate}
            disabled={!targetSemesterId}
            loading={generateMutation.isPending}
          >
            Generate Sesi Semester
          </Button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 border text-sm font-medium ${
            message.isError
              ? 'border-red-300 bg-red-50 text-red-700'
              : 'border-emerald-300 bg-emerald-50 text-emerald-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="border border-neutral-200 bg-white overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-700 text-xs uppercase tracking-wider">
              <th className="p-3.5 font-bold">Waktu (WIB)</th>
              <th className="p-3.5 font-bold">Mata Kuliah & Kelas</th>
              <th className="p-3.5 font-bold">Dosen</th>
              <th className="p-3.5 font-bold">Mode & Status</th>
              <th className="p-3.5 font-bold">Lokasi</th>
              <th className="p-3.5 font-bold text-right">Aksi Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-150">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-neutral-500">
                  Memuat data sesi...
                </td>
              </tr>
            ) : !filteredSessions || filteredSessions.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-neutral-500">
                  Tidak ada sesi yang sesuai filter.
                </td>
              </tr>
            ) : (
              filteredSessions.map((s) => {
                const group = s.classes?.student_groups
                const groupLabel = group ? `${group.cohorts?.tahun ?? ''} ${group.nama}` : ''
                const isPassed = new Date() >= new Date(s.mulai_at)
                const isCancelled = s.status === 'dibatalkan'
                const isFinished = s.status === 'selesai'
                const isLocked = isCancelled || isFinished || isPassed

                const missingOnlineLink = s.mode === 'online' && !s.link_online

                return (
                  <tr key={s.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="p-3.5">
                      <div className="font-semibold text-neutral-900">{formatDateWib(s.tanggal)}</div>
                      <div className="text-xs font-mono text-neutral-600">
                        {formatTimeWib(s.mulai_at)} – {formatTimeWib(s.selesai_at)}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[11px] text-neutral-500">
                          P{s.pertemuan_ke} dari {s.classes?.jumlah_pertemuan ?? 16}
                        </span>
                        {s.jenis === 'uts' && <Badge variant="secondary" size="sm">UTS</Badge>}
                        {s.jenis === 'uas' && <Badge variant="secondary" size="sm">UAS</Badge>}
                        {s.pengganti_dari_id && <Badge variant="warning" size="sm">Pengganti</Badge>}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-semibold text-neutral-900">
                        {s.classes?.courses?.kode} - {s.classes?.courses?.nama}
                      </div>
                      <div className="text-xs text-neutral-600 mt-0.5">
                        Kelas <span className="font-medium text-neutral-800">{groupLabel}</span>
                      </div>
                      {isCancelled && s.cancel_reason && (
                        <p className="text-xs text-red-600 italic mt-1">
                          Alasan: {s.cancel_reason}
                        </p>
                      )}
                    </td>

                    <td className="p-3.5 text-neutral-800 font-medium">
                      {s.classes?.profiles?.nama ?? '-'}
                    </td>

                    <td className="p-3.5 space-y-1">
                      <ModeBadge mode={s.mode} status={s.status} />
                      {s.mode_source && (
                        <div className="text-[11px] text-neutral-500">Sumber: {s.mode_source}</div>
                      )}
                    </td>

                    <td className="p-3.5 text-xs">
                      {s.ruangan && <div>Ruang: <span className="font-semibold">{s.ruangan}</span></div>}
                      {s.link_online && (
                        <a
                          href={s.link_online}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline truncate max-w-[150px] block"
                        >
                          Link Online
                        </a>
                      )}
                      {!s.ruangan && !s.link_online && (
                        <span className="text-neutral-400">Belum diatur</span>
                      )}
                      {missingOnlineLink && (
                        <div className="mt-1">
                          <Badge variant="warning" size="sm">
                            Link belum diisi
                          </Badge>
                        </div>
                      )}
                    </td>

                    <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                      {!isLocked && (
                        <div className="inline-flex gap-1">
                          {(['online', 'offline', 'tidak_ada'] as const).map((m) => (
                            <button
                              key={m}
                              type="button"
                              disabled={setModeMutation.isPending || s.mode === m}
                              onClick={() => handleAdminChangeMode(s.id, m)}
                              className={`min-h-9 px-2 text-xs font-semibold rounded border transition-colors ${
                                s.mode === m
                                  ? 'bg-neutral-900 text-white border-neutral-900'
                                  : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100'
                              }`}
                            >
                              {m === 'tidak_ada' ? 'Tidak Ada' : m === 'online' ? 'Online' : 'Offline'}
                            </button>
                          ))}
                        </div>
                      )}

                      {!isFinished && !isPassed && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setLocatingSession(s)
                            setInputRuangan(s.ruangan ?? '')
                            setInputLinkOnline(s.link_online ?? '')
                            setLokasiError(null)
                          }}
                        >
                          Atur Lokasi
                        </Button>
                      )}

                      {isCancelled && !isPassed && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleRestore(s.id)}
                          loading={restoreMutation.isPending}
                        >
                          Pulihkan
                        </Button>
                      )}

                      {!isCancelled && !isFinished && !isPassed && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setCancellingSession(s)
                            setCancelReason('')
                          }}
                        >
                          Batalkan
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Batalkan Sesi */}
      {cancellingSession && (
        <Modal
          isOpen={true}
          onClose={() => setCancellingSession(null)}
          title={`Batalkan Sesi Pertemuan ke-${cancellingSession.pertemuan_ke}`}
        >
          <form onSubmit={handleCancelSubmit} className="space-y-4">
            <p className="text-xs text-neutral-600">
              Sesi yang dibatalkan oleh Admin tidak dapat dikonfirmasi lagi dan mahasiswa akan menerima notifikasi pembatalan.
            </p>

            <div>
              <label className="block text-sm font-semibold text-neutral-800 mb-1">
                Keterangan Pembatalan (Opsional)
              </label>
              <textarea
                rows={3}
                placeholder="Contoh: Dosen berhalangan hadir karena tugas institusi."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2.5 border border-neutral-300 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCancellingSession(null)}>
                Batal
              </Button>
              <Button type="submit" variant="danger" loading={cancelMutation.isPending}>
                Konfirmasi Batalkan Sesi
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Atur Lokasi */}
      {locatingSession && (
        <Modal
          isOpen={true}
          onClose={() => setLocatingSession(null)}
          title={`Atur Lokasi Pertemuan ke-${locatingSession.pertemuan_ke}`}
        >
          <form onSubmit={handleLokasiSubmit} className="space-y-4">
            <p className="text-xs text-neutral-600">
              Isi ruangan fisik atau tautan kuliah online (Google Meet, Zoom, dsb). Mahasiswa dan dosen akan menerima notifikasi perubahan lokasi.
            </p>

            <Input
              label="Ruangan (Kuliah Offline)"
              placeholder="Contoh: Lab Media 301"
              value={inputRuangan}
              onChange={(e) => setInputRuangan(e.target.value)}
            />

            <Input
              label="Link Online (Google Meet, Zoom)"
              placeholder="https://meet.google.com/xyz-abc-def"
              value={inputLinkOnline}
              onChange={(e) => setInputLinkOnline(e.target.value)}
            />

            {lokasiError && <p className="text-sm text-red-600 font-medium">{lokasiError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setLocatingSession(null)}>
                Batal
              </Button>
              <Button type="submit" loading={setLokasiMutation.isPending}>
                Simpan Lokasi
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}