'use client';

import React, { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { CalendarDays, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { addDays, formatDayKey, isDayKey, todayKey } from '@/lib/dates';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';
import { triggerBase } from './Select';

// Day keys ('YYYY-MM-DD', Dhaka calendar) everywhere: no Date/timezone drift.

function keyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12); // local noon: immune to DST/timezone edges
}
function dateToKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface CalendarProps {
  /** Single date mode. */
  value?: string | null;
  onSelect?: (key: string) => void;
  /** Range mode. */
  range?: { from: string | null; to: string | null };
  onRangeSelect?: (range: { from: string; to: string | null }) => void;
  min?: string;
  max?: string;
  className?: string;
  numberOfMonths?: number;
}

/** Brand-styled react-day-picker (week starts Saturday, Bangladesh). */
const dayPickerClassNames = {
  root: 'select-none text-ink',
  months: 'relative flex flex-col gap-4 sm:flex-row',
  month: 'space-y-2',
  month_caption: 'flex h-9 items-center justify-center',
  caption_label: 'text-sm font-semibold text-ink',
  nav: 'absolute inset-x-0 top-0 flex h-9 items-center justify-between',
  button_previous:
    'grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-muted transition hover:bg-mint hover:text-primary active:scale-90 disabled:opacity-30',
  button_next:
    'grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-muted transition hover:bg-mint hover:text-primary active:scale-90 disabled:opacity-30',
  chevron: 'h-4 w-4 fill-current',
  month_grid: 'border-collapse',
  weekdays: '',
  weekday: 'h-8 w-9 text-center text-xs font-semibold text-muted',
  week: '',
  day: 'relative h-9 w-9 p-0 text-center',
  day_button:
    'tabular grid h-9 w-9 cursor-pointer place-items-center rounded-xl text-[13px] font-medium transition-[background-color,color,transform] duration-100 hover:bg-mint active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
  selected: '[&>button]:bg-primary [&>button]:font-bold [&>button]:text-white [&>button]:shadow-soft [&>button:hover]:bg-primary-600',
  range_start: 'rounded-l-xl bg-mint',
  range_end: 'rounded-r-xl bg-mint',
  range_middle: 'bg-mint [&>button]:!bg-transparent [&>button]:!text-primary-600 [&>button]:!shadow-none [&>button]:font-semibold',
  today: '[&>button]:ring-1 [&>button]:ring-inset [&>button]:ring-highlight',
  outside: '[&>button]:text-[#9db3a6]',
  disabled: '[&>button]:cursor-not-allowed [&>button]:opacity-35 [&>button:hover]:bg-transparent',
  hidden: 'invisible',
};

export function Calendar({ value, onSelect, range, onRangeSelect, min, max, className = '', numberOfMonths = 1 }: CalendarProps) {
  const disabled = [
    ...(min ? [{ before: keyToDate(min) }] : []),
    ...(max ? [{ after: keyToDate(max) }] : []),
  ];
  const anchor = value ?? range?.to ?? range?.from ?? null;
  const common = {
    weekStartsOn: 6 as const,
    showOutsideDays: true,
    disabled,
    classNames: dayPickerClassNames,
    className,
    numberOfMonths,
    defaultMonth: anchor ? keyToDate(anchor) : undefined,
  };
  if (onRangeSelect) {
    return (
      <DayPicker
        {...common}
        mode="range"
        selected={range?.from ? { from: keyToDate(range.from), to: range.to ? keyToDate(range.to) : undefined } : undefined}
        onSelect={(r, picked) => {
          // Start over when a full range already exists.
          if (range?.from && range.to) return onRangeSelect({ from: dateToKey(picked), to: null });
          if (!r?.from) return onRangeSelect({ from: dateToKey(picked), to: null });
          onRangeSelect({ from: dateToKey(r.from), to: r.to ? dateToKey(r.to) : null });
        }}
      />
    );
  }
  return (
    <DayPicker
      {...common}
      mode="single"
      selected={value ? keyToDate(value) : undefined}
      onSelect={(d, picked) => onSelect?.(dateToKey(d ?? picked))}
    />
  );
}

/** Single date field with a calendar popover. Value is a Dhaka day key or ''. */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  min,
  max,
  id,
  clearable = true,
  className = '',
  size = 'md',
  'aria-label': ariaLabel,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
}: {
  value: string;
  onChange: (key: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  id?: string;
  clearable?: boolean;
  className?: string;
  size?: 'sm' | 'md';
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const valid = isDayKey(value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn('relative', className)}>
        <PopoverTrigger
          id={id}
          aria-label={ariaLabel}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          aria-haspopup="dialog"
          className={cn(triggerBase, size === 'sm' ? 'h-9 px-3 text-[13px]' : 'h-10 px-3.5 text-sm', clearable && valid && 'pr-9')}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-muted" />
          <span className={cn('tabular flex-1 truncate', !valid && 'text-[#7e9688]')}>{valid ? formatDayKey(value, true) : placeholder}</span>
        </PopoverTrigger>
        {clearable && valid && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear date"
            className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted transition hover:bg-mint hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <PopoverContent
        className="w-auto p-3"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          const el = e.currentTarget as HTMLElement | null;
          requestAnimationFrame(() =>
            (el?.querySelector<HTMLButtonElement>('[aria-selected="true"] button, button[tabindex="0"]:not([disabled])'))?.focus()
          );
        }}
      >
        <Calendar
          value={valid ? value : null}
          min={min}
          max={max}
          onSelect={(k) => {
            onChange(k);
            setOpen(false);
          }}
        />
        <div className="mt-2 flex justify-between border-t border-line pt-2">
          <button
            type="button"
            onClick={() => {
              onChange(todayKey());
              setOpen(false);
            }}
            className="cursor-pointer rounded-lg px-2 py-1 text-[13px] font-semibold text-primary-600 hover:bg-mint"
          >
            Today
          </button>
          {clearable && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="cursor-pointer rounded-lg px-2 py-1 text-[13px] font-semibold text-muted hover:bg-mint"
            >
              Clear
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export interface DateRangeValue {
  from: string;
  to: string;
}

export interface RangePresetOption {
  id: string;
  label: string;
  /** Returns the range for this preset (inclusive day keys). */
  range: () => DateRangeValue;
}

export const DEFAULT_RANGE_PRESETS: RangePresetOption[] = [
  { id: 'today', label: 'Today', range: () => ({ from: todayKey(), to: todayKey() }) },
  { id: '7d', label: 'Last 7 days', range: () => ({ from: addDays(todayKey(), -6), to: todayKey() }) },
  { id: '30d', label: 'Last 30 days', range: () => ({ from: addDays(todayKey(), -29), to: todayKey() }) },
  { id: '90d', label: 'Last 90 days', range: () => ({ from: addDays(todayKey(), -89), to: todayKey() }) },
];

/**
 * Range picker: preset list + calendar. `onChange` receives either a preset
 * id or a custom range. `value` empty strings = no range.
 */
export function DateRangePicker({
  value,
  preset,
  onChange,
  presets = DEFAULT_RANGE_PRESETS,
  placeholder = 'Any date',
  max = todayKey(),
  size = 'md',
  className = '',
  align = 'start',
  clearable = false,
  fit = false,
  'aria-label': ariaLabel = 'Date range',
}: {
  /** Size the trigger to its content instead of filling the width. */
  fit?: boolean;
  value: DateRangeValue;
  /** Active preset id, if the range came from one. */
  preset?: string | null;
  onChange: (next: { preset: string | null; range: DateRangeValue }) => void;
  presets?: RangePresetOption[];
  placeholder?: string;
  max?: string;
  size?: 'sm' | 'md';
  className?: string;
  align?: 'start' | 'end';
  clearable?: boolean;
  'aria-label'?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });
  const has = isDayKey(value.from) && isDayKey(value.to);
  const presetLabel = preset ? presets.find((p) => p.id === preset)?.label : null;
  const label = presetLabel ?? (has ? (value.from === value.to ? formatDayKey(value.from, true) : `${formatDayKey(value.from)} – ${formatDayKey(value.to, true)}`) : placeholder);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setDraft(has ? { from: value.from, to: value.to } : { from: null, to: null });
      }}
    >
      <div className={cn('relative', fit && 'inline-block', className)}>
        <PopoverTrigger
          aria-label={`${ariaLabel}: ${label}`}
          aria-haspopup="dialog"
          className={cn(
            triggerBase,
            size === 'sm' ? 'h-9 px-3 text-[13px]' : 'h-10 px-3.5 text-sm',
            has && !preset && 'border-primary/50 bg-mint-25',
            fit && 'w-auto!',
            clearable && has && 'pr-9'
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-muted" />
          <span className={cn('tabular flex-1 truncate font-medium', !has && !presetLabel && 'text-[#7e9688]')}>{label}</span>
        </PopoverTrigger>
        {clearable && has && (
          <button
            type="button"
            onClick={() => onChange({ preset: null, range: { from: '', to: '' } })}
            aria-label="Clear date range"
            className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted transition hover:bg-mint hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <PopoverContent align={align} className="w-auto p-0">
        <div className="flex flex-col sm:flex-row">
          <ul className="flex gap-1 overflow-x-auto border-b border-line p-2 sm:w-40 sm:flex-col sm:border-b-0 sm:border-r" aria-label="Presets">
            {presets.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange({ preset: p.id, range: p.range() });
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full cursor-pointer whitespace-nowrap rounded-lg px-3 py-2 text-left text-[13px] font-medium transition',
                    preset === p.id ? 'bg-primary text-white' : 'text-ink hover:bg-mint'
                  )}
                >
                  {p.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="p-3">
            <Calendar
              range={draft}
              max={max}
              onRangeSelect={(r) => setDraft({ from: r.from, to: r.to })}
            />
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
              <p className="tabular text-[13px] text-muted">
                {draft.from ? formatDayKey(draft.from) : 'Start'} – {draft.to ? formatDayKey(draft.to) : 'End'}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-8 cursor-pointer rounded-lg px-3 text-[13px] font-semibold text-muted transition hover:bg-mint"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!draft.from}
                  onClick={() => {
                    if (!draft.from) return;
                    onChange({ preset: null, range: { from: draft.from, to: draft.to ?? draft.from } });
                    setOpen(false);
                  }}
                  className="h-8 cursor-pointer rounded-lg bg-primary px-3 text-[13px] font-semibold text-white transition hover:bg-primary-600 active:scale-95 disabled:opacity-40"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
