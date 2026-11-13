import React from 'react';
import { cn } from '@/lib/cn';

export function Card({ className = '', children, as: Tag = 'section', ...rest }: React.HTMLAttributes<HTMLElement> & { as?: 'section' | 'div' | 'article' | 'aside' }) {
  return (
    <Tag className={cn('rounded-2xl border border-line bg-white shadow-soft', className)} {...rest}>
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  description,
  actions,
  className = '',
  icon,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3 px-5 pt-5', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-mint text-primary">{icon}</span>}
        <div className="min-w-0">
          <h2 className="font-display text-[17px] font-semibold leading-tight text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Kbd({ children, className = '', dark = false }: { children: React.ReactNode; className?: string; dark?: boolean }) {
  return (
    <kbd
      className={cn(
        'inline-grid h-5 min-w-5 place-items-center rounded-md border px-1 font-sans text-[10px] font-bold',
        dark ? 'border-white/15 bg-white/10 text-white/70' : 'border-line-strong bg-mint-25 text-muted shadow-[0_1px_0_#cfe3d6]',
        className
      )}
    >
      {children}
    </kbd>
  );
}

export function Progress({ value, max = 100, tone = 'primary', className = '', label }: { value: number; max?: number; tone?: 'primary' | 'amber' | 'danger'; className?: string; label?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const color = { primary: 'bg-emerald-gradient', amber: 'bg-[#e0a21a]', danger: 'bg-red-500' }[tone];
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-[#e6efe9]', className)}
    >
      <div className={cn('fb-grow-x h-full rounded-full', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Avatar({ name, className = '', src }: { name: string; className?: string; src?: string }) {
  const words = name.trim().split(/[\s._-]+/).filter(Boolean);
  const letters =
    (words.length > 1 ? `${words[0][0]}${words[1][0]}` : (words[0] ?? '?').slice(0, 2)).toUpperCase() || '?';
  // Stable hue per name, kept in the brand's green/teal/amber family.
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  const palettes = [
    'bg-[#e3f5ea] text-[#145732]',
    'bg-[#fef5dc] text-[#7a4b06]',
    'bg-[#e4f6f5] text-[#0d6a68]',
    'bg-[#ecf2fd] text-[#24539f]',
    'bg-[#f7ecfa] text-[#7d2d8c]',
  ];
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={cn('h-9 w-9 rounded-full object-cover', className)} />;
  }
  return (
    <span aria-hidden className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-extrabold', palettes[h % palettes.length], className)}>
      {letters}
    </span>
  );
}

/** Product / category thumbnail with a graceful empty state. */
export function Thumb({ src, className = '', alt = '' }: { src?: string; className?: string; alt?: string }) {
  if (!src) {
    return <span aria-hidden className={cn('block h-10 w-10 shrink-0 rounded-xl border border-dashed border-line-strong bg-mint-25', className)} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" className={cn('h-10 w-10 shrink-0 rounded-xl border border-line bg-mint-50 object-cover', className)} />
  );
}
