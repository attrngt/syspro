import { Link } from 'react-router-dom'
import { useNotifications, useMarkNotificationRead } from './usePushSubscription'
import { formatDateWib, formatTimeWib } from '../../lib/time'

export function NotificationListPage() {
  const { data: notifications, isLoading } = useNotifications()
  const markReadMutation = useMarkNotificationRead()

  return (
    <div className="space-y-4">
      <div className="border-b border-neutral-900 pb-3">
        <h1 className="text-lg font-bold">Notifikasi</h1>
      </div>

      {isLoading ? (
        <p className="text-sm text-neutral-600">Memuat notifikasi...</p>
      ) : !notifications || notifications.length === 0 ? (
        <div className="border border-neutral-200 p-6 text-center text-sm text-neutral-600">
          Belum ada notifikasi.
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => {
            const isUnread = !n.read_at
            return (
              <li
                key={n.id}
                className={`border p-4 space-y-2 ${
                  isUnread ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-sm flex items-center gap-2">
                    {isUnread && (
                      <span
                        className="inline-block w-2 h-2 bg-status-online rounded-full"
                        title="Belum dibaca"
                      />
                    )}
                    <span>{n.judul}</span>
                  </div>
                  <span className="text-xs font-mono text-neutral-500">
                    {formatDateWib(n.created_at)} {formatTimeWib(n.created_at)}
                  </span>
                </div>

                <p className="text-sm text-neutral-800">{n.isi}</p>

                <div className="flex items-center gap-4 pt-1">
                  {n.aksi_url && (
                    <Link
                      to={n.aksi_url}
                      onClick={() => {
                        if (isUnread) markReadMutation.mutate(n.id)
                      }}
                      className="text-xs font-bold underline text-neutral-900 py-1"
                    >
                      Buka Sesi →
                    </Link>
                  )}
                  {isUnread && (
                    <button
                      type="button"
                      onClick={() => markReadMutation.mutate(n.id)}
                      className="text-xs text-neutral-600 underline py-1"
                    >
                      Tandai dibaca
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}