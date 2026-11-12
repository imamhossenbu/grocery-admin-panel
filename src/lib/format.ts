export function formatBDT(amount: number): string {
  return `৳${Math.round(amount).toLocaleString('en-IN')}`;
}

/** ৳1.2L / ৳35.4K style for chart axes and tight KPI spots. */
export function formatBDTCompact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 10_000_000) return `৳${(amount / 10_000_000).toFixed(1).replace(/\.0$/, '')}Cr`;
  if (abs >= 100_000) return `৳${(amount / 100_000).toFixed(1).replace(/\.0$/, '')}L`;
  if (abs >= 1_000) return `৳${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return `৳${Math.round(amount)}`;
}

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('en-IN');
}

export function formatPercent(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)}%`;
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return `${formatNumber(n)} ${n === 1 ? one : many}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
