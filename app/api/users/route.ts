import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password, full_name, role, phone } = await request.json();

    if (!email || !password || !full_name || !role) {
      return NextResponse.json(
        { error: 'Email, contraseña, nombre y rol son requeridos' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Create auth user
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    // Create profile
    const { error: profileError } = await admin
      .from('profiles')
      .insert({
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
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
