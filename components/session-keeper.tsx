'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  clearSession,
  getJwtExpMsFromToken,
  getRememberMeFromCookie,
  initSessionListeners,
  stopSessionListeners,
  syncSession,
  updateJwtExpMs,
} from '@/lib/session';

export function SessionKeeper() {
  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    function applySession(accessToken: string, userId: string | null) {
      syncSession({
        accessToken,
        userId,
        jwtExpMs: getJwtExpMsFromToken(accessToken),
        rememberMe: getRememberMeFromCookie(),
      });
      initSessionListeners();
    }

    async function bootstrap() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session?.access_token) {
          applySession(session.access_token, session.user?.id ?? null);
        } else {
          stopSessionListeners();
          clearSession();
        }
      } catch {
        // ignore
      }
    }

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        stopSessionListeners();
        clearSession();
        return;
      }
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session?.access_token) {
          applySession(session.access_token, session.user?.id ?? null);
        }
        return;
      }
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.access_token) {
          updateJwtExpMs(getJwtExpMsFromToken(session.access_token));
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      stopSessionListeners();
    };
  }, []);

  return null;
}