'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Html5QrcodeScanner } from 'html5-qrcode';

export function QrScanner() {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!scannerRef.current || !scanning) return;

    const scanner = new Html5QrcodeScanner(
      'qr-scanner',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    const onScanSuccess = (decodedText: string) => {
      // Extract equipment ID from QR code URL
      const match = decodedText.match(/equipments\/([a-f0-9-]+)/i);
      if (match) {
        const equipmentId = match[1];
        setScanning(false);
        router.push(`/dashboard/equipments/${equipmentId}`);
      }
    };

    const onScanFailure = () => {
      // Ignore scan failures - just keep scanning
    };

    try {
      scanner.render(onScanSuccess, onScanFailure);
    } catch (err: unknown) {
      setError('No se puede acceder a la cámara. Por favor, verifica los permisos.');
      setScanning(false);
    }

    return () => {
      if (scanning) {
        scanner.clear().catch(() => {});
      }
    };
  }, [scanning, router]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}
      <div
        ref={scannerRef}
        id="qr-scanner"
        className="bg-white rounded-lg overflow-hidden border-2 border-slate-200"
      />
    </div>
  );
}
