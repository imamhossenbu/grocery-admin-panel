'use client';

import React, { useTransition } from 'react';
import { ChevronDown, ExternalLink, Keyboard, KeyRound, LogOut, Settings, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { signOut } from '@/actions/auth';
import { Avatar } from '@/components/ui/Card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Skeleton } from '@/components/ui/Skeleton';

export function ProfileMenu({
  email,
  name: fullName,
  avatarUrl,
  storefrontUrl,
}: {
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  storefrontUrl?: string;
}) {
  const [pending, startTransition] = useTransition();
  const name = fullName || email.split('@')[0] || 'Admin';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account menu for ${email}`}
        className="flex h-10 cursor-pointer items-center gap-2 rounded-xl pl-1 pr-2 outline-none transition hover:bg-mint focus-visible:ring-2 focus-visible:ring-primary/40 data-[state=open]:bg-mint"
      >
        <Avatar name={name} src={avatarUrl ?? undefined} className="h-8 w-8" />
        <span className="hidden max-w-36 truncate text-sm font-medium text-ink xl:block">{name}</span>
        <ChevronDown className="hidden h-4 w-4 text-muted xl:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <div className="flex items-center gap-3 px-2.5 py-2.5">
          <Avatar name={name} src={avatarUrl ?? undefined} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{name}</p>
            <p className="truncate text-[13px] text-muted">{email}</p>
          </div>
        </div>
        <div className="mx-2.5 mb-1.5 inline-flex items-center gap-1.5 rounded-lg bg-mint px-2 py-1 text-xs font-semibold text-primary-600">
          <ShieldCheck className="h-3.5 w-3.5" /> Administrator
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <KeyRound /> Profile &amp; password
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings /> Settings
          </Link>
        </DropdownMenuItem>
        {storefrontUrl && (
          <DropdownMenuItem asChild>
            <a href={storefrontUrl} target="_blank" rel="noreferrer">
              <ExternalLink /> View storefront
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onSelect={() => window.dispatchEvent(new CustomEvent('fb:shortcuts'))}
          shortcut="?"
        >
          <Keyboard /> Keyboard shortcuts
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Signed in as admin</DropdownMenuLabel>
        <DropdownMenuItem
          tone="danger"
          disabled={pending}
          onSelect={(e) => {
            e.preventDefault();
            startTransition(() => signOut());
          }}
        >
          <LogOut /> {pending ? 'Signing out…' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ProfileMenuSkeleton() {
  return (
    <div className="flex h-10 items-center gap-2 pl-1 pr-2" aria-hidden>
      <Skeleton className="h-8 w-8 rounded-full" />
      <Skeleton className="hidden h-3.5 w-24 xl:block" />
    </div>
  );
}
