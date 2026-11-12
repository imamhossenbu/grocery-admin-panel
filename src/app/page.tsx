'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Layers,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import { Category, Coupon, Order, OrderStatus, Product, StoreDatabase } from '@/types/store';
import { INITIAL_STORE_DATA } from '@/lib/seed-data';
import { AdminNavbar } from '@/components/AdminNavbar';
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

export default function AdminDashboardPage() {
  const [db, setDb] = useState<StoreDatabase>(INITIAL_STORE_DATA);
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [syncing, setSyncing] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback(
    (title: string, desc?: string, type: Toast['type'] = 'success') => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, title, desc, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    []
  );

  const fetchCloudStore = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/store', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as StoreDatabase;
        if (data && Array.isArray(data.products)) {
          setDb(data);
        }
      }
    } catch (err) {
      console.error('Failed to sync cloud store:', err);
    } finally {
      setTimeout(() => setSyncing(false), 400);
    }
  }, []);

  useEffect(() => {
    fetchCloudStore();
  }, [fetchCloudStore]);

  const sendAction = async (action: string, payload: unknown, successMsg: string) => {
    try {
      const res = await fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.db) setDb(data.db);
        pushToast(successMsg, 'Synced to Supabase Cloud.');
      } else {
        pushToast('Action failed', 'Please try again.', 'error');
      }
    } catch {
      pushToast('Network Error', 'Could not reach server API.', 'error');
    }
  };

  // Handlers
  const handleSaveProduct = async (product: Product) => {
    await sendAction(
      'SAVE_PRODUCT',
      product,
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

  const handleResetDemo = async () => {
    if (confirm('Reset database to initial demo state?')) {
      await sendAction(
        'RESET_DEMO_DATA',
        {},
        'Store database reset to fresh demo state.'
      );
    }
  };

  const pendingOrdersCount = db.orders.filter(
    (o) => o.status === 'Pending' || o.status === 'Confirmed'
  ).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f8f5] text-[#112a1d]">
      {/* Top Bar */}
      <AdminNavbar
        syncing={syncing}
        onRefresh={() => {
          fetchCloudStore();
          pushToast('Syncing with Supabase Cloud...', undefined, 'info');
        }}
        onResetDemo={handleResetDemo}
      />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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
        {activeTab === 'dashboard' && (
          <DashboardOverview
            db={db}
            onNavigateTab={setActiveTab}
            onAddNewProduct={() => setActiveTab('products')}
          />
        )}

        {activeTab === 'products' && (
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

        {activeTab === 'orders' && (
          <OrdersManager
            orders={db.orders}
            onUpdateStatus={handleUpdateOrderStatus}
            onDeleteOrder={handleDeleteOrder}
          />
        )}

        {activeTab === 'categories' && (
          <CategoriesManager
            categories={db.categories}
            products={db.products}
            onSaveCategory={handleSaveCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        )}

        {activeTab === 'coupons' && (
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
            <CheckCircle2 className="w-5 h-5 text-[#f5b82e] shrink-0 mt-0.5" />
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
