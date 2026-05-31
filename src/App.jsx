import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Siswa from './pages/Siswa'
import BuatRapor from './pages/BuatRapor'
import InputRapor from './pages/InputRapor'
import Kepatuhan from './pages/Kepatuhan'
import CetakRapor from './pages/CetakRapor'
import KelolaUser from './pages/KelolaUser'
import GantiPassword from './pages/GantiPassword'

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
})

function RoleGuard({ allowedRoles, children }) {
  const { role, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }
  if (!role || !allowedRoles.includes(role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />

              {/* Admin only */}
              <Route path="siswa" element={<RoleGuard allowedRoles={['admin']}><Siswa /></RoleGuard>} />
              <Route path="buat-rapor" element={<RoleGuard allowedRoles={['admin']}><BuatRapor /></RoleGuard>} />
              <Route path="cetak-rapor" element={<RoleGuard allowedRoles={['admin']}><CetakRapor /></RoleGuard>} />
              <Route path="kelola-user" element={<RoleGuard allowedRoles={['admin']}><KelolaUser /></RoleGuard>} />

              {/* Teachers + Admin */}
              <Route path="input-rapor" element={<RoleGuard allowedRoles={['admin', 'guru_mapel', 'wali_kelas']}><InputRapor /></RoleGuard>} />
              <Route path="kepatuhan" element={<RoleGuard allowedRoles={['admin', 'wali_kelas']}><Kepatuhan /></RoleGuard>} />

              {/* All authenticated users */}
              <Route path="ganti-password" element={<RoleGuard allowedRoles={['admin', 'guru_mapel', 'wali_kelas']}><GantiPassword /></RoleGuard>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
