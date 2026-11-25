/**
 * Fechas de solo dia ('YYYY-MM-DD'). Se manejan como texto y no con `new Date(...)`:
 * `new Date('2026-08-03')` es UTC midnight y en Chile (UTC-3) retrocede un dia.
 */

/** Hoy en hora local como 'YYYY-MM-DD' (`toISOString` usa UTC y de noche devuelve mañana). */
export function todayISO(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${now.getFullYear()}-${month}-${day}`;
}

/** 'YYYY-MM-DD' -> 'DD/MM/AA' */
export function formatDateShort(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-');

  if (!year || !month || !day) return value;

  return `${day}/${month}/${year.slice(-2)}`;
}

/** Deja solo digitos (max 6) y los agrupa como 'DD/MM/AA' mientras se escribe. */
export function maskDateShort(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 6);

  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 6)]
    .filter(Boolean)
    .join('/');
}

/** 'DD/MM/AA' -> 'YYYY-MM-DD' (siglo 20xx), o null si esta incompleta o no es una fecha real. */
export function parseDateShort(text: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(text);

  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = 2000 + Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  if (!isRealDate) return null;

  return `${year}-${match[2]}-${match[1]}`;
}
