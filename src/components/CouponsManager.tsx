'use client';

import React, { useState } from 'react';
import { Plus, Sparkles, Tag, Trash2 } from 'lucide-react';
import { Coupon } from '@/types/store';
import { formatBDT } from '@/lib/supabase-db';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

interface CouponsManagerProps {
  coupons: Coupon[];
  onSaveCoupon: (coupon: Coupon) => Promise<void>;
  onDeleteCoupon: (code: string) => Promise<void>;
}

export function CouponsManager({
  coupons,
  onSaveCoupon,
  onDeleteCoupon,
}: CouponsManagerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteCode, setDeleteCode] = useState<string | null>(null);

  const [form, setForm] = useState<Coupon>({
    code: '',
    label: '',
    discountType: 'fixed',
    value: 50,
    minSubtotal: 500,
    maxDiscount: undefined,
    active: true,
  });

  const openAdd = () => {
    setForm({
      code: '',
      label: '',
      discountType: 'fixed',
      value: 50,
      minSubtotal: 500,
      maxDiscount: undefined,
      active: true,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) return;

    await onSaveCoupon({
      ...form,
      code: form.code.trim().toUpperCase(),
      label:
        form.label.trim() ||
        (form.discountType === 'fixed'
          ? `৳${form.value} off on orders over ৳${form.minSubtotal}`
          : `${form.value}% off`),
    });
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#112a1d]">
            Promotional Coupons &amp; Vouchers
          </h2>
          <p className="text-xs text-[#5a7165]">
            Create discount vouchers redeemable during checkout on the storefront.
          </p>
        </div>

        <Button variant="primary" size="md" onClick={openAdd}>
          <Plus className="w-4 h-4" />
          <span>Create Coupon</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map((coupon) => (
          <div
            key={coupon.code}
            className="rounded-3xl border border-[#dfece3] bg-white p-5 shadow-soft hover:shadow-card transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fef3c7] px-3 py-1 font-mono text-xs font-bold text-[#78350f]">
                  <Tag className="w-3.5 h-3.5" />
                  {coupon.code}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    coupon.active
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {coupon.active ? 'Active' : 'Disabled'}
                </span>
              </div>

              <h4 className="font-display text-base font-bold text-[#112a1d]">
                {coupon.discountType === 'fixed'
                  ? `${formatBDT(coupon.value)} Flat Discount`
                  : `${coupon.value}% Percentage Off`}
              </h4>
              <p className="mt-1 text-xs text-[#5a7165]">{coupon.label}</p>

              <div className="mt-4 pt-3 border-t border-[#f0f7f2] space-y-1 text-xs text-[#5a7165]">
                <div className="flex justify-between">
                  <span>Min Basket Subtotal:</span>
                  <span className="font-bold text-[#112a1d]">
                    {formatBDT(coupon.minSubtotal)}
                  </span>
                </div>
                {coupon.maxDiscount && (
                  <div className="flex justify-between">
                    <span>Max Discount Cap:</span>
                    <span className="font-bold text-[#112a1d]">
                      {formatBDT(coupon.maxDiscount)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#f0f7f2] flex items-center justify-between">
              <button
                onClick={() =>
                  onSaveCoupon({ ...coupon, active: !coupon.active })
                }
                className="text-xs font-bold text-[#1a663b] hover:underline cursor-pointer"
              >
                {coupon.active ? 'Disable' : 'Enable'}
              </button>
              <button
                onClick={() => setDeleteCode(coupon.code)}
                className="rounded-xl p-2 text-[#789d87] hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                title="Delete Coupon"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Coupon Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create New Coupon Voucher"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#5a7165] mb-1">
              Coupon Code (e.g. WELCOME100) *
            </label>
            <input
              type="text"
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="e.g. FRIDAY50"
              className="w-full rounded-xl border border-[#cfe3d6] px-3.5 py-2 text-xs uppercase font-mono tracking-wider focus:border-[#1a663b] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#5a7165] mb-1">
                Discount Type *
              </label>
              <select
                value={form.discountType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    discountType: e.target.value as 'fixed' | 'percent',
                  })
                }
                className="w-full rounded-xl border border-[#cfe3d6] bg-white px-3 py-2 text-xs focus:border-[#1a663b] focus:outline-none cursor-pointer"
              >
                <option value="fixed">Fixed Taka (৳)</option>
                <option value="percent">Percentage (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5a7165] mb-1">
                Discount Value *
              </label>
              <input
                type="number"
                required
                min="1"
                value={form.value}
                onChange={(e) =>
                  setForm({ ...form, value: Number(e.target.value) })
                }
                placeholder={form.discountType === 'fixed' ? '50' : '10'}
                className="w-full rounded-xl border border-[#cfe3d6] px-3.5 py-2 text-xs focus:border-[#1a663b] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#5a7165] mb-1">
                Min Basket Subtotal (BDT)
              </label>
              <input
                type="number"
                min="0"
                value={form.minSubtotal}
                onChange={(e) =>
                  setForm({ ...form, minSubtotal: Number(e.target.value) })
                }
                placeholder="500"
                className="w-full rounded-xl border border-[#cfe3d6] px-3.5 py-2 text-xs focus:border-[#1a663b] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5a7165] mb-1">
                Max Discount Cap (Optional)
              </label>
              <input
                type="number"
                min="0"
                value={form.maxDiscount || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maxDiscount: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="200"
                className="w-full rounded-xl border border-[#cfe3d6] px-3.5 py-2 text-xs focus:border-[#1a663b] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#5a7165] mb-1">
              Promo Label / Subtitle
            </label>
            <input
              type="text"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="e.g. ৳50 off on orders over ৳500"
              className="w-full rounded-xl border border-[#cfe3d6] px-3.5 py-2 text-xs focus:border-[#1a663b] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#e6f0e9]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Create Coupon
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Coupon Modal */}
      <Modal
        isOpen={!!deleteCode}
        onClose={() => setDeleteCode(null)}
        title="Delete Coupon"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#5a7165]">
            Are you sure you want to permanently delete coupon &quot;{deleteCode}&quot;?
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteCode(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={async () => {
                if (deleteCode) {
                  await onDeleteCoupon(deleteCode);
                  setDeleteCode(null);
                }
              }}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

