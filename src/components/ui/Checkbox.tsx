'use client';

import React from 'react';
import * as RC from '@radix-ui/react-checkbox';
import * as RR from '@radix-ui/react-radio-group';
import * as RS from '@radix-ui/react-switch';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Checkbox({
  className = '',
  label,
  description,
  ...props
}: React.ComponentProps<typeof RC.Root> & { label?: React.ReactNode; description?: React.ReactNode }) {
  const box = (
    <RC.Root
      className={cn(
        'peer grid h-[18px] w-[18px] shrink-0 cursor-pointer place-items-center rounded-[6px] border-[1.5px] border-[#b9d2c2] bg-white transition-all duration-150',
        'hover:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 active:scale-90',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      <RC.Indicator className="fb-fade-in text-white">
        {props.checked === 'indeterminate' ? <Minus className="h-3 w-3" strokeWidth={3.5} /> : <Check className="h-3 w-3" strokeWidth={3.5} />}
      </RC.Indicator>
    </RC.Root>
  );
  if (!label) return box;
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <span className="mt-0.5">{box}</span>
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
    </label>
  );
}

export function RadioGroup<T extends string>({
  value,
  onValueChange,
  options,
  className = '',
  variant = 'list',
  'aria-label': ariaLabel,
  name,
}: {
  value: T;
  onValueChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; description?: React.ReactNode; disabled?: boolean }[];
  className?: string;
  variant?: 'list' | 'cards';
  'aria-label'?: string;
  name?: string;
}) {
  return (
    <RR.Root
      value={value}
      onValueChange={(v) => onValueChange(v as T)}
      aria-label={ariaLabel}
      name={name}
      className={cn(variant === 'cards' ? 'grid gap-2 sm:grid-cols-2' : 'space-y-2', className)}
    >
      {options.map((o) => (
        <label
          key={o.value}
          className={cn(
            'flex cursor-pointer items-start gap-3',
            variant === 'cards' &&
              'rounded-xl border border-line-strong bg-white p-3 transition hover:border-primary/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-mint-50 has-[[data-state=checked]]:ring-4 has-[[data-state=checked]]:ring-primary/10'
          )}
        >
          <RR.Item
            value={o.value}
            disabled={o.disabled}
            className="mt-0.5 grid h-[18px] w-[18px] shrink-0 cursor-pointer place-items-center rounded-full border-[1.5px] border-[#b9d2c2] bg-white transition hover:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 data-[state=checked]:border-primary disabled:opacity-50"
          >
            <RR.Indicator className="fb-fade-in block h-2.5 w-2.5 rounded-full bg-primary" />
          </RR.Item>
          <span>
            <span className="block text-sm font-semibold text-ink">{o.label}</span>
            {o.description && <span className="block text-xs text-muted">{o.description}</span>}
          </span>
        </label>
      ))}
    </RR.Root>
  );
}

export function Switch({
  className = '',
  size = 'md',
  label,
  description,
  ...props
}: React.ComponentProps<typeof RS.Root> & { size?: 'sm' | 'md'; label?: React.ReactNode; description?: React.ReactNode }) {
  const dims = size === 'sm' ? 'h-5 w-9' : 'h-6 w-11';
  const thumb = size === 'sm' ? 'h-4 w-4 data-[state=checked]:translate-x-4' : 'h-5 w-5 data-[state=checked]:translate-x-5';
  const control = (
    <RS.Root
      className={cn(
        'relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-[#cddcd3] transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 data-[state=checked]:bg-primary disabled:cursor-not-allowed disabled:opacity-50',
        dims,
        className
      )}
      {...props}
    >
      <RS.Thumb
        className={cn(
          'pointer-events-none block translate-x-0 rounded-full bg-white shadow-[0_1px_3px_rgba(15,44,29,.3)] transition-transform duration-200 ease-[cubic-bezier(.16,1,.3,1)]',
          thumb
        )}
      />
    </RS.Root>
  );
  if (!label) return control;
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
      {control}
    </label>
  );
}
