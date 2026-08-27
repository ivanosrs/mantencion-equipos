'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const QrScanner = dynamic(() => import('@/components/qr/QrScanner').then(mod => ({ default: mod.QrScanner })), {
  loading: () => <div className="h-96 flex items-center justify-center">Cargando cámara...</div>,
  ssr: false,
});

export default function ScanPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Escanear QR</h1>
        <p className="text-slate-600 mt-1">
          Apunta con tu cámara al código QR del equipo para acceder a su detalle
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lector QR</CardTitle>
          <CardDescription>Posiciona el código QR dentro del marco</CardDescription>
        </CardHeader>
        <CardContent>
          <QrScanner />
        </CardContent>
      </Card>
    </div>
  );
}
