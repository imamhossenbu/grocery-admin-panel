import { STORE_TIMEZONE } from './constants';

// ---------------------------------------------------------------------------
// Date helpers shared by server and client. The store runs on Dhaka time
// (UTC+6, no daylight saving), so "a day" always means a Dhaka calendar day.
// Day keys are 'YYYY-MM-DD' strings in Dhaka time.
// ---------------------------------------------------------------------------

const OFFSET_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDayKey(value: unknown): value is string {
  if (typeof value !== 'string' || !KEY_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Dhaka calendar day of an instant. */
export function dayKeyOf(date: Date | string | number): string {
  const t = new Date(date).getTime() + OFFSET_MS;
  return new Date(t).toISOString().slice(0, 10);
}

export function todayKey(): string {
  return dayKeyOf(Date.now());
}

/** The UTC instant at which a Dhaka day starts. */
export function dayStart(key: string): Date {
  return new Date(Date.parse(`${key}T00:00:00Z`) - OFFSET_MS);
}

export function addDays(key: string, n: number): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

export function diffDays(fromKey: string, toKey: string): number {
  return Math.round((Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / DAY_MS);
}

/** Dhaka hour (0-23) of an instant. */
export function hourOf(date: Date | string): number {
  return new Date(new Date(date).getTime() + OFFSET_MS).getUTCHours();
}

export type RangePreset = 'today' | '7d' | '30d' | '90d' | 'custom';

export const RANGE_PRESETS: { id: Exclude<RangePreset, 'custom'>; label: string; short: string }[] = [
  { id: 'today', label: 'Today', short: 'Today' },
  { id: '7d', label: 'Last 7 days', short: '7D' },
  { id: '30d', label: 'Last 30 days', short: '30D' },
  { id: '90d', label: 'Last 90 days', short: '90D' },
];

export interface ResolvedRange {
  preset: RangePreset;
  /** Inclusive Dhaka day keys. */
  fromKey: string;
  toKey: string;
  /** [start, end) in UTC. */
  start: Date;
  end: Date;
  days: number;
  /** The same-length window right before this one. */
  prevStart: Date;
  prevEnd: Date;
  label: string;
}

export function resolveRange(input: { range?: string; from?: string; to?: string }): ResolvedRange {
  const today = todayKey();
  let preset: RangePreset = '30d';
  let fromKey: string;
  let toKey = today;

  if (input.range === 'custom' && isDayKey(input.from) && isDayKey(input.to)) {
    preset = 'custom';
    fromKey = input.from <= input.to ? input.from : input.to;
    toKey = input.from <= input.to ? input.to : input.from;
    if (toKey > today) toKey = today;
    if (fromKey > toKey) fromKey = toKey;
    // Keep aggregation bounded (about two years).
    if (diffDays(fromKey, toKey) > 730) fromKey = addDays(toKey, -730);
  } else {
    preset = (['today', '7d', '30d', '90d'] as const).find((p) => p === input.range) ?? '30d';
    const span = preset === 'today' ? 1 : Number.parseInt(preset, 10);
    fromKey = addDays(today, -(span - 1));
  }

  const days = diffDays(fromKey, toKey) + 1;
  const start = dayStart(fromKey);
  const end = dayStart(addDays(toKey, 1));
  const prevStart = new Date(start.getTime() - days * DAY_MS);
  const label =
    preset === 'custom'
      ? `${formatDayKey(fromKey)} – ${formatDayKey(toKey)}`
      : RANGE_PRESETS.find((p) => p.id === preset)!.label;

  return { preset, fromKey, toKey, start, end, days, prevStart, prevEnd: start, label };
}

const dayFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const dayYearFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "12 Nov" (or "12 Nov 2025" with year). */
export function formatDayKey(key: string, withYear = false): string {
  const d = new Date(`${key}T00:00:00Z`);
  return (withYear ? dayYearFmt : dayFmt).format(d);
}

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: STORE_TIMEZONE,
});
const dateTimeFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: STORE_TIMEZONE,
});
const timeFmt = new Intl.DateTimeFormat('en-GB', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: STORE_TIMEZONE,
});

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : dateFmt.format(d);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : dateTimeFmt.format(d);
}

export function formatTime(value: string | Date): string {
  return timeFmt.format(new Date(value));
}

/** "just now", "5 min ago", "3 h ago", "2 d ago", then a date. */
export function formatRelative(value: string | Date | null | undefined, now = Date.now()): string {
  if (!value) return '—';
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return '—';
  const s = Math.round((now - t) / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} d ago`;
  return formatDate(value);
}
