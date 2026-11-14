import React from 'react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, actionLabel, onAction, action, className = '', compact = false }: EmptyStateProps) {
  return (
    <div className={cn('fb-fade-in flex flex-col items-center justify-center text-center', compact ? 'px-4 py-8' : 'px-6 py-14', className)}>
      <div className="relative mb-4">
        <div aria-hidden className="absolute inset-0 -m-3 rounded-[28px] bg-mint/60 blur-md" />
        <div className="relative grid h-14 w-14 place-items-center rounded-2xl border border-line bg-white text-primary shadow-soft">{icon}</div>
      </div>
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted">{description}</p>
      {action ?? (actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction} className="mt-5">
          {actionLabel}
        </Button>
      ))}
    </div>
  );
}
