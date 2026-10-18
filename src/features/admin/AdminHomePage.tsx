import { Link } from 'react-router-dom'
import { useAdminStats } from './useAdminStats'
import { ModeBadge, type SessionMode, type SessionStatus } from '../../components/ui/Badge'
import { formatDateWib, formatTimeWib } from '../../lib/time'
import { copy } from '../../lib/copy'
import { Card } from '../../components/ui/Card'

export function AdminHomePage() {
  const { data: stats, isLoading } = useAdminStats()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{copy.nav.admin.ringkasan}</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Pantau status perkuliahan, konfirmasi dosen, pembatalan, dan tagihan semester ini.
        </p>
      </div>

      {/* 5 Kartu Ringkasan Sesuai PRD & AGENTS.md */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-5">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            {copy.admin.stats.hariIni}
          </div>
          <div className="text-3xl font-extrabold mt-2 text-neutral-900">
            {isLoading ? '...' : stats?.hariIni}
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
            {copy.admin.stats.menunggu}
          </div>
          <div className="text-3xl font-extrabold mt-2 text-amber-600">
            {isLoading ? '...' : stats?.menunggu}
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
            {copy.admin.stats.defaultOffline}
          </div>
          <div className="text-3xl font-extrabold mt-2 text-emerald-600">
            {isLoading ? '...' : stats?.defaultOffline}
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
            {copy.admin.stats.dibatalkan}
          </div>
          <div className="text-3xl font-extrabold mt-2 text-neutral-600">
            {isLoading ? '...' : stats?.dibatalkan}
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
            {copy.admin.stats.kurangPertemuan}
          </div>
          <div className="text-3xl font-extrabold mt-2 text-rose-600">
            {isLoading ? '...' : stats?.kekuranganPertemuan}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-900">Sesi yang Perlu Perhatian</h2>
          <Link
            to="/admin/sesi"
            className="text-xs font-bold text-blue-600 hover:text-blue-800 underline"
          >
            Lihat Semua Sesi →
          </Link>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-bold text-neutral-600 uppercase tracking-wider">
                  <th className="p-3.5">Tanggal & Jam (WIB)</th>
                  <th className="p-3.5">Mata Kuliah & Kelas</th>
                  <th className="p-3.5">Dosen</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-neutral-500">
                      Memuat data...
                    </td>
                  </tr>
                ) : !stats?.perluPerhatian || stats.perluPerhatian.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-neutral-500">
                      Semua sesi sudah terkonfirmasi atau tidak ada sesi yang menunggu.
                    </td>
                  </tr>
                ) : (
                  stats.perluPerhatian.map((s) => {
                    const cls = s.classes
                    const groupTahun = cls?.student_groups?.cohorts?.tahun ?? ''
                    const groupNama = cls?.student_groups?.nama ?? ''
                    const groupLabel = `${groupTahun} ${groupNama}`.trim() || '-'
                    const nTotal = cls?.jumlah_pertemuan ?? 16

                    return (
                      <tr key={s.id} className="hover:bg-neutral-50/60 transition-colors">
                        <td className="p-3.5">
                          <div className="font-semibold text-neutral-900">
                            {formatDateWib(s.tanggal)}
                          </div>
                          <div className="text-xs font-mono text-neutral-500 mt-0.5">
                            {formatTimeWib(s.mulai_at)} – {formatTimeWib(s.selesai_at)} WIB
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-neutral-900">
                            {cls?.courses?.kode} - {cls?.courses?.nama}
                          </div>
                          <div className="text-xs text-neutral-500 mt-0.5">
                            Kelas {groupLabel} · Pertemuan {s.pertemuan_ke} dari {nTotal}
                          </div>
                        </td>
                        <td className="p-3.5 font-medium text-neutral-800">
                          {cls?.profiles?.nama ?? '-'}
                        </td>
                        <td className="p-3.5">
                          <ModeBadge
                            mode={s.mode as SessionMode}
                            status={s.status as SessionStatus}
                          />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}