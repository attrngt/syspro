import { useState } from 'react'
import { useModeChangeLogs, useSystemAdminLogs } from './useAdminLogs'
import { formatDateWib, formatTimeWib } from '../../../lib/time'

export function AdminLogsPage() {
  const [tab, setTab] = useState<'mode' | 'admin'>('mode')
  const { data: modeLogs, isLoading: loadingMode } = useModeChangeLogs()
  const { data: adminLogs, isLoading: loadingAdmin } = useSystemAdminLogs()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Log Audit & Riwayat</h1>
          <p className="text-sm text-neutral-600 mt-1">
            Catatan permanen seluruh perubahan mode kuliah dan aksi admin.
          </p>
        </div>

        <div className="flex border border-neutral-900 bg-white">
          <button
            type="button"
            onClick={() => setTab('mode')}
            className={`min-h-11 px-4 text-xs font-bold ${
              tab === 'mode' ? 'bg-neutral-900 text-white' : 'text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            Riwayat Perubahan Mode
          </button>
          <button
            type="button"
            onClick={() => setTab('admin')}
            className={`min-h-11 px-4 text-xs font-bold ${
              tab === 'admin' ? 'bg-neutral-900 text-white' : 'text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            Log Aksi Admin
          </button>
        </div>
      </div>

      {tab === 'mode' ? (
        <div className="border border-neutral-900 bg-white">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-900 bg-neutral-100">
                <th className="p-3 font-bold">Waktu (WIB)</th>
                <th className="p-3 font-bold">Mata Kuliah & Kelas</th>
                <th className="p-3 font-bold">Perubahan Mode</th>
                <th className="p-3 font-bold">Aktor & Sumber</th>
              </tr>
            </thead>
            <tbody>
              {loadingMode ? (
                <tr>
                  <td colSpan={4} className="p-4 text-neutral-600">Memuat riwayat mode...</td>
                </tr>
              ) : !modeLogs || modeLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-neutral-600">Belum ada riwayat perubahan mode.</td>
                </tr>
              ) : (
                modeLogs.map((log) => (
                  <tr key={log.id} className="border-b border-neutral-200">
                    <td className="p-3 font-mono text-xs">
                      {formatDateWib(log.created_at)} · {formatTimeWib(log.created_at)}
                    </td>
                    <td className="p-3">
                      <div className="font-medium">
                        {log.sessions?.classes?.courses?.kode} - {log.sessions?.classes?.courses?.nama} (Kelas{' '}
                        {log.sessions?.classes?.student_groups ? `${log.sessions.classes.student_groups.cohorts?.tahun ?? ''} ${log.sessions.classes.student_groups.nama}`.trim() : '-'})
                      </div>
                      {log.sessions?.tanggal && (
                        <div className="text-xs text-neutral-500">
                          Jadwal: {formatDateWib(log.sessions.tanggal)}{' '}
                          {formatTimeWib(log.sessions.mulai_at)} WIB
                        </div>
                      )}
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {log.mode_lama ? `${log.mode_lama.toUpperCase()} → ` : 'MENUNGGU → '}
                      <span className="font-bold">{log.mode_baru.toUpperCase()}</span>
                    </td>
                    <td className="p-3">
                      <span className="font-medium">{log.profiles?.nama ?? 'Sistem Otomatis'}</span>
                      <span className="text-xs text-neutral-600 ml-1">
                        (sumber: {log.sumber})
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border border-neutral-900 bg-white">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-900 bg-neutral-100">
                <th className="p-3 font-bold">Waktu (WIB)</th>
                <th className="p-3 font-bold">Aktor</th>
                <th className="p-3 font-bold">Aksi</th>
                <th className="p-3 font-bold">Target</th>
                <th className="p-3 font-bold">Detail</th>
              </tr>
            </thead>
            <tbody>
              {loadingAdmin ? (
                <tr>
                  <td colSpan={5} className="p-4 text-neutral-600">Memuat log admin...</td>
                </tr>
              ) : !adminLogs || adminLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-neutral-600">Belum ada log aksi admin.</td>
                </tr>
              ) : (
                adminLogs.map((item) => (
                  <tr key={item.id} className="border-b border-neutral-200">
                    <td className="p-3 font-mono text-xs">
                      {formatDateWib(item.created_at)} · {formatTimeWib(item.created_at)}
                    </td>
                    <td className="p-3 font-medium">{item.profiles?.nama ?? 'Sistem'}</td>
                    <td className="p-3 font-mono text-xs">{item.aksi}</td>
                    <td className="p-3 text-xs text-neutral-600">
                      {item.target_tipe ?? '-'}
                    </td>
                    <td className="p-3 font-mono text-xs text-neutral-700">
                      {JSON.stringify(item.detail)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}