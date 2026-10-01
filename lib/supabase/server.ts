import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const REMEMBER_COOKIE = 'm_remember';
export const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30; // 30 días

export const createClient = async () => {
  const cookieStore = await cookies();
  const remember = cookieStore.get(REMEMBER_COOKIE)?.value === '1';

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: remember ? { maxAge: REMEMBER_MAX_AGE, path: '/' } : { path: '/' },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
};

export { REMEMBER_COOKIE };
