'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useIsTouchDevice } from '@/lib/use-touch-device';

const QrScanner = dynamic(() => import('@/components/qr/QrScanner').then(mod => ({ default: mod.QrScanner })), {
  loading: () => <div className="h-96 flex items-center justify-center">Cargando cámara...</div>,
  ssr: false,
});

export default function ScanPage() {
  const isTouchDevice = useIsTouchDevice();
  const router = useRouter();

  // El escaneo solo esta disponible en telefonos y tablets.
  useEffect(() => {
    if (!window.matchMedia('(pointer: coarse)').matches) {
      router.replace('/dashboard');
    }
  }, [router]);

  if (!isTouchDevice) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Escanear QR</h1>
        <p className="text-slate-600 mt-1">
          Apunta con tu cámara al código QR del equipo para acceder a su detalle
        </p>
      </div>

      <QrScanner />
    </div>
  );
}
