import { copy } from '../../lib/copy'

export type SessionMode = 'online' | 'offline' | 'tidak_ada' | null
export type SessionStatus = 'menunggu' | 'terkonfirmasi' | 'default_offline' | 'dibatalkan' | 'selesai'

interface ModeBadgeProps {
  mode: SessionMode
  status: SessionStatus
}

export function ModeBadge({ mode, status }: ModeBadgeProps) {
  if (status === 'dibatalkan') {
    return (
      <span className="inline-block px-2.5 py-1 text-xs font-medium bg-neutral-200 text-neutral-700">
        Dibatalkan
      </span>
    )
  }

  if (status === 'default_offline') {
    return (
      <span className="inline-block px-2.5 py-1 text-xs font-medium border border-dashed border-status-offline text-status-offline">
        {copy.mode.default_offline}
      </span>
    )
  }

  if (mode === 'online') {
    return (
      <span className="inline-block px-2.5 py-1 text-xs font-medium bg-status-online text-white">
        {copy.mode.online}
      </span>
    )
  }

  if (mode === 'offline') {
    return (
      <span className="inline-block px-2.5 py-1 text-xs font-medium bg-status-offline text-white">
        {copy.mode.offline}
      </span>
    )
  }

  if (mode === 'tidak_ada') {
    return (
      <span className="inline-block px-2.5 py-1 text-xs font-medium bg-status-none text-white">
        {copy.mode.tidak_ada}
      </span>
    )
  }

  return (
    <span className="inline-block px-2.5 py-1 text-xs font-medium border border-status-waiting text-status-waiting">
      {copy.mode.menunggu}
    </span>
  )
}