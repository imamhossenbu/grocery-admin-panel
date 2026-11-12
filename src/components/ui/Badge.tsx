import React from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone =
  | 'emerald'
  | 'amber'
  | 'forest'
  | 'danger'
  | 'rose'
  | 'info'
  | 'sky'
  | 'teal'
  | 'violet'
  | 'gray'
  | 'highlight';

const tones: Record<BadgeTone, string> = {
  emerald: 'bg-[#e3f5ea] text-[#145732] ring-[#bce3cb]',
  amber: 'bg-[#fef5dc] text-[#7a4b06] ring-[#f6dc9c]',
  highlight: 'bg-highlight text-[#3a2502] ring-highlight',
  forest: 'bg-forest text-[#ecfdf5] ring-forest',
  danger: 'bg-red-50 text-red-700 ring-red-200',
  rose: 'bg-[#fdeef2] text-[#a3244a] ring-[#f6c6d4]',
  info: 'bg-sky-50 text-sky-800 ring-sky-200',
  sky: 'bg-[#ecf2fd] text-[#24539f] ring-[#c8d9f6]',
  teal: 'bg-[#e4f6f5] text-[#0d6a68] ring-[#b6e3e1]',
  violet: 'bg-[#f7ecfa] text-[#7d2d8c] ring-[#e6c7ee]',
  gray: 'bg-[#f1f4f2] text-[#45584d] ring-[#dbe3de]',
};

const dots: Record<BadgeTone, string> = {
  emerald: 'bg-[#1a663b]',
  amber: 'bg-[#c98a0c]',
  highlight: 'bg-[#3a2502]',
  forest: 'bg-leaf',
  danger: 'bg-red-600',
  rose: 'bg-[#e0577a]',
  info: 'bg-sky-600',
  sky: 'bg-[#3a74d6]',
  teal: 'bg-[#16a3a0]',
  violet: 'bg-[#b14bc4]',
  gray: 'bg-[#8a9a90]',
};

interface BadgeProps {
  tone?: BadgeTone;
  /** @deprecated use tone */
  variant?: BadgeTone;
  dot?: boolean;
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ tone, variant, dot = false, size = 'sm', children, className = '' }: BadgeProps) {
  const t = tone ?? variant ?? 'emerald';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-bold ring-1 ring-inset',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        tones[t],
        className
      )}
    >
      {dot && <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', dots[t])} />}
      {children}
    </span>
  );
}

/** Small count pill used in nav and tabs. */
export function CountPill({ children, tone = 'gray', className = '' }: { children: React.ReactNode; tone?: 'gray' | 'highlight' | 'forest' | 'danger'; className?: string }) {
  const styles = {
    gray: 'bg-[#eef3f0] text-muted',
    highlight: 'bg-highlight text-[#3a2502]',
    forest: 'bg-forest text-white',
    danger: 'bg-red-600 text-white',
  }[tone];
  return (
    <span className={cn('inline-grid min-w-5 h-5 place-items-center rounded-full px-1.5 text-[10px] font-extrabold tabular', styles, className)}>
      {children}
    </span>
  );
}
