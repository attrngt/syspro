import { useState, type FormEvent } from 'react'
import { useCohorts, useStudentGroups, useCreateCohort, useCreateStudentGroup } from './useCohorts'
import { copy } from '../../../lib/copy'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { mapErrorMessage } from '../../../lib/errors'

export function CohortsPage() {
  const { data: cohorts, isLoading: cohortsLoading } = useCohorts()
  const { data: groups, isLoading: groupsLoading } = useStudentGroups()
  const createCohort = useCreateCohort()
  const createGroup = useCreateStudentGroup()

  const [isCohortModalOpen, setIsCohortModalOpen] = useState(false)
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false)

  const [tahun, setTahun] = useState('')
  const [namaCohort, setNamaCohort] = useState('')

  const [selectedCohortId, setSelectedCohortId] = useState('')
  const [namaGroup, setNamaGroup] = useState('')

  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function handleCreateCohort(e: FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    const tahunNum = parseInt(tahun, 10)
    if (isNaN(tahunNum)) return

    createCohort.mutate(
      { tahun: tahunNum, nama: namaCohort },
      {
        onSuccess: () => {
          setIsCohortModalOpen(false)
          setTahun('')
          setNamaCohort('')
        },
        onError: (err) => setErrorMsg(mapErrorMessage(err)),
      }
    )
  }

  function handleCreateGroup(e: FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    if (!selectedCohortId || !namaGroup) return

    createGroup.mutate(
      { cohortId: selectedCohortId, nama: namaGroup },
      {
        onSuccess: () => {
          setIsGroupModalOpen(false)
          setNamaGroup('')
        },
        onError: (err) => setErrorMsg(mapErrorMessage(err)),
      }
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{copy.admin.angkatan.judul}</h1>
          <p className="text-sm text-neutral-600 mt-1">
            Kelola angkatan mahasiswa dan kelompok perkuliahan (A, B, C) untuk penempatan mahasiswa.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsCohortModalOpen(true)} variant="outline" size="sm">
            + {copy.admin.angkatan.tambahAngkatan}
          </Button>
          <Button onClick={() => setIsGroupModalOpen(true)} size="sm">
            + {copy.admin.angkatan.tambahKelompok}
          </Button>
        </div>
      </div>

      {/* Tabel Angkatan & Kelompok */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kolom Angkatan */}
        <div className="rounded-xl border border-neutral-200 bg-white shadow-xs overflow-hidden">
          <div className="p-4 bg-neutral-50 border-b border-neutral-200 font-bold text-sm text-neutral-800">
            Daftar Angkatan (Cohorts)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs font-bold text-neutral-500 uppercase">
                  <th className="p-3.5">Tahun</th>
                  <th className="p-3.5">Nama Angkatan</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {cohortsLoading ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-neutral-500">
                      Memuat angkatan...
                    </td>
                  </tr>
                ) : !cohorts || cohorts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-neutral-500">
                      Belum ada angkatan terdaftar.
                    </td>
                  </tr>
                ) : (
                  cohorts.map((c) => (
                    <tr key={c.id} className="hover:bg-neutral-50/60">
                      <td className="p-3.5 font-bold text-neutral-900">{c.tahun}</td>
                      <td className="p-3.5 text-neutral-700">{c.nama}</td>
                      <td className="p-3.5">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-semibold ${
                            c.aktif
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          {c.aktif ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Kolom Kelompok Mahasiswa */}
        <div className="rounded-xl border border-neutral-200 bg-white shadow-xs overflow-hidden">
          <div className="p-4 bg-neutral-50 border-b border-neutral-200 font-bold text-sm text-neutral-800">
            Daftar Kelompok Mahasiswa (Student Groups)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs font-bold text-neutral-500 uppercase">
                  <th className="p-3.5">Angkatan</th>
                  <th className="p-3.5">Nama Kelompok</th>
                  <th className="p-3.5">Label Kelas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {groupsLoading ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-neutral-500">
                      Memuat kelompok...
                    </td>
                  </tr>
                ) : !groups || groups.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-neutral-500">
                      Belum ada kelompok terdaftar.
                    </td>
                  </tr>
                ) : (
                  groups.map((g) => (
                    <tr key={g.id} className="hover:bg-neutral-50/60">
                      <td className="p-3.5 font-semibold text-neutral-900">
                        {g.cohorts?.tahun ?? '-'}
                      </td>
                      <td className="p-3.5 font-bold text-neutral-900">Kelas {g.nama}</td>
                      <td className="p-3.5">
                        <span className="text-xs px-2.5 py-1 rounded-md font-mono font-bold bg-neutral-100 text-neutral-800">
                          {g.cohorts?.tahun} {g.nama}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Tambah Angkatan */}
      <Modal
        isOpen={isCohortModalOpen}
        onClose={() => setIsCohortModalOpen(false)}
        title={copy.admin.angkatan.tambahAngkatan}
      >
        <form onSubmit={handleCreateCohort} className="space-y-4">
          <Input
            label={copy.admin.angkatan.tahun}
            type="number"
            min={2000}
            max={2100}
            value={tahun}
            onChange={(e) => setTahun(e.target.value)}
            placeholder="Contoh: 2025"
            required
          />
          <Input
            label="Nama Angkatan"
            value={namaCohort}
            onChange={(e) => setNamaCohort(e.target.value)}
            placeholder="Contoh: Angkatan 2025"
            required
          />
          {errorMsg && (
            <p className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded border border-rose-200">
              {errorMsg}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsCohortModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" isLoading={createCohort.isPending}>
              Simpan Angkatan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Tambah Kelompok */}
      <Modal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        title={copy.admin.angkatan.tambahKelompok}
      >
        <form onSubmit={handleCreateGroup} className="space-y-4">
          <Select
            label="Pilih Angkatan"
            value={selectedCohortId}
            onChange={(e) => setSelectedCohortId(e.target.value)}
            required
          >
            <option value="">-- Pilih Angkatan --</option>
            {cohorts?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.tahun} - {c.nama}
              </option>
            ))}
          </Select>
          <Input
            label={copy.admin.angkatan.namaKelompok}
            value={namaGroup}
            onChange={(e) => setNamaGroup(e.target.value)}
            placeholder="Contoh: A, B, atau C"
            required
          />
          {errorMsg && (
            <p className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded border border-rose-200">
              {errorMsg}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsGroupModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" isLoading={createGroup.isPending}>
              Simpan Kelompok
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
