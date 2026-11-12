'use client';

import React from 'react';
import {
  ExternalLink,
  Leaf,
  RefreshCw,
  ShieldCheck,
  Store,
} from 'lucide-react';
import { Button } from './ui/Button';

interface AdminNavbarProps {
  syncing: boolean;
  onRefresh: () => void;
  onResetDemo: () => void;
}

export function AdminNavbar({
  syncing,
  onRefresh,
  onResetDemo,
}: AdminNavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#dfece3] bg-white/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="grid place-items-center w-10 h-10 rounded-2xl bg-forest-gradient text-white shadow-soft">
            <Leaf className="w-5 h-5 text-[#3ed481]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-bold tracking-tight text-[#112a1d]">
                Fresh<span className="text-[#1a663b]">Basket</span>
              </span>
              <span className="rounded-full bg-[#1a663b] text-white text-[10px] font-extrabold uppercase px-2 py-0.5">
                Admin
              </span>
            </div>
            <span className="text-xs text-[#5a7165] block leading-none">
              Store &amp; Inventory Operations Center
            </span>
          </div>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            title="Fetch latest data from Supabase Cloud"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync Cloud</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onResetDemo}
            className="text-xs text-[#627a6d] hover:text-red-700"
          >
            Reset Demo
          </Button>

          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-[#cfe3d6] bg-[#f0f7f2] px-3.5 py-1.5 text-xs font-bold text-[#14522f] hover:bg-[#e2f1e7] transition"
          >
            <Store className="w-3.5 h-3.5 text-[#1a663b]" />
            <span>Open Storefront</span>
            <ExternalLink className="w-3 h-3 text-[#5a7165]" />
          </a>
        </div>
      </div>
    </header>
  );
}
