import { Navigate, Outlet } from 'react-router-dom'
import { useSession, getHomeRouteByRole } from '../../features/auth/useSession'
import type { ReactNode } from 'react'

export function GuestOnly({ children }: { children?: ReactNode }) {
  const { session, profile, loading } = useSession()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-neutral-600">
        Memuat...
      </div>
    )
  }

  if (session && profile) {
    return <Navigate to={getHomeRouteByRole(profile.role)} replace />
  }

  return children ? <>{children}</> : <Outlet />
}
