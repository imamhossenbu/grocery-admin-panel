import { requireAdmin } from '@/lib/auth';
import { revalidateStorefront } from '@/lib/revalidate-storefront';
import { revalidateAdminData } from '@/lib/revalidate-admin';
import { NextResponse } from 'next/server';
import {
  StoreError,
  deleteCategory,
  deleteCoupon,
  deleteOrder,
  deleteProduct,
  deleteProducts,
  deleteReview,
  insertProduct,
  markOrderRefunded,
  productExists,
  reorderCategories,
  saveCategory,
  saveCoupon,
  setOrderStatus,
  setOrdersStatus,
  setProductActive,
  setProductsActive,
  setProductsCategory,
  saveDeliverySettings,
  setMessageRead,
  setReviewApproved,
  setProductFeatured,
  setProductStock,
  updateProduct,
} from '@/lib/supabase-db';
import {
  asPayload,
  parseBulkActive,
  parseBulkCategory,
  parseBulkOrderStatus,
  parseCategory,
  parseCategoryReorder,
  parseCoupon,
  parseDeliverySettings,
  parseId,
  parseIdList,
  parseMessageRead,
  parseOrderStatus,
  parseProduct,
  parseQuickStock,
  parseReviewId,
  parseReviewModeration,
  parseToggle,
} from '@/lib/store-validation';

/** What an action reports back (e.g. the id of a newly created product). */
type ActionResult = { id?: string; count?: number } | void;

/** Actions that cannot change anything the storefront shows. */
const NO_STOREFRONT_IMPACT = new Set(['MARK_ORDER_REFUNDED', 'DELETE_ORDER', 'SET_MESSAGE_READ']);

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

/** Runs one targeted row operation. Throws a StoreError on bad input. */
async function runAction(action: unknown, rawPayload: unknown): Promise<ActionResult> {
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
        return { id: await insertProduct(product, id) };
      }
      if (!id) throw new StoreError(400, 'VALIDATION_ERROR', 'Product id is required.');
      await updateProduct(id, product);
      return { id };
    }

    case 'BULK_SET_PRODUCTS_ACTIVE': {
      const { ids, active } = parseBulkActive(asPayload(rawPayload));
      return { count: await setProductsActive(ids, active) };
    }

    case 'BULK_SET_PRODUCTS_CATEGORY': {
      const { ids, category } = parseBulkCategory(asPayload(rawPayload));
      return { count: await setProductsCategory(ids, category) };
    }

    case 'BULK_DELETE_PRODUCTS':
      return { count: await deleteProducts(parseIdList(asPayload(rawPayload), 'ids', 'Product ids')) };

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

    case 'BULK_UPDATE_ORDER_STATUS': {
      const { ids, status } = parseBulkOrderStatus(asPayload(rawPayload));
      return { count: await setOrdersStatus(ids, status) };
    }

    case 'MARK_ORDER_REFUNDED':
      return markOrderRefunded(parseId(asPayload(rawPayload), 'id', 'Order id'));

    case 'SET_REVIEW_APPROVED': {
      const { id, approved } = parseReviewModeration(asPayload(rawPayload));
      return setReviewApproved(id, approved);
    }

    case 'DELETE_REVIEW':
      return deleteReview(parseReviewId(asPayload(rawPayload)));

    case 'SET_MESSAGE_READ': {
      const { id, read } = parseMessageRead(asPayload(rawPayload));
      return setMessageRead(id, read);
    }

    case 'SAVE_DELIVERY_SETTINGS':
      return saveDeliverySettings(parseDeliverySettings(asPayload(rawPayload)));

    case 'REVALIDATE_STOREFRONT':
      // Nothing to write: the revalidation below is the whole action.
      return;

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

    const result = await runAction(action, payload);
    revalidateAdminData();
    if (typeof action === 'string' && !NO_STOREFRONT_IMPACT.has(action)) {
      // Delivery charges also expire the storefront's settings cache at once.
      await revalidateStorefront(action === 'SAVE_DELIVERY_SETTINGS' || action === 'REVALIDATE_STOREFRONT' ? ['settings'] : []);
    }

    // The panel re-reads what it shows through its server components
    // (router.refresh()), so the response only carries the action's result.
    return NextResponse.json({ success: true, result: result ?? null }, { headers: NO_STORE });
  } catch (err) {
    return errorResponse(err);
  }
}
