import { useState, type FormEvent } from 'react'
import { z } from 'zod'
import { useCourses, useCreateCourse, useDeleteCourse } from './useCourses'

const CourseSchema = z.object({
  kode: z.string().min(2, 'Kode wajib diisi'),
  nama: z.string().min(3, 'Nama mata kuliah wajib diisi'),
  sks: z.number().int().min(1).max(6),
})

export function CoursesPage() {
  const { data: courses, isLoading } = useCourses()
  const createMutation = useCreateCourse()
  const deleteMutation = useDeleteCourse()

  const [kode, setKode] = useState('')
  const [nama, setNama] = useState('')
  const [sks, setSks] = useState('3')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    const parsed = CourseSchema.safeParse({
      kode: kode.trim().toUpperCase(),
      nama: nama.trim(),
      sks: Number(sks),
    })
    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message ?? 'Input tidak valid')
      return
    }
    createMutation.mutate(parsed.data, {
      onSuccess: () => {
        setKode('')
        setNama('')
        setSks('3')
      },
      onError: (err) => setErrorMsg(err.message),
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Manajemen Mata Kuliah</h1>
        <p className="text-sm text-neutral-600 mt-1">Kelola daftar mata kuliah Program Studi Produksi Media.</p>
      </div>

      <form onSubmit={handleSubmit} className="border border-neutral-900 bg-white p-6 space-y-4 max-w-xl">
        <h2 className="font-bold text-base">Tambah Mata Kuliah</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium">Kode MK</label>
            <input
              type="text"
              placeholder="PM104"
              value={kode}
              onChange={(e) => setKode(e.target.value)}
              className="mt-1 w-full min-h-11 px-3 border border-neutral-900"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Nama Mata Kuliah</label>
            <input
              type="text"
              placeholder="Sinematografi Dasar"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="mt-1 w-full min-h-11 px-3 border border-neutral-900"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium">SKS (1–6)</label>
          <input
            type="number"
            min={1}
            max={6}
            value={sks}
            onChange={(e) => setSks(e.target.value)}
            className="mt-1 w-28 min-h-11 px-3 border border-neutral-900"
            required
          />
        </div>

        {errorMsg && <p className="text-sm text-red-700 font-medium">{errorMsg}</p>}

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="min-h-11 px-6 bg-neutral-900 text-white text-sm font-medium disabled:opacity-50"
        >
          Simpan Mata Kuliah
        </button>
      </form>

      <div className="border border-neutral-900 bg-white">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-900 bg-neutral-100">
              <th className="p-3 font-bold">Kode</th>
              <th className="p-3 font-bold">Nama Mata Kuliah</th>
              <th className="p-3 font-bold">SKS</th>
              <th className="p-3 font-bold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="p-4 text-neutral-600">Memuat data...</td>
              </tr>
            ) : (
              courses?.map((c) => (
                <tr key={c.id} className="border-b border-neutral-200">
                  <td className="p-3 font-mono font-medium">{c.kode}</td>
                  <td className="p-3">{c.nama}</td>
                  <td className="p-3">{c.sks}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(c.id)}
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