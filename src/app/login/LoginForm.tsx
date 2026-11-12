'use client';

import { useActionState } from 'react';
import { AlertCircle, Lock, Mail } from 'lucide-react';
import { signIn, type SignInState } from '@/actions/auth';
import { Button } from '@/components/ui/Button';

const INITIAL: SignInState = { message: '' };

const inputClass =
  'w-full rounded-xl border border-[#cfe3d6] bg-white py-2.5 pl-10 pr-3 text-sm text-[#112a1d] placeholder:text-[#8aa396] outline-none transition focus:border-[#1a663b] focus:ring-2 focus:ring-[#1a663b]/15';

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signIn, INITIAL);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />

      {state.message && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.message}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wide text-[#234835]">
          Email
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5a7165]" />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            defaultValue={state.email ?? ''}
            key={state.email ?? ''}
            className={inputClass}
            placeholder="admin@example.com"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wide text-[#234835]">
          Password
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5a7165]" />
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={inputClass}
            placeholder="••••••••"
          />
        </div>
      </div>

      <Button type="submit" variant="forest" size="lg" loading={pending} className="w-full">
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
