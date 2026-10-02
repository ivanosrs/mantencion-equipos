'use client';

import { useSyncExternalStore } from 'react';

// Telefonos y tablets reportan un puntero principal "coarse" (dedo);
// en desktop es "fine" (mouse/trackpad), aunque el notebook tenga pantalla tactil.
const QUERY = '(pointer: coarse)';

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

export function useIsTouchDevice() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  );
}
