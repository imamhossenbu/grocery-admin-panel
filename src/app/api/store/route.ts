import { requireAdmin } from '@/lib/auth';
import { revalidateStorefront } from '@/lib/revalidate-storefront';
import { NextResponse, connection } from 'next/server';
import {
  StoreError,
  deleteCategory,
  deleteCoupon,
  deleteOrder,
  deleteProduct,
  insertProduct,
  productExists,
  readStore,
  reorderCategories,
  saveCategory,
  saveCoupon,
  setOrderStatus,
  setProductActive,
  setProductFeatured,
  setProductStock,
  updateProduct,
} from '@/lib/supabase-db';
import {
  asPayload,
  parseCategory,
  parseCategoryReorder,
  parseCoupon,
  parseId,
  parseOrderStatus,
  parseProduct,
  parseQuickStock,
  parseToggle,
} from '@/lib/store-validation';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

/** Every failure leaves the API as `{ error: CODE, message: human text }`. */
function errorResponse(err: unknown) {
  if (err instanceof StoreError) {
    return NextResponse.json(
      { error: err.code, message: err.message },
      { status: err.status, headers: NO_STORE }
    );
  }
  console.error('[api/store] unexpected error:', err);
  return NextResponse.json(
    { error: 'INTERNAL_ERROR', message: 'Something went wrong on the server. Please try again.' },
    { status: 500, headers: NO_STORE }
  );
}

export async function GET() {
  // Always read live data: never prerender or cache this response.
  await connection();
  // Defence in depth: proxy.ts already blocks non-admins, but this route
  // must never rely on that alone.
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json(await readStore(), { headers: NO_STORE });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Runs one targeted row operation. Throws a StoreError on bad input. */
async function runAction(action: unknown, rawPayload: unknown): Promise<void> {
  switch (action) {
    case 'SAVE_PRODUCT': {
      const payload = asPayload(rawPayload);
      const product = parseProduct(payload);
      const id = typeof payload.id === 'string' ? payload.id.trim() : '';
      // The UI says whether this is a new product. Without the flag, fall
      // back to "update if the id exists, otherwise create".
      const isNew =
        typeof payload.isNew === 'boolean' ? payload.isNew : !id || !(await productExists(id));
      if (isNew) {
        await insertProduct(product, id);
      } else {
        if (!id) throw new StoreError(400, 'VALIDATION_ERROR', 'Product id is required.');
        await updateProduct(id, product);
      }
      return;
    }

    case 'DELETE_PRODUCT':
      return deleteProduct(parseId(asPayload(rawPayload), 'id', 'Product id'));

    case 'TOGGLE_PRODUCT_ACTIVE': {
      const { id, value } = parseToggle(asPayload(rawPayload), 'active');
      return setProductActive(id, value);
    }

    case 'TOGGLE_PRODUCT_FEATURED': {
      const { id, value } = parseToggle(asPayload(rawPayload), 'featured');
      return setProductFeatured(id, value);
    }

    case 'QUICK_STOCK_UPDATE': {
      const { id, stock, price } = parseQuickStock(asPayload(rawPayload));
      return setProductStock(id, stock, price);
    }

    case 'SAVE_CATEGORY':
      return saveCategory(parseCategory(asPayload(rawPayload)));

    case 'REORDER_CATEGORIES':
      return reorderCategories(parseCategoryReorder(asPayload(rawPayload)));

    case 'DELETE_CATEGORY':
      return deleteCategory(parseId(asPayload(rawPayload), 'id', 'Category id'));

    case 'UPDATE_ORDER_STATUS': {
      const { id, status } = parseOrderStatus(asPayload(rawPayload));
      return setOrderStatus(id, status);
    }

    case 'DELETE_ORDER':
      return deleteOrder(parseId(asPayload(rawPayload), 'id', 'Order id'));

    case 'SAVE_COUPON':
      return saveCoupon(parseCoupon(asPayload(rawPayload)));

    case 'DELETE_COUPON':
      return deleteCoupon(parseId(asPayload(rawPayload), 'code', 'Coupon code'));

    default:
      throw new StoreError(
        400,
        'UNKNOWN_ACTION',
        `Unknown action${typeof action === 'string' ? ` "${action}"` : ''}.`
      );
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new StoreError(400, 'VALIDATION_ERROR', 'Request body must be valid JSON.');
    }
    const { action, payload } = asPayload(body);

    await runAction(action, payload);
    await revalidateStorefront();

    return NextResponse.json({ success: true, db: await readStore() }, { headers: NO_STORE });
  } catch (err) {
    return errorResponse(err);
  }
}
