import { NextResponse, connection } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getPulse } from '@/lib/admin-queries';
import { NO_STORE, apiError } from '../_shared';

/** Sidebar badges + notification bell. Polled by the shell every 30 s. */
export async function GET() {
  await connection();
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json(await getPulse(), { headers: NO_STORE });
  } catch (err) {
    return apiError(err, 'api/admin/pulse');
  }
}
