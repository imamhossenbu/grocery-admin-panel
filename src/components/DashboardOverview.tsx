'use client';

import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock,
  Package,
  Plus,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';
import { StoreDatabase } from '@/types/store';
import { formatBDT } from '@/lib/format';
import { Button } from './ui/Button';

interface DashboardOverviewProps {
  db: StoreDatabase;
  onNavigateTab: (tab: 'products' | 'orders' | 'categories' | 'coupons') => void;
  onAddNewProduct: () => void;
}

export function DashboardOverview({
  db,
  onNavigateTab,
  onAddNewProduct,
}: DashboardOverviewProps) {
  const totalRevenue = db.orders.reduce((sum, o) => {
    if (o.status === 'Cancelled') return sum;
    return sum + o.total;
  }, 0);

  const pendingOrders = db.orders.filter(
    (o) => o.status === 'Pending' || o.status === 'Confirmed'
  );

  const topLevelCategories = db.categories.filter((c) => !c.parentId).length;

  const lowStockCount = db.products.filter((p) => p.stock <= 20).length;
  const outOfStockCount = db.products.filter((p) => p.stock <= 0).length;

  const STATS = [
    {
      label: 'Gross Revenue (COD)',
      value: formatBDT(totalRevenue),
      subtext: `${db.orders.length} total orders recorded`,
      icon: Banknote,
      color: 'bg-emerald-50 text-[#14522f] border-[#bce3cb]',
    },
    {
      label: 'Pending Dispatch',
      value: pendingOrders.length.toString(),
      subtext: 'Awaiting packing or rider assignment',
      icon: Clock,
      color: 'bg-amber-50 text-[#854d0e] border-[#fde68a]',
    },
    {
      label: 'Catalog Items',
      value: db.products.length.toString(),
      subtext: `${topLevelCategories} top-level categories · ${db.categories.length - topLevelCategories} subcategories`,
      icon: Package,
      color: 'bg-sky-50 text-[#0369a1] border-[#bae6fd]',
    },
    {
      label: 'Stock Alerts',
      value: `${outOfStockCount} Out · ${lowStockCount} Low`,
      subtext: 'Replenish stock promptly',
      icon: AlertTriangle,
      color: 'bg-rose-50 text-[#be123c] border-[#fecdd3]',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="rounded-3xl bg-forest-gradient p-6 sm:p-8 text-white shadow-soft flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1a663b] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#bbf7d0]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Supabase Cloud Connected
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold">
            Welcome to FreshBasket Operations
          </h2>
          <p className="text-xs sm:text-sm text-[#b9d8c5] leading-relaxed">
            Manage your daily vegetables, fresh fruits, dairy and groceries. All changes update instantly on the customer storefront.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="highlight"
            size="md"
            onClick={onAddNewProduct}
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={() => onNavigateTab('orders')}
            className="text-white bg-white/10 hover:bg-white/20 border-white/20"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Process Orders</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className={`rounded-2xl border p-5 bg-white shadow-soft transition hover:shadow-card`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#5a7165]">
                  {stat.label}
                </span>
                <div
                  className={`grid place-items-center w-9 h-9 rounded-xl border ${stat.color}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <span className="mt-3 block font-display text-2xl font-bold text-[#112a1d]">
                {stat.value}
              </span>
              <span className="mt-1 block text-xs text-[#5a7165]">
                {stat.subtext}
              </span>
            </div>
          );
        })}
      </div>

      {/* Recent Orders Preview */}
      <div className="rounded-3xl border border-[#dfece3] bg-white p-6 shadow-soft space-y-4">
        <div className="flex items-center justify-between border-b border-[#e6f0e9] pb-4">
          <div>
            <h3 className="font-display text-lg font-bold text-[#112a1d]">
              Latest Cash on Delivery Orders
            </h3>
            <p className="text-xs text-[#5a7165]">
              Real-time orders placed by shoppers
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigateTab('orders')}
          >
            <span>View All ({db.orders.length})</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#f0f7f2] text-[#5a7165]">
                <th className="py-2.5 font-bold">Order ID</th>
                <th className="py-2.5 font-bold">Customer</th>
                <th className="py-2.5 font-bold">Area</th>
                <th className="py-2.5 font-bold">Slot</th>
                <th className="py-2.5 font-bold">Total (COD)</th>
                <th className="py-2.5 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f7f2]">
              {db.orders.slice(0, 5).map((order) => (
                <tr key={order.id} className="hover:bg-[#f9fbf9]">
                  <td className="py-3 font-mono font-bold text-[#1a663b]">
                    {order.id}
                  </td>
                  <td className="py-3 font-semibold text-[#112a1d]">
                    {order.customer.name}
                  </td>
                  <td className="py-3 text-[#5a7165]">{order.customer.area}</td>
                  <td className="py-3 text-[#5a7165]">
                    {order.customer.deliverySlot}
                  </td>
                  <td className="py-3 font-extrabold text-[#112a1d]">
                    {formatBDT(order.total)}
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        order.status === 'Delivered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : order.status === 'Cancelled'
                          ? 'bg-red-100 text-red-700'
                          : order.status === 'Out for delivery'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

