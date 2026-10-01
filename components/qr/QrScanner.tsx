'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Flashlight, FlashlightOff, RefreshCw, TriangleAlert, LoaderCircle, SwitchCamera } from 'lucide-react';

const READER_ID = 'qr-reader';

interface CameraDevice {
  id: string;
  label: string;
}

export function QrScanner() {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [status, setStatus] = useState<'idle' | 'starting' | 'scanning' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const runIdRef = useRef(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cancelledRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const stopScan = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try {
        await scanner.stop();
      } catch {
      }
    }
    setStatus('idle');
    setTorchOn(false);

    const video = containerRef.current?.querySelector('video');
    const stream = video?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
  }, []);

  const startScan = useCallback(async (cameraId: string) => {
    const runId = ++runIdRef.current;
    cancelledRef.current = false;
    setStatus('starting');
    setError(null);

    if (!containerRef.current) {
      setStatus('error');
      setError('Contenedor de cámara no disponible');
      return;
    }

    try {
      const scanner = new Html5Qrcode(READER_ID, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = scanner;

      const onScanSuccess = (decodedText: string) => {
        if (cancelledRef.current || runId !== runIdRef.current) return;
        const match = decodedText.match(/equipments\/([a-f0-9-]+)/i);
        if (match) {
          const equipmentId = match[1];
          cancelledRef.current = true;
          void stopScan();
          router.push(`/dashboard/equipments/${equipmentId}`);
        } else {
          setLastResult(decodedText);
        }
      };

      const onScanFailure = () => {
      };

      await scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.72;
            return { width: size, height: size };
          },
          aspectRatio: undefined,
        },
        onScanSuccess,
        onScanFailure
      );

      if (cancelledRef.current || runId !== runIdRef.current) {
        await scanner.stop().catch(() => {});
        return;
      }

      setStatus('scanning');
      const capabilities = scanner.getRunningTrackCameraCapabilities();
      const torch = capabilities.torchFeature();
      setTorchSupported(torch.isSupported());
      setTorchOn(false);
    } catch (e) {
      if (cancelledRef.current || runId !== runIdRef.current) return;
      setStatus('error');
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('NotAllowedError') || msg.includes('Permission denied')) {
        setError('Permiso de cámara denegado. Actívalo en la configuración del navegador.');
      } else if (msg.includes('NotFoundError') || msg.includes('No camera')) {
        setError('No se encontró ninguna cámara en este dispositivo.');
      } else if (msg.includes('NotSupportedError') || msg.includes('insecure')) {
        setError('Contexto no seguro: la cámara requiere HTTPS o localhost.');
      } else {
        setError(`Error al iniciar la cámara: ${msg}`);
      }
    }
  }, [router, stopScan]);

  const handleCameraSwitch = useCallback(() => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.id === activeCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextId = cameras[nextIndex].id;
    setActiveCameraId(nextId);
    void stopScan();
    void startScan(nextId);
  }, [cameras, activeCameraId, stopScan, startScan]);

  const handleTorchToggle = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      const capabilities = scanner.getRunningTrackCameraCapabilities();
      await capabilities.torchFeature().apply(!torchOn);
      setTorchOn(!torchOn);
    } catch {
    }
  }, [torchOn]);

  const handleRetry = useCallback(() => {
    if (activeCameraId) {
      void startScan(activeCameraId);
    }
  }, [activeCameraId, startScan]);

  useEffect(() => {
    let mounted = true;
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!mounted) return;
        const list = devices.map((d) => ({ id: d.id, label: d.label }));
        setCameras(list);
        if (list.length > 0) {
          const firstId = list[0].id;
          setActiveCameraId(firstId);
          void startScan(firstId);
        } else {
          setStatus('error');
          setError('No se encontró ninguna cámara en este dispositivo.');
        }
      })
      .catch(() => {
        if (!mounted) return;
        setStatus('error');
        setError('No se pudo acceder a las cámaras. Verifica los permisos.');
      });

    return () => {
      mounted = false;
      cancelledRef.current = true;
      void stopScan();
    };
  }, [startScan, stopScan]);

  if (status === 'error') {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center space-y-4">
          <TriangleAlert className="w-12 h-12 text-red-500 mx-auto" />
          <p className="text-slate-900 font-medium">No se pudo iniciar la cámara</p>
          <p className="text-sm text-slate-600">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={handleRetry} variant="outline" className="w-auto">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <div className="relative" ref={containerRef}>
        <div
          id={READER_ID}
          className="w-full aspect-square bg-slate-900 rounded-xl overflow-hidden"
          style={{ position: 'relative' }}
        />
        {status === 'scanning' && (
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[72%] aspect-square relative">
                <div className="absolute -top-2 -left-2 w-4 h-4 border-4 border-slate-50 rounded-tl-xl border-r-transparent border-b-transparent" />
                <div className="absolute -top-2 -right-2 w-4 h-4 border-4 border-slate-50 rounded-tr-xl border-l-transparent border-b-transparent" />
                <div className="absolute -bottom-2 -left-2 w-4 h-4 border-4 border-slate-50 rounded-bl-xl border-r-transparent border-t-transparent" />
                <div className="absolute -bottom-2 -right-2 w-4 h-4 border-4 border-slate-50 rounded-br-xl border-l-transparent border-t-transparent" />
                <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-400/80 animate-[scan_2.4s_ease-in-out_infinite] shadow-[0_0_8px_theme(colors.emerald.400)]" />
              </div>
            </div>
          </div>
        )}
        {status === 'starting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
            <LoaderCircle className="w-10 h-10 text-white animate-spin" />
          </div>
        )}
      </div>

      <p className="text-sm text-slate-600 text-center">
        {status === 'scanning' ? 'Apunta al código QR del equipo' : 'Iniciando cámara...'}
      </p>

      {lastResult && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 text-center">
          QR no reconocido: <code className="font-mono break-all">{lastResult}</code>
        </div>
      )}

      <div className="flex items-center justify-center gap-3">
        <Button
          onClick={handleCameraSwitch}
          disabled={cameras.length <= 1 || status !== 'scanning'}
          variant="outline"
          size="icon"
          className="h-12 w-12"
          aria-label="Cambiar cámara"
        >
          <SwitchCamera className="w-5 h-5" />
        </Button>

        <Button
          onClick={status === 'scanning' ? stopScan : () => activeCameraId && startScan(activeCameraId)}
          variant={status === 'scanning' ? 'destructive' : 'default'}
          size="lg"
          className="min-w-[160px]"
          disabled={status === 'starting'}
        >
          {status === 'starting' && <LoaderCircle className="w-5 h-5 animate-spin mr-2" />}
          {status === 'scanning' ? (
            <>Detener escaneo</>
          ) : (
            <>Iniciar escaneo</>
          )}
        </Button>

        <Button
          onClick={handleTorchToggle}
          disabled={!torchSupported || status !== 'scanning'}
          variant="outline"
          size="icon"
          className="h-12 w-12"
          aria-label={torchOn ? 'Apagar linterna' : 'Encender linterna'}
        >
          {torchOn ? <FlashlightOff className="w-5 h-5" /> : <Flashlight className="w-5 h-5" />}
        </Button>
      </div>
    </div>
  );
}