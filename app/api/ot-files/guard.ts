import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

type ActiveUserGuard =
  | { ok: true; admin: ReturnType<typeof createAdminClient> }
  | { ok: false; response: NextResponse };

/** Usuario logueado y activo: los archivos de OT se firman con la service role. */
export async function requireActiveUser(): Promise<ActiveUserGuard> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No autenticado' }, { status: 401 }),
    };
  }

  const { data: profile } = await userClient
    .from('profiles')
    .select('is_active')
    .eq('id', user.id)
    .single();

  if (!profile?.is_active) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Usuario inactivo' }, { status: 403 }),
    };
  }

  return { ok: true, admin: createAdminClient() };
}
