'use client';

import React, { useState } from 'react';
import { Check, Copy, KeyRound, ShieldCheck, UserMinus, UserPlus } from 'lucide-react';
import type { AdminAccountRow } from '@/types/admin';
import { formatDateTime } from '@/lib/dates';
import { useStoreAction } from '@/lib/client/store-action';
import { Avatar, Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { useConfirm } from '@/components/ui/ConfirmDialog';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Settings → Team: who has admin access, add an admin, remove access. */
export function TeamCard({ admins, currentId }: { admins: AdminAccountRow[]; currentId: string }) {
  const { run, busy } = useStoreAction();
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);

  const remove = async (a: AdminAccountRow) => {
    const ok = await confirm({
      title: `Remove admin access for ${a.name ?? a.email}?`,
      description:
        'They can no longer change anything in the admin panel. Their account stays, so they can still shop on the storefront. You can make them an admin again later.',
      confirmLabel: 'Remove admin access',
      tone: 'danger',
    });
    if (!ok) return;
    await run('SET_ADMIN_ROLE', { userId: a.id, admin: false }, { success: 'Admin access removed', error: 'Could not remove admin access' });
  };

  const last = admins.length <= 1;

  return (
    <Card>
      <CardHeader
        title="Team"
        description="People who can sign in to this admin panel."
        icon={<ShieldCheck className="h-[18px] w-[18px]" />}
        actions={
          <Button size="sm" onClick={() => setAdding(true)}>
            <UserPlus className="h-4 w-4" /> Add admin
          </Button>
        }
      />
      <ul className="divide-y divide-[#edf4ef] px-5 pb-3 pt-2">
        {admins.map((a) => {
          const you = a.id === currentId;
          return (
            <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
              <Avatar name={a.name ?? a.email.split('@')[0] ?? a.email} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-medium text-ink">
                  {a.name ?? a.email}
                  {you && <Badge tone="emerald">You</Badge>}
                </p>
                <p className="truncate text-[13px] text-muted">
                  {a.name ? `${a.email} · ` : ''}Added {formatDateTime(a.createdAt)} · last sign-in{' '}
                  {a.lastSignInAt ? <RelativeTime value={a.lastSignInAt} /> : 'never'}
                </p>
              </div>
              {!you && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(a)}
                  disabled={busy || last}
                  title={last ? 'The last admin can’t be removed' : undefined}
                  className="text-red-700 hover:bg-red-50 hover:text-red-700"
                >
                  <UserMinus className="h-4 w-4" /> Remove
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="border-t border-line px-5 py-3 text-[13px] text-subtle">
        To make a customer an admin, open them in Customers and choose “Make admin”, or add their email here.
      </p>
      <AddAdminModal open={adding} onClose={() => setAdding(false)} />
    </Card>
  );
}

function AddAdminModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { run, busy } = useStoreAction();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const emailError = touched && !EMAIL_RE.test(email.trim()) ? 'Enter a valid email address.' : null;

  const close = () => {
    onClose();
    // Reset after the closing animation; the password is never kept around.
    setTimeout(() => {
      setEmail('');
      setName('');
      setTouched(false);
      setCreated(null);
      setCopied(false);
    }, 250);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!EMAIL_RE.test(email.trim())) return;
    const out = await run(
      'ADD_ADMIN',
      { email: email.trim(), name: name.trim() || null },
      { error: 'Could not add admin' }
    );
    if (!out.ok) return;
    const result = out.result as { created?: boolean; password?: string } | null;
    if (result?.created && result.password) {
      setCreated({ email: email.trim().toLowerCase(), password: result.password });
    } else {
      close();
    }
  };

  const copy = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(`Admin panel sign-in\nEmail: ${created.email}\nTemporary password: ${created.password}`).catch(() => undefined);
    setCopied(true);
  };

  return (
    <Modal
      isOpen={open}
      onClose={close}
      size="md"
      title={created ? 'Admin account created' : 'Add an admin'}
      subtitle={
        created
          ? 'Share these sign-in details privately. The password is shown only once.'
          : 'An existing account (for example a customer) gets admin access at once. For a new email, an account is created with a temporary password.'
      }
      icon={created ? <KeyRound className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
      dismissable={!busy}
      footer={
        created ? (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={copy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy details'}
            </Button>
            <Button onClick={close}>Done</Button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" form="add-admin-form" loading={busy}>
              Add admin
            </Button>
          </div>
        )
      }
    >
      {created ? (
        <div className="space-y-3">
          <dl className="space-y-2 rounded-xl border border-line bg-mint-25 p-4 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted">Email</dt>
              <dd className="font-medium text-ink">{created.email}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted">Temporary password</dt>
              <dd className="select-all font-mono text-[15px] font-semibold tracking-wide text-ink">{created.password}</dd>
            </div>
          </dl>
          <p className="text-[13px] text-muted">
            They sign in at the admin login page, then change the password under Profile &amp; password.
          </p>
        </div>
      ) : (
        <form id="add-admin-form" onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Email" required error={emailError}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="name@example.com"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                autoFocus
              />
            )}
          </Field>
          <Field label="Name" optional help="Only used for a new account.">
            {({ id, describedBy }) => (
              <Input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rakib Hasan" maxLength={80} aria-describedby={describedBy} />
            )}
          </Field>
        </form>
      )}
    </Modal>
  );
}
