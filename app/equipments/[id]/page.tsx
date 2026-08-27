'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PublicEquipment } from '@/lib/types';

export default function PublicEquipmentPage() {
  const params = useParams();
  const id = params.id as string;

  const [equipment, setEquipment] = useState<PublicEquipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();

        const { data } = await supabase
          .from('public_equipment_view')
          .select('*')
          .eq('id', id)
          .single();

        if (data) {
          setEquipment(data);
        } else {
          setError('Equipo no encontrado');
        }
      } catch (err) {
        setError('Error al cargar la información del equipo');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-100 text-green-800';
      case 'in_maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'out_of_service':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'operational':
        return 'Operativo';
      case 'in_maintenance':
        return 'En Mantención';
      case 'out_of_service':
        return 'Fuera de Servicio';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div>Cargando información del equipo...</div>
      </div>
    );
  }

  if (error || !equipment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-red-600">{error || 'Equipo no encontrado'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 py-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1">
                <CardTitle className="text-2xl">{equipment.type}</CardTitle>
                <CardDescription>{equipment.brand} {equipment.model}</CardDescription>
              </div>
              <Badge variant="outline" className={getStatusColor(equipment.status)}>
                {getStatusLabel(equipment.status)}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Equipment info */}
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Número de Serie</p>
                <p className="font-mono font-bold text-slate-900 text-lg">{equipment.serial_number}</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Ubicación</p>
                <p className="text-slate-900 text-sm">{equipment.location}</p>
              </div>

              {equipment.last_maintenance_date && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Última Mantención</p>
                  <p className="text-slate-900 text-sm">
                    {new Date(equipment.last_maintenance_date).toLocaleDateString('es-CL', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* Info message */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                Esta es la ficha pública del equipo. Para más información o registrar una orden de trabajo,
                contacta al equipo de mantención.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-600">
          <p>Sistema de Gestión de Mantenciones</p>
        </div>
      </div>
    </div>
  );
}
