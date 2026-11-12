import { NextResponse, connection, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { searchEverything } from '@/lib/admin-queries';
import { NO_STORE, apiError } from '../_shared';

/** Command palette lookup: orders by id/phone/name, products by name/SKU, customers. */
export async function GET(req: NextRequest) {
  await connection();
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const q = req.nextUrl.searchParams.get('q') ?? '';
    return NextResponse.json(await searchEverything(q), { headers: NO_STORE });
  } catch (err) {
    return apiError(err, 'api/admin/search');
  }
}
