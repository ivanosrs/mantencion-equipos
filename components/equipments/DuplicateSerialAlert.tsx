'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import type { ExistingEquipment } from '@/lib/equipment-serial';

interface DuplicateSerialAlertProps {
  serial: string;
  existing: ExistingEquipment | null;
  onRestored: (id: string) => void;
}

export function DuplicateSerialAlert({ serial, existing, onRestored }: DuplicateSerialAlertProps) {
  const supabase = createClient();
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');

  async function handleRestore() {
    if (!existing) return;
    if (!confirm('¿Restaurar este equipo? Volverá a aparecer en la lista de activos.')) return;

    setRestoring(true);
    setRestoreError('');

    try {
      const { error } = await supabase
        .from('equipments')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', existing.id);

      if (error) {
        setRestoreError(error.message);
      } else {
        onRestored(existing.id);
      }
    } catch {
      setRestoreError('Error al restaurar el equipo');
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div role="alert" className="bg-red-50 text-red-600 p-4 rounded-lg text-sm space-y-3">
      <p>
        Ya existe un equipo con el número de serie «{serial}»
        {existing && (
          <>
            {existing.is_active ? ': ' : ', pero está desactivado: '}
            {existing.type} {existing.brand} {existing.model} ({existing.location})
          </>
        )}
        .{existing && !existing.is_active && ' Puedes restaurarlo para volver a usarlo.'}
      </p>

      {restoreError && <p>{restoreError}</p>}

      {existing && (
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/dashboard/equipments/${existing.id}`} className="font-medium underline">
            Ver equipo
          </Link>
          {!existing.is_active && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRestore}
              disabled={restoring}
            >
              {restoring ? 'Restaurando...' : 'Restaurar equipo'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
