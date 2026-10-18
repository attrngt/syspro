import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { RequireAuth } from './guards/RequireAuth'
import { RequireRole } from './guards/RequireRole'
import { GuestOnly } from './guards/GuestOnly'
import { LoginPage } from '../features/auth/LoginPage'
import { ActivatePage } from '../features/auth/ActivatePage'
import { AdminLoginPage } from '../features/auth/AdminLoginPage'
import { AdminLayout } from '../layouts/AdminLayout'
import { AppShell } from '../layouts/AppShell'
import { AdminHomePage } from '../features/admin/AdminHomePage'
import { SemestersPage } from '../features/admin/semesters/SemestersPage'
import { CohortsPage } from '../features/admin/cohorts/CohortsPage'
import { CoursesPage } from '../features/admin/courses/CoursesPage'
import { ClassesPage } from '../features/admin/classes/ClassesPage'
import { MembersPage } from '../features/admin/members/MembersPage'
import { HolidaysPage } from '../features/admin/holidays/HolidaysPage'
import { SessionsAdminPage } from '../features/admin/sessions/SessionsAdminPage'
import { AdminTagihanPage } from '../features/admin/tagihan/AdminTagihanPage'
import { AdminLogsPage } from '../features/admin/logs/AdminLogsPage'
import { LecturerHomePage } from '../features/lecturer/LecturerHomePage'
import { LecturerSchedulePage } from '../features/lecturer/LecturerSchedulePage'
import { SessionConfirmPage } from '../features/lecturer/SessionConfirmPage'
import { LecturerTagihanPage } from '../features/lecturer/LecturerTagihanPage'
import { StudentHomePage } from '../features/student/StudentHomePage'
import { StudentSchedulePage } from '../features/student/StudentSchedulePage'
import { StudentSessionPage } from '../features/student/StudentSessionPage'
import { NotificationListPage } from '../features/notifications/NotificationListPage'
import { ProfilePage } from '../features/profile/ProfilePage'
import { useSession, getHomeRouteByRole } from '../features/auth/useSession'
import { ReloadPrompt } from '../components/pwa/ReloadPrompt'

function RootRedirect() {
  const { profile, loading } = useSession()
  if (loading) return null
  if (!profile) return <Navigate to="/login" replace />
  return <Navigate to={getHomeRouteByRole(profile.role)} replace />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <ReloadPrompt />
      <Routes>
        {/* Rute Publik Terlindungi Tamu (GuestOnly) */}
        <Route
          path="/login"
          element={
            <GuestOnly>
              <LoginPage />
            </GuestOnly>
          }
        />
        <Route
          path="/aktivasi"
          element={
            <GuestOnly>
              <ActivatePage />
            </GuestOnly>
          }
        />
        <Route
          path="/admin/login"
          element={
            <GuestOnly>
              <AdminLoginPage />
            </GuestOnly>
          }
        />

        {/* Rute Terlindungi (Semua Pengguna Terotentikasi) */}
        <Route element={<RequireAuth />}>
          <Route path="/" element={<RootRedirect />} />

          {/* Rute Bersama Profil di dalam AppShell */}
          <Route element={<AppShell />}>
            <Route path="/profil" element={<ProfilePage />} />
          </Route>

          {/* Rute Dosen */}
          <Route element={<RequireRole role="dosen" />}>
            <Route path="/dosen" element={<AppShell />}>
              <Route index element={<LecturerHomePage />} />
              <Route path="jadwal" element={<LecturerSchedulePage />} />
              <Route path="sesi/:id" element={<SessionConfirmPage />} />
              <Route path="tagihan" element={<LecturerTagihanPage />} />
              <Route path="notifikasi" element={<NotificationListPage />} />
            </Route>
          </Route>

          {/* Rute Mahasiswa */}
          <Route element={<RequireRole role="mahasiswa" />}>
            <Route path="/mahasiswa" element={<AppShell />}>
              <Route index element={<StudentHomePage />} />
              <Route path="jadwal" element={<StudentSchedulePage />} />
              <Route path="sesi/:id" element={<StudentSessionPage />} />
              <Route path="notifikasi" element={<NotificationListPage />} />
            </Route>
          </Route>

          {/* Rute Admin */}
          <Route element={<RequireRole role="admin" />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminHomePage />} />
              <Route path="semester" element={<SemestersPage />} />
              <Route path="angkatan" element={<CohortsPage />} />
              <Route path="mata-kuliah" element={<CoursesPage />} />
              <Route path="kelas" element={<ClassesPage />} />
              <Route path="anggota" element={<MembersPage />} />
              <Route path="libur" element={<HolidaysPage />} />
              <Route path="sesi" element={<SessionsAdminPage />} />
              <Route path="tagihan" element={<AdminTagihanPage />} />
              <Route path="log" element={<AdminLogsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}