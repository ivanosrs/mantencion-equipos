import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Archivos de las OT (firma y adjunto) en Storage.
 *
 * Los buckets son privados y no tienen politicas en storage.objects, asi que el
 * navegador no puede subir ni firmar URLs con su sesion. El servidor valida la
 * sesion y emite URLs firmadas con la service role (/api/ot-files/*):
 * - subida: URL de subida firmada, el archivo va directo a Supabase (sin pasar
 *   por Vercel, que limita el body a ~4.5 MB).
 * - lectura: URL firmada de descarga.
 */

export const OT_FILE_BUCKETS = ['signatures', 'attachments'] as const;

export type OtFileBucket = (typeof OT_FILE_BUCKETS)[number];

export function isOtFileBucket(value: unknown): value is OtFileBucket {
  return OT_FILE_BUCKETS.includes(value as OtFileBucket);
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error ?? `Error ${response.status}`);
  }

  return data as T;
}

/** Sube el archivo de una OT y devuelve su path dentro del bucket. */
export async function uploadOtFile(
  supabase: SupabaseClient,
  bucket: OtFileBucket,
  equipmentId: string,
  file: Blob,
  fileName: string
): Promise<string> {
  const { path, token } = await postJson<{ path: string; token: string }>(
    '/api/ot-files/upload-url',
    { bucket, equipmentId, fileName }
  );

  const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, file, {
    contentType: file.type || undefined,
  });

  if (error) throw error;

  return path;
}

/** URL firmada para ver o descargar un archivo de una OT. */
export async function getOtFileUrl(
  bucket: OtFileBucket,
  path: string,
  expiresIn = 60
): Promise<string> {
  const { signedUrl } = await postJson<{ signedUrl: string }>('/api/ot-files/signed-url', {
    bucket,
    path,
    expiresIn,
  });

  return signedUrl;
}
