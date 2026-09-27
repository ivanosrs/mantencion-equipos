import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const MINIMUM_DAYS = 180;

export async function GET(request: NextRequest) {
  const equipmentId = request.nextUrl.searchParams.get('equipment_id');

  if (!equipmentId) {
    return NextResponse.json({ error: 'Falta equipment_id' }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('work_orders')
    .select('intervention_date')
    .eq('equipment_id', equipmentId)
    .order('intervention_date', { ascending: false })
    .limit(1);

  if (error) {
    return NextResponse.json({ error: 'Error al consultar el historial' }, { status: 500 });
  }

  const last = data?.[0]?.intervention_date ?? null;

  if (!last) {
    return NextResponse.json({ allowed: true, lastInterventionDate: null, daysRemaining: 0 });
  }

  const daysSince = Math.floor(
    (Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysRemaining = Math.max(0, MINIMUM_DAYS - daysSince);

  return NextResponse.json({
    allowed: daysRemaining === 0,
    lastInterventionDate: last,
    daysSince,
    daysRemaining,
  });
}
