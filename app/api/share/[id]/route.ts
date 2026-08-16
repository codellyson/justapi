import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { get, isValidId } from '../store';
import { requireAuth, isAuthError } from '@/src/server/require-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;
  const { id } = await params;
  if (!isValidId(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }
  const { env } = await getCloudflareContext({ async: true });
  const data = await get(env.SHARE_BUCKET, id);
  if (data === null) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return new NextResponse(data, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
