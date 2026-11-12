'use client';

import React, { useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Package,
  Phone,
  Search,
  Trash2,
  Truck,
  User,
} from 'lucide-react';
import { Order, OrderStatus } from '@/types/store';
import { formatBDT } from '@/lib/supabase-db';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { EmptyState } from './ui/EmptyState';

interface OrdersManagerProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onDeleteOrder: (orderId: string) => Promise<void>;
}

const ALL_STATUSES: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Packed',
  'Out for delivery',
  'Delivered',
  'Cancelled',
];

export function OrdersManager({
  orders,
  onUpdateStatus,
  onDeleteOrder,
}: OrdersManagerProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredOrders = orders.filter((o) => {
    const matchesStatus =
      statusFilter === 'all' || o.status === statusFilter;
    const matchesSearch =
      !search.trim() ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.name.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.phone.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.area.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#112a1d]">
            Cash on Delivery Orders Pipeline
          </h2>
          <p className="text-xs text-[#5a7165]">
            Track and process grocery orders through dispatch and doorstep delivery.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dfece3] bg-white p-4 shadow-soft">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-[#5a7165] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Order ID, name, or phone..."
            className="w-full rounded-xl border border-[#cfe3d6] pl-10 pr-3 py-2 text-xs focus:border-[#1a663b] focus:outline-none"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#1a663b] text-white'
                : 'bg-[#f0f7f2] text-[#14522f] hover:bg-[#e2f1e7]'
            }`}
          >
            All ({orders.length})
          </button>
          {ALL_STATUSES.map((st) => {
            const count = orders.filter((o) => o.status === st).length;
            const isSelected = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#1a663b] text-white'
                    : 'bg-[#f0f7f2] text-[#14522f] hover:bg-[#e2f1e7]'
                }`}
              >
                {st} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders Grid / Cards */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-3xl border border-[#dfece3] bg-white p-12 shadow-soft">
          <EmptyState
            icon={<Package className="w-8 h-8" />}
            title="No orders found"
            description="No Cash on Delivery orders matched this filter."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredOrders.map((order) => {
            return (
              <div
                key={order.id}
                className="rounded-3xl border border-[#dfece3] bg-white p-5 shadow-soft hover:shadow-card transition flex flex-col justify-between"
              >
                <div>
                  {/* Card Top Row */}
                  <div className="flex items-center justify-between border-b border-[#f0f7f2] pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-bold text-[#1a663b]">
                        {order.id}
                      </span>
                      <span className="text-[11px] text-[#789d87]">
                        {new Date(order.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Status Dropdown */}
                    <div className="flex items-center gap-1.5">
                      <select
                        value={order.status}
                        onChange={(e) =>
                          onUpdateStatus(order.id, e.target.value as OrderStatus)
                        }
                        className={`rounded-full px-3 py-1 text-xs font-bold focus:outline-none cursor-pointer border ${
                          order.status === 'Delivered'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : order.status === 'Cancelled'
                            ? 'bg-red-50 text-red-800 border-red-300'
                            : order.status === 'Out for delivery'
                            ? 'bg-sky-50 text-sky-800 border-sky-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        {ALL_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#5a7165] mb-3">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-[#1a663b]" />
                      <strong className="text-[#112a1d]">
                        {order.customer.name}
                      </strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#1a663b]" />
                      <span>{order.customer.phone}</span>
                    </div>
                    <div className="flex items-start gap-2 col-span-full">
                      <MapPin className="w-3.5 h-3.5 text-[#1a663b] shrink-0 mt-0.5" />
                      <span className="line-clamp-1">
                        {order.customer.address}, {order.customer.area}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 col-span-full text-[11px] bg-[#f7faf8] p-2 rounded-xl">
                      <Clock className="w-3.5 h-3.5 text-[#1a663b]" />
                      <span>Slot: {order.customer.deliverySlot}</span>
                    </div>
                  </div>

                  {/* Items Preview */}
                  <div className="rounded-2xl border border-[#eef4f0] bg-[#fbfdfc] p-3 space-y-1 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#789d87] block mb-1">
                      Ordered Items ({order.items.length})
                    </span>
                    {order.items.slice(0, 3).map((it, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between text-[#112a1d]"
                      >
                        <span className="line-clamp-1">
                          {it.name} ({it.unit}) × {it.qty}
                        </span>
                        <span className="font-bold text-[#1a663b] shrink-0">
                          {formatBDT(it.price * it.qty)}
                        </span>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <span className="text-[11px] text-[#5a7165] italic block pt-1">
                        +{order.items.length - 3} more items...
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Bottom Row */}
                <div className="mt-4 pt-3 border-t border-[#f0f7f2] flex items-center justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs text-[#5a7165]">Payable:</span>
                    <span className="text-base font-extrabold text-[#1a663b]">
                      {formatBDT(order.total)}
                    </span>
                    <span className="text-[10px] text-[#789d87]">(COD)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <span>Details</span>
                    </Button>
                    <button
                      onClick={() => setDeleteConfirmId(order.id)}
                      className="rounded-xl p-2 text-[#789d87] hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                      title="Delete Order"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Details Modal */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Order #${selectedOrder.id}` : ''}
        subtitle="Complete order invoice and customer information"
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-6">
            {/* Status changer in modal */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f0f7f2] border border-[#cfe3d6] p-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5a7165] block">
                  Current Dispatch Status
                </span>
                <span className="font-bold text-[#112a1d] text-base">
                  {selectedOrder.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#5a7165]">
                  Update Status:
                </span>
                <select
                  value={selectedOrder.status}
                  onChange={async (e) => {
                    const next = e.target.value as OrderStatus;
                    await onUpdateStatus(selectedOrder.id, next);
                    setSelectedOrder({ ...selectedOrder, status: next });
                  }}
                  className="rounded-xl border border-[#cfe3d6] bg-white px-3 py-1.5 text-xs font-bold focus:border-[#1a663b] focus:outline-none cursor-pointer"
                >
                  {ALL_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Customer Details */}
            <div className="rounded-2xl border border-[#dfece3] bg-[#fbfdfc] p-4 space-y-2 text-xs">
              <span className="font-bold text-[#112a1d] block text-sm">
                Customer &amp; Address
              </span>
              <p className="text-[#5a7165]">
                <strong className="text-[#112a1d]">{selectedOrder.customer.name}</strong> ({selectedOrder.customer.phone})
              </p>
              {selectedOrder.customer.email && (
                <p className="text-[#5a7165]">Email: {selectedOrder.customer.email}</p>
              )}
              <p className="text-[#5a7165]">
                {selectedOrder.customer.address}, {selectedOrder.customer.area}, {selectedOrder.customer.city}
              </p>
              <p className="text-[#5a7165]">
                Slot: <strong className="text-[#112a1d]">{selectedOrder.customer.deliverySlot}</strong>
              </p>
              {selectedOrder.customer.notes && (
                <p className="italic text-[#789d87]">
                  Delivery Note: {selectedOrder.customer.notes}
                </p>
              )}
            </div>

            {/* Line items table */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#5a7165] block mb-2">
                All Items in this Order ({selectedOrder.items.length})
              </span>
              <div className="rounded-2xl border border-[#dfece3] overflow-hidden divide-y divide-[#f0f7f2]">
                {selectedOrder.items.map((it, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 text-xs bg-white"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={it.image}
                        alt={it.name}
                        className="w-10 h-10 rounded-xl object-cover bg-[#f0f7f2]"
                      />
                      <div>
                        <span className="font-bold text-[#112a1d] block">
                          {it.name}
                        </span>
                        <span className="text-[#5a7165]">
                          {it.unit} · {formatBDT(it.price)} each
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-[#1a663b] block">
                        {formatBDT(it.price * it.qty)}
                      </span>
                      <span className="text-[11px] text-[#5a7165]">
                        Qty: {it.qty}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial summary */}
            <div className="rounded-2xl bg-[#f7faf8] border border-[#dfece3] p-4 space-y-1.5 text-xs text-[#5a7165]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-bold text-[#112a1d]">
                  {formatBDT(selectedOrder.subtotal)}
                </span>
              </div>
              {selectedOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Coupon Discount ({selectedOrder.couponCode || 'PROMO'}):</span>
                  <span>-{formatBDT(selectedOrder.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery Charge:</span>
                <span className="font-bold text-[#112a1d]">
                  {selectedOrder.deliveryFee === 0 ? 'FREE' : formatBDT(selectedOrder.deliveryFee)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#e2efe6] pt-2 text-base font-extrabold text-[#112a1d]">
                <span>Total Due at Doorstep (COD):</span>
                <span className="text-[#1a663b]">{formatBDT(selectedOrder.total)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Order Record"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#5a7165]">
            Are you sure you want to permanently remove this order from the database?
          </p>
          <div className="flex justify-end gap-3 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={async () => {
                if (deleteConfirmId) {
                  await onDeleteOrder(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
            >
              Delete Order
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
