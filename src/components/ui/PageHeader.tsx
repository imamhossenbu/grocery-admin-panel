import React from 'react';
import { cn } from '@/lib/cn';

/** Page title block. Static (no data), so it is part of the prerendered shell. */
export function PageHeader({
  title,
  description,
  actions,
  className = '',
  eyebrow,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  eyebrow?: React.ReactNode;
}) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0 max-w-[75ch]">
        {eyebrow && <div className="mb-1 text-[13px] font-semibold text-primary">{eyebrow}</div>}
        <h1 className="font-display text-[26px] font-semibold leading-tight tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
