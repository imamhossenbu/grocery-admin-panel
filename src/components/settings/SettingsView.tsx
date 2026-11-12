'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Database, ExternalLink, Globe, RefreshCw, ShieldCheck, Store, Truck } from 'lucide-react';
import type { AdminAccountRow } from '@/types/admin';
import { formatBDT, formatNumber } from '@/lib/format';
import { formatDateTime, formatRelative } from '@/lib/dates';
import { useStoreAction } from '@/lib/client/store-action';
import { Avatar, Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { riseChild, staggerParent } from '@/components/ui/motion';

export interface StoreInfo {
  storefrontUrl: string | null;
  supabaseHost: string | null;
  cloudinaryCloud: string | null;
  revalidateConfigured: boolean;
  freeDeliveryFrom: number;
  deliveryFee: number;
  lowStock: number;
  timezone: string;
  stats: { products: number; categories: number; orders: number; coupons: number; customers: number };
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[200px_1fr] sm:gap-4">
      <dt className="text-[13px] font-medium text-muted">{label}</dt>
      <dd className="min-w-0 text-sm text-ink">{children}</dd>
    </div>
  );
}

export function SettingsView({ info, admins, currentEmail }: { info: StoreInfo; admins: AdminAccountRow[]; currentEmail: string }) {
  const { run, pending } = useStoreAction();
  return (
    <motion.div variants={staggerParent} initial="initial" animate="animate" className="grid items-start gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <motion.div variants={riseChild}>
          <Card>
            <CardHeader title="Store" description="Read-only. Change these in the server environment (.env.local)." icon={<Store className="h-[18px] w-[18px]" />} />
            <dl className="divide-y divide-[#edf4ef] px-5 pb-2 pt-2">
              <Item label="Storefront">
                {info.storefrontUrl ? (
                  <a href={info.storefrontUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-primary-600 hover:underline">
                    {info.storefrontUrl} <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <span className="text-muted">Not set (STOREFRONT_URL)</span>
                )}
              </Item>
              <Item label="Database">
                <span className="inline-flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted" />
                  {info.supabaseHost ?? 'Not configured'}
                </span>
              </Item>
              <Item label="Image uploads">Cloudinary{info.cloudinaryCloud ? ` (${info.cloudinaryCloud})` : ''}, Supabase Storage as fallback</Item>
              <Item label="Time zone">{info.timezone} — all dates and reports use Dhaka time</Item>
              <Item label="Low-stock alert">At {info.lowStock} units or fewer (active products)</Item>
            </dl>
          </Card>
        </motion.div>

        <motion.div variants={riseChild}>
          <Card>
            <CardHeader title="Delivery & pricing rules" description="Enforced by the database when an order is placed." icon={<Truck className="h-[18px] w-[18px]" />} />
            <dl className="divide-y divide-[#edf4ef] px-5 pb-2 pt-2">
              <Item label="Delivery fee">
                <span className="tabular">{formatBDT(info.deliveryFee)}</span> per order
              </Item>
              <Item label="Free delivery">
                From a subtotal of <span className="tabular">{formatBDT(info.freeDeliveryFrom)}</span>
              </Item>
              <Item label="Online payments">SSLCommerz, 10 – 5,00,000 BDT per transaction; unpaid online orders expire after 60 minutes</Item>
            </dl>
          </Card>
        </motion.div>

        <motion.div variants={riseChild}>
          <Card>
            <CardHeader title="Administrators" description="Accounts with admin access. Managed with the create-admin script; read-only here." icon={<ShieldCheck className="h-[18px] w-[18px]" />} />
            <ul className="divide-y divide-[#edf4ef] px-5 pb-3 pt-2">
              {admins.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
                  <Avatar name={a.email.split('@')[0] ?? a.email} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-medium text-ink">
                      {a.email}
                      {a.email === currentEmail && <Badge tone="emerald">You</Badge>}
                    </p>
                    <p className="text-[13px] text-muted">
                      Added {formatDateTime(a.createdAt)} · last sign-in {a.lastSignInAt ? formatRelative(a.lastSignInAt) : 'never'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>
      </div>

      <div className="space-y-6">
        <motion.div variants={riseChild}>
          <Card>
            <CardHeader title="Storefront cache" icon={<Globe className="h-[18px] w-[18px]" />} />
            <div className="space-y-4 p-5">
              <p className="text-sm leading-relaxed text-muted">
                Catalog changes refresh the storefront automatically. If prices or stock look stale there, refresh the cache by hand.
              </p>
              {!info.revalidateConfigured && (
                <p className="rounded-xl bg-[#fffaeb] p-3 text-[13px] text-[#5c3d05]">STOREFRONT_URL or REVALIDATE_SECRET is not set, so refreshes are skipped.</p>
              )}
              <Button variant="outline" loading={pending} onClick={() => run('REVALIDATE_STOREFRONT', {}, { success: 'Storefront cache refreshed' }, { refresh: false })}>
                <RefreshCw className="h-4 w-4" /> Refresh storefront cache
              </Button>
            </div>
          </Card>
        </motion.div>
        <motion.div variants={riseChild}>
          <Card>
            <CardHeader title="At a glance" />
            <dl className="grid grid-cols-2 gap-4 p-5">
              {(
                [
                  ['Products', info.stats.products],
                  ['Categories', info.stats.categories],
                  ['Orders', info.stats.orders],
                  ['Coupons', info.stats.coupons],
                  ['Customer profiles', info.stats.customers],
                ] as const
              ).map(([label, n]) => (
                <div key={label}>
                  <dt className="text-[13px] text-muted">{label}</dt>
                  <dd className="font-display tabular text-xl font-semibold text-ink">{formatNumber(n)}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
