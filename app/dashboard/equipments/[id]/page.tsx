'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Equipment, WorkOrder, WorkOrderPart } from '@/lib/types';
import { buildOtDocument, serviceTypeLabel } from '@/lib/ot-document';
import { downloadWorkOrderPdf } from '@/lib/pdf/work-order';
import { ArrowLeft, Eye, FileDown, FileText, Pencil, Plus } from 'lucide-react';

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
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
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

  async function handleDownloadPdf(wo: WorkOrder, eq: Equipment) {
    setDownloadingId(wo.id);

    try {
      const [partsResult, technicianResult] = await Promise.all([
        supabase.from('work_order_parts').select('*').eq('work_order_id', wo.id).order('id'),
        supabase.from('profiles').select('full_name').eq('id', wo.technician_id).single(),
      ]);

      const document = buildOtDocument({
        workOrder: wo,
        equipment: eq,
        technicianName: technicianResult.data?.full_name ?? null,
        parts: (partsResult.data as WorkOrderPart[]) ?? [],
      });

      await downloadWorkOrderPdf(supabase, document);
    } catch (error) {
      console.error('Error al generar el PDF:', error);
      alert('No se pudo generar el PDF de la orden de trabajo');
    } finally {
      setDownloadingId(null);
    }
  }

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

  const getActiveBadge = (isActive: boolean) => {
    if (!isActive) {
      return (
        <Badge variant="outline" className="bg-slate-100 text-slate-800 ml-2">
          Inactivo
        </Badge>
      );
    }
    return null;
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
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={getStatusColor(equipment.status)}>
            {getStatusLabel(equipment.status)}
          </Badge>
          {getActiveBadge(equipment.is_active)}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Equipment info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Información del Equipo</CardTitle>
              {isAdmin && (
                <Link href={`/dashboard/equipments/${id}/edit`}>
                  <Button variant="outline" size="sm" aria-label="Editar equipo">
                    <Pencil className="w-4 h-4" />
                    <span className="hidden sm:inline">Editar</span>
                  </Button>
                </Link>
              )}
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
                <Button size="sm" disabled={!equipment.is_active}>
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
                        <Badge variant="secondary">{serviceTypeLabel(wo.service_type)}</Badge>
                      </div>
                      <p className="text-sm text-slate-700 mb-2">{wo.problem_description}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <div className="flex w-full gap-2 sm:w-auto">
                          <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
                            <Link href={`/dashboard/work-orders/${wo.id}`}>
                              <Eye className="w-4 h-4" />
                              Ver OT
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadPdf(wo, equipment)}
                            disabled={downloadingId === wo.id}
                            className="flex-1 sm:flex-none"
                          >
                            <FileText className="w-4 h-4" />
                            {downloadingId === wo.id ? 'Generando...' : 'Descargar PDF'}
                          </Button>
                        </div>
                        {wo.attachment_path && (
                          <button
                            type="button"
                            onClick={() => handleDownload('attachments', wo.attachment_path!)}
                            className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <FileDown className="w-4 h-4" />
                            Descargar adjunto
                          </button>
                        )}
                        {wo.client_signature_path && (
                          <button
                            type="button"
                            onClick={() => handleDownload('signatures', wo.client_signature_path!)}
                            className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
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
