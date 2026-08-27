'use client';

import { useRef, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { Equipment } from '@/lib/types';

interface QrPrintLabelProps {
  equipment: Equipment;
}

export function QrPrintLabel({ equipment }: QrPrintLabelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
    const canvas = canvasRef.current;
    if (!canvas || !qrGenerated) return;

    const qrDataUrl = canvas.toDataURL('image/png');
    const pageWidth = 100;

    const doc = new jsPDF({ unit: 'mm', format: [pageWidth, 130] });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(equipment.type, pageWidth / 2, 15, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`${equipment.brand} ${equipment.model}`, pageWidth / 2, 22, { align: 'center' });

    const qrSize = 60;
    doc.addImage(qrDataUrl, 'PNG', (pageWidth - qrSize) / 2, 30, qrSize, qrSize);

    doc.setFontSize(9);
    doc.text(`Serie: ${equipment.serial_number}`, pageWidth / 2, 98, { align: 'center' });
    doc.text(`Ubicación: ${equipment.location}`, pageWidth / 2, 104, { align: 'center' });

    doc.setTextColor(150);
    doc.text('Escanea el código QR para ver detalles', pageWidth / 2, 112, { align: 'center' });

    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  };

  return (
    <div className="space-y-4">
      <div
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

      <Button onClick={handlePrint} disabled={!qrGenerated} className="w-full gap-2" variant="outline">
        <Printer className="w-4 h-4" />
        Imprimir QR
      </Button>
    </div>
  );
}
