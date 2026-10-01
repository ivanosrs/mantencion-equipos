'use client';

import { createClient } from '@/lib/supabase/client';

const IDLE_MS = 30 * 60 * 1000;
const ACTIVITY_THROTTLE_MS = 1000; // evitar escrituras excesivas

type SessionState = {
  accessToken: string | null;
  userId: string | null;
  jwtExpMs: number | null; // exp de JWT en ms
  lastActivityMs: number;
  rememberMe: boolean;
  loginAt: number;
};

type SessionData = SessionState & {
  effectiveExpiresAt: number | null;
  isExpired: boolean;
};

const SESSION_KEY = 'mantencion_session_v1';
const LOGOUT_FLAG_KEY = 'mantencion_logging_out';

function nowMs(): number {
  return Date.now();
}

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function getStorage(rememberMe: boolean): Storage {
  if (typeof window === 'undefined') return sessionStorage;
  try {
    return rememberMe ? localStorage : sessionStorage;
  } catch {
    return sessionStorage;
  }
}

function readSession(): SessionState | null {
  if (typeof window === 'undefined') return null;
  const fromLocal = safeParse<SessionState>(localStorage.getItem(SESSION_KEY));
  const fromSession = safeParse<SessionState>(sessionStorage.getItem(SESSION_KEY));
  const data = fromLocal || fromSession;
  if (!data) return null;
  return data;
}

function writeSession(state: SessionState) {
  if (typeof window === 'undefined') return;
  const storage = getStorage(state.rememberMe);
  try {
    storage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
  // limpiar el otro storage para evitar duplicidad/conflicto
  try {
    const other = storage === localStorage ? sessionStorage : localStorage;
    other.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

function clearSessionStorage() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

function getEffectiveExpiresAt(state: SessionState | null): number | null {
  if (!state) return null;
  const { jwtExpMs, lastActivityMs } = state;
  if (jwtExpMs == null) return null;
  const idleExpiresAt = lastActivityMs + IDLE_MS;
  return Math.min(jwtExpMs, idleExpiresAt);
}

export function isSessionExpired(now: number = nowMs(), state?: SessionState | null): boolean {
  const s = state ?? readSession();
  if (!s) return true;
  const effective = getEffectiveExpiresAt(s);
  if (effective == null) return true;
  // usar epsilon pequeño
  return now >= effective - 50;
}

export function getSessionData(): SessionData | null {
  const s = readSession();
  if (!s) return null;
  const effectiveExpiresAt = getEffectiveExpiresAt(s);
  const isExpired = effectiveExpiresAt == null ? true : nowMs() >= effectiveExpiresAt - 50;
  return { ...s, effectiveExpiresAt, isExpired };
}

export function updateLastActivity(ts: number = nowMs(), throttle: boolean = true): boolean {
  if (typeof window === 'undefined') return false;
  const s = readSession();
  if (!s) return false;
  if (isSessionExpired(ts, s)) {
    // no actualizar si ya expirado; dejar que checkAndLogout actúe
    void checkAndLogout();
    return false;
  }
  if (throttle) {
    const last = s.lastActivityMs;
    if (ts - last < ACTIVITY_THROTTLE_MS) {
      return false; // throttle
    }
  }
  const next: SessionState = { ...s, lastActivityMs: ts };
  writeSession(next);
  return true;
}

export function setSession(params: {
  accessToken?: string | null;
  userId?: string | null;
  jwtExpMs: number | null;
  rememberMe: boolean;
  loginAt?: number;
}) {
  const ts = params.loginAt ?? nowMs();
  const s: SessionState = {
    accessToken: params.accessToken ?? null,
    userId: params.userId ?? null,
    jwtExpMs: params.jwtExpMs,
    lastActivityMs: ts,
    rememberMe: params.rememberMe,
    loginAt: ts,
  };
  writeSession(s);
}

/**
 * Sincroniza la metadata de sesión preservando el reloj de inactividad cuando
 * se trata del mismo usuario. Evita que una recarga (o reanudación tras
 * suspensión) reinicie la ventana de 30 minutos.
 */
export function syncSession(params: {
  accessToken: string | null;
  userId: string | null;
  jwtExpMs: number | null;
  rememberMe: boolean;
}) {
  const existing = readSession();
  const sameUser = !!existing?.userId && !!params.userId && existing.userId === params.userId;
  const ts = nowMs();
  const s: SessionState = {
    accessToken: params.accessToken,
    userId: params.userId,
    jwtExpMs: params.jwtExpMs,
    rememberMe: params.rememberMe,
    lastActivityMs: sameUser ? existing!.lastActivityMs : ts,
    loginAt: sameUser ? existing!.loginAt : ts,
  };
  writeSession(s);
}

export function updateJwtExpMs(jwtExpMs: number | null) {
  if (typeof window === 'undefined') return;
  const s = readSession();
  if (!s) return;
  writeSession({ ...s, jwtExpMs });
}

export function setRememberMe(rememberMe: boolean) {
  if (typeof window === 'undefined') return;
  const s = readSession();
  if (!s) return;
  writeSession({ ...s, rememberMe });
}

export function getRememberMeFromCookie(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const match = document.cookie
      .split('; ')
      .find((row) => row.startsWith('m_remember='));
    return match?.split('=')[1] === '1';
  } catch {
    return false;
  }
}

export function clearSession() {
  clearSessionStorage();
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(LOGOUT_FLAG_KEY);
    } catch {
      // ignore
    }
  }
}

function buildLoginUrl(): string {
  if (typeof window === 'undefined') return '/login';
  try {
    const current = window.location.pathname + window.location.search;
    // evitar bucle si ya en login
    if (current.startsWith('/login')) {
      return '/login';
    }
    const url = new URL('/login', window.location.origin);
    url.searchParams.set('returnUrl', current);
    return url.toString();
  } catch {
    return '/login';
  }
}

let loggingOut = false;
let activityListenersBound = false;
let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
let periodicTimer: ReturnType<typeof setInterval> | null = null;

function setLoggingOut(flag: boolean) {
  loggingOut = flag;
  if (typeof window !== 'undefined') {
    try {
      if (flag) sessionStorage.setItem(LOGOUT_FLAG_KEY, '1');
      else sessionStorage.removeItem(LOGOUT_FLAG_KEY);
    } catch {
      // ignore
    }
  }
}

export async function checkAndLogout() {
  if (typeof window === 'undefined') return;
  if (loggingOut) return;
  // Si aún no hay metadata de sesión, no se puede concluir expiración:
  // se deja que el guard/middleware de rutas decida.
  const state = readSession();
  if (!state) return;
  if (isSessionExpired(nowMs(), state)) {
    setLoggingOut(true);
    clearAllTimersAndListeners();
    clearSessionStorage();
    // intentar signOut silencioso (cliente) si hay supabase
    try {
      const supabase = createClient();
      await supabase.auth.signOut().catch(() => undefined);
    } catch {
      // ignore
    }
    const loginUrl = buildLoginUrl();
    window.location.assign(loginUrl);
  }
}

function clearAllTimersAndListeners() {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
  if (periodicTimer) {
    clearInterval(periodicTimer);
    periodicTimer = null;
  }
  if (typeof window !== 'undefined' && activityListenersBound) {
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'touchmove', 'pointerdown'];
    activityEvents.forEach((event) => {
      window.removeEventListener(event, handleActivity as EventListener);
    });
    window.removeEventListener('focus', handleFocus as EventListener);
    document.removeEventListener('visibilitychange', handleVisibilityChange as EventListener);
    window.removeEventListener('online', handleOnline as EventListener);
    window.removeEventListener('pageshow', handlePageShow as EventListener);
    activityListenersBound = false;
  }
}

function handleActivity() {
  const updated = updateLastActivity(nowMs(), true);
  if (updated) {
    scheduleInactivityTimer();
  }
}

function handleFocus() {
  void checkAndLogout();
}

function handleVisibilityChange() {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
    void checkAndLogout();
  }
  // al volverse invisible no hace nada
}

function handleOnline() {
  void checkAndLogout();
}

function handlePageShow(e: PageTransitionEvent) {
  if (e.persisted) {
    void checkAndLogout();
    return;
  }
  void checkAndLogout();
}

function scheduleInactivityTimer() {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
  const s = readSession();
  if (!s) return;
  const effective = getEffectiveExpiresAt(s);
  if (effective == null) return;
  const now = nowMs();
  const remaining = Math.max(0, effective - now);
  // programar timeout al momento efectivo
  inactivityTimer = setTimeout(() => {
    void checkAndLogout();
  }, remaining);
}

function startPeriodicCheck() {
  if (periodicTimer) clearInterval(periodicTimer);
  periodicTimer = setInterval(() => {
    void checkAndLogout();
  }, 15000); // cada 15s
}

export function initSessionListeners() {
  if (typeof window === 'undefined') return;
  // evitar reinicializar múltiples veces
  if (activityListenersBound) return;
  const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'touchmove', 'pointerdown'];
  activityEvents.forEach((event) => {
    window.addEventListener(event, handleActivity as EventListener, { passive: true });
  });
  window.addEventListener('focus', handleFocus as EventListener);
  document.addEventListener('visibilitychange', handleVisibilityChange as EventListener);
  window.addEventListener('online', handleOnline as EventListener);
  window.addEventListener('pageshow', handlePageShow as EventListener);
  activityListenersBound = true;
  scheduleInactivityTimer();
  startPeriodicCheck();
  // chequeo inicial inmediato
  void checkAndLogout();
}

export function stopSessionListeners() {
  clearAllTimersAndListeners();
}

export function getJwtExpMsFromToken(token: string | null | undefined): number | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const decoded = atob(padded);
    const json = JSON.parse(decoded) as { exp?: number };
    if (typeof json.exp === 'number') {
      // exp en seconds
      return json.exp * 1000;
    }
    return null;
  } catch {
    return null;
  }
}