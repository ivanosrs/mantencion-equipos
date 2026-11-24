import type { createClient } from '@/lib/supabase/client';
import type { Equipment } from '@/lib/types';

// El numero de serie es unico por equipo sin distinguir mayusculas ni espacios
// en los extremos: "ABC-123", "abc-123" y "ABC-123 " son el mismo equipo. La
// base lo garantiza con un indice sobre lower(btrim(serial_number)) (migracion
// 0012); aca se normaliza lo que se guarda y se explica el rechazo al usuario.

type SupabaseBrowserClient = ReturnType<typeof createClient>;

export type ExistingEquipment = Pick<
  Equipment,
  'id' | 'type' | 'brand' | 'model' | 'serial_number' | 'location' | 'is_active'
>;

export function normalizeSerial(value: string): string {
  return value.trim();
}

// 23505 = unique_violation de Postgres. En equipments el serial es el unico
// campo editable con restriccion de unicidad.
export function isDuplicateSerialError(error: { code?: string } | null | undefined): boolean {
  return error?.code === '23505';
}

// Busca el equipo que ya ocupa ese serial, activo o no (los admins ven ambos
// por RLS). Devuelve null si no lo encuentra, por ejemplo un serial antiguo
// guardado con espacios.
export async function findEquipmentBySerial(
  supabase: SupabaseBrowserClient,
  serial: string,
  excludeId?: string
): Promise<ExistingEquipment | null> {
  const target = normalizeSerial(serial).toLowerCase();
  // ilike trata % y _ como comodines; se escapan para comparar literal.
  const pattern = target.replace(/[\\%_]/g, '\\$&');

  let query = supabase
    .from('equipments')
    .select('id, type, brand, model, serial_number, location, is_active')
    .ilike('serial_number', pattern);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data } = await query.limit(5);

  // PostgREST tambien trata * como comodin en ilike: se confirma la
  // coincidencia exacta antes de senalar un equipo.
  return data?.find((eq) => normalizeSerial(eq.serial_number).toLowerCase() === target) ?? null;
}
