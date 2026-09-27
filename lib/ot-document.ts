import type { Equipment, ServiceType, WorkOrder, WorkOrderPart } from '@/lib/types';

/**
 * Definicion unica del documento "Orden de Trabajo".
 *
 * El formulario de creacion, la vista de solo lectura y el PDFexportado
 * consumen esta misma estructura, de modo que los tres quedan siempre
 * alineados. Si se agrega un campo aqui, aparece en los tres lugares.
 */

export const OT_ACTIONS = [
  'Limpieza general',
  'Chequeo de funcionamiento',
  'Chequeo de RPM',
  'Lubricación de partes móviles',
  'Reparación de tarjeta electrónica',
  'Reemplazo de piezas',
  'Calibración',
];

export const OT_SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: 'preventive', label: 'Mantención Preventiva' },
  { value: 'install_uninstall', label: 'Instalación/Desinstalación' },
  { value: 'corrective', label: 'Acción Correctiva' },
  { value: 'training', label: 'Capacitación Usuario' },
  { value: 'followup', label: 'Seguimiento' },
];

export function serviceTypeLabel(value: string): string {
  return OT_SERVICE_TYPES.find((type) => type.value === value)?.label ?? value;
}

/**
 * `intervention_date` se guarda como 'YYYY-MM-DD'. `new Date(...)` lo
 * interpreta como UTC midnight, y en Chile (UTC-3) `toLocaleDateString`
 * retrocede un dia. Formateamos a mano para evitarlo.
 */
export function formatDateOnly(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-');

  if (!year || !month || !day) return value;

  return `${day}/${month}/${year}`;
}

export interface OtField {
  label: string;
  value: string;
  /** ocupa la fila completa, igual que los campos `sm:col-span-2` del formulario */
  fullWidth?: boolean;
}

export interface OtSectionFields {
  kind: 'fields';
  title: string;
  fields: OtField[];
}

export interface OtSectionChecklist {
  kind: 'checklist';
  title: string;
  subtitle: string;
  items: { label: string; checked: boolean }[];
}

export interface OtSectionParts {
  kind: 'parts';
  title: string;
  parts: WorkOrderPart[];
}

export interface OtSectionConformity {
  kind: 'conformity';
  title: string;
  fields: OtField[];
  checkbox: { label: string; checked: boolean };
  signaturePath: string | null;
}

export interface OtSectionAttachment {
  kind: 'attachment';
  title: string;
  subtitle: string;
  fileName: string | null;
}

export type OtSection =
  | OtSectionFields
  | OtSectionChecklist
  | OtSectionParts
  | OtSectionConformity
  | OtSectionAttachment;

export interface OtDocument {
  otNumber: string;
  title: string;
  /** subtitulo del encabezado, tal como aparece en el formulario */
  equipmentSubtitle: string;
  equipment: Pick<Equipment, 'type' | 'brand' | 'model' | 'serial_number' | 'location'>;
  technicianName: string;
  sections: OtSection[];
  attachmentPath: string | null;
}

function baseName(path: string | null): string | null {
  if (!path) return null;

  const segments = path.split('/');

  return segments[segments.length - 1] || null;
}

export function buildOtDocument(input: {
  workOrder: WorkOrder;
  equipment: Equipment;
  technicianName: string | null;
  parts: WorkOrderPart[];
}): OtDocument {
  const { workOrder, equipment, technicianName, parts } = input;
  const performed = workOrder.actions_checklist ?? [];

  return {
    otNumber: workOrder.ot_number,
    title: 'Orden de Trabajo',
    equipmentSubtitle: `${equipment.type} - ${equipment.serial_number}`,
    equipment: {
      type: equipment.type,
      brand: equipment.brand,
      model: equipment.model,
      serial_number: equipment.serial_number,
      location: equipment.location,
    },
    technicianName: technicianName || 'Sin técnico asignado',
    attachmentPath: workOrder.attachment_path ?? null,
    sections: [
      {
        kind: 'fields',
        title: 'Información de la Orden',
        fields: [
          { label: 'Número OT', value: workOrder.ot_number },
          { label: 'Fecha de Intervención', value: formatDateOnly(workOrder.intervention_date) },
          { label: 'Tipo de Servicio', value: serviceTypeLabel(workOrder.service_type) },
          { label: 'Descripción del Problema', value: workOrder.problem_description || '' },
        ],
      },
      {
        kind: 'fields',
        title: 'Información del Cliente',
        fields: [
          { label: 'Nombre/Empresa Cliente', value: workOrder.client_name || '' },
          { label: 'Teléfono', value: workOrder.client_phone || '' },
          { label: 'Dirección', value: workOrder.client_address || '', fullWidth: true },
        ],
      },
      {
        kind: 'checklist',
        title: 'Acciones Ejecutadas',
        subtitle: 'Selecciona las acciones realizadas',
        items: OT_ACTIONS.map((action) => ({
          label: action,
          checked: performed.includes(action),
        })),
      },
      {
        kind: 'parts',
        title: 'Repuestos / Insumos Utilizados',
        parts,
      },
      {
        kind: 'conformity',
        title: 'Conformidad del Cliente',
        fields: [
          { label: 'Nombre del Cliente', value: workOrder.client_conformity_name || '' },
          { label: 'RUT del Cliente', value: workOrder.client_conformity_rut || '' },
        ],
        checkbox: {
          label: 'Recepción conforme - El cliente recibió conforme',
          checked: Boolean(workOrder.client_received_ok),
        },
        signaturePath: workOrder.client_signature_path ?? null,
      },
      {
        kind: 'attachment',
        title: 'Adjunto',
        subtitle: 'Sube una foto o PDF de la OT física (opcional)',
        fileName: baseName(workOrder.attachment_path ?? null),
      },
    ],
  };
}
