import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  useLecturerTagihan,
  useAjukanPengganti,
  type LecturerTagihanItem,
} from './useLecturerSessions'
import { TagihanBadge, type TagihanStatus } from '../../components/ui/Badge'
import { formatDateWib, formatTimeWib } from '../../lib/time'
import { copy } from '../../lib/copy'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { mapErrorMessage } from '../../lib/errors'

function getDefaultReplacementTimes() {
  const besok = new Date(Date.now() + 24 * 3600 * 1000)
  besok.setHours(9, 0, 0, 0)
  const selesai = new Date(besok.getTime() + 2.5 * 3600 * 1000)
  return {
    mulai: besok.toISOString().slice(0, 16),
    selesai: selesai.toISOString().slice(0, 16),
  }
}

export function LecturerTagihanPage() {
  const { data: tagihanList, isLoading } = useLecturerTagihan()
  const ajukanMutation = useAjukanPengganti()

  const [selectedTagihan, setSelectedTagihan] = useState<LecturerTagihanItem | null>(null)
  const [mulaiAt, setMulaiAt] = useState('')
  const [selesaiAt, setSelesaiAt] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function openAjukanModal(t: LecturerTagihanItem) {
    setSelectedTagihan(t)
    const { mulai, selesai } = getDefaultReplacementTimes()
    setMulaiAt(mulai)
    setSelesaiAt(selesai)
    setErrorMsg(null)
  }

  function handleAjukanSubmit(e: FormEvent) {
    e.preventDefault()
    if (!selectedTagihan || !mulaiAt || !selesaiAt) return
    setErrorMsg(null)

    ajukanMutation.mutate(
      {
        tagihanId: selectedTagihan.id,
        mulaiAt: new Date(mulaiAt).toISOString(),
        selesaiAt: new Date(selesaiAt).toISOString(),
      },
      {
        onSuccess: () => {
          setSelectedTagihan(null)
        },
        onError: (err) => {
          setErrorMsg(mapErrorMessage(err))
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            {copy.tagihan.dosenTitle}
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Daftar sesi yang dibatalkan karena libur atau berhalangan dan wajib dijadwalkan ulang.
          </p>
        </div>
        <Link
          to="/dosen"
          className="text-xs font-semibold text-neutral-700 hover:text-neutral-950 underline py-2"
        >
          ← Beranda
        </Link>
      </div>

      {isLoading ? (
        <p className="text-sm text-neutral-500 py-6 text-center">Memuat daftar tagihan...</p>
      ) : !tagihanList || tagihanList.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 bg-neutral-50/50">
          Tidak ada tagihan kelas pengganti. Semua pertemuan telah terpenuhi!
        </div>
      ) : (
        <div className="space-y-4">
          {tagihanList.map((t) => {
            const cls = t.classes
            const courseName = cls?.courses?.nama ?? 'Mata Kuliah'
            const groupTahun = cls?.student_groups?.cohorts?.tahun ?? ''
            const groupNama = cls?.student_groups?.nama ?? ''
            const groupLabel = `${groupTahun} ${groupNama}`.trim() || '-'
            const nTotal = cls?.jumlah_pertemuan ?? 16

            return (
              <div
                key={t.id}
                className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-base text-neutral-900">{courseName}</h2>
                    <div className="text-xs text-neutral-600 mt-0.5">
                      Kelas <span className="font-semibold text-neutral-900">{groupLabel}</span> ·
                      Pertemuan ke-{t.pertemuan_ke} dari {nTotal}
                    </div>
                  </div>
                  <TagihanBadge status={t.status as TagihanStatus} />
                </div>

                <div className="bg-neutral-50 rounded-lg p-3 text-xs space-y-1 text-neutral-600 border border-neutral-100">
                  <div className="flex justify-between">
                    <span>Tenggat Pengajuan:</span>
                    <span className="font-semibold text-neutral-900">
                      {formatDateWib(t.tenggat_at)} ({formatTimeWib(t.tenggat_at)} WIB)
                    </span>
                  </div>

                  {t.usulan_mulai_at && (
                    <div className="flex justify-between pt-1 border-t border-neutral-200/60">
                      <span>Jadwal yang Diajukan:</span>
                      <span className="font-semibold text-neutral-900">
                        {formatDateWib(t.usulan_mulai_at)} {formatTimeWib(t.usulan_mulai_at)} –{' '}
                        {formatTimeWib(t.usulan_selesai_at ?? t.usulan_mulai_at)} WIB
                      </span>
                    </div>
                  )}

                  {t.ditolak_alasan && (
                    <div className="pt-2 text-rose-600 font-medium">
                      <span className="font-bold">Alasan Ditolak Admin:</span> {t.ditolak_alasan}
                    </div>
                  )}
                </div>

                {/* Aksi Ajukan atau Ajukan Ulang jika status menunggu atau diajukan */}
                {t.status === 'menunggu' && (
                  <Button
                    onClick={() => openAjukanModal(t)}
                    variant="primary"
                    size="sm"
                    className="w-full mt-2"
                  >
                    Ajukan Jadwal Pengganti
                  </Button>
                )}

                {t.status === 'diajukan' && (
                  <Button
                    onClick={() => openAjukanModal(t)}
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                  >
                    Ubah Usulan Jadwal
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Ajukan Pengganti */}
      {selectedTagihan && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedTagihan(null)}
          title={`Ajukan Jadwal Pengganti (Pertemuan ke-${selectedTagihan.pertemuan_ke})`}
        >
          <form onSubmit={handleAjukanSubmit} className="space-y-4">
            <p className="text-xs text-neutral-600">
              Pilih waktu kuliah pengganti. Jadwal tidak boleh bentrok dengan kelas Anda lainnya
              maupun jadwal kuliah mahasiswa kelas tersebut.
            </p>

            <Input
              type="datetime-local"
              label="Waktu Mulai"
              value={mulaiAt}
              onChange={(e) => setMulaiAt(e.target.value)}
              required
            />

            <Input
              type="datetime-local"
              label="Waktu Selesai"
              value={selesaiAt}
              onChange={(e) => setSelesaiAt(e.target.value)}
              required
            />

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg font-medium">
                {errorMsg}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setSelectedTagihan(null)}>
                Batal
              </Button>
              <Button type="submit" loading={ajukanMutation.isPending}>
                Kirim Pengajuan
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
