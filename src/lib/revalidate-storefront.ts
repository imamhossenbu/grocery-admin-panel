import 'server-only';

/**
 * Tell the storefront to drop its cached catalog after an admin change, so
 * new prices/stock/products show up immediately instead of after the cache
 * lifetime. Best effort: a failure is logged, never shown as a failed save.
 */
export async function revalidateStorefront(): Promise<void> {
  const url = process.env.STOREFRONT_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!url || !secret) return;
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/api/revalidate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) console.error(`Storefront revalidate failed: HTTP ${res.status}`);
  } catch (err) {
    console.error('Storefront revalidate failed:', err instanceof Error ? err.message : err);
  }
}
