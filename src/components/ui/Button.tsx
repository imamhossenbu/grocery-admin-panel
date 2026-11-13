import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ButtonVariant =
  | 'primary'
  | 'forest'
  | 'outline'
  | 'secondary'
  | 'danger'
  | 'ghost'
  | 'highlight'
  | 'danger-soft';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

const base =
  'relative inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap rounded-xl cursor-pointer select-none ' +
  'transition-[background-color,border-color,color,box-shadow,transform,filter] duration-150 ease-out active:scale-[0.97] ' +
  'disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-emerald-gradient text-white shadow-soft hover:brightness-110 hover:shadow-card',
  forest: 'bg-forest text-white hover:bg-forest-700 shadow-sm',
  highlight: 'bg-highlight text-[#3a2502] hover:bg-highlight-600 shadow-sm',
  outline: 'border border-line-strong bg-white text-ink hover:border-primary/60 hover:bg-mint-50',
  secondary: 'bg-mint text-primary-600 hover:bg-[#d5ece0]',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  'danger-soft': 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200',
  ghost: 'bg-transparent text-ink-2 hover:bg-mint',
};

const sizes: Record<ButtonSize, string> = {
  xs: 'h-7 text-[11px] px-2.5 gap-1.5',
  sm: 'h-8 text-xs px-3',
  md: 'h-10 text-sm px-4',
  lg: 'h-12 text-base px-6',
  icon: 'h-9 w-9 p-0',
  'icon-sm': 'h-8 w-8 p-0 rounded-lg',
};

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className = '') {
  return cn(base, variants[variant], sizes[size], className);
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  disabled,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />}
      {children}
    </button>
  );
}
