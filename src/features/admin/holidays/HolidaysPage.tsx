import { useState, type FormEvent } from 'react'
import {
  useHolidays,
  usePreviewHoliday,
  useUpsertHoliday,
  useDeleteHoliday,
} from './useHolidays'
import { copy } from '../../../lib/copy'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { Card } from '../../../components/ui/Card'
import { Input } from '../../../components/ui/Input'

export function HolidaysPage() {
  const { data: holidays, isLoading } = useHolidays()
  const previewMutation = usePreviewHoliday()
  const upsertMutation = useUpsertHoliday()
  const deleteMutation = useDeleteHoliday()

  const [tanggal, setTanggal] = useState('')
  const [keterangan, setKeterangan] = useState('')
  const [isLiburKuliah, setIsLiburKuliah] = useState(false)
  const [previewData, setPreviewData] = useState<{
    akan_dibatalkan: number
    sudah_berlangsung: number
  } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  function handleTanggalChange(val: string) {
    setTanggal(val)
    if (val && isLiburKuliah) {
      previewMutation.mutate(val, {
        onSuccess: (res) => setPreviewData(res),
        onError: () => setPreviewData(null),
      })
    } else {
      setPreviewData(null)
    }
  }

  function handleLiburKuliahToggle(checked: boolean) {
    setIsLiburKuliah(checked)
    if (checked && tanggal) {
      previewMutation.mutate(tanggal, {
        onSuccess: (res) => setPreviewData(res),
        onError: () => setPreviewData(null),
      })
    } else {
      setPreviewData(null)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    if (!tanggal || !keterangan.trim()) {
      setErrorMsg('Tanggal dan keterangan wajib diisi.')
      return
    }

    upsertMutation.mutate(
      {
        tanggal,
        keterangan: keterangan.trim(),
        isLiburKuliah,
      },
      {
        onSuccess: (nCancelled) => {
          let msg = 'Hari libur berhasil disimpan.'
          if (isLiburKuliah && nCancelled > 0) {
            msg += ` ${nCancelled} sesi perkuliahan berhasil dibatalkan dan tagihan kelas pengganti telah diterbitkan.`
          }
          setSuccessMsg(msg)
          setTanggal('')
          setKeterangan('')
          setIsLiburKuliah(false)
          setPreviewData(null)
        },
        onError: (err) => setErrorMsg(err.message),
      }
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{copy.admin.holidays.title}</h1>
        <p className="text-sm text-neutral-600 mt-1">{copy.admin.holidays.subtitle}</p>
      </div>

      <Card className="max-w-xl space-y-4">
        <h2 className="font-bold text-base text-neutral-900">{copy.admin.holidays.newHoliday}</h2>
        <p className="text-xs text-neutral-500">
          Tanggal merah nasional biasa tidak membatalkan perkuliahan secara otomatis. Centang opsi <strong>Libur Perkuliahan</strong> jika seluruh kegiatan belajar mengajar ditiadakan.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              type="date"
              label="Tanggal"
              value={tanggal}
              onChange={(e) => handleTanggalChange(e.target.value)}
              required
            />
            <Input
              type="text"
              label="Keterangan"
              placeholder="Contoh: Hari Raya Idul Fitri"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              required
            />
          </div>

          <div className="p-3 bg-neutral-50 border border-neutral-200 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isLiburKuliah}
                onChange={(e) => handleLiburKuliahToggle(e.target.checked)}
                className="mt-0.5 rounded border-neutral-300"
              />
              <div>
                <span className="text-sm font-semibold text-neutral-900">
                  Libur Perkuliahan (Batalkan Sesi Kuliah)
                </span>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Jika dicentang, semua sesi kuliah yang belum mulai pada tanggal ini akan otomatis dibatalkan dan sistem akan menerbitkan tagihan kelas pengganti untuk dosen pengampu.
                </p>
              </div>
            </label>

            {/* Pratinjau Dampak */}
            {isLiburKuliah && previewMutation.isPending && (
              <p className="text-xs text-neutral-500 italic pt-1">Memeriksa dampak sesi pada tanggal ini...</p>
            )}

            {isLiburKuliah && previewData && (
              <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-bold">Pratinjau Dampak:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>
                    <strong className="text-red-700">{previewData.akan_dibatalkan} sesi</strong> akan otomatis dibatalkan & diterbitkan tagihan pengganti.
                  </li>
                  <li>
                    <span>{previewData.sudah_berlangsung} sesi</span> sudah berlangsung (tidak terpengaruh).
                  </li>
                </ul>
              </div>
            )}
          </div>

          {errorMsg && <p className="text-sm text-red-600 font-medium">{errorMsg}</p>}
          {successMsg && <p className="text-sm text-emerald-700 font-medium">{successMsg}</p>}

          <Button type="submit" loading={upsertMutation.isPending}>
            Simpan Hari Libur
          </Button>
        </form>
      </Card>

      {/* Tabel Libur */}
      <div className="border border-neutral-200 bg-white overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-700 text-xs uppercase tracking-wider">
              <th className="p-3.5 font-bold">Tanggal</th>
              <th className="p-3.5 font-bold">Keterangan</th>
              <th className="p-3.5 font-bold">Status Kuliah</th>
              <th className="p-3.5 font-bold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-150">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-neutral-500">
                  Memuat data libur...
                </td>
              </tr>
            ) : !holidays || holidays.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-neutral-500">
                  Belum ada data hari libur.
                </td>
              </tr>
            ) : (
              holidays.map((h) => (
                <tr key={h.id} className="hover:bg-neutral-50/60 transition-colors">
                  <td className="p-3.5 font-mono text-xs font-semibold text-neutral-900">
                    {h.tanggal}
                  </td>
                  <td className="p-3.5 font-medium text-neutral-900">{h.keterangan}</td>
                  <td className="p-3.5">
                    {h.is_libur_kuliah ? (
                      <Badge variant="danger" size="sm">
                        Libur Kuliah (Dibatalkan)
                      </Badge>
                    ) : (
                      <Badge variant="outline" size="sm">
                        Tanggal Merah Saja
                      </Badge>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Hapus tanggal libur ${h.tanggal} (${h.keterangan})? Sesi yang sudah terlanjur dibatalkan tidak akan dipulihkan otomatis.`)) {
                          deleteMutation.mutate(h.tanggal)
                        }
                      }}
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
  )
}