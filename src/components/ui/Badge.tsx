import React from 'react';

interface BadgeProps {
  variant?: 'emerald' | 'amber' | 'forest' | 'danger' | 'info' | 'gray';
  children: React.ReactNode;
  className?: string;
}

export function Badge({
  variant = 'emerald',
  children,
  className = '',
}: BadgeProps) {
  const styles: Record<NonNullable<BadgeProps['variant']>, string> = {
    emerald: 'bg-[#e3f5ea] text-[#145732] border border-[#bce3cb]',
    amber: 'bg-[#fef3c7] text-[#78350f] border border-[#fde68a]',
    forest: 'bg-[#0f2c1d] text-[#ecfdf5]',
    danger: 'bg-red-50 text-red-700 border border-red-200',
    info: 'bg-sky-50 text-sky-800 border border-sky-200',
    gray: 'bg-gray-100 text-gray-700 border border-gray-200',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
