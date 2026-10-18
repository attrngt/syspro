import { Link } from 'react-router-dom'
import { useAdminStats } from './useAdminStats'
import { ModeBadge, type SessionMode, type SessionStatus } from '../../components/ui/Badge'
import { formatDateWib, formatTimeWib } from '../../lib/time'

export function AdminHomePage() {
  const { data: stats, isLoading } = useAdminStats()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Ringkasan Sistem</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Pantau status perkuliahan dan konfirmasi hari ini.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border border-neutral-900 bg-white p-6">
          <div className="text-sm text-neutral-600">Sesi Hari Ini</div>
          <div className="text-3xl font-bold mt-2">{isLoading ? '...' : stats?.hariIni}</div>
        </div>
        <div className="border border-neutral-900 bg-white p-6">
          <div className="text-sm text-neutral-600">Sesi Menunggu Konfirmasi</div>
          <div className="text-3xl font-bold mt-2 text-amber-600">
            {isLoading ? '...' : stats?.menunggu}
          </div>
        </div>
        <div className="border border-neutral-900 bg-white p-6">
          <div className="text-sm text-neutral-600">Sesi Default Offline</div>
          <div className="text-3xl font-bold mt-2 text-emerald-600">
            {isLoading ? '...' : stats?.defaultOffline}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Sesi yang Perlu Perhatian</h2>
          <Link to="/admin/sesi" className="text-xs font-bold underline">
            Lihat Semua Sesi →
          </Link>
        </div>

        <div className="border border-neutral-900 bg-white">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-900 bg-neutral-100">
                <th className="p-3 font-bold">Tanggal & Jam (WIB)</th>
                <th className="p-3 font-bold">Mata Kuliah & Kelas</th>
                <th className="p-3 font-bold">Dosen</th>
                <th className="p-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="p-4 text-neutral-600">Memuat data...</td>
                </tr>
              ) : !stats?.perluPerhatian || stats.perluPerhatian.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-neutral-600">
                    Semua sesi sudah terkonfirmasi.
                  </td>
                </tr>
              ) : (
                stats.perluPerhatian.map((s) => (
                  <tr key={s.id} className="border-b border-neutral-200">
                    <td className="p-3">
                      <div className="font-medium">{formatDateWib(s.tanggal)}</div>
                      <div className="text-xs font-mono text-neutral-600">
                        {formatTimeWib(s.mulai_at)} – {formatTimeWib(s.selesai_at)}
                      </div>
                    </td>
                    <td className="p-3">
                      {s.classes?.courses?.kode} - {s.classes?.courses?.nama} (Kelas{' '}
                      {s.classes?.nama_kelas})
                    </td>
                    <td className="p-3">{s.classes?.profiles?.nama}</td>
                    <td className="p-3">
                      <ModeBadge
                        mode={s.mode as SessionMode}
                        status={s.status as SessionStatus}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}