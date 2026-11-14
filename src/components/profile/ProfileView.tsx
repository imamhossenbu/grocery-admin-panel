'use client';

import React, { startTransition, useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { changePassword, updateProfile, type AccountFormState } from '@/actions/account';
import type { AdminUser } from '@/lib/auth';
import { formatDateTime } from '@/lib/dates';
import { Avatar, Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, PasswordInput } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { RelativeTime } from '@/components/ui/RelativeTime';

const INITIAL: AccountFormState = { ok: false, message: '' };

/**
 * Submit through onSubmit instead of <form action>: React resets a form
 * after an action, which would wipe what the admin typed when the server
 * reports an error. Successful submits reset explicitly.
 */
function submitWith(action: (fd: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };
}

/** Shows a toast once per new successful result. */
function useResultToast(state: AccountFormState, onSuccess?: () => void) {
  const toast = useToast();
  const seen = useRef(state);
  useEffect(() => {
    if (seen.current === state) return;
    seen.current = state;
    if (state.ok) {
      toast.success(state.message);
      onSuccess?.();
    }
  }, [state, toast, onSuccess]);
}

function FormMessage({ state }: { state: AccountFormState }) {
  if (state.ok || !state.message) return null;
  return (
    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-700">
      {state.message}
    </p>
  );
}

export function ProfileView({ admin }: { admin: Omit<AdminUser, 'id'> }) {
  const router = useRouter();
  const [profileState, profileAction, savingProfile] = useActionState(updateProfile, INITIAL);
  const [pwState, pwAction, savingPw] = useActionState(changePassword, INITIAL);
  const pwForm = useRef<HTMLFormElement>(null);
  const [newPassword, setNewPassword] = useState('');

  useResultToast(profileState, () => router.refresh());
  useResultToast(pwState, () => {
    pwForm.current?.reset();
    setNewPassword('');
  });

  const displayName = admin.name || admin.email.split('@')[0];
  const strength = passwordStrength(newPassword);

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3 [&>*]:min-w-0">
      <Card className="xl:order-last">
        <div className="flex flex-col items-center px-5 pb-5 pt-6 text-center">
          <Avatar name={displayName} className="h-16 w-16 text-lg" />
          <p className="mt-3 font-display text-lg font-semibold text-ink">{displayName}</p>
          <p className="flex items-center gap-1.5 break-all text-[13px] text-muted">
            <Mail className="h-3.5 w-3.5 shrink-0" /> {admin.email}
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-mint px-2 py-1 text-xs font-semibold text-primary-600">
            <ShieldCheck className="h-3.5 w-3.5" /> Administrator
          </span>
        </div>
        <dl className="divide-y divide-[#edf4ef] border-t border-line px-5 text-[13px]">
          <div className="flex justify-between gap-3 py-3">
            <dt className="text-muted">Last sign-in</dt>
            <dd className="text-right text-ink">{admin.lastSignInAt ? <RelativeTime value={admin.lastSignInAt} /> : '—'}</dd>
          </div>
          <div className="flex justify-between gap-3 py-3">
            <dt className="text-muted">Account created</dt>
            <dd className="text-right text-ink">{admin.createdAt ? formatDateTime(admin.createdAt) : '—'}</dd>
          </div>
        </dl>
      </Card>

      <div className="space-y-6 xl:col-span-2">
        <Card>
          <CardHeader title="Profile" description="Your name is shown in the admin header." icon={<UserRound className="h-[18px] w-[18px]" />} />
          <form onSubmit={submitWith(profileAction)} className="space-y-4 p-5" noValidate>
            <Field label="Full name" required error={profileState.fieldErrors?.name}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  name="name"
                  defaultValue={admin.name ?? ''}
                  placeholder="e.g. Imam Hossen"
                  autoComplete="name"
                  maxLength={80}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                />
              )}
            </Field>
            <Field label="Email" help="Sign-in email. Change it from the Supabase dashboard (Authentication → Users).">
              {({ id, describedBy }) => <Input id={id} value={admin.email} readOnly disabled aria-describedby={describedBy} />}
            </Field>
            <FormMessage state={profileState} />
            <div className="flex justify-end">
              <Button type="submit" loading={savingProfile}>
                Save profile
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader title="Change password" description="You’ll stay signed in on this device." icon={<KeyRound className="h-[18px] w-[18px]" />} />
          <form ref={pwForm} onSubmit={submitWith(pwAction)} className="space-y-4 p-5" noValidate>
            {/* Lets password managers attach the new password to the right account. */}
            <input type="text" name="username" autoComplete="username" value={admin.email} readOnly hidden />
            <Field label="Current password" required error={pwState.fieldErrors?.currentPassword}>
              {({ id, describedBy, invalid }) => (
                <PasswordInput id={id} name="currentPassword" autoComplete="current-password" aria-describedby={describedBy} aria-invalid={invalid} />
              )}
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 [&>*]:min-w-0">
              <Field label="New password" required error={pwState.fieldErrors?.password} help="At least 8 characters.">
                {({ id, describedBy, invalid }) => (
                  <PasswordInput
                    id={id}
                    name="password"
                    autoComplete="new-password"
                    maxLength={72}
                    onChange={(e) => setNewPassword(e.target.value)}
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                  />
                )}
              </Field>
              <Field label="Confirm new password" required error={pwState.fieldErrors?.confirmPassword}>
                {({ id, describedBy, invalid }) => (
                  <PasswordInput id={id} name="confirmPassword" autoComplete="new-password" maxLength={72} aria-describedby={describedBy} aria-invalid={invalid} />
                )}
              </Field>
            </div>
            {newPassword && (
              <div aria-live="polite" className="flex items-center gap-3">
                <div className="flex flex-1 gap-1" aria-hidden>
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className={`h-1.5 flex-1 rounded-full ${i < strength.score ? strength.bar : 'bg-[#e6efe9]'}`} />
                  ))}
                </div>
                <span className={`text-[13px] font-semibold ${strength.text}`}>{strength.label}</span>
              </div>
            )}
            <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-ink-2">
              <input type="checkbox" name="signOutOthers" defaultChecked className="h-4 w-4 accent-[#1a663b]" />
              Sign out of every other device
            </label>
            <FormMessage state={pwState} />
            <div className="flex justify-end">
              <Button type="submit" loading={savingPw}>
                Change password
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

function passwordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length < 8) score = Math.min(score, 1);
  return [
    { score, label: 'Too short', bar: 'bg-red-500', text: 'text-red-700' },
    { score, label: 'Weak', bar: 'bg-red-500', text: 'text-red-700' },
    { score, label: 'Fair', bar: 'bg-amber-500', text: 'text-amber-700' },
    { score, label: 'Good', bar: 'bg-primary-400', text: 'text-primary-600' },
    { score, label: 'Strong', bar: 'bg-primary', text: 'text-primary-600' },
  ][score];
}
