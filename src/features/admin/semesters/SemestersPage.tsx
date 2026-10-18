import { useState, type FormEvent } from 'react'
import { z } from 'zod'
import {
  useSemesters,
  useCreateSemester,
  useSetActiveSemester,
  useDeleteSemester,
} from './useSemesters'

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

  const [nama, setNama] = useState('')
  const [tanggalMulai, setTanggalMulai] = useState('')
  const [tanggalSelesai, setTanggalSelesai] = useState('')
  const [aktif, setAktif] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
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
      },
      onError: (err) => setErrorMsg(err.message),
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Manajemen Semester</h1>
        <p className="text-sm text-neutral-600 mt-1">Kelola periode semester aktif dan rentang tanggal perkuliahan.</p>
      </div>

      <form onSubmit={handleSubmit} className="border border-neutral-900 bg-white p-6 space-y-4 max-w-xl">
        <h2 className="font-bold text-base">Tambah Semester Baru</h2>
        <div>
          <label className="block text-sm font-medium">Nama Semester</label>
          <input
            type="text"
            placeholder="Contoh: Genap 2026/2027"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="mt-1 w-full min-h-11 px-3 border border-neutral-900"
            required
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Tanggal Mulai</label>
            <input
              type="date"
              value={tanggalMulai}
              onChange={(e) => setTanggalMulai(e.target.value)}
              className="mt-1 w-full min-h-11 px-3 border border-neutral-900"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Tanggal Selesai</label>
            <input
              type="date"
              value={tanggalSelesai}
              onChange={(e) => setTanggalSelesai(e.target.value)}
              className="mt-1 w-full min-h-11 px-3 border border-neutral-900"
              required
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input
            type="checkbox"
            checked={aktif}
            onChange={(e) => setAktif(e.target.checked)}
            className="w-4 h-4"
          />
          Jadikan sebagai semester aktif
        </label>

        {errorMsg && <p className="text-sm text-red-700 font-medium">{errorMsg}</p>}

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="min-h-11 px-6 bg-neutral-900 text-white text-sm font-medium disabled:opacity-50"
        >
          Simpan Semester
        </button>
      </form>

      <div className="border border-neutral-900 bg-white">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-900 bg-neutral-100">
              <th className="p-3 font-bold">Nama</th>
              <th className="p-3 font-bold">Mulai</th>
              <th className="p-3 font-bold">Selesai</th>
              <th className="p-3 font-bold">Status</th>
              <th className="p-3 font-bold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-4 text-neutral-600">Memuat data...</td>
              </tr>
            ) : semesters?.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-neutral-600">Belum ada data semester.</td>
              </tr>
            ) : (
              semesters?.map((s) => (
                <tr key={s.id} className="border-b border-neutral-200">
                  <td className="p-3 font-medium">{s.nama}</td>
                  <td className="p-3">{s.tanggal_mulai}</td>
                  <td className="p-3">{s.tanggal_selesai}</td>
                  <td className="p-3">
                    {s.aktif ? (
                      <span className="inline-block px-2 py-1 text-xs font-bold bg-emerald-600 text-white">
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-1 text-xs bg-neutral-200 text-neutral-800">
                        Nonaktif
                      </span>
                    )}
                  </td>
                  <td className="p-3 space-x-2">
                    {!s.aktif && (
                      <button
                        type="button"
                        onClick={() => activateMutation.mutate(s.id)}
                        className="min-h-11 px-3 border border-neutral-900 text-xs font-medium hover:bg-neutral-100"
                      >
                        Set Aktif
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(s.id)}
                      className="min-h-11 px-3 border border-neutral-300 text-xs text-red-700 font-medium hover:bg-neutral-100"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}