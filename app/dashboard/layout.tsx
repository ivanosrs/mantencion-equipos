'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Menu, LogOut, QrCode, Wrench, Users } from 'lucide-react';
import { APP_VERSION } from '@/lib/version';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

interface UserInfo {
  email: string;
  fullName: string;
  role: 'admin' | 'technician';
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function roleLabel(role: string) {
  return role === 'admin' ? 'Administrador' : 'Técnico';
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [remainingSeconds, setRemainingSeconds] = useState(INACTIVITY_TIMEOUT_MS / 1000);
  const router = useRouter();
  const supabase = createClient();
  const isAdmin = userInfo?.role === 'admin';

  useEffect(() => {
    async function checkAuth() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single();

        setUserInfo({
          email: user.email || '',
          fullName: profile?.full_name || '',
          role: profile?.role === 'admin' ? 'admin' : 'technician',
        });
        setLoading(false);
      } catch (error) {
        router.push('/login');
      }
    }

    checkAuth();
  }, [router, supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const handleLogoutRef = useRef(handleLogout);
  handleLogoutRef.current = handleLogout;

  useEffect(() => {
    const deadlineRef = { current: Date.now() + INACTIVITY_TIMEOUT_MS };

    const resetDeadline = () => {
      deadlineRef.current = Date.now() + INACTIVITY_TIMEOUT_MS;
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach((event) => window.addEventListener(event, resetDeadline));
    resetDeadline();

    const interval = setInterval(() => {
      const secondsLeft = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
      setRemainingSeconds(secondsLeft);

      if (secondsLeft <= 0) {
        handleLogoutRef.current();
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      activityEvents.forEach((event) => window.removeEventListener(event, resetDeadline));
    };
  }, []);

  if (loading || !userInfo) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="flex h-dvh bg-slate-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex flex-col h-full">
          <h1 className="text-xl font-bold mb-8">Mantenciones</h1>

          <nav className="flex-1 space-y-2">
            <Link
              href="/dashboard"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-800 transition"
            >
              <Wrench className="w-5 h-5" />
              Equipos
            </Link>
            <Link
              href="/dashboard/scan"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-800 transition"
            >
              <QrCode className="w-5 h-5" />
              Escanear QR
            </Link>
            {isAdmin && (
              <Link
                href="/dashboard/users"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-800 transition"
              >
                <Users className="w-5 h-5" />
                Usuarios
              </Link>
            )}
          </nav>

          {/* Current user */}
          <div className="px-4 py-3 mb-2 border-t border-slate-800">
            <p className="text-sm font-medium text-white truncate">
              {userInfo.fullName || userInfo.email}
            </p>
            <p className="text-xs text-slate-400 truncate">{userInfo.email}</p>
            <p className="text-xs text-slate-500 mt-1">{roleLabel(userInfo.role)}</p>
          </div>

          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Salir
          </Button>

          <p className="text-xs text-slate-600 text-center mt-4">v{APP_VERSION}</p>
        </div>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 overflow-auto min-h-0">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-4 lg:px-6 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3 text-right">
            <div>
              <p className="text-sm font-medium text-slate-900">
                {userInfo.fullName || userInfo.email}
              </p>
              <p className="text-xs text-slate-500">{roleLabel(userInfo.role)}</p>
            </div>
            <div className="text-xs text-slate-400 border-l border-slate-200 pl-3">
              Sesión expira en<br />
              <span className="font-mono">{formatCountdown(remainingSeconds)}</span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
