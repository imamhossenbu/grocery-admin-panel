import { NextRequest, NextResponse } from 'next/server';
import { readCloudStore, writeCloudStore } from '@/lib/supabase-db';
import { INITIAL_STORE_DATA } from '@/lib/seed-data';
import { Category, Coupon, OrderStatus, Product } from '@/types/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await readCloudStore();
    return NextResponse.json(db, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch store database', details: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;
    const db = await readCloudStore();

    switch (action) {
      case 'SAVE_PRODUCT': {
        const product = payload as Product;
        const exists = db.products.some((p) => p.id === product.id);
        const products = exists
          ? db.products.map((p) => (p.id === product.id ? product : p))
          : [product, ...db.products];
        const updated = await writeCloudStore({ ...db, products });
        return NextResponse.json({ success: true, db: updated });
      }

      case 'DELETE_PRODUCT': {
        const { id } = payload as { id: string };
        const products = db.products.filter((p) => p.id !== id);
        const updated = await writeCloudStore({ ...db, products });
        return NextResponse.json({ success: true, db: updated });
      }

      case 'TOGGLE_PRODUCT_ACTIVE': {
        const { id, active } = payload as { id: string; active: boolean };
        const products = db.products.map((p) =>
          p.id === id ? { ...p, active } : p
        );
        const updated = await writeCloudStore({ ...db, products });
        return NextResponse.json({ success: true, db: updated });
      }

      case 'TOGGLE_PRODUCT_FEATURED': {
        const { id, featured } = payload as { id: string; featured: boolean };
        const products = db.products.map((p) =>
          p.id === id ? { ...p, featured } : p
        );
        const updated = await writeCloudStore({ ...db, products });
        return NextResponse.json({ success: true, db: updated });
      }

      case 'QUICK_STOCK_UPDATE': {
        const { id, stock, price } = payload as {
          id: string;
          stock: number;
          price?: number;
        };
        const products = db.products.map((p) =>
          p.id === id
            ? { ...p, stock, ...(price !== undefined ? { price } : {}) }
            : p
        );
        const updated = await writeCloudStore({ ...db, products });
        return NextResponse.json({ success: true, db: updated });
      }

      case 'SAVE_CATEGORY': {
        const category = payload as Category;
        const exists = db.categories.some((c) => c.id === category.id);
        const categories = exists
          ? db.categories.map((c) => (c.id === category.id ? category : c))
          : [...db.categories, category];
        const updated = await writeCloudStore({ ...db, categories });
        return NextResponse.json({ success: true, db: updated });
      }

      case 'DELETE_CATEGORY': {
        const { id } = payload as { id: string };
        const categories = db.categories.filter((c) => c.id !== id);
        const updated = await writeCloudStore({ ...db, categories });
        return NextResponse.json({ success: true, db: updated });
      }

      case 'UPDATE_ORDER_STATUS': {
        const { id, status } = payload as { id: string; status: OrderStatus };
        const orders = db.orders.map((o) =>
          o.id === id ? { ...o, status } : o
        );
        const updated = await writeCloudStore({ ...db, orders });
        return NextResponse.json({ success: true, db: updated });
      }

      case 'DELETE_ORDER': {
        const { id } = payload as { id: string };
        const orders = db.orders.filter((o) => o.id !== id);
        const updated = await writeCloudStore({ ...db, orders });
        return NextResponse.json({ success: true, db: updated });
      }

      case 'SAVE_COUPON': {
        const coupon = payload as Coupon;
        const codeUpper = coupon.code.trim().toUpperCase();
        const normalized = { ...coupon, code: codeUpper };
        const exists = db.coupons.some((c) => c.code === codeUpper);
        const coupons = exists
          ? db.coupons.map((c) => (c.code === codeUpper ? normalized : c))
          : [...db.coupons, normalized];
        const updated = await writeCloudStore({ ...db, coupons });
        return NextResponse.json({ success: true, db: updated });
      }

      case 'DELETE_COUPON': {
        const { code } = payload as { code: string };
        const coupons = db.coupons.filter((c) => c.code !== code);
        const updated = await writeCloudStore({ ...db, coupons });
        return NextResponse.json({ success: true, db: updated });
      }

      case 'RESET_DEMO_DATA': {
        const updated = await writeCloudStore(INITIAL_STORE_DATA);
        return NextResponse.json({ success: true, db: updated });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: 'Admin action failed', details: String(err) },
      { status: 500 }
    );
  }
}

