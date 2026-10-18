import { useState, useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '../features/auth/useSession'
import { copy } from '../lib/copy'

export function AppShell() {
  const { profile, signOut } = useSession()
  const location = useLocation()
  const navigate = useNavigate()

  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
    }
    function handleOffline() {
      setIsOnline(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const isDosen = profile?.role === 'dosen'
  const basePath = isDosen ? '/dosen' : '/mahasiswa'

  const navItems = isDosen
    ? [
        { label: 'Hari Ini', path: basePath },
        { label: 'Jadwal', path: `${basePath}/jadwal` },
        { label: 'Tagihan', path: `${basePath}/tagihan` },
        { label: 'Notifikasi', path: `${basePath}/notifikasi` },
        { label: 'Profil', path: '/profil' },
      ]
    : [
        { label: 'Hari Ini', path: basePath },
        { label: 'Jadwal', path: `${basePath}/jadwal` },
        { label: 'Notifikasi', path: `${basePath}/notifikasi` },
        { label: 'Profil', path: '/profil' },
      ]

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-neutral-50/50 text-neutral-900 pb-20">
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-neutral-950 px-4 py-2 text-center text-xs font-semibold sticky top-0 z-50 shadow-sm">
          {copy.offline.offlineBanner}
        </div>
      )}

      <header className="bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between max-w-md mx-auto sticky top-0 z-20">
        <div>
          <span className="font-bold text-base tracking-tight text-neutral-900">{copy.app.nama}</span>
          <span className="text-xs text-neutral-500 ml-2 capitalize font-medium">({profile?.role})</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-neutral-800 truncate max-w-[120px]">
            {profile?.nama}
          </span>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="min-h-9 px-2.5 border border-neutral-300 rounded text-xs font-medium hover:bg-neutral-100 transition-colors"
          >
            Keluar
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-neutral-200 z-30 shadow-lg">
        <div className={`max-w-md mx-auto grid ${isDosen ? 'grid-cols-5' : 'grid-cols-4'}`}>
          {navItems.map((item) => {
            const active = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`min-h-12 flex flex-col items-center justify-center text-xs font-medium transition-colors ${
                  active
                    ? 'text-neutral-950 font-bold border-t-2 border-neutral-950 bg-neutral-50'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}