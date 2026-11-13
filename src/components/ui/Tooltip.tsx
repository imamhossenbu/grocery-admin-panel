'use client';

import React from 'react';
import * as RT from '@radix-ui/react-tooltip';
import { cn } from '@/lib/cn';

export const TooltipProvider = ({ children }: { children: React.ReactNode }) => (
  <RT.Provider delayDuration={250} skipDelayDuration={150}>
    {children}
  </RT.Provider>
);

/**
 * Brand tooltip (replaces `title=`). The child must be focusable or accept a
 * ref; the tooltip shows on hover and keyboard focus and is announced via
 * aria-describedby.
 */
export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  disabled = false,
  shortcut,
  className = '',
}: {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  disabled?: boolean;
  shortcut?: React.ReactNode;
  className?: string;
}) {
  if (disabled || !content) return children;
  return (
    <RT.Root>
      <RT.Trigger asChild>{children}</RT.Trigger>
      <RT.Portal>
        <RT.Content
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={8}
          className={cn(
            'fb-pop z-[80] flex max-w-xs items-center gap-2 rounded-lg bg-forest px-2.5 py-1.5 text-[11px] font-semibold leading-snug text-white shadow-pop',
            className
          )}
        >
          {content}
          {shortcut && <span className="flex items-center gap-0.5 text-white/60">{shortcut}</span>}
          <RT.Arrow className="fill-forest" width={10} height={5} />
        </RT.Content>
      </RT.Portal>
    </RT.Root>
  );
}
