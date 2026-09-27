'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { WorkOrderDocument } from '@/components/work-orders/WorkOrderDocument';
import { buildOtDocument, type OtDocument } from '@/lib/ot-document';
import { downloadWorkOrderPdf } from '@/lib/pdf/work-order';
import type { Equipment, WorkOrder, WorkOrderPart } from '@/lib/types';
import { ArrowLeft } from 'lucide-react';

export default function WorkOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [document, setDocument] = useState<OtDocument | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
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

        const { data: workOrder, error: workOrderError } = await supabase
          .from('work_orders')
          .select('*')
          .eq('id', id)
          .single();

        if (workOrderError || !workOrder) {
          setError('Orden de trabajo no encontrada');
          return;
        }

        const wo = workOrder as WorkOrder;

        const [{ data: equipmentData }, { data: partsData }] = await Promise.all([
          supabase.from('equipments').select('*').eq('id', wo.equipment_id).single(),
          supabase
            .from('work_order_parts')
            .select('*')
            .eq('work_order_id', wo.id)
            .order('id'),
        ]);

        if (!equipmentData) {
          setError('Equipo de la orden de trabajo no encontrado');
          return;
        }

        let technicianName: string | null = null;

        if (wo.technician_id) {
          const { data: technician } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', wo.technician_id)
            .single();

          technicianName = technician?.full_name ?? null;
        }

        setDocument(
          buildOtDocument({
            workOrder: wo,
            equipment: equipmentData as Equipment,
            technicianName,
            parts: (partsData as WorkOrderPart[]) ?? [],
          })
        );

        if (wo.client_signature_path) {
          const { data: signed } = await supabase.storage
            .from('signatures')
            .createSignedUrl(wo.client_signature_path, 300);

          setSignatureUrl(signed?.signedUrl ?? null);
        }
      } catch {
        setError('Error al cargar la orden de trabajo');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, router, supabase]);

  async function handleDownloadPdf() {
    if (!document) return;

    setDownloading(true);

    try {
      await downloadWorkOrderPdf(supabase, document);
    } catch {
      alert('No se pudo generar el PDF de la orden de trabajo');
    } finally {
      setDownloading(false);
    }
  }

  async function handleDownloadAttachment() {
    if (!document?.attachmentPath) return;

    const { data, error: signError } = await supabase.storage
      .from('attachments')
      .createSignedUrl(document.attachmentPath, 60);

    if (signError || !data) {
      alert('No se pudo generar el enlace de descarga');
      return;
    }

    window.open(data.signedUrl, '_blank');
  }

  if (loading) return <div>Cargando...</div>;

  if (error || !document) {
    return (
      <div className="space-y-4">
        <p className="text-slate-600">{error || 'Orden de trabajo no encontrada'}</p>
        <Button variant="outline" onClick={() => router.back()}>
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Orden de Trabajo N° {document.otNumber}</h1>
          <p className="text-slate-600">{document.equipmentSubtitle}</p>
        </div>
      </div>

      <WorkOrderDocument
        document={document}
        signatureUrl={signatureUrl}
        onDownloadPdf={handleDownloadPdf}
        onDownloadAttachment={handleDownloadAttachment}
        downloading={downloading}
      />
    </div>
  );
}
