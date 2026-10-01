import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const REMEMBER_COOKIE = 'm_remember';
const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30;

// `/login` y la ficha pública de equipo (accesible vía QR) permanecen abiertas.
const PUBLIC_PATHS = ['/login', '/equipments'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const remember = request.cookies.get(REMEMBER_COOKIE)?.value === '1';

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: remember ? { maxAge: REMEMBER_MAX_AGE, path: '/' } : { path: '/' },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresca la sesión (escribe cookies actualizadas) antes de decidir.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith('/api');
  const isLoginPage = pathname === '/login';

  // Usuario logueado en la página de login -> al dashboard.
  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Rutas públicas (login): permitir.
  if (isPublicPath(pathname)) {
    return supabaseResponse;
  }

  // A partir de aquí todo requiere sesión.
  if (!user) {
    if (isApi) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    if (pathname !== '/') {
      url.searchParams.set('returnUrl', pathname + request.nextUrl.search);
    }
    return NextResponse.redirect(url);
  }

  // Bloquear usuarios dados de baja (soft delete).
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_active')
    .eq('id', user.id)
    .single();

  if (profile && profile.is_active === false) {
    await supabase.auth.signOut();
    if (isApi) {
      return NextResponse.json({ error: 'inactive' }, { status: 403 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '?error=inactivo';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}