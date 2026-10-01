import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import { ToastProvider, Toaster } from '@/components/ui/toast';
import { SessionKeeper } from '@/components/session-keeper';
import './globals.css';

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Gestión de Mantenciones',
  description: 'Sistema de gestión y seguimiento de mantenciones de equipos',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans antialiased">
        <ToastProvider>
          <SessionKeeper />
          {children}
          <Toaster />
        </ToastProvider>
      </body>
    </html>
  );
}
