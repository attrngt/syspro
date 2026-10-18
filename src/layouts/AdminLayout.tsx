import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useSession } from '../features/auth/useSession'
import { copy } from '../lib/copy'

const navItems = [
  { label: 'Ringkasan', path: '/admin' },
  { label: 'Semester', path: '/admin/semester' },
  { label: 'Mata Kuliah', path: '/admin/mata-kuliah' },
  { label: 'Kelas & Jadwal', path: '/admin/kelas' },
  { label: 'Anggota', path: '/admin/anggota' },
  { label: 'Libur', path: '/admin/libur' },
  { label: 'Pantau Sesi', path: '/admin/sesi' },
  { label: 'Log Admin', path: '/admin/log' },
]

export function AdminLayout() {
  const { profile, signOut } = useSession()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleSignOut() {
    await signOut()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen flex bg-neutral-50 text-neutral-900">
      <aside className="w-64 bg-white border-r border-neutral-900 flex flex-col">
        <div className="p-6 border-b border-neutral-900">
          <h1 className="font-bold text-lg">{copy.app.nama} Admin</h1>
          <p className="text-xs text-neutral-600 mt-1">Masuk sebagai: {profile?.nama}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`block min-h-11 px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'bg-neutral-900 text-white' : 'text-neutral-800 hover:bg-neutral-100'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-neutral-200">
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="w-full min-h-11 px-3 border border-neutral-900 text-sm font-medium hover:bg-neutral-100"
          >
            Keluar
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}