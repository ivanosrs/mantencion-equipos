import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Elimina una OT (solo administradores activos), pensado para corregir OT
 * ingresadas por error:
 * - los repuestos caen por ON DELETE CASCADE;
 * - la firma y el adjunto se borran de Storage;
 * - si la OT habia fijado la "ultima mantencion" del equipo, se recalcula con
 *   la OT mas reciente que quede (o null si no queda ninguna). La regla de los
 *   180 dias se calcula desde work_orders, asi que se libera sola.
 */
export async function DELETE(_request: NextRequest, ctx: RouteContext<'/api/work-orders/[id]'>) {
  const { id } = await ctx.params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'OT inválida' }, { status: 400 });
  }

  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { data: profile } = await userClient
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' || !profile.is_active) {
    return NextResponse.json(
      { error: 'Solo administradores pueden eliminar órdenes de trabajo' },
      { status: 403 }
    );
  }

  const admin = createAdminClient();

  const { data: workOrder } = await admin
    .from('work_orders')
    .select('id, equipment_id, intervention_date, client_signature_path, attachment_path')
    .eq('id', id)
    .single();

  if (!workOrder) {
    return NextResponse.json({ error: 'Orden de trabajo no encontrada' }, { status: 404 });
  }

  const { error: deleteError } = await admin.from('work_orders').delete().eq('id', id);

  if (deleteError) {
    return NextResponse.json({ error: 'No se pudo eliminar la orden de trabajo' }, { status: 500 });
  }

  // La OT ya no existe: si falla el borrado de archivos solo quedan huerfanos.
  await Promise.all([
    workOrder.client_signature_path &&
      admin.storage.from('signatures').remove([workOrder.client_signature_path]),
    workOrder.attachment_path &&
      admin.storage.from('attachments').remove([workOrder.attachment_path]),
  ]);

  const { data: equipment } = await admin
    .from('equipments')
    .select('last_maintenance_date')
    .eq('id', workOrder.equipment_id)
    .single();

  if (equipment?.last_maintenance_date === workOrder.intervention_date) {
    const { data: latest } = await admin
      .from('work_orders')
      .select('intervention_date')
      .eq('equipment_id', workOrder.equipment_id)
      .order('intervention_date', { ascending: false })
      .limit(1);

    await admin
      .from('equipments')
      .update({
        last_maintenance_date: latest?.[0]?.intervention_date ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workOrder.equipment_id);
  }

  return NextResponse.json({ equipmentId: workOrder.equipment_id });
}
