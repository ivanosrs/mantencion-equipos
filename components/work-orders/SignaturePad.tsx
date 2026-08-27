'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface SignaturePadProps {
  onSignatureSaved: (blob: Blob) => void;
}

export function SignaturePad({ onSignatureSaved }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left) * scaleX;
    const y = (('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top) * scaleY;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left) * scaleX;
    const y = (('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top) * scaleY;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
      setIsEmpty(false);
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setIsEmpty(true);
      }
    }
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (canvas && !isEmpty) {
      canvas.toBlob((blob) => {
        if (blob) {
          onSignatureSaved(blob);
        }
      }, 'image/png');
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={400}
          height={200}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full block cursor-crosshair"
        />
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={clearSignature}
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Limpiar
        </Button>
        <Button
          type="button"
          onClick={saveSignature}
          disabled={isEmpty}
          className="flex-1"
        >
          Guardar Firma
        </Button>
      </div>

      {!isEmpty && (
        <p className="text-sm text-slate-600">Firma capturada correctamente</p>
      )}
    </div>
  );
}
