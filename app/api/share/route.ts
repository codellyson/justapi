import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { generateId, put } from './store';
import { requireAuth, isAuthError } from '@/src/server/require-auth';

const MAX_BYTES = 50_000;

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;
  const body = await request.text();
  if (body.length === 0 || body.length > MAX_BYTES) {
    return NextResponse.json(
      { error: 'Invalid payload size' },
      { status: 413 }
    );
  }
  try {
    JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 });
  }

  const id = generateId();
  try {
    const { env } = await getCloudflareContext({ async: true });
    await put(env.SHARE_BUCKET, id, body);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Storage failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
  return NextResponse.json({ id });
}
