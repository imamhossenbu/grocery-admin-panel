import { createClient } from '@supabase/supabase-js';
import { StoreDatabase } from '@/types/store';
import { INITIAL_STORE_DATA } from './seed-data';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || '';
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

const BUCKET_NAME = 'ecommerce-store';
const DB_FILE = 'database.json';

export const supabasePublic = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

export function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  });
}

export async function readCloudStore(): Promise<StoreDatabase> {
  try {
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${DB_FILE}?t=${Date.now()}`;
    const res = await fetch(publicUrl, { cache: 'no-store' });

    if (res.ok) {
      const data = (await res.json()) as StoreDatabase;
      if (data && Array.isArray(data.products) && data.products.length > 0) {
        return data;
      }
    }

    // If not seeded yet in Supabase Cloud, seed it automatically right now
    await writeCloudStore(INITIAL_STORE_DATA);
    return INITIAL_STORE_DATA;
  } catch (err) {
    console.error('Supabase cloud read fallback to seed:', err);
    return INITIAL_STORE_DATA;
  }
}

export async function writeCloudStore(db: StoreDatabase): Promise<StoreDatabase> {
  const updated: StoreDatabase = {
    ...db,
    updatedAt: new Date().toISOString(),
  };

  try {
    // Ensure bucket exists
    await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: BUCKET_NAME,
        name: BUCKET_NAME,
        public: true,
      }),
    }).catch(() => {});

    // Upload/overwrite database.json in Supabase Cloud Storage
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${DB_FILE}`;
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'x-upsert': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      body: JSON.stringify(updated, null, 2),
    });

    if (!res.ok) {
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          apikey: SUPABASE_SECRET_KEY,
          Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
          'Content-Type': 'application/json',
          'x-upsert': 'true',
        },
        body: JSON.stringify(updated, null, 2),
      });
      if (!putRes.ok) {
        console.error('Failed to write to Supabase storage:', await putRes.text());
      }
    }

    // Optional: also sync to PostgreSQL tables if the user ran supabase-schema.sql
    const admin = getSupabaseAdmin();
    await Promise.allSettled([
      admin.from('categories').upsert(
        updated.categories.map((c) => ({
          id: c.id,
          name: c.name,
          blurb: c.blurb,
          image: c.image,
        }))
      ),
      admin.from('products').upsert(
        updated.products.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          unit: p.unit,
          price: p.price,
          old_price: p.oldPrice ?? null,
          description: p.description,
          image: p.image,
          badge: p.badge ?? null,
          rating: p.rating,
          sku: p.sku,
          stock: p.stock,
          featured: p.featured,
          active: p.active,
          origin: p.origin ?? 'Bangladesh',
          nutrition: p.nutrition ?? '100% Farm Fresh',
        }))
      ),
    ]);
  } catch (err) {
    console.error('Supabase write error:', err);
  }

  return updated;
}

export function formatBDT(amount: number): string {
  return `৳${Math.round(amount).toLocaleString('en-IN')}`;
}

