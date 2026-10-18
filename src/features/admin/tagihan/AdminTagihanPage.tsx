import { useState, type FormEvent } from 'react'
import {
  useAdminTagihan,
  useAdminSetujuiPengganti,
  useAdminTolakPengganti,
  useAdminJadwalkanPengganti,
  type AdminTagihanItem,
} from './useAdminTagihan'
import { copy } from '../../../lib/copy'
import { formatDateWib, formatTimeWib } from '../../../lib/time'
import { TagihanBadge, type TagihanStatus } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { mapErrorMessage } from '../../../lib/errors'

export function AdminTagihanPage() {
  const { data: tagihanList, isLoading } = useAdminTagihan()
  const setujuiMutation = useAdminSetujuiPengganti()
  const tolakMutation = useAdminTolakPengganti()
  const jadwalkanMutation = useAdminJadwalkanPengganti()

  const [activeTab, setActiveTab] = useState<'diajukan' | 'menunggu' | 'terjadwal' | 'kedaluwarsa'>(
    'diajukan'
  )

  // State untuk Modal Setujui
  const [tagihanToApprove, setTagihanToApprove] = useState<AdminTagihanItem | null>(null)
  const [approveRuangan, setApproveRuangan] = useState('')
  const [approveLinkOnline, setApproveLinkOnline] = useState('')

  // State untuk Modal Tolak
  const [tagihanToReject, setTagihanToReject] = useState<AdminTagihanItem | null>(null)
  const [rejectAlasan, setRejectAlasan] = useState('')

  // State untuk Modal Jadwalkan Langsung atas nama Dosen
  const [tagihanToDirectSchedule, setTagihanToDirectSchedule] = useState<AdminTagihanItem | null>(null)
  const [directMulaiAt, setDirectMulaiAt] = useState('')
  const [directSelesaiAt, setDirectSelesaiAt] = useState('')
  const [directRuangan, setDirectRuangan] = useState('')
  const [directLinkOnline, setDirectLinkOnline] = useState('')

  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const filteredTagihan = (tagihanList ?? []).filter((t) => t.status === activeTab)

  function openApproveModal(t: AdminTagihanItem) {
    setTagihanToApprove(t)
    setApproveRuangan('R.401')
    setApproveLinkOnline('')
    setErrorMsg(null)
  }

  function handleApproveSubmit(e: FormEvent) {
    e.preventDefault()
    if (!tagihanToApprove) return
    setErrorMsg(null)

    if (!approveRuangan.trim() && !approveLinkOnline.trim()) {
      setErrorMsg(copy.errors.ruanganAtauLinkWajib)
      return
    }

    setujuiMutation.mutate(
      {
        tagihanId: tagihanToApprove.id,
        ruangan: approveRuangan || null,
        linkOnline: approveLinkOnline || null,
      },
      {
        onSuccess: () => setTagihanToApprove(null),
        onError: (err) => setErrorMsg(mapErrorMessage(err)),
      }
    )
  }

  function openRejectModal(t: AdminTagihanItem) {
    setTagihanToReject(t)
    setRejectAlasan('')
    setErrorMsg(null)
  }

  function handleRejectSubmit(e: FormEvent) {
    e.preventDefault()
    if (!tagihanToReject) return
    setErrorMsg(null)

    if (!rejectAlasan.trim()) {
      setErrorMsg(copy.errors.alasanTolakWajib)
      return
    }

    tolakMutation.mutate(
      {
        tagihanId: tagihanToReject.id,
        alasan: rejectAlasan,
      },
      {
        onSuccess: () => setTagihanToReject(null),
        onError: (err) => setErrorMsg(mapErrorMessage(err)),
      }
    )
  }

  function openDirectScheduleModal(t: AdminTagihanItem) {
    setTagihanToDirectSchedule(t)
    const besok = new Date(Date.now() + 24 * 3600 * 1000)
    besok.setHours(8, 0, 0, 0)
    const selesai = new Date(besok.getTime() + 2.5 * 3600 * 1000)
    setDirectMulaiAt(besok.toISOString().slice(0, 16))
    setDirectSelesaiAt(selesai.toISOString().slice(0, 16))
    setDirectRuangan('Lab Audio')
    setDirectLinkOnline('')
    setErrorMsg(null)
  }

  function handleDirectScheduleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!tagihanToDirectSchedule || !directMulaiAt || !directSelesaiAt) return
    setErrorMsg(null)

    if (!directRuangan.trim() && !directLinkOnline.trim()) {
      setErrorMsg(copy.errors.ruanganAtauLinkWajib)
      return
    }

    jadwalkanMutation.mutate(
      {
        tagihanId: tagihanToDirectSchedule.id,
        mulaiAt: new Date(directMulaiAt).toISOString(),
        selesaiAt: new Date(directSelesaiAt).toISOString(),
        ruangan: directRuangan || null,
        linkOnline: directLinkOnline || null,
      },
      {
        onSuccess: () => setTagihanToDirectSchedule(null),
        onError: (err) => setErrorMsg(mapErrorMessage(err)),
      }
    )
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-4">
        <h1 className="text-2xl font-bold text-neutral-900">{copy.admin.tagihan.judul}</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Pantau kewajiban kelas pengganti, setujui atau tolak pengajuan dosen, atau jadwalkan langsung.
        </p>
      </div>

      {/* 4 Tabs: Diajukan, Menunggu, Terjadwal, Kedaluwarsa */}
      <div className="flex border-b border-neutral-200 gap-2 overflow-x-auto pb-1">
        {(
          [
            { id: 'diajukan', label: copy.admin.tagihan.tabDiajukan },
            { id: 'menunggu', label: copy.admin.tagihan.tabMenunggu },
            { id: 'terjadwal', label: copy.admin.tagihan.tabTerjadwal },
            { id: 'kedaluwarsa', label: copy.admin.tagihan.tabKedaluwarsa },
          ] as const
        ).map((tab) => {
          const count = (tagihanList ?? []).filter((t) => t.status === tab.id).length
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[44px] px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
                active
                  ? 'border-neutral-900 text-neutral-900 bg-white'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  active ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-700'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <p className="text-sm text-neutral-500 py-8 text-center">Memuat daftar tagihan...</p>
      ) : filteredTagihan.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 bg-neutral-50/50">
          Tidak ada tagihan dalam status ini.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTagihan.map((t) => {
            const cls = t.classes
            const courseName = cls?.courses?.nama ?? 'Mata Kuliah'
            const groupTahun = cls?.student_groups?.cohorts?.tahun ?? ''
            const groupNama = cls?.student_groups?.nama ?? ''
            const groupLabel = `${groupTahun} ${groupNama}`.trim() || '-'
            const dosenNama = t.profiles?.nama ?? '-'
            const nTotal = cls?.jumlah_pertemuan ?? 16

            return (
              <div
                key={t.id}
                className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-xs space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-base text-neutral-900">{courseName}</h3>
                    <div className="text-xs text-neutral-600 mt-0.5">
                      Kelas {groupLabel} · Pertemuan {t.pertemuan_ke} dari {nTotal} · Dosen: {dosenNama}
                    </div>
                  </div>
                  <TagihanBadge status={t.status as TagihanStatus} />
                </div>

                <div className="text-xs text-neutral-600 space-y-1 bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                  <div>
                    <strong>Tenggat:</strong> {formatDateWib(t.tenggat_at)} pukul{' '}
                    {formatTimeWib(t.tenggat_at)} WIB
                  </div>
                  {t.usulan_mulai_at && (
                    <div className="text-blue-900 font-semibold">
                      <strong>Usulan Jadwal Dosen:</strong> {formatDateWib(t.usulan_mulai_at)},{' '}
                      {formatTimeWib(t.usulan_mulai_at)} – {formatTimeWib(t.usulan_selesai_at ?? t.usulan_mulai_at)} WIB
                    </div>
                  )}
                  {t.ditolak_alasan && (
                    <div className="p-2 rounded bg-rose-50 text-rose-800 font-medium">
                      <strong>Alasan Penolakan:</strong> {t.ditolak_alasan}
                    </div>
                  )}
                </div>

                {/* Aksi untuk Tab Diajukan */}
                {activeTab === 'diajukan' && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      onClick={() => openApproveModal(t)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                      size="sm"
                    >
                      ✓ {copy.admin.tagihan.setujuiBtn}
                    </Button>
                    <Button
                      onClick={() => openRejectModal(t)}
                      variant="danger"
                      size="sm"
                    >
                      ✗ {copy.admin.tagihan.tolakBtn}
                    </Button>
                  </div>
                )}

                {/* Aksi untuk Tab Menunggu */}
                {activeTab === 'menunggu' && (
                  <div className="pt-1">
                    <Button
                      onClick={() => openDirectScheduleModal(t)}
                      variant="outline"
                      size="sm"
                    >
                      {copy.admin.tagihan.jadwalkanAdminBtn}
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Setujui Pengajuan */}
      <Modal
        isOpen={!!tagihanToApprove}
        onClose={() => setTagihanToApprove(null)}
        title={copy.admin.tagihan.setujuiBtn}
        description="Isi ruangan atau tautan online (minimal salah satu) untuk mahasiswa dan dosen."
      >
        <form onSubmit={handleApproveSubmit} className="space-y-4">
          <Input
            label={copy.lokasi.ruangan}
            value={approveRuangan}
            onChange={(e) => setApproveRuangan(e.target.value)}
            placeholder="Contoh: R.401 atau Lab Produksi"
          />
          <Input
            label={copy.lokasi.linkOnline}
            type="url"
            value={approveLinkOnline}
            onChange={(e) => setApproveLinkOnline(e.target.value)}
            placeholder="Contoh: https://meet.google.com/xyz"
          />
          {errorMsg && (
            <p className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded border border-rose-200">
              {errorMsg}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setTagihanToApprove(null)}>
              Batal
            </Button>
            <Button type="submit" isLoading={setujuiMutation.isPending}>
              Konfirmasi & Buat Sesi
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Tolak Pengajuan */}
      <Modal
        isOpen={!!tagihanToReject}
        onClose={() => setTagihanToReject(null)}
        title={copy.admin.tagihan.tolakBtn}
        description="Alasan penolakan wajib diisi dan akan dikirimkan ke dosen pengampu."
      >
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          <Input
            label={copy.admin.tagihan.alasanTolakLabel}
            value={rejectAlasan}
            onChange={(e) => setRejectAlasan(e.target.value)}
            placeholder="Contoh: Ruangan lab sedang digunakan untuk ujian"
            required
          />
          {errorMsg && (
            <p className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded border border-rose-200">
              {errorMsg}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setTagihanToReject(null)}>
              Batal
            </Button>
            <Button type="submit" variant="danger" isLoading={tolakMutation.isPending}>
              Tolak Pengajuan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Jadwalkan Langsung atas nama Dosen */}
      <Modal
        isOpen={!!tagihanToDirectSchedule}
        onClose={() => setTagihanToDirectSchedule(null)}
        title="Jadwalkan Langsung atas nama Dosen"
        description="Admin menetapkan jadwal kuliah pengganti langsung tanpa tahap usulan dosen."
      >
        <form onSubmit={handleDirectScheduleSubmit} className="space-y-4">
          <Input
            label="Waktu Mulai"
            type="datetime-local"
            value={directMulaiAt}
            onChange={(e) => setDirectMulaiAt(e.target.value)}
            required
          />
          <Input
            label="Waktu Selesai"
            type="datetime-local"
            value={directSelesaiAt}
            onChange={(e) => setDirectSelesaiAt(e.target.value)}
            required
          />
          <Input
            label={copy.lokasi.ruangan}
            value={directRuangan}
            onChange={(e) => setDirectRuangan(e.target.value)}
            placeholder="Contoh: R.202"
          />
          <Input
            label={copy.lokasi.linkOnline}
            type="url"
            value={directLinkOnline}
            onChange={(e) => setDirectLinkOnline(e.target.value)}
            placeholder="Contoh: https://zoom.us/j/123"
          />
          {errorMsg && (
            <p className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded border border-rose-200">
              {errorMsg}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setTagihanToDirectSchedule(null)}>
              Batal
            </Button>
            <Button type="submit" isLoading={jadwalkanMutation.isPending}>
              Jadwalkan Sesi Pengganti
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
