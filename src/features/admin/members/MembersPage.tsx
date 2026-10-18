import { useState, type ChangeEvent } from 'react'
import { parseMembersCsv } from '../../../lib/csv'
import {
  useMembers,
  useImportMembers,
  useToggleMemberActive,
  useResetMemberAccess,
} from './useMembers'

export function MembersPage() {
  const { data: members, isLoading } = useMembers()
  const importMutation = useImportMembers()
  const toggleActiveMutation = useToggleMemberActive()
  const resetMutation = useResetMemberAccess()

  const [csvText, setCsvText] = useState('')
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setCsvText(String(ev.target?.result ?? ''))
    }
    reader.readAsText(file)
  }

  function handleImport() {
    setStatusMsg(null)
    const rows = parseMembersCsv(csvText)
    if (rows.length === 0) {
      setStatusMsg('CSV kosong atau tidak valid.')
      return
    }
    importMutation.mutate(rows, {
      onSuccess: (res) => {
        setStatusMsg(`Berhasil: ${res.berhasil} baris. Gagal: ${res.gagal.length} baris.`)
        setCsvText('')
      },
      onError: (err) => setStatusMsg(err.message),
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Manajemen Anggota (Dosen & Mahasiswa)</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Impor daftar anggota via CSV, kelola status aktif, atau reset akses akun.
        </p>
      </div>

      <div className="border border-neutral-900 bg-white p-6 space-y-4 max-w-2xl">
        <h2 className="font-bold text-base">Impor Anggota dari CSV</h2>
        <p className="text-xs text-neutral-600">
          Format kolom: <code className="font-mono bg-neutral-100 px-1">kode,nama,peran,nim_nidn</code> (contoh:{' '}
          <code className="font-mono bg-neutral-100 px-1">9000000013,Rina Wati,mahasiswa,2401011</code>)
        </p>

        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileUpload}
          className="block text-sm text-neutral-700 file:mr-4 file:py-2 file:px-4 file:border file:border-neutral-900 file:text-sm file:font-medium file:bg-white hover:file:bg-neutral-100"
        />

        <textarea
          rows={4}
          placeholder="kode,nama,peran,nim_nidn&#10;9000000013,Rina Wati,mahasiswa,2401011"
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          className="w-full p-3 border border-neutral-900 font-mono text-xs"
        />

        {statusMsg && <p className="text-sm font-medium text-neutral-900">{statusMsg}</p>}

        <button
          type="button"
          onClick={handleImport}
          disabled={importMutation.isPending}
          className="min-h-11 px-6 bg-neutral-900 text-white text-sm font-medium disabled:opacity-50"
        >
          {importMutation.isPending ? 'Mengimpor...' : 'Impor CSV'}
        </button>
      </div>

      <div className="border border-neutral-900 bg-white">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-900 bg-neutral-100">
              <th className="p-3 font-bold">Kode</th>
              <th className="p-3 font-bold">Nama</th>
              <th className="p-3 font-bold">Peran</th>
              <th className="p-3 font-bold">NIM/NIDN</th>
              <th className="p-3 font-bold">Status Akun</th>
              <th className="p-3 font-bold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-4 text-neutral-600">Memuat anggota...</td>
              </tr>
            ) : (
              members?.map((m) => (
                <tr key={m.id} className="border-b border-neutral-200">
                  <td className="p-3 font-mono">{m.kode}</td>
                  <td className="p-3 font-medium">{m.nama}</td>
                  <td className="p-3 capitalize">{m.peran}</td>
                  <td className="p-3">{m.nim_nidn ?? '-'}</td>
                  <td className="p-3">
                    {!m.aktif ? (
                      <span className="px-2 py-1 text-xs bg-neutral-200 text-neutral-700">Nonaktif</span>
                    ) : m.activated_at ? (
                      <span className="px-2 py-1 text-xs bg-emerald-600 text-white font-medium">Sudah Aktif</span>
                    ) : (
                      <span className="px-2 py-1 text-xs border border-amber-600 text-amber-700">Belum Aktivasi</span>
                    )}
                  </td>
                  <td className="p-3 space-x-2">
                    <button
                      type="button"
                      onClick={() => toggleActiveMutation.mutate({ id: m.id, aktif: !m.aktif })}
                      className="min-h-11 px-3 border border-neutral-900 text-xs font-medium hover:bg-neutral-100"
                    >
                      {m.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                    {m.activated_at && (
                      <button
                        type="button"
                        onClick={() => resetMutation.mutate(m.id)}
                        disabled={resetMutation.isPending}
                        className="min-h-11 px-3 border border-neutral-300 text-xs text-red-700 font-medium hover:bg-neutral-100"
                      >
                        Reset Akses
                      </button>
                    )}
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