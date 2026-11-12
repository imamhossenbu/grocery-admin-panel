'use client';

import React, { useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createColumnHelper } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Percent, Plus, TicketPercent, Trash2 } from 'lucide-react';
import type { Coupon } from '@/types/store';
import { cn } from '@/lib/cn';
import { formatBDT } from '@/lib/format';
import { addDays, dayKeyOf, dayStart, formatDate } from '@/lib/dates';
import { useStoreAction } from '@/lib/client/store-action';
import { DataTable } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Modal';
import { Field, Input, NumberInput, PriceInput, SearchInput } from '@/components/ui/Input';
import { RadioGroup, Switch } from '@/components/ui/Checkbox';
import { DatePicker } from '@/components/ui/DatePicker';
import { Progress } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';

const col = createColumnHelper<Coupon>();
const PAGE = 10;

type CouponState = { label: string; tone: BadgeTone };
function couponState(c: Coupon, now = Date.now()): CouponState {
  if (!c.active) return { label: 'Disabled', tone: 'gray' };
  if (c.expiresAt && Date.parse(c.expiresAt) < now) return { label: 'Expired', tone: 'rose' };
  if (c.usageLimit != null && (c.usedCount ?? 0) >= c.usageLimit) return { label: 'Used up', tone: 'amber' };
  if (c.startsAt && Date.parse(c.startsAt) > now) return { label: 'Scheduled', tone: 'sky' };
  return { label: 'Active', tone: 'emerald' };
}

const schema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{2,32}$/, '2–32 characters: letters, digits, “-” or “_”.'),
    label: z.string().trim().min(1, 'Describe the offer (shown to shoppers).').max(200),
    discountType: z.enum(['percent', 'fixed']),
    value: z.number({ error: 'Enter the discount.' }).positive('Discount must be more than 0.'),
    maxDiscount: z.number().min(0).nullable(),
    minSubtotal: z.number().min(0),
    startsAt: z.string(),
    expiresAt: z.string(),
    usageLimit: z.number().int().min(1, 'At least 1, or leave empty for unlimited.').nullable(),
    active: z.boolean(),
  })
  .refine((v) => v.discountType !== 'percent' || v.value <= 100, { path: ['value'], message: 'A percent discount can’t exceed 100.' })
  .refine((v) => !v.startsAt || !v.expiresAt || v.expiresAt >= v.startsAt, { path: ['expiresAt'], message: 'Expiry must be on or after the start date.' });

type FormValues = z.input<typeof schema>;

function toForm(c: Coupon | null): FormValues {
  return {
    code: c?.code ?? '',
    label: c?.label ?? '',
    discountType: c?.discountType ?? 'percent',
    value: c?.value ?? 10,
    maxDiscount: c?.maxDiscount ?? null,
    minSubtotal: c?.minSubtotal ?? 0,
    startsAt: c?.startsAt ? dayKeyOf(c.startsAt) : '',
    expiresAt: c?.expiresAt ? dayKeyOf(c.expiresAt) : '',
    usageLimit: c?.usageLimit ?? null,
    active: c?.active ?? true,
  };
}

export function CouponsView({ coupons, openNew }: { coupons: Coupon[]; openNew: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const { run, busy } = useStoreAction();
  const confirm = useConfirm();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(openNew);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toForm(null) });
  const errors = form.formState.errors;
  const type = form.watch('discountType');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? coupons.filter((c) => c.code.toLowerCase().includes(s) || c.label.toLowerCase().includes(s)) : coupons;
  }, [coupons, q]);
  const last = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = Math.min(page, last);
  const rows = filtered.slice((current - 1) * PAGE, current * PAGE);

  const openForm = (c: Coupon | null) => {
    setEditing(c);
    form.reset(toForm(c));
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    if (openNew) router.replace(pathname, { scroll: false });
  };

  const save = form.handleSubmit(async (raw) => {
    const v = schema.parse(raw);
    if (!editing && coupons.some((c) => c.code === v.code)) {
      form.setError('code', { message: 'A coupon with this code already exists.' });
      return;
    }
    const out = await run(
      'SAVE_COUPON',
      {
        code: v.code,
        label: v.label,
        discountType: v.discountType,
        value: v.value,
        maxDiscount: v.discountType === 'percent' ? v.maxDiscount : null,
        minSubtotal: v.minSubtotal,
        active: v.active,
        startsAt: v.startsAt ? dayStart(v.startsAt).toISOString() : null,
        expiresAt: v.expiresAt ? new Date(dayStart(addDays(v.expiresAt, 1)).getTime() - 1000).toISOString() : null,
        usageLimit: v.usageLimit,
      },
      { success: editing ? 'Coupon saved' : 'Coupon created', successDetail: v.code }
    );
    if (out.ok) close();
  });

  const toggle = (c: Coupon, active: boolean) =>
    run('SAVE_COUPON', { ...c, active, usedCount: undefined }, { success: active ? `${c.code} enabled` : `${c.code} disabled` });

  const remove = async (c: Coupon) => {
    const ok = await confirm({
      title: `Delete coupon ${c.code}?`,
      description: 'Shoppers can no longer use it. Past orders keep their discount.',
      confirmLabel: 'Delete coupon',
      tone: 'danger',
    });
    if (ok) await run('DELETE_COUPON', { code: c.code }, { success: 'Coupon deleted' });
  };

  const columns = useMemo(
    () => [
      col.accessor('code', {
        header: 'Code',
        enableSorting: false,
        meta: { alwaysVisible: true },
        cell: ({ row }) => (
          <div>
            <span className="tabular inline-flex rounded-lg border border-dashed border-primary/40 bg-mint-50 px-2 py-0.5 text-sm font-semibold tracking-wide text-primary-600">
              {row.original.code}
            </span>
            <p className="mt-1 max-w-[260px] truncate text-[13px] text-muted">{row.original.label}</p>
          </div>
        ),
      }),
      col.display({
        id: 'discount',
        header: 'Discount',
        meta: { label: 'Discount' },
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div>
              <p className="tabular font-semibold text-ink">{c.discountType === 'percent' ? `${c.value}% off` : `${formatBDT(c.value)} off`}</p>
              <p className="tabular text-[13px] text-muted">
                {c.minSubtotal ? `Min. ${formatBDT(c.minSubtotal)}` : 'No minimum'}
                {c.discountType === 'percent' && c.maxDiscount ? ` · up to ${formatBDT(c.maxDiscount)}` : ''}
              </p>
            </div>
          );
        },
      }),
      col.display({
        id: 'validity',
        header: 'Valid',
        meta: { label: 'Validity' },
        cell: ({ row }) => {
          const c = row.original;
          return (
            <span className="tabular whitespace-nowrap text-muted">
              {c.startsAt || c.expiresAt ? `${c.startsAt ? formatDate(c.startsAt) : 'Now'} – ${c.expiresAt ? formatDate(c.expiresAt) : 'No end'}` : 'Always'}
            </span>
          );
        },
      }),
      col.display({
        id: 'usage',
        header: 'Usage',
        meta: { label: 'Usage', className: 'min-w-[160px]' },
        cell: ({ row }) => {
          const c = row.original;
          const used = c.usedCount ?? 0;
          if (c.usageLimit == null) return <span className="tabular text-muted">{used} used · unlimited</span>;
          const pct = used / Math.max(1, c.usageLimit);
          return (
            <div className="space-y-1.5">
              <p className="tabular text-[13px] text-ink">
                {used} / {c.usageLimit}
              </p>
              <Progress value={used} max={c.usageLimit} tone={pct >= 1 ? 'danger' : pct >= 0.8 ? 'amber' : 'primary'} label={`${used} of ${c.usageLimit} uses`} className="w-32" />
            </div>
          );
        },
      }),
      col.display({
        id: 'state',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ row }) => {
          const st = couponState(row.original);
          return (
            <Badge tone={st.tone} dot>
              {st.label}
            </Badge>
          );
        },
      }),
      col.accessor('active', {
        header: 'Enabled',
        enableSorting: false,
        meta: { label: 'Enabled', align: 'center' },
        cell: ({ row }) => (
          <span className="flex justify-center">
            <Switch size="sm" checked={row.original.active} onCheckedChange={(v) => toggle(row.original, v)} aria-label={`${row.original.code} enabled`} disabled={busy} />
          </span>
        ),
      }),
      col.display({
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        meta: { alwaysVisible: true, align: 'right', className: 'w-14' },
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${row.original.code}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => openForm(row.original)}>
                <Pencil /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem tone="danger" onSelect={() => remove(row.original)}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy]
  );

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[75ch]">
          <h1 className="font-display text-[28px] font-semibold leading-tight text-ink">Coupons</h1>
          <p className="mt-1 text-sm text-muted">Discount codes shoppers enter at checkout. Usage is counted when an order is placed.</p>
        </div>
        <Button onClick={() => openForm(null)}>
          <Plus className="h-4 w-4" /> New coupon
        </Button>
      </div>

      <DataTable
        tableId="coupons"
        caption="Coupons"
        data={rows}
        columns={columns}
        getRowId={(c) => c.code}
        toolbar={
          <SearchInput
            data-page-search
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Search code or description…"
            aria-label="Search coupons"
            className="w-full min-w-60 flex-1 sm:max-w-sm"
          />
        }
        empty={
          <EmptyState
            icon={<TicketPercent className="h-6 w-6" />}
            title={q ? 'No coupons match' : 'No coupons yet'}
            description={q ? 'Try another code.' : 'Create a code like FRESH10 to give shoppers a discount.'}
            actionLabel={q ? undefined : 'New coupon'}
            onAction={q ? undefined : () => openForm(null)}
          />
        }
        mobileCard={(c) => {
          const st = couponState(c);
          return (
            <div className="space-y-1.5 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="tabular font-semibold text-primary-600">{c.code}</span>
                <Badge tone={st.tone} dot>
                  {st.label}
                </Badge>
              </div>
              <p className="text-sm text-ink">{c.discountType === 'percent' ? `${c.value}% off` : `${formatBDT(c.value)} off`}</p>
              <p className="truncate text-[13px] text-muted">{c.label}</p>
              <button type="button" onClick={() => openForm(c)} className="text-[13px] font-semibold text-primary-600">
                Edit
              </button>
            </div>
          );
        }}
        footer={
          filtered.length > PAGE ? (
            <Pagination className="border-t border-line" page={current} pageSize={PAGE} total={filtered.length} onPageChange={setPage} noun="coupons" />
          ) : undefined
        }
      />

      <Drawer
        isOpen={open}
        onClose={close}
        title={editing ? `Edit ${editing.code}` : 'New coupon'}
        subtitle={editing ? `Used ${editing.usedCount ?? 0} times so far` : 'Codes are not case-sensitive for shoppers.'}
        width="max-w-xl"
        footer={
          <>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button onClick={save} loading={busy}>
              {editing ? 'Save coupon' : 'Create coupon'}
            </Button>
          </>
        }
      >
        <form onSubmit={save} noValidate className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Code" required error={errors.code?.message}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  readOnly={!!editing}
                  placeholder="FRESH10"
                  className="uppercase"
                  {...form.register('code', { onChange: (e) => form.setValue('code', e.target.value.toUpperCase()) })}
                />
              )}
            </Field>
            <Field label="Status" help="Disabled codes are rejected at checkout.">
              {() => (
                <div className="flex h-10 items-center">
                  <Controller control={form.control} name="active" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Coupon enabled" />} />
                  <span className="ml-3 text-sm text-ink">{form.watch('active') ? 'Enabled' : 'Disabled'}</span>
                </div>
              )}
            </Field>
          </div>
          <Field label="Description" required error={errors.label?.message} help="Shown to shoppers, e.g. “10% off fresh fruit”.">
            {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} {...form.register('label')} />}
          </Field>
          <Field label="Discount type">
            {() => (
              <Controller
                control={form.control}
                name="discountType"
                render={({ field }) => (
                  <RadioGroup
                    variant="cards"
                    aria-label="Discount type"
                    value={field.value}
                    onValueChange={field.onChange}
                    options={[
                      { value: 'percent', label: 'Percentage', description: 'e.g. 10% off the subtotal' },
                      { value: 'fixed', label: 'Fixed amount', description: 'e.g. ৳100 off' },
                    ]}
                  />
                )}
              />
            )}
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Discount" required error={errors.value?.message}>
              {({ id, describedBy, invalid }) => (
                <Controller
                  control={form.control}
                  name="value"
                  render={({ field }) =>
                    type === 'percent' ? (
                      <NumberInput id={id} aria-describedby={describedBy} aria-invalid={invalid} min={0} max={100} decimals={2} value={field.value} onChange={(v) => field.onChange(v ?? 0)} suffix={<Percent className="h-4 w-4" />} />
                    ) : (
                      <PriceInput id={id} aria-describedby={describedBy} aria-invalid={invalid} value={field.value} onChange={(v) => field.onChange(v ?? 0)} />
                    )
                  }
                />
              )}
            </Field>
            <Field label="Maximum discount" optional help={type === 'percent' ? 'Cap for percentage coupons.' : 'Only for percentage coupons.'}>
              {({ id, describedBy }) => (
                <Controller
                  control={form.control}
                  name="maxDiscount"
                  render={({ field }) => (
                    <PriceInput id={id} aria-describedby={describedBy} allowEmpty placeholder="No cap" disabled={type !== 'percent'} value={field.value} onChange={field.onChange} />
                  )}
                />
              )}
            </Field>
            <Field label="Minimum order subtotal" help="0 = any order.">
              {({ id, describedBy }) => (
                <Controller control={form.control} name="minSubtotal" render={({ field }) => <PriceInput id={id} aria-describedby={describedBy} value={field.value} onChange={(v) => field.onChange(v ?? 0)} />} />
              )}
            </Field>
            <Field label="Usage limit" optional error={errors.usageLimit?.message} help="Total uses across all shoppers. Empty = unlimited.">
              {({ id, describedBy, invalid }) => (
                <Controller
                  control={form.control}
                  name="usageLimit"
                  render={({ field }) => (
                    <NumberInput id={id} aria-describedby={describedBy} aria-invalid={invalid} min={1} allowEmpty placeholder="Unlimited" value={field.value} onChange={field.onChange} suffix="uses" />
                  )}
                />
              )}
            </Field>
            <Field label="Starts" optional help="From the start of this day (Dhaka time).">
              {({ id, describedBy }) => (
                <Controller control={form.control} name="startsAt" render={({ field }) => <DatePicker id={id} aria-describedby={describedBy} value={field.value} onChange={field.onChange} placeholder="Immediately" />} />
              )}
            </Field>
            <Field label="Expires" optional error={errors.expiresAt?.message} help="Until the end of this day.">
              {({ id, describedBy, invalid }) => (
                <Controller
                  control={form.control}
                  name="expiresAt"
                  render={({ field }) => (
                    <DatePicker id={id} aria-describedby={describedBy} aria-invalid={invalid} value={field.value} onChange={field.onChange} min={form.watch('startsAt') || undefined} placeholder="Never" />
                  )}
                />
              )}
            </Field>
          </div>
          {editing && editing.usageLimit != null && (
            <div className={cn('rounded-xl bg-mint-25 p-4')}>
              <p className="mb-2 text-[13px] text-muted">
                Used {editing.usedCount ?? 0} of {editing.usageLimit}
              </p>
              <Progress value={editing.usedCount ?? 0} max={editing.usageLimit} />
            </div>
          )}
        </form>
      </Drawer>
    </>
  );
}
