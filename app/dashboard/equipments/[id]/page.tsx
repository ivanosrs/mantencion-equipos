'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Equipment, WorkOrder } from '@/lib/types';
import { ArrowLeft, FileDown, Plus } from 'lucide-react';

const QrPrintLabel = dynamic(() => import('@/components/qr/QrPrintLabel').then(mod => ({ default: mod.QrPrintLabel })), {
  ssr: false,
});

export default function EquipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        // Check role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        setIsAdmin(profile?.role === 'admin');

        // Load equipment
        const { data: equipmentData } = await supabase
          .from('equipments')
          .select('*')
          .eq('id', id)
          .single();

        setEquipment(equipmentData);

        // Load work orders
        const { data: woData } = await supabase
          .from('work_orders')
          .select('*')
          .eq('equipment_id', id)
          .order('intervention_date', { ascending: false });

        setWorkOrders(woData || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, router, supabase]);

  async function handleDownload(bucket: 'attachments' | 'signatures', path: string) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);

    if (error || !data) {
      alert('No se pudo generar el enlace de descarga');
      return;
    }

    window.open(data.signedUrl, '_blank');
  }

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

  if (loading) return <div>Cargando...</div>;
  if (!equipment) return <div>Equipo no encontrado</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{equipment.type}</h1>
          <p className="text-slate-600">{equipment.brand} {equipment.model}</p>
        </div>
        <Badge variant="outline" className={getStatusColor(equipment.status)}>
          {getStatusLabel(equipment.status)}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Equipment info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información del Equipo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Marca</p>
                  <p className="font-semibold">{equipment.brand}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Modelo</p>
                  <p className="font-semibold">{equipment.model}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Número de Serie</p>
                  <p className="font-mono font-semibold">{equipment.serial_number}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Ubicación</p>
                  <p className="font-semibold">{equipment.location}</p>
                </div>
                {equipment.last_maintenance_date && (
                  <div>
                    <p className="text-sm text-slate-500">Última mantención</p>
                    <p className="font-semibold">
                      {new Date(equipment.last_maintenance_date).toLocaleDateString('es-CL')}
                    </p>
                  </div>
                )}
              </div>

              {isAdmin && (
                <div className="pt-4 border-t flex gap-2">
                  <Link href={`/dashboard/equipments/${id}/edit`}>
                    <Button variant="outline" size="sm">
                      Editar
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Work Orders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Órdenes de Trabajo</CardTitle>
                <CardDescription>Historial de mantenciones</CardDescription>
              </div>
              <Link href={`/dashboard/work-orders/new?equipment_id=${id}`}>
                <Button size="sm" gap-2>
                  <Plus className="w-4 h-4" />
                  Nueva OT
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {workOrders.length === 0 ? (
                <p className="text-sm text-slate-500">Sin órdenes de trabajo registradas</p>
              ) : (
                <div className="space-y-4">
                  {workOrders.map((wo) => (
                    <div key={wo.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div>
                          <p className="font-semibold">OT #{wo.ot_number}</p>
                          <p className="text-sm text-slate-600">
                            {new Date(wo.intervention_date).toLocaleDateString('es-CL')}
                          </p>
                        </div>
                        <Badge variant="secondary">{wo.service_type}</Badge>
                      </div>
                      <p className="text-sm text-slate-700 mb-2">{wo.problem_description}</p>
                      <div className="flex flex-wrap gap-4">
                        {wo.attachment_path && (
                          <button
                            type="button"
                            onClick={() => handleDownload('attachments', wo.attachment_path!)}
                            className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                          >
                            <FileDown className="w-4 h-4" />
                            Descargar adjunto
                          </button>
                        )}
                        {wo.client_signature_path && (
                          <button
                            type="button"
                            onClick={() => handleDownload('signatures', wo.client_signature_path!)}
                            className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                          >
                            <FileDown className="w-4 h-4" />
                            Ver firma cliente
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* QR Print */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Código QR</CardTitle>
            </CardHeader>
            <CardContent>
              <QrPrintLabel equipment={equipment} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
