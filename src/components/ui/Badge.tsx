import { copy } from '../../lib/copy'

export type SessionMode = 'online' | 'offline' | 'tidak_ada' | null
export type SessionStatus =
  | 'menunggu'
  | 'terkonfirmasi'
  | 'default_offline'
  | 'dibatalkan'
  | 'selesai'

export interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({ children, variant = 'default', size = 'md', className = '' }: BadgeProps) {
  const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
  const variantStyles = {
    default: 'bg-neutral-900 text-white',
    secondary: 'bg-neutral-100 text-neutral-800 border border-neutral-200',
    success: 'bg-emerald-600 text-white',
    warning: 'bg-amber-500 text-white',
    danger: 'bg-rose-600 text-white',
    outline: 'border border-neutral-300 text-neutral-800 bg-white',
  }[variant]

  return (
    <span className={`inline-flex items-center font-semibold rounded ${sizeStyles} ${variantStyles} ${className}`}>
      {children}
    </span>
  )
}

interface ModeBadgeProps {
  mode?: SessionMode
  status?: SessionStatus
  className?: string
}

export function ModeBadge({ mode, status, className = '' }: ModeBadgeProps) {
  if (status === 'dibatalkan') {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded line-through bg-neutral-200 text-neutral-600 ${className}`}
      >
        {copy.status.dibatalkan}
      </span>
    )
  }

  if (status === 'default_offline') {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded border border-dashed border-status-offline text-status-offline bg-emerald-50 ${className}`}
      >
        {copy.status.default_offline}
      </span>
    )
  }

  if (mode === 'online') {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded bg-status-online text-white shadow-xs ${className}`}
      >
        {copy.status.online}
      </span>
    )
  }

  if (mode === 'offline') {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded bg-status-offline text-white shadow-xs ${className}`}
      >
        {copy.status.offline}
      </span>
    )
  }

  if (mode === 'tidak_ada') {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded bg-status-none text-white ${className}`}
      >
        {copy.status.tidak_ada}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded border border-status-waiting text-amber-700 bg-amber-50 ${className}`}
    >
      {copy.status.menunggu}
    </span>
  )
}

export type TagihanStatus = 'menunggu' | 'diajukan' | 'terjadwal' | 'kedaluwarsa' | 'dibatalkan'

export function TagihanBadge({ status, className = '' }: { status: TagihanStatus; className?: string }) {
  switch (status) {
    case 'diajukan':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded bg-amber-500 text-white shadow-xs ${className}`}
        >
          {copy.status.diajukan}
        </span>
      )
    case 'terjadwal':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded bg-status-offline text-white shadow-xs ${className}`}
        >
          {copy.status.terjadwal}
        </span>
      )
    case 'kedaluwarsa':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded bg-rose-600 text-white ${className}`}
        >
          {copy.status.kedaluwarsa}
        </span>
      )
    case 'dibatalkan':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded line-through bg-neutral-200 text-neutral-600 ${className}`}
        >
          {copy.status.dibatalkan}
        </span>
      )
    default:
      return (
        <span
          className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded border border-amber-600 text-amber-800 bg-amber-50 ${className}`}
        >
          {copy.status.menunggu}
        </span>
      )
  }
}