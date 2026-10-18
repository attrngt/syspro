import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '../features/auth/useSession'
import { copy } from '../lib/copy'

export function AppShell() {
  const { profile, signOut } = useSession()
  const location = useLocation()
  const navigate = useNavigate()

  const basePath = profile?.role === 'dosen' ? '/dosen' : '/mahasiswa'

  const navItems = [
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
    <div className="min-h-screen bg-white text-neutral-900 pb-20">
      <header className="border-b border-neutral-900 px-4 py-3 flex items-center justify-between max-w-md mx-auto">
        <div>
          <span className="font-bold text-base">{copy.app.nama}</span>
          <span className="text-xs text-neutral-600 ml-2 capitalize">({profile?.role})</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-neutral-800 truncate max-w-[120px]">
            {profile?.nama}
          </span>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="min-h-9 px-2.5 border border-neutral-900 text-xs font-medium hover:bg-neutral-100"
          >
            Keluar
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-neutral-900 z-10">
        <div className="max-w-md mx-auto grid grid-cols-4">
          {navItems.map((item) => {
            const active = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`min-h-12 flex items-center justify-center text-xs font-medium transition-colors ${
                  active ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}