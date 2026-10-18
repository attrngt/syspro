import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from '../../features/auth/useSession'

export function RequireAuth() {
  const { session, loading } = useSession()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-neutral-600">
        Memuat sesi...
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}