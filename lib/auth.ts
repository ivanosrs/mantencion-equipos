'use server';

import { cookies } from 'next/headers';
import { createClient, REMEMBER_COOKIE, REMEMBER_MAX_AGE } from '@/lib/supabase/server';
import type { AuthError } from '@supabase/supabase-js';

export async function signUp(email: string, password: string, fullName: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  return { data, error };
}

export async function signIn(
  email: string,
  password: string,
  rememberMe = false
): Promise<{ data: { user: { id: string } } | null; error: AuthError | null }> {
  // Persistir la preferencia "Recordarme" ANTES de crear el cliente para que
  // las cookies de sesión de Supabase adopten (o no) el maxAge correspondiente.
  const cookieStore = await cookies();
  cookieStore.set(REMEMBER_COOKIE, rememberMe ? '1' : '0', {
    path: '/',
    sameSite: 'lax',
    ...(rememberMe ? { maxAge: REMEMBER_MAX_AGE } : {}),
  });

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { data: null, error };
  }

  // Baja logica: un usuario desactivado no puede iniciar sesion.
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_active')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profile?.is_active === false) {
    await supabase.auth.signOut();
    return {
      data: null,
      error: {
        message: 'Tu cuenta está desactivada. Contacta al administrador para reactivarla.',
      } as AuthError,
    };
  }

  return { data: { user: data.user }, error: null };
}

export async function signOut() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  return { error };
}

export async function getUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { user, error };
}

export async function getUserProfile() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}