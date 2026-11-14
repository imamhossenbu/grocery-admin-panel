'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { KeyRound, SlidersHorizontal, Truck, Users } from 'lucide-react';
import { cn } from '@/lib/cn';

const SECTIONS = [
  { href: '/settings', label: 'General', hint: 'Store info and cache', icon: SlidersHorizontal },
  { href: '/settings/delivery', label: 'Delivery', hint: 'Delivery charges', icon: Truck },
  { href: '/settings/team', label: 'Team', hint: 'Admins and roles', icon: Users },
] as const;

/**
 * Settings section navigation: a vertical list beside the content on large
 * screens, a horizontally scrolling tab row on small ones.
 */
export function SettingsNav() {
  const pathname = usePathname();
  const item = (href: string, label: string, hint: string, Icon: typeof Truck, active: boolean) => (
    <Link
      key={href}
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        active ? 'bg-white font-semibold text-ink shadow-soft ring-1 ring-line' : 'text-muted hover:bg-white/70 hover:text-ink'
      )}
    >
      <span
        className={cn(
          'grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors',
          active ? 'bg-mint text-primary' : 'bg-[#e9f1ec] text-muted group-hover:text-primary'
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block whitespace-nowrap">{label}</span>
        <span className="hidden text-[13px] font-normal text-subtle lg:block">{hint}</span>
      </span>
    </Link>
  );

  return (
    <nav aria-label="Settings sections" className="lg:sticky lg:top-24">
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
        {SECTIONS.map((s) => item(s.href, s.label, s.hint, s.icon, pathname === s.href))}
        <div className="mx-3 my-2 hidden h-px bg-line lg:block" aria-hidden />
        {item('/profile', 'Your profile', 'Name, photo, password', KeyRound, pathname === '/profile')}
      </div>
    </nav>
  );
}
