'use client';

import React, { useState } from 'react';
import { AlertTriangle, Truck } from 'lucide-react';
import type { DeliverySettings, DeliverySettingsState } from '@/types/admin';
import { formatBDT } from '@/lib/format';
import { useStoreAction } from '@/lib/client/store-action';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, PriceInput } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Checkbox';
import { RelativeTime } from '@/components/ui/RelativeTime';

type Draft = {
  dhakaFee: number | null;
  dhakaFree: boolean;
  dhakaFreeFrom: number | null;
  outsideFee: number | null;
  outsideFree: boolean;
  outsideFreeFrom: number | null;
};

const toDraft = (s: DeliverySettings): Draft => ({
  dhakaFee: s.dhakaFee,
  dhakaFree: s.dhakaFreeFrom !== null,
  dhakaFreeFrom: s.dhakaFreeFrom ?? 1000,
  outsideFee: s.outsideFee,
  outsideFree: s.outsideFreeFrom !== null,
  outsideFreeFrom: s.outsideFreeFrom ?? 2000,
});

function feeFor(subtotal: number, fee: number, freeFrom: number | null) {
  return freeFrom !== null && subtotal >= freeFrom ? 0 : fee;
}

/**
 * Delivery charges the storefront shows and place_order() charges
 * (store_settings). Saving refreshes the storefront's settings cache.
 */
export function DeliverySettingsCard({ state }: { state: DeliverySettingsState }) {
  const { run, busy } = useStoreAction();
  const [draft, setDraft] = useState<Draft>(() => toDraft(state.settings));
  const [seen, setSeen] = useState(state.settings);
  if (seen !== state.settings) {
    setSeen(state.settings);
    setDraft(toDraft(state.settings));
  }
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const errors: Partial<Record<keyof Draft, string>> = {};
  if (draft.dhakaFee === null) errors.dhakaFee = 'Enter a fee (0 for free).';
  if (draft.outsideFee === null) errors.outsideFee = 'Enter a fee (0 for free).';
  if (draft.dhakaFree && draft.dhakaFreeFrom === null) errors.dhakaFreeFrom = 'Enter the order amount.';
  if (draft.outsideFree && draft.outsideFreeFrom === null) errors.outsideFreeFrom = 'Enter the order amount.';
  const valid = Object.keys(errors).length === 0;

  const next: DeliverySettings | null = valid
    ? {
        dhakaFee: draft.dhakaFee!,
        dhakaFreeFrom: draft.dhakaFree ? draft.dhakaFreeFrom : null,
        outsideFee: draft.outsideFee!,
        outsideFreeFrom: draft.outsideFree ? draft.outsideFreeFrom : null,
      }
    : null;
  const s = state.settings;
  const dirty =
    !!next &&
    (next.dhakaFee !== s.dhakaFee || next.dhakaFreeFrom !== s.dhakaFreeFrom || next.outsideFee !== s.outsideFee || next.outsideFreeFrom !== s.outsideFreeFrom);

  const save = () => {
    if (!next) return;
    run('SAVE_DELIVERY_SETTINGS', next, {
      success: 'Delivery charges saved',
      successDetail: 'The storefront and new orders use them now.',
      error: 'Could not save delivery charges',
    });
  };

  return (
    <Card>
      <CardHeader
        title="Delivery charges"
        description="Shown in the storefront and charged on every new order."
        icon={<Truck className="h-[18px] w-[18px]" />}
      />
      <div className="space-y-5 p-5">
        {!state.ready && (
          <p role="alert" className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              The database needs the <code className="font-mono">store_settings</code> table before these can be changed. Run{' '}
              <code className="font-mono">supabase/schema.sql</code> in the Supabase SQL Editor. Until then orders use the values shown.
            </span>
          </p>
        )}

        <fieldset className="space-y-3" disabled={!state.ready}>
          <legend className="text-sm font-semibold text-ink">Inside Dhaka district</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 [&>*]:min-w-0">
            <Field label="Delivery fee" required error={errors.dhakaFee}>
              {({ id, describedBy, invalid }) => (
                <PriceInput id={id} value={draft.dhakaFee} onChange={(v) => set({ dhakaFee: v })} allowEmpty aria-describedby={describedBy} aria-invalid={invalid} />
              )}
            </Field>
            <Field label="Free delivery from" error={errors.dhakaFreeFrom} help={draft.dhakaFree ? 'Order subtotal, before coupons.' : 'Off: the fee always applies.'}>
              {({ id, describedBy, invalid }) => (
                <div className="flex items-center gap-3">
                  <Switch checked={draft.dhakaFree} onCheckedChange={(v) => set({ dhakaFree: v })} aria-label="Free delivery in Dhaka above an amount" />
                  <PriceInput
                    id={id}
                    value={draft.dhakaFreeFrom}
                    onChange={(v) => set({ dhakaFreeFrom: v })}
                    allowEmpty
                    disabled={!draft.dhakaFree || !state.ready}
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                  />
                </div>
              )}
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-3 border-t border-line pt-5" disabled={!state.ready}>
          <legend className="sr-only">Outside Dhaka</legend>
          <p className="text-sm font-semibold text-ink" aria-hidden>
            Outside Dhaka (courier)
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 [&>*]:min-w-0">
            <Field label="Delivery fee" required error={errors.outsideFee}>
              {({ id, describedBy, invalid }) => (
                <PriceInput id={id} value={draft.outsideFee} onChange={(v) => set({ outsideFee: v })} allowEmpty aria-describedby={describedBy} aria-invalid={invalid} />
              )}
            </Field>
            <Field label="Free delivery from" error={errors.outsideFreeFrom} help={draft.outsideFree ? 'Order subtotal, before coupons.' : 'Off: the fee always applies.'}>
              {({ id, describedBy, invalid }) => (
                <div className="flex items-center gap-3">
                  <Switch checked={draft.outsideFree} onCheckedChange={(v) => set({ outsideFree: v })} aria-label="Free delivery outside Dhaka above an amount" />
                  <PriceInput
                    id={id}
                    value={draft.outsideFreeFrom}
                    onChange={(v) => set({ outsideFreeFrom: v })}
                    allowEmpty
                    disabled={!draft.outsideFree || !state.ready}
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                  />
                </div>
              )}
            </Field>
          </div>
        </fieldset>

        {next && (
          <div className="rounded-xl border border-line bg-mint-25 px-4 py-3">
            <p className="text-[13px] font-semibold text-ink-2">What shoppers pay</p>
            <table className="mt-2 w-full text-[13px]">
              <thead>
                <tr className="text-left text-muted">
                  <th className="pb-1 font-medium">Order subtotal</th>
                  <th className="pb-1 text-right font-medium">Dhaka</th>
                  <th className="pb-1 text-right font-medium">Outside Dhaka</th>
                </tr>
              </thead>
              <tbody className="tabular text-ink">
                {[500, 1000, 2000, 5000].map((sub) => (
                  <tr key={sub}>
                    <td className="py-0.5">{formatBDT(sub)}</td>
                    <td className="py-0.5 text-right">{fmtFee(feeFor(sub, next.dhakaFee, next.dhakaFreeFrom))}</td>
                    <td className="py-0.5 text-right">{fmtFee(feeFor(sub, next.outsideFee, next.outsideFreeFrom))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-subtle">
            {state.updatedAt ? (
              <>
                Last changed <RelativeTime value={state.updatedAt} />
              </>
            ) : (
              'Orders already placed keep the fee they were charged.'
            )}
          </p>
          <div className="flex gap-2">
            {dirty && (
              <Button variant="ghost" onClick={() => setDraft(toDraft(state.settings))} disabled={busy}>
                Reset
              </Button>
            )}
            <Button onClick={save} loading={busy} disabled={!state.ready || !valid || !dirty}>
              Save charges
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function fmtFee(v: number) {
  return v === 0 ? <span className="font-semibold text-primary">Free</span> : formatBDT(v);
}
