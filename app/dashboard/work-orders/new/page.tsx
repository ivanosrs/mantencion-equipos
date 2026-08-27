'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Equipment, ServiceType } from '@/lib/types';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

const SignaturePad = dynamic(() => import('@/components/work-orders/SignaturePad').then(mod => ({ default: mod.SignaturePad })), {
  ssr: false,
});

const ACTIONS = [
  'Limpieza general',
  'Chequeo de funcionamiento',
  'Chequeo de RPM',
  'Lubricación de partes móviles',
  'Reparación de tarjeta electrónica',
  'Reemplazo de piezas',
  'Calibración',
];

const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: 'preventive', label: 'Mantención Preventiva' },
  { value: 'install_uninstall', label: 'Instalación/Desinstalación' },
  { value: 'corrective', label: 'Acción Correctiva' },
  { value: 'training', label: 'Capacitación Usuario' },
  { value: 'followup', label: 'Seguimiento' },
];

interface Part {
  id: string;
  code: string;
  description: string;
  quantity: number;
  observations: string;
}

export default function NewWorkOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const equipmentId = searchParams.get('equipment_id');
  const supabase = createClient();

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signatureBlob, setSignatureBlob] = useState<Blob | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    ot_number: '',
    intervention_date: new Date().toISOString().split('T')[0],
    client_name: '',
    client_address: '',
    client_phone: '',
    problem_description: '',
    service_type: 'preventive' as ServiceType,
    actions_checklist: [] as string[],
    client_conformity_name: '',
    client_conformity_rut: '',
    client_received_ok: false,
  });

  const [parts, setParts] = useState<Part[]>([]);
  const [newPart, setNewPart] = useState({
    code: '',
    description: '',
    quantity: 1,
    observations: '',
  });

  useEffect(() => {
    async function loadData() {
      if (!equipmentId) {
        setError('ID de equipo no especificado');
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        const { data } = await supabase
          .from('equipments')
          .select('*')
          .eq('id', equipmentId)
          .single();

        setEquipment(data);
        setFormData((prev) => ({
          ...prev,
          client_name: data?.location || '',
        }));
      } catch (err) {
        setError('Error al cargar el equipo');
      }
    }

    loadData();
  }, [equipmentId, router, supabase]);

  function toggleAction(action: string) {
    setFormData((prev) => ({
      ...prev,
      actions_checklist: prev.actions_checklist.includes(action)
        ? prev.actions_checklist.filter((a) => a !== action)
        : [...prev.actions_checklist, action],
    }));
  }

  function addPart() {
    if (!newPart.description) {
      setError('Debes completar la descripción del repuesto');
      return;
    }

    setParts([
      ...parts,
      {
        id: Date.now().toString(),
        ...newPart,
      },
    ]);

    setNewPart({
      code: '',
      description: '',
      quantity: 1,
      observations: '',
    });
  }

  function removePart(id: string) {
    setParts(parts.filter((p) => p.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !equipmentId) {
        setError('Usuario o equipo no disponible');
        return;
      }

      let signaturePath: string | null = null;
      let attachmentPath: string | null = null;

      // Upload signature if exists
      if (signatureBlob) {
        const fileName = `${Date.now()}-signature.png`;
        const { error: uploadError } = await supabase.storage
          .from('signatures')
          .upload(`${equipmentId}/${fileName}`, signatureBlob);

        if (uploadError) {
          setError('Error al subir la firma');
          return;
        }
        signaturePath = `${equipmentId}/${fileName}`;
      }

      // Upload attachment if exists
      if (attachmentFile) {
        const fileName = `${Date.now()}-${attachmentFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(`${equipmentId}/${fileName}`, attachmentFile);

        if (uploadError) {
          setError('Error al subir el adjunto');
          return;
        }
        attachmentPath = `${equipmentId}/${fileName}`;
      }

      // Insert work order
      const { data: woData, error: woError } = await supabase
        .from('work_orders')
        .insert({
          equipment_id: equipmentId,
          technician_id: user.id,
          ot_number: formData.ot_number,
          intervention_date: formData.intervention_date,
          client_name: formData.client_name,
          client_address: formData.client_address,
          client_phone: formData.client_phone,
          problem_description: formData.problem_description,
          service_type: formData.service_type,
          actions_checklist: formData.actions_checklist,
          client_conformity_name: formData.client_conformity_name,
          client_conformity_rut: formData.client_conformity_rut,
          client_received_ok: formData.client_received_ok,
          client_signature_path: signaturePath,
          attachment_path: attachmentPath,
        })
        .select()
        .single();

      if (woError) {
        setError(woError.message);
        return;
      }

      // Insert parts
      if (parts.length > 0) {
        const partsToInsert = parts.map(({ id, ...p }) => ({
          ...p,
          work_order_id: woData.id,
        }));

        const { error: partsError } = await supabase
          .from('work_order_parts')
          .insert(partsToInsert);

        if (partsError) {
          setError('Error al guardar los repuestos');
          return;
        }
      }

      // Update equipment last maintenance date
      await supabase
        .from('equipments')
        .update({
          last_maintenance_date: formData.intervention_date,
          updated_at: new Date().toISOString(),
        })
        .eq('id', equipmentId);

      router.push(`/dashboard/equipments/${equipmentId}`);
    } catch (err) {
      setError('Error al crear la orden de trabajo');
    } finally {
      setLoading(false);
    }
  }

  if (!equipment) {
    return <div>{error || 'Cargando...'}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nueva Orden de Trabajo</h1>
          <p className="text-slate-600">{equipment.type} - {equipment.serial_number}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Información de la Orden</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número OT *</Label>
                <Input
                  placeholder="Ej: 00554"
                  value={formData.ot_number}
                  onChange={(e) => setFormData({ ...formData, ot_number: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha de Intervención *</Label>
                <Input
                  type="date"
                  value={formData.intervention_date}
                  onChange={(e) => setFormData({ ...formData, intervention_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Servicio *</Label>
                <select
                  value={formData.service_type}
                  onChange={(e) => setFormData({ ...formData, service_type: e.target.value as ServiceType })}
                  className="w-full px-3 py-2 rounded-md border border-slate-200"
                >
                  {SERVICE_TYPES.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Descripción del Problema</Label>
                <textarea
                  placeholder="Describe el problema o el servicio solicitado"
                  value={formData.problem_description}
                  onChange={(e) => setFormData({ ...formData, problem_description: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm"
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client Info */}
        <Card>
          <CardHeader>
            <CardTitle>Información del Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre/Empresa Cliente *</Label>
                <Input
                  placeholder="Nombre del cliente"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  type="tel"
                  placeholder="Teléfono del cliente"
                  value={formData.client_phone}
                  onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Dirección</Label>
                <Input
                  placeholder="Dirección del cliente"
                  value={formData.client_address}
                  onChange={(e) => setFormData({ ...formData, client_address: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones Ejecutadas</CardTitle>
            <CardDescription>Selecciona las acciones realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ACTIONS.map((action) => (
                <label key={action} className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={formData.actions_checklist.includes(action)}
                    onCheckedChange={() => toggleAction(action)}
                  />
                  <span className="text-sm">{action}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Parts */}
        <Card>
          <CardHeader>
            <CardTitle>Repuestos / Insumos Utilizados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {parts.length > 0 && (
              <div className="border rounded-lg divide-y">
                {parts.map((part) => (
                  <div key={part.id} className="p-3 flex justify-between items-start gap-2">
                    <div className="flex-1">
                      {part.code && <p className="text-xs text-slate-500">Código: {part.code}</p>}
                      <p className="font-medium text-sm">{part.description}</p>
                      <p className="text-xs text-slate-600">Cantidad: {part.quantity}</p>
                      {part.observations && <p className="text-xs text-slate-500">{part.observations}</p>}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePart(part.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 pt-4 border-t">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  placeholder="Código (opcional)"
                  value={newPart.code}
                  onChange={(e) => setNewPart({ ...newPart, code: e.target.value })}
                />
                <Input
                  placeholder="Descripción *"
                  value={newPart.description}
                  onChange={(e) => setNewPart({ ...newPart, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min="1"
                  placeholder="Cantidad"
                  value={newPart.quantity}
                  onChange={(e) => setNewPart({ ...newPart, quantity: parseInt(e.target.value) })}
                />
                <Input
                  placeholder="Observaciones"
                  value={newPart.observations}
                  onChange={(e) => setNewPart({ ...newPart, observations: e.target.value })}
                />
              </div>
              <Button
                type="button"
                onClick={addPart}
                variant="outline"
                className="w-full gap-2"
              >
                <Plus className="w-4 h-4" />
                Agregar Repuesto
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Conformidad y Firma */}
        <Card>
          <CardHeader>
            <CardTitle>Conformidad del Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre del Cliente</Label>
                <Input
                  placeholder="Nombre completo"
                  value={formData.client_conformity_name}
                  onChange={(e) => setFormData({ ...formData, client_conformity_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>RUT del Cliente</Label>
                <Input
                  placeholder="RUT sin puntos"
                  value={formData.client_conformity_rut}
                  onChange={(e) => setFormData({ ...formData, client_conformity_rut: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Firma Digital del Cliente</Label>
              <SignaturePad onSignatureSaved={setSignatureBlob} />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={formData.client_received_ok}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, client_received_ok: checked as boolean })
                }
              />
              <span className="text-sm">Recepción conforme - El cliente recibió conforme</span>
            </label>
          </CardContent>
        </Card>

        {/* Attachment */}
        <Card>
          <CardHeader>
            <CardTitle>Adjunto</CardTitle>
            <CardDescription>Sube una foto o PDF de la OT física (opcional)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
              />
              {attachmentFile && (
                <p className="text-sm text-green-600">
                  Archivo seleccionado: {attachmentFile.name}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-2">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Guardando...' : 'Guardar Orden de Trabajo'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
