import { isOtFileBucket } from '@/lib/ot-files';
import { NextRequest, NextResponse } from 'next/server';
import { requireActiveUser } from '../guard';

const MAX_EXPIRES_IN = 300;

export async function POST(request: NextRequest) {
  const guard = await requireActiveUser();
  if (!guard.ok) return guard.response;

  const { bucket, path, expiresIn } = await request.json().catch(() => ({}));

  if (!isOtFileBucket(bucket)) {
    return NextResponse.json({ error: 'Bucket inválido' }, { status: 400 });
  }

  if (typeof path !== 'string' || !path || path.includes('..')) {
    return NextResponse.json({ error: 'Ruta inválida' }, { status: 400 });
  }

  const seconds = Math.min(Math.max(Number(expiresIn) || 60, 1), MAX_EXPIRES_IN);

  const { data, error } = await guard.admin.storage.from(bucket).createSignedUrl(path, seconds);

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'No se pudo generar el enlace' },
      { status: 404 }
    );
  }

  return NextResponse.json({ signedUrl: data.signedUrl });
}
