import 'server-only';
import { redirect } from 'next/navigation';
import { LogOut, ShieldCheck } from 'lucide-react';
import { checkAdmin } from '@/lib/auth';
import { signOut } from '@/actions/auth';
import { Button } from './ui/Button';

/** Signed-in admin's email + Sign out. Reads cookies: render inside <Suspense>. */
export async function AdminAccount() {
  const result = await checkAdmin();
  if (!result.ok) redirect('/login');

  const { email } = result.admin;
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="hidden md:inline-flex max-w-[220px] items-center gap-1.5 rounded-xl bg-[#f0f7f2] px-3 py-1.5 text-xs font-semibold text-[#14522f]"
        title={`Signed in as ${email}`}
      >
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#1a663b]" />
        <span className="truncate">{email}</span>
      </span>
      <form action={signOut}>
        <Button type="submit" variant="forest" size="sm" title={`Sign out ${email}`}>
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </form>
    </div>
  );
}

export function AdminAccountFallback() {
  return <div className="h-8 w-28 animate-pulse rounded-xl bg-[#e8f3ec]" aria-hidden="true" />;
}
