import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Leaf, ShieldCheck } from 'lucide-react';
import { safeNext } from '@/lib/safe-next';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Sign in — FreshBasket Admin',
  robots: { index: false, follow: false },
};

async function LoginFormWithNext({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { next } = await searchParams;
  return <LoginForm next={safeNext(Array.isArray(next) ? next[0] : next)} />;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f4f8f5] px-4 py-12 text-[#112a1d]">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-forest-gradient text-white shadow-soft">
            <Leaf className="h-5 w-5 text-[#3ed481]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display text-2xl font-bold tracking-tight text-[#112a1d]">
              Fresh<span className="text-[#1a663b]">Basket</span>
            </span>
            <span className="rounded-full bg-[#1a663b] px-2 py-0.5 text-[11px] font-extrabold uppercase text-white">
              Admin
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-[#dfece3] bg-white shadow-soft">
          <div className="bg-forest-gradient px-6 py-5 text-white">
            <div className="flex items-center gap-2 text-[#3ed481]">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Staff only</span>
            </div>
            <h1 className="mt-1 font-display text-xl font-bold">Sign in to the admin panel</h1>
            <p className="mt-1 text-[13px] text-white/80">Use the admin account created for you.</p>
          </div>

          <div className="px-6 py-6">
            <Suspense fallback={<LoginForm next="/" />}>
              <LoginFormWithNext searchParams={searchParams} />
            </Suspense>
          </div>
        </div>

        <p className="mt-5 text-center text-[13px] text-[#3f5649]">
          Customer accounts from the storefront cannot sign in here.
        </p>
      </div>
    </main>
  );
}
