import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useSession } from '../features/auth/useSession'
import { copy } from '../lib/copy'

const navItems = [
  { label: 'Ringkasan', path: '/admin' },
  { label: 'Semester', path: '/admin/semester' },
  { label: 'Angkatan & Kelompok', path: '/admin/angkatan' },
  { label: 'Mata Kuliah', path: '/admin/mata-kuliah' },
  { label: 'Kelas & Jadwal', path: '/admin/kelas' },
  { label: 'Anggota', path: '/admin/anggota' },
  { label: 'Hari Libur', path: '/admin/libur' },
  { label: 'Pantau Sesi', path: '/admin/sesi' },
  { label: 'Tagihan Pengganti', path: '/admin/tagihan' },
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
    <div className="min-h-screen flex bg-neutral-100 text-neutral-900">
      <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col shadow-sm">
        <div className="p-6 border-b border-neutral-200">
          <h1 className="font-bold text-lg tracking-tight text-neutral-900">{copy.app.nama} Admin</h1>
          <p className="text-xs text-neutral-500 mt-1 truncate">Masuk sebagai: {profile?.nama}</p>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`block min-h-10 px-3 py-2 text-sm font-medium rounded transition-colors ${
                  active
                    ? 'bg-neutral-900 text-white font-semibold shadow-sm'
                    : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
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
            className="w-full min-h-10 px-3 border border-neutral-300 rounded text-sm font-medium hover:bg-neutral-100 text-neutral-700 transition-colors"
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