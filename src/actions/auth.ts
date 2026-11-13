'use server';

import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { isAdminAppMetadata } from '@/lib/admin-role';
import { safeNext } from '@/lib/safe-next';

export interface SignInState {
  message: string;
  /** Echoed back so the form keeps the address after an error. */
  email?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const BAD_CREDENTIALS = 'Invalid email or password.';
const NOT_ADMIN = 'This account does not have admin access.';

function field(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === 'string' ? v : '';
}

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = field(formData, 'email').trim().toLowerCase();
  const password = field(formData, 'password');
  const next = safeNext(field(formData, 'next'));

  if (!EMAIL_RE.test(email) || email.length > 200 || !password || password.length > 200) {
    return { message: BAD_CREDENTIALS, email };
  }

  let supabase;
  try {
    supabase = await supabaseServer();
  } catch {
    return { message: 'Sign-in is not configured on the server.', email };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    if (error && (error.status === 429 || error.code?.startsWith('over_'))) {
      return { message: 'Too many attempts. Please wait a minute and try again.', email };
    }
    // Same message for unknown email, wrong password, unconfirmed or banned
    // accounts: don't tell an attacker which one it was.
    return { message: BAD_CREDENTIALS, email };
  }

  // `data.user` comes straight from the Auth server's token response, so its
  // app_metadata is authoritative (customers cannot write app_metadata).
  if (!isAdminAppMetadata(data.user.app_metadata)) {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
    return { message: NOT_ADMIN, email };
  }

  redirect(next);
}

export async function signOut(): Promise<void> {
  try {
    const supabase = await supabaseServer();
    // This device only; other admin devices keep their sessions.
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Even if the Auth server is unreachable, send the user to the login page.
  }
  redirect('/login');
}
