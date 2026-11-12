'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Layers,
  LayoutDashboard,
  Loader2,
  Package,
  ShoppingBag,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import { Category, Coupon, Order, OrderStatus, Product, StoreDatabase } from '@/types/store';
import { AdminNavbar } from '@/components/AdminNavbar';
import { redirectToLogin } from '@/lib/redirect-to-login';
import { DashboardOverview } from '@/components/DashboardOverview';
import { ProductsManager } from '@/components/ProductsManager';
import { OrdersManager } from '@/components/OrdersManager';
import { CategoriesManager } from '@/components/CategoriesManager';
import { CouponsManager } from '@/components/CouponsManager';

type TabKey = 'dashboard' | 'products' | 'orders' | 'categories' | 'coupons';

interface Toast {
  id: string;
  title: string;
  desc?: string;
  type?: 'success' | 'error' | 'info';
}

const EMPTY_STORE: StoreDatabase = {
  categories: [],
  products: [],
  coupons: [],
  orders: [],
  updatedAt: '',
};

interface LoadError {
  code: string;
  message: string;
}

/** Reads `{ error, message }` from a failed API response. */
async function readApiError(res: Response): Promise<LoadError> {
  const body = await res.json().catch(() => null);
  return {
    code: typeof body?.error === 'string' ? body.error : `HTTP_${res.status}`,
    message:
      typeof body?.message === 'string'
        ? body.message
        : `The server answered with status ${res.status}.`,
  };
}

export function AdminDashboard({ account }: { account?: React.ReactNode }) {
  const [db, setDb] = useState<StoreDatabase>(EMPTY_STORE);
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  // True until the first load finishes: nothing is shown as "live" before that.
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<LoadError | null>(null);
  const [syncing, setSyncing] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback(
    (title: string, desc?: string, type: Toast['type'] = 'success') => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, title, desc, type }]);
      setTimeout(
        () => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        },
        type === 'error' ? 8000 : 3500
      );
    },
    []
  );

  const fetchCloudStore = useCallback(async () => {
    try {
      const res = await fetch('/api/store', { cache: 'no-store' });
      if (res.status === 401 || res.status === 403) {
        redirectToLogin();
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as StoreDatabase;
        setDb(data);
        setLoadError(null);
      } else {
        // Never keep showing data that might be stale or fake as if it were live.
        setDb(EMPTY_STORE);
        setLoadError(await readApiError(res));
      }
    } catch (err) {
      console.error('Failed to load store data:', err);
      setLoadError({
        code: 'NETWORK_ERROR',
        message: 'Could not reach the admin server. Check that it is running and try again.',
      });
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    // Initial load; state is only set after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCloudStore();
  }, [fetchCloudStore]);

  const sendAction = async (action: string, payload: unknown, successMsg: string) => {
    try {
      const res = await fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      });
      if (res.status === 401 || res.status === 403) {
        pushToast('Session expired', 'Please sign in again.', 'error');
        redirectToLogin();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (data.db) setDb(data.db);
        setLoadError(null);
        pushToast(successMsg, 'Saved to the database.');
      } else {
        const error = await readApiError(res);
        if (error.code === 'DATABASE_NOT_READY') setLoadError(error);
        pushToast('Action failed', error.message, 'error');
      }
    } catch {
      pushToast('Network Error', 'Could not reach server API.', 'error');
    }
  };

  // Handlers
  const handleSaveProduct = async (product: Product, isNew: boolean) => {
    await sendAction(
      'SAVE_PRODUCT',
      { ...product, isNew },
      `Product "${product.name}" saved successfully!`
    );
  };

  const handleDeleteProduct = async (id: string) => {
    await sendAction('DELETE_PRODUCT', { id }, 'Product deleted.');
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await sendAction(
      'TOGGLE_PRODUCT_ACTIVE',
      { id, active },
      active ? 'Product is now active on storefront.' : 'Product is now hidden.'
    );
  };

  const handleToggleFeatured = async (id: string, featured: boolean) => {
    await sendAction(
      'TOGGLE_PRODUCT_FEATURED',
      { id, featured },
      featured ? 'Product pinned as Featured.' : 'Removed from Featured.'
    );
  };

  const handleQuickUpdate = async (id: string, stock: number, price?: number) => {
    await sendAction(
      'QUICK_STOCK_UPDATE',
      { id, stock, price },
      'Stock updated.'
    );
  };

  const handleUpdateOrderStatus = async (id: string, status: OrderStatus) => {
    await sendAction(
      'UPDATE_ORDER_STATUS',
      { id, status },
      `Order #${id} marked as ${status}.`
    );
  };

  const handleDeleteOrder = async (id: string) => {
    await sendAction('DELETE_ORDER', { id }, 'Order record deleted.');
  };

  const handleSaveCategory = async (category: Category) => {
    await sendAction(
      'SAVE_CATEGORY',
      category,
      `Category "${category.name}" saved.`
    );
  };

  const handleDeleteCategory = async (id: string) => {
    await sendAction('DELETE_CATEGORY', { id }, 'Category deleted.');
  };

  const handleSaveCoupon = async (coupon: Coupon) => {
    await sendAction('SAVE_COUPON', coupon, `Coupon ${coupon.code} updated.`);
  };

  const handleDeleteCoupon = async (code: string) => {
    await sendAction('DELETE_COUPON', { code }, 'Coupon deleted.');
  };

  const pendingOrdersCount = db.orders.filter(
    (o) => o.status === 'Pending' || o.status === 'Confirmed'
  ).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f8f5] text-[#112a1d]">
      {/* Top Bar */}
      <AdminNavbar
        syncing={syncing}
        account={account}
        onRefresh={() => {
          setSyncing(true);
          fetchCloudStore();
          pushToast('Refreshing from the database...', undefined, 'info');
        }}
      />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Data-layer problem notice: shown instead of pretending data is live */}
        {loadError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900"
          >
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
            <div className="space-y-1">
              <span className="block text-sm font-bold">
                {loadError.code === 'DATABASE_NOT_READY'
                  ? 'Database is not set up yet'
                  : 'Could not load live store data'}
              </span>
              <span className="block text-xs">{loadError.message}</span>
              <span className="block text-[11px] text-amber-800">
                Nothing below is live data, and changes cannot be saved until this is fixed.
                Press &ldquo;Sync Cloud&rdquo; to retry. ({loadError.code})
              </span>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-[#dfece3] pb-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'dashboard'
                ? 'bg-[#0f2c1d] text-white shadow-soft'
                : 'bg-white text-[#5a7165] hover:bg-[#e8f5ee] hover:text-[#112a1d]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'products'
                ? 'bg-[#0f2c1d] text-white shadow-soft'
                : 'bg-white text-[#5a7165] hover:bg-[#e8f5ee] hover:text-[#112a1d]'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Products ({db.products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'orders'
                ? 'bg-[#0f2c1d] text-white shadow-soft'
                : 'bg-white text-[#5a7165] hover:bg-[#e8f5ee] hover:text-[#112a1d]'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>COD Orders ({db.orders.length})</span>
            {pendingOrdersCount > 0 && (
              <span className="rounded-full bg-[#f5b82e] text-[#3a2502] text-[10px] px-1.5 py-0.2 font-extrabold">
                {pendingOrdersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'categories'
                ? 'bg-[#0f2c1d] text-white shadow-soft'
                : 'bg-white text-[#5a7165] hover:bg-[#e8f5ee] hover:text-[#112a1d]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Categories ({db.categories.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('coupons')}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'coupons'
                ? 'bg-[#0f2c1d] text-white shadow-soft'
                : 'bg-white text-[#5a7165] hover:bg-[#e8f5ee] hover:text-[#112a1d]'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Coupons ({db.coupons.length})</span>
          </button>
        </div>

        {/* Tab Body */}
        {loading && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#dfece3] bg-white p-10 text-sm font-semibold text-[#5a7165]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading store data...</span>
          </div>
        )}

        {!loading && activeTab === 'dashboard' && (
          <DashboardOverview
            db={db}
            onNavigateTab={setActiveTab}
            onAddNewProduct={() => setActiveTab('products')}
          />
        )}

        {!loading && activeTab === 'products' && (
          <ProductsManager
            products={db.products}
            categories={db.categories}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onToggleActive={handleToggleActive}
            onToggleFeatured={handleToggleFeatured}
            onQuickUpdate={handleQuickUpdate}
          />
        )}

        {!loading && activeTab === 'orders' && (
          <OrdersManager
            orders={db.orders}
            onUpdateStatus={handleUpdateOrderStatus}
            onDeleteOrder={handleDeleteOrder}
          />
        )}

        {!loading && activeTab === 'categories' && (
          <CategoriesManager
            categories={db.categories}
            products={db.products}
            onSaveCategory={handleSaveCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        )}

        {!loading && activeTab === 'coupons' && (
          <CouponsManager
            coupons={db.coupons}
            onSaveCoupon={handleSaveCoupon}
            onDeleteCoupon={handleDeleteCoupon}
          />
        )}
      </div>

      {/* Floating Toasts */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 rounded-2xl bg-[#0f2c1d] text-white p-4 shadow-2xl border border-[#1e4d33]"
          >
            {t.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-[#f5b82e] shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <span className="text-xs font-bold block">{t.title}</span>
              {t.desc && (
                <span className="text-[11px] text-[#b9d8c5]">{t.desc}</span>
              )}
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="text-[#789d87] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
