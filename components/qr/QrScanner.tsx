'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Html5QrcodeScannerStrings } from 'html5-qrcode/esm/strings';

Html5QrcodeScannerStrings.cameraPermissionTitle = () => 'Solicitar permisos de cámara';
Html5QrcodeScannerStrings.cameraPermissionRequesting = () => 'Solicitando permisos de cámara...';
Html5QrcodeScannerStrings.noCameraFound = () => 'No se encontró ninguna cámara';
Html5QrcodeScannerStrings.scanButtonStopScanningText = () => 'Detener escaneo';
Html5QrcodeScannerStrings.scanButtonStartScanningText = () => 'Iniciar escaneo';
Html5QrcodeScannerStrings.scanButtonScanningStarting = () => 'Iniciando cámara...';
Html5QrcodeScannerStrings.textIfCameraScanSelected = () => 'Escanear un archivo de imagen';
Html5QrcodeScannerStrings.textIfFileScanSelected = () => 'Escanear con la cámara';
Html5QrcodeScannerStrings.selectCamera = () => 'Seleccionar cámara';
Html5QrcodeScannerStrings.fileSelectionChooseImage = () => 'Elegir imagen';
Html5QrcodeScannerStrings.fileSelectionChooseAnother = () => 'Elegir otra';
Html5QrcodeScannerStrings.fileSelectionNoImageSelected = () => 'Ninguna imagen elegida';
Html5QrcodeScannerStrings.dragAndDropMessage = () => 'O arrastra una imagen para escanear';
Html5QrcodeScannerStrings.zoom = () => 'zoom';
Html5QrcodeScannerStrings.torchOnButton = () => 'Encender linterna';
Html5QrcodeScannerStrings.torchOffButton = () => 'Apagar linterna';

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

      // Defensive fallback: html5-qrcode's clear() can silently no-op if the
      // camera was still initializing, leaving the MediaStream active.
      const video = scannerRef.current?.querySelector('video');
      const stream = video?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((track) => track.stop());
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
