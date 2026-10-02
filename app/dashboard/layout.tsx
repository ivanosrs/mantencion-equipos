'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Menu, LogOut, QrCode, Wrench, Users } from 'lucide-react';
import { APP_VERSION } from '@/lib/version';
import { useIsTouchDevice } from '@/lib/use-touch-device';
import {
  checkAndLogout,
  clearSession,
  getSessionData,
  isSessionExpired,
  stopSessionListeners,
} from '@/lib/session';

const IDLE_MS = 30 * 60 * 1000;

interface UserInfo {
  email: string;
  fullName: string;
  role: 'admin' | 'technician';
}

function formatCountdown(totalMs: number) {
  const totalSeconds = Math.max(0, Math.ceil(totalMs / 1000));
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
  const [remainingMs, setRemainingMs] = useState(IDLE_MS);
  const router = useRouter();
  const supabase = createClient();
  const isAdmin = userInfo?.role === 'admin';
  const isTouchDevice = useIsTouchDevice();
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          clearSession();
          stopSessionListeners();
          await supabase.auth.signOut().catch(() => undefined);
          router.push('/login');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, role, is_active')
          .eq('id', user.id)
          .single();

        // Baja logica: cerrar la sesion y expulsar al dashboard.
        if (profile?.is_active === false) {
          clearSession();
          stopSessionListeners();
          await supabase.auth.signOut();
          router.push('/login?error=inactivo');
          return;
        }

        setUserInfo({
          email: user.email || '',
          fullName: profile?.full_name || '',
          role: profile?.role === 'admin' ? 'admin' : 'technician',
        });

        setLoading(false);
      } catch {
        clearSession();
        stopSessionListeners();
        router.push('/login');
      }
    }

    checkAuth();

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [router, supabase]);

  const handleLogout = useCallback(async () => {
    clearSession();
    stopSessionListeners();
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    await supabase.auth.signOut();
    router.push('/login');
  }, [router, supabase]);

  const handleLogoutRef = useRef(handleLogout);

  useEffect(() => {
    handleLogoutRef.current = handleLogout;
  }, [handleLogout]);

  // Contador absoluto basado en effectiveExpiresAt
  useEffect(() => {
    if (loading) return;
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    countdownIntervalRef.current = setInterval(() => {
      const data = getSessionData();
      // SessionKeeper aún no inicializó la metadata: no forzar logout.
      if (!data || data.effectiveExpiresAt == null) return;
      const rem = Math.max(0, data.effectiveExpiresAt - Date.now());
      setRemainingMs(rem);
      if (rem <= 0 || data.isExpired || isSessionExpired()) {
        void checkAndLogout();
      }
    }, 1000);
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [loading]);

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
            {isTouchDevice && (
              <Link
                href="/dashboard/scan"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-800 transition"
              >
                <QrCode className="w-5 h-5" />
                Escanear QR
              </Link>
            )}
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

          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800 border-t border-slate-800 rounded-t-none pt-4 mt-2"
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
            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg cursor-pointer"
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
              <span className="font-mono">{formatCountdown(remainingMs)}</span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}