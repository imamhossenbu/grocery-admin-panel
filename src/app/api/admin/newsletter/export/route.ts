import { connection } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { exportSubscribers } from '@/lib/admin-queries';
import { csvResponse, toCsv } from '@/lib/csv';
import { todayKey } from '@/lib/dates';
import { apiError } from '../../_shared';

export async function GET() {
  await connection();
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const rows = await exportSubscribers();
    return csvResponse(
      `newsletter-subscribers-${todayKey()}.csv`,
      toCsv(['Email', 'Subscribed at (UTC)'], rows.map((s) => [s.email, s.createdAt]))
    );
  } catch (err) {
    return apiError(err, 'api/admin/newsletter/export');
  }
}
