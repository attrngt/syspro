import { Navigate, Outlet } from 'react-router-dom'
import { useSession, getHomeRouteByRole, type UserRole } from '../../features/auth/useSession'

export function RequireRole({ role }: { role: UserRole }) {
  const { profile, loading } = useSession()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-neutral-600">
        Memeriksa akses...
      </div>
    )
  }

  if (!profile) {
    return <Navigate to="/login" replace />
  }

  if (profile.role !== role) {
    return <Navigate to={getHomeRouteByRole(profile.role)} replace />
  }

  return <Outlet />
}