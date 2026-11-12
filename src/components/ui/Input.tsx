'use client';

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Minus, Plus, Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';

// ---------------------------------------------------------------------------
// One input system for the whole panel. Every text-like control shares the
// same frame (border, radius, hover, brand focus ring, error/success states,
// sizes) so forms look identical everywhere.
// ---------------------------------------------------------------------------

export type ControlSize = 'sm' | 'md' | 'lg';
export type ControlState = 'default' | 'error' | 'success';

const SIZE: Record<ControlSize, { h: string; text: string; px: string; padL: string; padR: string }> = {
  sm: { h: 'h-9', text: 'text-[13px]', px: 'px-3', padL: 'pl-9', padR: 'pr-9' },
  md: { h: 'h-10', text: 'text-sm', px: 'px-3.5', padL: 'pl-10', padR: 'pr-10' },
  lg: { h: 'h-12', text: 'text-[15px]', px: 'px-4', padL: 'pl-11', padR: 'pr-11' },
};

/** The shared frame. Exported so custom controls (selects, pickers) match. */
export function frameClass(state: ControlState = 'default', className = '') {
  return cn(
    'group/frame relative flex w-full items-stretch rounded-xl border bg-white transition-[border-color,box-shadow,background-color] duration-150',
    'focus-within:ring-4',
    state === 'error'
      ? 'border-red-400 focus-within:border-red-500 focus-within:ring-red-500/10'
      : state === 'success'
        ? 'border-primary/60 focus-within:border-primary focus-within:ring-primary/10'
        : 'border-line-strong hover:border-[#b5d2bf] focus-within:border-primary focus-within:ring-primary/10',
    'has-[:disabled]:cursor-not-allowed has-[:disabled]:bg-[#f3f6f4] has-[:disabled]:hover:border-line-strong',
    'has-[[readonly]]:bg-mint-25',
    className
  );
}

const bare =
  'min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-[#7e9688] disabled:cursor-not-allowed disabled:text-muted read-only:cursor-default';

/** Kept for older call sites: a frame-less input class with the same look. */
export const inputBase =
  'w-full rounded-xl border border-line-strong bg-white text-sm text-ink placeholder:text-[#7e9688] outline-none transition-[border-color,box-shadow] duration-150 hover:border-[#b5d2bf] focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-[#f3f6f4] aria-[invalid=true]:border-red-400';

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> & {
  ref?: React.Ref<HTMLInputElement>;
  /** Icon inside the left edge. */
  leading?: React.ReactNode;
  /** Icon/button inside the right edge. */
  trailing?: React.ReactNode;
  /** Text adornment glued to the left (e.g. ৳, +880). */
  prefix?: React.ReactNode;
  /** Text adornment glued to the right (e.g. %, kg). */
  suffix?: React.ReactNode;
  inputSize?: ControlSize;
  state?: ControlState;
  wrapperClassName?: string;
};

export function Input({
  className = '',
  wrapperClassName = '',
  leading,
  trailing,
  prefix,
  suffix,
  inputSize = 'md',
  state,
  ...props
}: InputProps) {
  const s = SIZE[inputSize];
  const st: ControlState = state ?? (props['aria-invalid'] ? 'error' : 'default');
  return (
    <div className={frameClass(st, cn(s.h, wrapperClassName, className))}>
      {prefix && (
        <span className={cn('flex shrink-0 items-center rounded-l-[11px] border-r border-line bg-mint-25 font-medium text-muted', s.px, s.text)}>{prefix}</span>
      )}
      {leading && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted [&_svg]:h-4 [&_svg]:w-4" style={prefix ? { display: 'none' } : undefined}>
          {leading}
        </span>
      )}
      <input
        className={cn(bare, s.text, leading && !prefix ? s.padL : s.px, trailing && !suffix ? s.padR : '')}
        {...props}
      />
      {trailing && !suffix && <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center">{trailing}</span>}
      {suffix && (
        <span className={cn('flex shrink-0 items-center rounded-r-[11px] border-l border-line bg-mint-25 font-medium text-muted', s.px, s.text)}>{suffix}</span>
      )}
      {st === 'success' && !trailing && !suffix && (
        <CheckCircle2 aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
      )}
    </div>
  );
}

/** Password field with a show/hide toggle. */
export function PasswordInput(props: Omit<InputProps, 'type' | 'trailing'>) {
  const [show, setShow] = useState(false);
  return (
    <Input
      {...props}
      type={show ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-muted transition hover:bg-mint hover:text-ink"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }
    />
  );
}

/** Auto-growing textarea with optional character counter. */
export function Textarea({
  className = '',
  maxLength,
  showCount = !!maxLength,
  minRows = 3,
  maxRows = 14,
  state,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  ref?: React.Ref<HTMLTextAreaElement>;
  showCount?: boolean;
  minRows?: number;
  maxRows?: number;
  state?: ControlState;
}) {
  const inner = useRef<HTMLTextAreaElement | null>(null);
  const value = typeof props.value === 'string' ? props.value : '';
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    el.style.height = 'auto';
    const line = parseFloat(getComputedStyle(el).lineHeight) || 22;
    const pad = 20;
    el.style.height = `${Math.min(Math.max(el.scrollHeight, minRows * line + pad), maxRows * line + pad)}px`;
  }, [value, minRows, maxRows]);
  const st: ControlState = state ?? (props['aria-invalid'] ? 'error' : 'default');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { ref: _ref, ...rest } = props;
  return (
    <div className={frameClass(st, cn('flex-col', className))}>
      <textarea
        ref={inner}
        maxLength={maxLength}
        className={cn(bare, 'resize-none px-3.5 py-2.5 text-sm leading-relaxed')}
        {...rest}
      />
      {showCount && maxLength && (
        <span className={cn('tabular self-end px-3 pb-2 text-xs', value.length > maxLength * 0.9 ? 'text-amber-700' : 'text-subtle')} aria-live="polite">
          {value.length}/{maxLength}
        </span>
      )}
    </div>
  );
}

/** Search box: icon, clear button, optional ⌘K hint, optional debounce. */
export function SearchInput({
  value,
  onChange,
  debounce = 0,
  placeholder = 'Search…',
  className = '',
  inputSize = 'md',
  hint,
  inputRef,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  /** ms; 0 = call onChange on every keystroke. */
  debounce?: number;
  placeholder?: string;
  className?: string;
  inputSize?: ControlSize;
  hint?: React.ReactNode;
  inputRef?: React.Ref<HTMLInputElement>;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'size' | 'prefix'>) {
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  // Follow outside changes (e.g. "clear filters").
  if (value !== synced) {
    setSynced(value);
    setDraft(value);
  }
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const emit = (v: string, now = false) => {
    setDraft(v);
    window.clearTimeout(timer.current);
    if (!debounce || now) {
      setSynced(v);
      onChange(v);
    } else {
      timer.current = window.setTimeout(() => {
        setSynced(v);
        onChange(v);
      }, debounce);
    }
  };

  return (
    <Input
      ref={inputRef}
      type="search"
      inputSize={inputSize}
      value={draft}
      onChange={(e) => emit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && draft) {
          e.stopPropagation();
          emit('', true);
        } else if (e.key === 'Enter') emit(draft, true);
      }}
      placeholder={placeholder}
      className={className}
      leading={<Search />}
      trailing={
        draft ? (
          <button
            type="button"
            onClick={() => emit('', true)}
            aria-label="Clear search"
            className="grid h-7 w-7 cursor-pointer place-items-center rounded-full text-muted transition hover:bg-mint hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          hint
        )
      }
      {...rest}
    />
  );
}

/** Label + control + help/error/counter, wired with ids for assistive tech. */
export function Field({
  label,
  help,
  error,
  required,
  optional,
  children,
  className = '',
  htmlFor,
  counter,
}: {
  label: React.ReactNode;
  help?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  optional?: boolean;
  counter?: { value: number; max: number };
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  const auto = useId();
  const id = htmlFor ?? auto;
  const helpId = `${id}-help`;
  const errId = `${id}-err`;
  const describedBy = [help ? helpId : null, error ? errId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="flex items-center gap-1 text-[13px] font-semibold text-ink-2">
          {label}
          {required && (
            <span className="text-red-600" aria-hidden>
              *
            </span>
          )}
          {optional && <span className="font-normal text-subtle">(optional)</span>}
        </label>
        {counter && (
          <span className={cn('tabular text-xs', counter.value > counter.max ? 'text-red-700' : 'text-subtle')}>
            {counter.value}/{counter.max}
          </span>
        )}
      </div>
      {children({ id, describedBy, invalid: !!error })}
      {error ? (
        <p id={errId} role="alert" className="fb-fade-in flex items-start gap-1.5 text-[13px] font-medium text-red-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : help ? (
        <p id={helpId} className="text-[13px] text-subtle">
          {help}
        </p>
      ) : null}
    </div>
  );
}

/** Numeric field with − / + steppers and min/max (no browser spinners). */
export function NumberInput({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  decimals = 0,
  prefix,
  suffix,
  className = '',
  inputSize = 'md',
  id,
  'aria-label': ariaLabel,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
  placeholder,
  allowEmpty = false,
  disabled,
  onBlur,
  steppers = true,
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  className?: string;
  inputSize?: ControlSize;
  id?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  placeholder?: string;
  allowEmpty?: boolean;
  disabled?: boolean;
  onBlur?: () => void;
  steppers?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value === null || value === undefined ? '' : String(value));
  const clamp = (n: number) => {
    let v = Math.max(min, n);
    if (max !== undefined) v = Math.min(max, v);
    const f = 10 ** decimals;
    return Math.round(v * f) / f;
  };
  const commit = (text: string) => {
    setDraft(null);
    if (!text.trim()) return onChange(allowEmpty ? null : clamp(min));
    const n = Number(text);
    if (Number.isFinite(n)) onChange(clamp(n));
  };
  const bump = (dir: 1 | -1) => onChange(clamp((value ?? 0) + dir * step));
  const s = SIZE[inputSize];
  const stepBtn =
    'grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-muted transition hover:bg-mint hover:text-primary active:scale-90 disabled:pointer-events-none disabled:opacity-30';

  return (
    <div className={frameClass(invalid ? 'error' : 'default', cn(s.h, className))}>
      {prefix && <span className={cn('flex shrink-0 items-center rounded-l-[11px] border-r border-line bg-mint-25 font-medium text-muted', s.px, s.text)}>{prefix}</span>}
      <input
        id={id}
        type="text"
        inputMode={decimals ? 'decimal' : 'numeric'}
        value={shown}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        role="spinbutton"
        aria-valuenow={value ?? undefined}
        aria-valuemin={min}
        aria-valuemax={max}
        onChange={(e) => {
          const t = e.target.value.replace(decimals ? /[^\d.]/g : /\D/g, '');
          setDraft(t);
          const n = Number(t);
          if (t.trim() && Number.isFinite(n)) onChange(clamp(n));
          else if (!t.trim() && allowEmpty) onChange(null);
        }}
        onBlur={(e) => {
          commit(e.target.value);
          onBlur?.();
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            bump(1);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            bump(-1);
          } else if (e.key === 'Enter' && onBlur) {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          } else if (e.key === 'Enter') commit((e.target as HTMLInputElement).value);
        }}
        className={cn(bare, s.text, s.px, 'tabular')}
      />
      {steppers && (
        <span className="flex shrink-0 items-center gap-0.5 pr-1">
          <button type="button" tabIndex={-1} disabled={disabled || (value ?? 0) <= min} onClick={() => bump(-1)} aria-label="Decrease" className={stepBtn}>
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled || (max !== undefined && (value ?? 0) >= max)}
            onClick={() => bump(1)}
            aria-label="Increase"
            className={stepBtn}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </span>
      )}
      {suffix && <span className={cn('flex shrink-0 items-center rounded-r-[11px] border-l border-line bg-mint-25 font-medium text-muted', s.px, s.text)}>{suffix}</span>}
    </div>
  );
}

/** Taka amount, two decimals, ৳ prefix. */
export function PriceInput(props: Omit<React.ComponentProps<typeof NumberInput>, 'decimals' | 'prefix' | 'steppers'>) {
  return <NumberInput {...props} decimals={2} prefix="৳" steppers={false} step={props.step ?? 5} />;
}

/** Bangladesh mobile number: +880 prefix, formats 1XXX-XXXXXX as you type. */
export function PhoneInput({
  value,
  onChange,
  ...rest
}: { value: string; onChange: (v: string) => void } & Omit<InputProps, 'value' | 'onChange' | 'prefix' | 'type'>) {
  const digits = value.replace(/\D/g, '').replace(/^880/, '').replace(/^0/, '').slice(0, 10);
  const pretty = digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits;
  return (
    <Input
      {...rest}
      type="tel"
      inputMode="tel"
      autoComplete="tel-national"
      prefix="+880"
      placeholder="1XXX-XXXXXX"
      value={pretty}
      onChange={(e) => {
        const d = e.target.value.replace(/\D/g, '').replace(/^880/, '').replace(/^0/, '').slice(0, 10);
        onChange(d ? `+880${d}` : '');
      }}
    />
  );
}

/** Chips input: Enter/comma adds, Backspace removes the last, × removes one. */
export function TagInput({
  value,
  onChange,
  placeholder = 'Type and press Enter',
  max = 20,
  id,
  'aria-describedby': describedBy,
  suggestions = [],
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  max?: number;
  id?: string;
  'aria-describedby'?: string;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState('');
  const add = (raw: string) => {
    const parts = raw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    for (const p of parts) if (!next.some((t) => t.toLowerCase() === p.toLowerCase()) && next.length < max) next.push(p.slice(0, 40));
    onChange(next);
    setDraft('');
  };
  const open = suggestions.filter((s) => !value.includes(s) && (!draft || s.toLowerCase().includes(draft.toLowerCase()))).slice(0, 6);
  return (
    <div className="space-y-2">
      <div className={frameClass('default', 'min-h-10 flex-wrap items-center gap-1.5 px-2 py-1.5')}>
        {value.map((t) => (
          <span key={t} className="fb-fade-in inline-flex items-center gap-1 rounded-lg bg-mint py-1 pl-2.5 pr-1 text-[13px] font-medium text-primary-600">
            {t}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== t))}
              aria-label={`Remove ${t}`}
              className="grid h-5 w-5 cursor-pointer place-items-center rounded-md text-primary-600/70 transition hover:bg-white hover:text-red-600"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          aria-describedby={describedBy}
          onChange={(e) => {
            if (e.target.value.endsWith(',')) add(e.target.value);
            else setDraft(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
            } else if (e.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => add(draft)}
          placeholder={value.length >= max ? `Up to ${max}` : placeholder}
          disabled={value.length >= max}
          className={cn(bare, 'h-7 min-w-32 px-1.5 text-sm')}
        />
      </div>
      {open.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Suggestions">
          {open.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="cursor-pointer rounded-lg border border-dashed border-line-strong px-2 py-0.5 text-[13px] text-muted transition hover:border-primary hover:bg-mint-50 hover:text-primary-600"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Long-form error summary shown above a form after a failed submit. */
export function FormErrorSummary({ errors, onJump }: { errors: { field: string; message: string }[]; onJump?: (field: string) => void }) {
  if (!errors.length) return null;
  return (
    <div role="alert" className="fb-slide-down rounded-2xl border border-red-200 bg-red-50 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-red-800">
        <AlertCircle className="h-4 w-4" />
        {errors.length === 1 ? 'Please fix 1 problem' : `Please fix ${errors.length} problems`}
      </p>
      <ul className="mt-2 space-y-1 pl-6 text-[13px] text-red-800">
        {errors.map((e) => (
          <li key={e.field} className="list-disc">
            {onJump ? (
              <button type="button" onClick={() => onJump(e.field)} className="cursor-pointer text-left underline-offset-2 hover:underline">
                {e.message}
              </button>
            ) : (
              e.message
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
