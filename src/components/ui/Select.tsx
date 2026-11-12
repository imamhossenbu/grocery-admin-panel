'use client';

import React, { useId, useMemo, useRef, useState } from 'react';
import * as RP from '@radix-ui/react-popover';
import { Popover, PopoverContent } from './Popover';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  /** Extra text matched by search (not shown). */
  keywords?: string;
  /** Right-aligned hint (e.g. a count). */
  meta?: React.ReactNode;
}

interface CommonProps<T extends string> {
  options: SelectOption<T>[];
  placeholder?: string;
  /** Show a search box; 'auto' = when there are more than 8 options. */
  searchable?: boolean | 'auto';
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  size?: 'sm' | 'md';
  id?: string;
  name?: string;
  icon?: React.ReactNode;
  align?: 'start' | 'end';
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  emptyText?: string;
}

export interface SelectProps<T extends string> extends CommonProps<T> {
  value: T | '' | null;
  onChange: (value: T) => void;
  /** Adds a "clear" affordance that calls onClear. */
  onClear?: () => void;
}

export interface MultiSelectProps<T extends string> extends CommonProps<T> {
  values: T[];
  onChange: (values: T[]) => void;
  /** Label shown in the trigger, e.g. "Payment status". */
  label?: string;
}

export const triggerBase =
  'group inline-flex w-full items-center gap-2 rounded-xl border border-line-strong bg-white text-left text-ink outline-none cursor-pointer ' +
  'transition-[border-color,box-shadow,background-color] duration-150 hover:border-[#b5d2bf] focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 ' +
  'data-[state=open]:border-primary data-[state=open]:ring-4 data-[state=open]:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-red-400';

function matches(o: SelectOption, q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return `${o.label} ${o.description ?? ''} ${o.keywords ?? ''}`.toLowerCase().includes(s);
}

function useListbox<T extends string>({
  options,
  searchable,
  isSelected,
  onPick,
  multiple,
}: {
  options: SelectOption<T>[];
  searchable: boolean | 'auto';
  isSelected: (v: T) => boolean;
  onPick: (v: T) => void;
  multiple: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ text: '', at: 0 });

  const showSearch = searchable === 'auto' ? options.length > 8 : searchable;
  const filtered = useMemo(() => options.filter((o) => matches(o, query)), [options, query]);
  const optionId = (i: number) => `${listId}-opt-${i}`;

  const firstEnabled = (list: SelectOption<T>[], from = 0, dir: 1 | -1 = 1) => {
    for (let i = from; i >= 0 && i < list.length; i += dir) if (!list[i].disabled) return i;
    return -1;
  };

  const scrollTo = (i: number) => {
    requestAnimationFrame(() => document.getElementById(optionId(i))?.scrollIntoView({ block: 'nearest' }));
  };

  const move = (i: number) => {
    setActive(i);
    if (i >= 0) scrollTo(i);
  };

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setQuery('');
      const sel = options.findIndex((o) => isSelected(o.value));
      const start = sel >= 0 ? sel : firstEnabled(options);
      setActive(start);
      if (start >= 0) scrollTo(start);
    }
  };

  const choose = (o: SelectOption<T> | undefined) => {
    if (!o || o.disabled) return;
    onPick(o.value);
    if (!multiple) setOpen(false);
  };

  const runTypeahead = (key: string, list: SelectOption<T>[], from: number): number => {
    const now = Date.now();
    const t = typeahead.current;
    t.text = now - t.at > 600 ? key : t.text + key;
    t.at = now;
    const q = t.text.toLowerCase();
    const order = [...list.keys()].map((k) => (k + from + (t.text.length === 1 ? 1 : 0)) % list.length);
    return order.find((i) => !list[i].disabled && list[i].label.toLowerCase().startsWith(q)) ?? -1;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const list = filtered;
    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const n = firstEnabled(list, Math.min(active + 1, list.length - 1));
        move(n >= 0 ? n : active);
        return;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const n = firstEnabled(list, Math.max(active - 1, 0), -1);
        move(n >= 0 ? n : active);
        return;
      }
      case 'Home':
        if (showSearch) return;
        e.preventDefault();
        move(firstEnabled(list));
        return;
      case 'End':
        if (showSearch) return;
        e.preventDefault();
        move(firstEnabled(list, list.length - 1, -1));
        return;
      case 'Enter':
        e.preventDefault();
        choose(list[active]);
        return;
      case ' ':
        if (showSearch) return;
        e.preventDefault();
        choose(list[active]);
        return;
      case 'Tab':
        setOpen(false);
        return;
      default:
        if (!showSearch && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          const i = runTypeahead(e.key, list, Math.max(active, 0));
          if (i >= 0) move(i);
        }
    }
  };

  /** Closed-trigger keys: arrows open; letters jump (single select only). */
  const onTriggerKeyDown = (e: React.KeyboardEvent, singlePick?: (v: T) => void) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      onOpenChange(true);
    } else if (singlePick && e.key.length === 1 && e.key !== ' ' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const current = options.findIndex((o) => isSelected(o.value));
      const i = runTypeahead(e.key, options, Math.max(current, 0));
      if (i >= 0) singlePick(options[i].value);
    }
  };

  const content = (opts: { emptyText?: string; contentClassName?: string; align?: 'start' | 'end'; label?: string }) => (
      <PopoverContent
        unstyled
        align={opts.align ?? 'start'}
        sideOffset={6}
        onOpenAutoFocus={(e) => {
          if (!showSearch) {
            e.preventDefault();
            listRef.current?.focus();
          }
        }}
        onKeyDown={onKeyDown}
        className={cn(
          'flex max-h-[min(380px,var(--radix-popover-content-available-height))] min-w-[var(--radix-popover-trigger-width)] max-w-[min(420px,calc(100vw-24px))] flex-col overflow-hidden rounded-xl border border-line bg-white shadow-pop',
          opts.contentClassName
        )}
      >
        {showSearch && (
          <div className="border-b border-line p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  const next = options.filter((o) => matches(o, e.target.value));
                  setActive(firstEnabled(next));
                }}
                placeholder="Type to filter…"
                role="combobox"
                aria-expanded
                aria-controls={listId}
                aria-activedescendant={active >= 0 ? optionId(active) : undefined}
                aria-autocomplete="list"
                aria-label={opts.label ? `Filter ${opts.label}` : 'Filter options'}
                className="h-9 w-full rounded-lg bg-mint-25 pl-8 pr-2 text-[13px] text-ink outline-none ring-1 ring-line placeholder:text-[#8aa396] focus:ring-primary/50"
              />
            </div>
          </div>
        )}
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-multiselectable={multiple || undefined}
          aria-label={opts.label}
          aria-activedescendant={!showSearch && active >= 0 ? optionId(active) : undefined}
          className="flex-1 overflow-y-auto p-1.5 outline-none"
        >
          {filtered.length === 0 && (
            <li className="px-3 py-6 text-center text-xs text-muted" role="presentation">
              {opts.emptyText ?? 'No matches'}
            </li>
          )}
          {filtered.map((o, i) => {
            const selected = isSelected(o.value);
            return (
              <li
                key={o.value}
                id={optionId(i)}
                role="option"
                aria-selected={selected}
                aria-disabled={o.disabled || undefined}
                onPointerMove={() => !o.disabled && active !== i && setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o)}
                className={cn(
                  'relative flex cursor-pointer select-none items-center gap-2.5 rounded-lg py-2 pl-2.5 pr-8 text-[13px] transition-colors duration-100',
                  i === active ? 'bg-mint text-primary-600' : 'text-ink',
                  selected && 'font-semibold',
                  o.disabled && 'cursor-not-allowed opacity-45'
                )}
              >
                {multiple && (
                  <span
                    aria-hidden
                    className={cn(
                      'grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border-[1.5px] transition-colors',
                      selected ? 'border-primary bg-primary text-white' : 'border-[#b9d2c2] bg-white'
                    )}
                  >
                    {selected && <Check className="h-3 w-3" strokeWidth={3.5} />}
                  </span>
                )}
                {o.icon && <span className="shrink-0 [&_svg]:h-4 [&_svg]:w-4">{o.icon}</span>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{o.label}</span>
                  {o.description && <span className="block truncate text-[11px] font-normal text-muted">{o.description}</span>}
                </span>
                {o.meta && <span className="shrink-0 text-[11px] font-semibold text-subtle">{o.meta}</span>}
                {!multiple && selected && <Check className="absolute right-2.5 h-4 w-4 text-primary" strokeWidth={2.5} />}
              </li>
            );
          })}
        </ul>
      </PopoverContent>
  );

  return { open, onOpenChange, content, onTriggerKeyDown, listId };
}

/** Single-value select: listbox with keyboard nav, type-ahead, optional search. */
export function Select<T extends string>({
  value,
  onChange,
  onClear,
  options,
  placeholder = 'Select…',
  searchable = 'auto',
  disabled,
  className = '',
  contentClassName,
  size = 'md',
  id,
  name,
  icon,
  align,
  emptyText,
  ...aria
}: SelectProps<T>) {
  const { open, onOpenChange, content, onTriggerKeyDown, listId } = useListbox({
    options,
    searchable,
    isSelected: (v) => v === value,
    onPick: onChange,
    multiple: false,
  });
  const selected = options.find((o) => o.value === value);
  const h = size === 'sm' ? 'h-9 px-3 text-xs' : 'h-10 px-3.5 text-sm';

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {name && <input type="hidden" name={name} value={value ?? ''} />}
      <div className={cn('relative', className)}>
        <RP.Trigger
          id={id}
          disabled={disabled}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-label={aria['aria-label']}
          aria-labelledby={aria['aria-labelledby']}
          aria-describedby={aria['aria-describedby']}
          aria-invalid={aria['aria-invalid'] || undefined}
          onKeyDown={(e) => onTriggerKeyDown(e, onChange)}
          className={cn(triggerBase, h, onClear && selected && 'pr-14')}
        >
          {(icon || selected?.icon) && <span className="shrink-0 text-muted [&_svg]:h-4 [&_svg]:w-4">{selected?.icon ?? icon}</span>}
          <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-[#8aa396]')}>{selected ? selected.label : placeholder}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </RP.Trigger>
        {onClear && selected && !disabled && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear selection"
            className="absolute right-8 top-1/2 grid h-6 w-6 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted transition hover:bg-mint hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {content({ emptyText, contentClassName, align, label: aria['aria-label'] })}
    </Popover>
  );
}

/** Multi-value select with checkboxes; trigger summarises the selection. */
export function MultiSelect<T extends string>({
  values,
  onChange,
  options,
  placeholder = 'Any',
  label,
  searchable = 'auto',
  disabled,
  className = '',
  contentClassName,
  size = 'md',
  id,
  name,
  icon,
  align,
  emptyText,
  ...aria
}: MultiSelectProps<T>) {
  const toggle = (v: T) => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  const { open, onOpenChange, content, onTriggerKeyDown, listId } = useListbox({
    options,
    searchable,
    isSelected: (v) => values.includes(v),
    onPick: toggle,
    multiple: true,
  });
  const chosen = options.filter((o) => values.includes(o.value));
  const h = size === 'sm' ? 'h-9 px-3 text-xs' : 'h-10 px-3.5 text-sm';

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {name && <input type="hidden" name={name} value={values.join(',')} />}
      <div className={cn('relative', className)}>
        <RP.Trigger
          id={id}
          disabled={disabled}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-label={aria['aria-label'] ?? label}
          aria-labelledby={aria['aria-labelledby']}
          aria-describedby={aria['aria-describedby']}
          onKeyDown={(e) => onTriggerKeyDown(e)}
          className={cn(triggerBase, h, chosen.length > 0 && 'border-primary/50 bg-mint-25 pr-14')}
        >
          {icon && <span className="shrink-0 text-muted [&_svg]:h-4 [&_svg]:w-4">{icon}</span>}
          <span className="min-w-0 flex-1 truncate">
            {label && <span className={cn('font-semibold', chosen.length ? 'text-ink' : 'text-muted')}>{label}</span>}
            {chosen.length === 0 ? (
              <span className="text-[#8aa396]">{label ? `: ${placeholder}` : placeholder}</span>
            ) : (
              <span className="text-primary-600">
                {label ? ': ' : ''}
                {chosen.length <= 2 ? chosen.map((c) => c.label).join(', ') : `${chosen.length} selected`}
              </span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </RP.Trigger>
        {chosen.length > 0 && !disabled && (
          <button
            type="button"
            onClick={() => onChange([])}
            aria-label={`Clear ${label ?? 'selection'}`}
            className="absolute right-8 top-1/2 grid h-6 w-6 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted transition hover:bg-mint hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {content({ emptyText, contentClassName, align, label: label ?? aria['aria-label'] })}
    </Popover>
  );
}
