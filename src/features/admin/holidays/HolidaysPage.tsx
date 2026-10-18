import { useState, type FormEvent } from 'react'
import { useHolidays, useCreateHoliday, useDeleteHoliday } from './useHolidays'

export function HolidaysPage() {
  const { data: holidays, isLoading } = useHolidays()
  const createMutation = useCreateHoliday()
  const deleteMutation = useDeleteHoliday()

  const [tanggal, setTanggal] = useState('')
  const [keterangan, setKeterangan] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    if (!tanggal || !keterangan.trim()) {
      setErrorMsg('Tanggal dan keterangan wajib diisi.')
      return
    }
    createMutation.mutate(
      { tanggal, keterangan: keterangan.trim() },
      {
        onSuccess: () => {
          setTanggal('')
          setKeterangan('')
        },
        onError: (err) => setErrorMsg(err.message),
      }
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Manajemen Hari Libur & UAS</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Tanggal yang terdaftar di sini tidak akan menghasilkan sesi kuliah. Menambah tanggal libur baru akan otomatis membatalkan sesi pada tanggal tersebut.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="border border-neutral-900 bg-white p-6 space-y-4 max-w-xl">
        <h2 className="font-bold text-base">Tambah Tanggal Libur / UAS</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Tanggal</label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="mt-1 w-full min-h-11 px-3 border border-neutral-900"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Keterangan</label>
            <input
              type="text"
              placeholder="Contoh: Pekan UAS Ganjil"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              className="mt-1 w-full min-h-11 px-3 border border-neutral-900"
              required
            />
          </div>
        </div>

        {errorMsg && <p className="text-sm text-red-700 font-medium">{errorMsg}</p>}

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="min-h-11 px-6 bg-neutral-900 text-white text-sm font-medium disabled:opacity-50"
        >
          Simpan Hari Libur
        </button>
      </form>

      <div className="border border-neutral-900 bg-white">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-900 bg-neutral-100">
              <th className="p-3 font-bold">Tanggal</th>
              <th className="p-3 font-bold">Keterangan</th>
              <th className="p-3 font-bold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={3} className="p-4 text-neutral-600">Memuat data libur...</td>
              </tr>
            ) : (
              holidays?.map((h) => (
                <tr key={h.id} className="border-b border-neutral-200">
                  <td className="p-3 font-mono">{h.tanggal}</td>
                  <td className="p-3">{h.keterangan}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(h.id)}
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