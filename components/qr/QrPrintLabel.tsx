'use client';

import { useRef, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { Equipment } from '@/lib/types';

interface QrPrintLabelProps {
  equipment: Equipment;
}

export function QrPrintLabel({ equipment }: QrPrintLabelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [qrGenerated, setQrGenerated] = useState(false);

  const qrValue = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/equipments/${equipment.id}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, qrValue, { width: 200 })
        .then(() => setQrGenerated(true))
        .catch(() => {});
    }
  }, [qrValue]);

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '', 'width=800,height=600');
      if (printWindow) {
        const html = printRef.current.innerHTML;
        printWindow.document.write(`<!DOCTYPE html><html><head><title>Imprimir QR</title></head><body>${html}</body></html>`);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div
        ref={printRef}
        className="bg-white p-8 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-6"
        style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}
      >
        {/* Header */}
        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-900">{equipment.type}</h3>
          <p className="text-sm text-slate-600">{equipment.brand} {equipment.model}</p>
        </div>

        {/* QR Code */}
        <canvas
          ref={canvasRef}
          style={{ border: 'none', margin: '20px', display: qrGenerated ? 'block' : 'none' }}
        />
        {!qrGenerated && (
          <p className="text-sm text-slate-400">Generando código QR...</p>
        )}

        {/* Equipment Info */}
        <div className="text-center space-y-1 text-xs text-slate-700">
          <p><strong>Serie:</strong> {equipment.serial_number}</p>
          <p><strong>Ubicación:</strong> {equipment.location}</p>
          <p className="text-slate-500">Escanea el código QR para ver detalles</p>
        </div>
      </div>

      <Button onClick={handlePrint} className="w-full gap-2" variant="outline">
        <Printer className="w-4 h-4" />
        Imprimir Etiqueta
      </Button>
    </div>
  );
}
