import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'

import { Suspense, lazy } from 'react'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Siswa = lazy(() => import('./pages/Siswa'))
const BuatRapor = lazy(() => import('./pages/BuatRapor'))
const InputRapor = lazy(() => import('./pages/InputRapor'))
const Kepatuhan = lazy(() => import('./pages/Kepatuhan'))
const CetakRapor = lazy(() => import('./pages/CetakRapor'))
const KelolaUser = lazy(() => import('./pages/KelolaUser'))
const GantiPassword = lazy(() => import('./pages/GantiPassword'))
const ManajemenStatus = lazy(() => import('./pages/ManajemenStatus'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
})

function RoleGuard({ allowedRoles, children }) {
  const { role, loading, user, initialized } = useAuth()
  const location = useLocation()

  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (!role) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!allowedRoles.includes(role)) {
    if (location.pathname === '/') {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
          <div className="text-center">
            <p className="font-semibold">Anda tidak memiliki akses ke halaman ini.</p>
          </div>
        </div>
      )
    }
    return <Navigate to="/" replace />
  }

  return children
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin" /></div>}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />

                {/* Admin only */}
                <Route path="siswa" element={<RoleGuard allowedRoles={['admin']}><Siswa /></RoleGuard>} />
                <Route path="buat-rapor" element={<RoleGuard allowedRoles={['admin']}><BuatRapor /></RoleGuard>} />
                <Route path="cetak-rapor" element={<RoleGuard allowedRoles={['admin']}><CetakRapor /></RoleGuard>} />
                <Route path="kelola-user" element={<RoleGuard allowedRoles={['admin']}><KelolaUser /></RoleGuard>} />
                <Route path="manajemen-status" element={<RoleGuard allowedRoles={['admin']}><ManajemenStatus /></RoleGuard>} />

                {/* Teachers + Admin */}
                <Route path="input-rapor" element={<RoleGuard allowedRoles={['admin', 'guru_mapel', 'wali_kelas']}><InputRapor /></RoleGuard>} />
                <Route path="kepatuhan" element={<RoleGuard allowedRoles={['admin', 'wali_kelas']}><Kepatuhan /></RoleGuard>} />

                {/* All authenticated users */}
                <Route path="ganti-password" element={<RoleGuard allowedRoles={['admin', 'guru_mapel', 'wali_kelas']}><GantiPassword /></RoleGuard>} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}