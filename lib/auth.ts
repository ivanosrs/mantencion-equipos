'use server';

import { createClient } from '@/lib/supabase/server';
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
  password: string
): Promise<{ data: { user: { id: string } } | null; error: AuthError | null }> {
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
