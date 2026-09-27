import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const VALID_ROLES = ['admin', 'technician'] as const;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AdminGuard =
  | { ok: true; admin: ReturnType<typeof createAdminClient>; userId: string }
  | { ok: false; response: NextResponse };

async function requireAdmin(): Promise<AdminGuard> {
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
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Solo administradores pueden gestionar usuarios' },
        { status: 403 }
      ),
    };
  }

  return { ok: true, admin: createAdminClient(), userId: user.id };
}

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { admin } = guard;

  const { data: profiles, error: profilesError } = await admin
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (profilesError) {
    return NextResponse.json({ error: 'Error al cargar los usuarios' }, { status: 500 });
  }

  // El email vive en auth.users, no en profiles. Paginar el listado de auth
  // y unir por id; si Supabase pagina, repetir hasta acumular todos los ids.
  const emailsById = new Map<string, string>();
  let page = 1;
  for (;;) {
    const { data: authPage, error: authError } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (authError) {
      return NextResponse.json({ error: 'Error al cargar los emails' }, { status: 500 });
    }

    for (const authUser of authPage.users) {
      if (authUser.email) emailsById.set(authUser.id, authUser.email);
    }

    if (authPage.users.length < 1000) break;
    page += 1;
  }

  const users = (profiles ?? []).map((profile) => ({
    ...profile,
    email: emailsById.get(profile.id) ?? '',
  }));

  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;
    const { admin } = guard;

    const { email, password, full_name, role, phone } = await request.json();

    // Validate required fields
    if (!email || !password || !full_name || !role) {
      return NextResponse.json(
        { error: 'Email, contraseña, nombre y rol son requeridos' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }

    // Validate role
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    }

    // Create auth user
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Create profile
    const { error: profileError } = await admin.from('profiles').insert({
      id: authData.user.id,
      full_name,
      role,
      phone,
    });

    if (profileError) {
      // Delete auth user if profile creation fails
      await admin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: 'Error al crear el perfil del usuario' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Usuario creado exitosamente', user: authData.user },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;
    const { admin, userId } = guard;

    const { id, full_name, role, phone, password, is_active } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Falta el id del usuario' }, { status: 400 });
    }

    // Toggle de estado (reactivar / desactivar).
    if (typeof is_active === 'boolean') {
      if (!is_active && id === userId) {
        return NextResponse.json(
          { error: 'No puedes desactivar tu propia cuenta' },
          { status: 400 }
        );
      }

      const { error } = await admin.from('profiles').update({ is_active }).eq('id', id);
      if (error) {
        return NextResponse.json({ error: 'Error al cambiar el estado' }, { status: 500 });
      }
      return NextResponse.json({ message: 'Estado actualizado' });
    }

    if (id === userId && role !== undefined && role !== 'admin') {
      return NextResponse.json(
        { error: 'No puedes quitarte a ti mismo el rol de administrador' },
        { status: 400 }
      );
    }

    const profileUpdate: Record<string, unknown> = {};
    if (full_name !== undefined) profileUpdate.full_name = full_name;
    if (phone !== undefined) profileUpdate.phone = phone;
    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) {
        return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
      }
      profileUpdate.role = role;
    }

    if (Object.keys(profileUpdate).length > 0) {
      const { error } = await admin.from('profiles').update(profileUpdate).eq('id', id);
      if (error) {
        return NextResponse.json({ error: 'Error al actualizar el perfil' }, { status: 500 });
      }
    }

    if (password) {
      if (password.length < 8) {
        return NextResponse.json(
          { error: 'La contraseña debe tener al menos 8 caracteres' },
          { status: 400 }
        );
      }

      const { error } = await admin.auth.admin.updateUserById(id, { password });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;
    const { admin, userId } = guard;

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Falta el id del usuario' }, { status: 400 });
    }

    if (id === userId) {
      return NextResponse.json(
        { error: 'No puedes desactivar tu propia cuenta' },
        { status: 400 }
      );
    }

    // Soft delete: la fila y todo su historial se conservan.
    const { error } = await admin.from('profiles').update({ is_active: false }).eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Error al desactivar el usuario' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Usuario desactivado exitosamente' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
