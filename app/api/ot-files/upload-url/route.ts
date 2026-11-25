import { isOtFileBucket } from '@/lib/ot-files';
import { NextRequest, NextResponse } from 'next/server';
import { requireActiveUser } from '../guard';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Storage rechaza claves con tildes, ñ y otros caracteres ("Invalid key"):
 * se quitan los acentos y el resto queda como '_'.
 */
function safeFileName(name: string): string {
  const cleaned = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^[._]+/, '')
    .slice(-100);

  return cleaned || 'archivo';
}

export async function POST(request: NextRequest) {
  const guard = await requireActiveUser();
  if (!guard.ok) return guard.response;

  const { bucket, equipmentId, fileName } = await request.json().catch(() => ({}));

  if (!isOtFileBucket(bucket)) {
    return NextResponse.json({ error: 'Bucket inválido' }, { status: 400 });
  }

  if (typeof equipmentId !== 'string' || !UUID_REGEX.test(equipmentId)) {
    return NextResponse.json({ error: 'Equipo inválido' }, { status: 400 });
  }

  if (typeof fileName !== 'string' || !fileName.trim()) {
    return NextResponse.json({ error: 'Falta el nombre del archivo' }, { status: 400 });
  }

  const path = `${equipmentId}/${Date.now()}-${safeFileName(fileName)}`;

  const { data, error } = await guard.admin.storage.from(bucket).createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'No se pudo preparar la subida' },
      { status: 500 }
    );
  }

  return NextResponse.json({ path: data.path, token: data.token });
}
