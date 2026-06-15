import React, { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Header from './Header'
import Sidebar from './Sidebar'

export default function Layout() {
  const { user, loading, initialized, sidebarOpen, setSidebarOpen, signOut } = useAuth()

  useEffect(() => {
    if (!user) return;

    let inactivityTimer;

    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      // 3 hours in milliseconds: 3 * 60 * 60 * 1000 = 10800000
      inactivityTimer = setTimeout(() => {
        signOut();
      }, 10800000);
    };

    // Initialize the timer
    resetTimer();

    // Event listeners for user activity (removed mousemove and scroll for performance)
    const events = ['keydown', 'click'];
    const handleActivity = () => resetTimer();

    events.forEach(event => window.addEventListener(event, handleActivity));

    // Cleanup function
    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [user, signOut]);

  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="relative w-16 h-16">
          {/* Outer Ring */}
          <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
          {/* Rotating emerald sector */}
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
        </div>
        <p className="mt-4 text-slate-400 text-sm font-medium animate-pulse">
          Memuat data sistem...
        </p>
      </div>
    )
  }

  // Redirect to login if not logged in
  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 relative">
        {/* Mobile Backdrop Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 top-16 bg-black/40 backdrop-blur-sm z-20 lg:hidden transition-all duration-300"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <Sidebar />
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 md:p-8 bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
