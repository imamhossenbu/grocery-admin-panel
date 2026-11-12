import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'forest' | 'outline' | 'secondary' | 'danger' | 'ghost' | 'highlight';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 rounded-xl cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none';

  const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
      'bg-emerald-gradient text-white shadow-soft hover:brightness-105',
    forest:
      'bg-[#0f2c1d] text-white hover:bg-[#1a432e] shadow-sm',
    highlight:
      'bg-[#f5b82e] text-[#3a2502] hover:bg-[#e5a91f]',
    outline:
      'border border-[#cfe3d6] bg-white text-[#112a1d] hover:border-[#1a663b] hover:bg-[#f0f7f2]',
    secondary:
      'bg-[#e8f5ee] text-[#14522f] hover:bg-[#d5ece0]',
    danger:
      'bg-red-600 text-white hover:bg-red-700 shadow-sm',
    ghost:
      'bg-transparent text-[#234835] hover:bg-[#e8f3ec]',
  };

  const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-6 py-3',
    icon: 'w-9 h-9 p-0',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
