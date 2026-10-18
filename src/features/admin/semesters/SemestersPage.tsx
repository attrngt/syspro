import { useState, type FormEvent } from 'react'
import { z } from 'zod'
import {
  useSemesters,
  useCreateSemester,
  useSetActiveSemester,
  useDeleteSemester,
  useCopySemester,
  useGenerateSessions,
} from './useSemesters'
import { copy } from '../../../lib/copy'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { mapErrorMessage } from '../../../lib/errors'

const SemesterSchema = z
  .object({
    nama: z.string().min(3, 'Nama semester minimal 3 karakter'),
    tanggal_mulai: z.string().min(1, 'Tanggal mulai wajib diisi'),
    tanggal_selesai: z.string().min(1, 'Tanggal selesai wajib diisi'),
    aktif: z.boolean(),
  })
  .refine((d) => d.tanggal_selesai >= d.tanggal_mulai, {
    message: 'Tanggal selesai harus setelah atau sama dengan tanggal mulai',
  })

export function SemestersPage() {
  const { data: semesters, isLoading } = useSemesters()
  const createMutation = useCreateSemester()
  const activateMutation = useSetActiveSemester()
  const deleteMutation = useDeleteSemester()
  const copyMutation = useCopySemester()
  const generateMutation = useGenerateSessions()

  const [nama, setNama] = useState('')
  const [tanggalMulai, setTanggalMulai] = useState('')
  const [tanggalSelesai, setTanggalSelesai] = useState('')
  const [aktif, setAktif] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Modal Salin Semester
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false)
  const [fromSemId, setFromSemId] = useState('')
  const [toSemId, setToSemId] = useState('')

  // Modal Generate Sesi
  const [isGenModalOpen, setIsGenModalOpen] = useState(false)
  const [genSemId, setGenSemId] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    const parsed = SemesterSchema.safeParse({
      nama,
      tanggal_mulai: tanggalMulai,
      tanggal_selesai: tanggalSelesai,
      aktif,
    })
    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message ?? 'Input tidak valid')
      return
    }
    createMutation.mutate(parsed.data, {
      onSuccess: () => {
        setNama('')
        setTanggalMulai('')
        setTanggalSelesai('')
        setAktif(false)
        setSuccessMsg('Semester baru berhasil disimpan.')
      },
      onError: (err) => setErrorMsg(mapErrorMessage(err)),
    })
  }

  function handleCopySubmit(e: FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    if (!fromSemId || !toSemId) return

    copyMutation.mutate(
      { fromSemesterId: fromSemId, toSemesterId: toSemId },
      {
        onSuccess: (count) => {
          setIsCopyModalOpen(false)
          setSuccessMsg(`Berhasil menyalin ${count} kelas dari semester sebelumnya.`)
        },
        onError: (err) => setErrorMsg(mapErrorMessage(err)),
      }
    )
  }

  function handleGenerateSubmit(e: FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    if (!genSemId) return

    generateMutation.mutate(genSemId, {
      onSuccess: (count) => {
        setIsGenModalOpen(false)
        setSuccessMsg(copy.admin.semester.generateSukses(count))
      },
      onError: (err) => setErrorMsg(mapErrorMessage(err)),
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{copy.admin.semester.judul}</h1>
          <p className="text-sm text-neutral-600 mt-1">
            Kelola periode semester aktif, salin konfigurasi kelas, dan generate sesi perkuliahan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsCopyModalOpen(true)} variant="outline" size="sm">
            {copy.admin.semester.salin}
          </Button>
          <Button onClick={() => setIsGenModalOpen(true)} size="sm">
            {copy.admin.semester.generate}
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm font-semibold text-emerald-800">
          ✓ {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm font-semibold text-rose-800">
          {errorMsg}
        </div>
      )}

      {/* Form Tambah Semester */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4 max-w-xl shadow-xs"
      >
        <h2 className="font-bold text-base text-neutral-900">{copy.admin.semester.tambah}</h2>
        <Input
          label="Nama Semester"
          type="text"
          placeholder="Contoh: Genap 2026/2027"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          required
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Tanggal Mulai"
            type="date"
            value={tanggalMulai}
            onChange={(e) => setTanggalMulai(e.target.value)}
            required
          />
          <Input
            label="Tanggal Selesai"
            type="date"
            value={tanggalSelesai}
            onChange={(e) => setTanggalSelesai(e.target.value)}
            required
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={aktif}
            onChange={(e) => setAktif(e.target.checked)}
            className="w-4 h-4 rounded text-neutral-900 focus:ring-neutral-900"
          />
          Jadikan sebagai semester aktif saat ini
        </label>

        <Button type="submit" isLoading={createMutation.isPending}>
          Simpan Semester Baru
        </Button>
      </form>

      {/* Tabel Semester */}
      <div className="rounded-xl border border-neutral-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-bold text-neutral-500 uppercase">
                <th className="p-3.5">Nama</th>
                <th className="p-3.5">Mulai</th>
                <th className="p-3.5">Selesai</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-neutral-500">
                    Memuat data...
                  </td>
                </tr>
              ) : semesters?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-neutral-500">
                    Belum ada data semester.
                  </td>
                </tr>
              ) : (
                semesters?.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50/60">
                    <td className="p-3.5 font-bold text-neutral-900">{s.nama}</td>
                    <td className="p-3.5 font-mono text-xs">{s.tanggal_mulai}</td>
                    <td className="p-3.5 font-mono text-xs">{s.tanggal_selesai}</td>
                    <td className="p-3.5">
                      {s.aktif ? (
                        <span className="inline-block px-2.5 py-1 text-xs font-bold bg-emerald-600 text-white rounded">
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-1 text-xs bg-neutral-200 text-neutral-700 rounded">
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 space-x-2">
                      {!s.aktif && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => activateMutation.mutate(s.id)}
                        >
                          Set Aktif
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(s.id)}
                        className="text-rose-600 hover:bg-rose-50"
                      >
                        Hapus
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Salin Semester */}
      <Modal
        isOpen={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        title={copy.admin.semester.salin}
        description="Salin mata kuliah, kelas, dan jadwal dari semester sebelumnya ke semester tujuan."
      >
        <form onSubmit={handleCopySubmit} className="space-y-4">
          <Select
            label="Dari Semester (Sumber)"
            value={fromSemId}
            onChange={(e) => setFromSemId(e.target.value)}
            required
          >
            <option value="">-- Pilih Semester Sumber --</option>
            {semesters?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama}
              </option>
            ))}
          </Select>

          <Select
            label="Ke Semester (Tujuan)"
            value={toSemId}
            onChange={(e) => setToSemId(e.target.value)}
            required
          >
            <option value="">-- Pilih Semester Tujuan --</option>
            {semesters?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama}
              </option>
            ))}
          </Select>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsCopyModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" isLoading={copyMutation.isPending}>
              Salin Kelas
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Generate Sesi */}
      <Modal
        isOpen={isGenModalOpen}
        onClose={() => setIsGenModalOpen(false)}
        title={copy.admin.semester.generate}
        description="Bentuk sesi tepat N pertemuan per kelas. Hanya bisa dilakukan sebelum semester dimulai dan sekali per semester."
      >
        <form onSubmit={handleGenerateSubmit} className="space-y-4">
          <Select
            label="Pilih Semester untuk Dibuat Jadwalnya"
            value={genSemId}
            onChange={(e) => setGenSemId(e.target.value)}
            required
          >
            <option value="">-- Pilih Semester --</option>
            {semesters?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama} ({s.tanggal_mulai} s/d {s.tanggal_selesai})
              </option>
            ))}
          </Select>

          <div className="text-xs text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200">
            <strong>Catatan:</strong> UTS akan dijadwalkan pada pertemuan ke-⌊N/2⌋ dan UAS pada pertemuan ke-N. Sesi pada tanggal libur perkuliahan akan otomatis dibatalkan dan dibuatkan tagihan pengganti.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsGenModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" isLoading={generateMutation.isPending}>
              Mulai Generate Sesi
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}