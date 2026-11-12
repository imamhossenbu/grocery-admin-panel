import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center rounded-2xl border-2 border-dashed border-[#cfe3d6] bg-white/80 px-6 py-12">
      <div className="grid place-items-center w-14 h-14 rounded-2xl bg-[#e8f5ee] text-[#1a663b] mb-4">
        {icon}
      </div>
      <h4 className="font-display text-lg font-bold text-[#112a1d]">{title}</h4>
      <p className="mt-1 max-w-sm text-xs text-[#5a7165] leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

