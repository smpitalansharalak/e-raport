import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import RoleGuard from './guards/RoleGuard'

const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const StudentsPage = lazy(() => import('@/features/students/StudentsPage'))
const AssessmentFormatsPage = lazy(() => import('@/features/assessment-formats/AssessmentFormatsPage'))
const PredicatesPage = lazy(() => import('@/features/predicates/PredicatesPage'))
const ReportConfigPage = lazy(() => import('@/features/report-config/ReportConfigPage'))
const InputRaporPage = lazy(() => import('@/features/input-rapor/InputRaporPage'))
const KepatuhanPage = lazy(() => import('@/features/kepatuhan/KepatuhanPage'))
const CetakRaporPage = lazy(() => import('@/features/cetak-rapor/CetakRaporPage'))
const UsersPage = lazy(() => import('@/features/users/UsersPage'))
const ChangePasswordPage = lazy(() => import('@/features/auth/ChangePasswordPage'))
const StudentStatusPage = lazy(() => import('@/features/student-status/StudentStatusPage'))

function RouteFallback() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  )
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />

          {/* Admin only */}
          <Route path="siswa" element={<RoleGuard allowedRoles={['admin']}><StudentsPage /></RoleGuard>} />
          <Route path="buat-rapor" element={<RoleGuard allowedRoles={['admin']}><ReportConfigPage /></RoleGuard>} />
          <Route path="format-penilaian" element={<RoleGuard allowedRoles={['admin']}><AssessmentFormatsPage /></RoleGuard>} />
          <Route path="predikat" element={<RoleGuard allowedRoles={['admin']}><PredicatesPage /></RoleGuard>} />
          <Route path="cetak-rapor" element={<RoleGuard allowedRoles={['admin']}><CetakRaporPage /></RoleGuard>} />
          <Route path="kelola-user" element={<RoleGuard allowedRoles={['admin']}><UsersPage /></RoleGuard>} />
          <Route path="manajemen-status" element={<RoleGuard allowedRoles={['admin']}><StudentStatusPage /></RoleGuard>} />

          {/* Teachers + Admin */}
          <Route path="input-rapor" element={<RoleGuard allowedRoles={['admin', 'guru_mapel', 'wali_kelas']}><InputRaporPage /></RoleGuard>} />
          <Route path="kepatuhan" element={<RoleGuard allowedRoles={['admin', 'wali_kelas']}><KepatuhanPage /></RoleGuard>} />

          {/* All authenticated users */}
          <Route path="ganti-password" element={<RoleGuard allowedRoles={['admin', 'guru_mapel', 'wali_kelas']}><ChangePasswordPage /></RoleGuard>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
