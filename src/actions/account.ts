'use server';

import { createClient } from '@supabase/supabase-js';
import { checkAdmin } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { revalidateAdminData } from '@/lib/revalidate-admin';

/**
 * The signed-in admin's own account: display name and password.
 * Both run as that admin (session client), never with the secret key.
 */

export interface AccountFormState {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<Record<'name' | 'currentPassword' | 'password' | 'confirmPassword', string>>;
}

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72; // bcrypt limit used by Supabase Auth

function field(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === 'string' ? v : '';
}

/**
 * Pages read the admin's name and photo from the session token
 * (requireAdminPage → getClaims), so mint a new token after changing
 * user_metadata; the new cookies are written by this server action.
 */
async function refreshToken(supabase: Awaited<ReturnType<typeof supabaseServer>>) {
  await supabase.auth.refreshSession().catch(() => undefined);
}

const SESSION_EXPIRED: AccountFormState = { ok: false, message: 'Your session has expired. Please sign in again.' };

export async function updateProfile(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const auth = await checkAdmin();
  if (!auth.ok) return SESSION_EXPIRED;

  const name = field(formData, 'name').replace(/\s+/g, ' ').trim();
  if (name.length < 2) return { ok: false, message: '', fieldErrors: { name: 'Enter at least 2 characters.' } };
  if (name.length > 80) return { ok: false, message: '', fieldErrors: { name: 'Keep the name under 80 characters.' } };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
  if (error) return { ok: false, message: 'Could not save your name. Please try again.' };
  await refreshToken(supabase);
  revalidateAdminData(); // Settings lists admins by name
  return { ok: true, message: 'Profile saved.' };
}

export async function changePassword(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const auth = await checkAdmin();
  if (!auth.ok) return SESSION_EXPIRED;

  const current = field(formData, 'currentPassword');
  const password = field(formData, 'password');
  const confirm = field(formData, 'confirmPassword');
  const signOutOthers = field(formData, 'signOutOthers') === 'on';

  const fieldErrors: AccountFormState['fieldErrors'] = {};
  if (!current) fieldErrors.currentPassword = 'Enter your current password.';
  if (password.length < PASSWORD_MIN) fieldErrors.password = `Use at least ${PASSWORD_MIN} characters.`;
  else if (password.length > PASSWORD_MAX) fieldErrors.password = `Use at most ${PASSWORD_MAX} characters.`;
  else if (password === current) fieldErrors.password = 'Choose a password different from the current one.';
  if (!fieldErrors.password && confirm !== password) fieldErrors.confirmPassword = 'The passwords don’t match.';
  if (Object.keys(fieldErrors).length) return { ok: false, message: '', fieldErrors };

  // Prove the current password with a throwaway client, so the admin's own
  // session cookies are left alone.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const probe = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: verifyError } = await probe.auth.signInWithPassword({ email: auth.admin.email, password: current });
  if (verifyError) {
    if (verifyError.status === 429) return { ok: false, message: 'Too many attempts. Please wait a minute and try again.' };
    return { ok: false, message: '', fieldErrors: { currentPassword: 'That isn’t your current password.' } };
  }
  // The probe session is only needed for the check; end it on this client.
  await probe.auth.signOut({ scope: 'local' }).catch(() => undefined);

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === 'weak_password') {
      return { ok: false, message: '', fieldErrors: { password: 'That password is too easy to guess. Try a longer one.' } };
    }
    if (error.code === 'same_password') {
      return { ok: false, message: '', fieldErrors: { password: 'Choose a password different from the current one.' } };
    }
    if (error.code === 'reauthentication_needed') {
      return { ok: false, message: 'Supabase asks for a fresh sign-in before changing the password. Sign out, sign in again and retry.' };
    }
    return { ok: false, message: 'Could not change the password. Please try again.' };
  }

  if (signOutOthers) await supabase.auth.signOut({ scope: 'others' }).catch(() => undefined);
  return {
    ok: true,
    message: signOutOthers ? 'Password changed. Other devices have been signed out.' : 'Password changed.',
  };
}

/** Only images our own upload route produced (Cloudinary or this project's Storage). */
function isOurImageUrl(value: string): boolean {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:') return false;
    const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').host;
    return u.host === 'res.cloudinary.com' || u.host === supabaseHost;
  } catch {
    return false;
  }
}

/** Saves (or with null, removes) the admin's profile photo URL. */
export async function updateAvatar(url: string | null): Promise<AccountFormState> {
  const auth = await checkAdmin();
  if (!auth.ok) return SESSION_EXPIRED;
  if (url !== null && (url.length > 500 || !isOurImageUrl(url))) {
    return { ok: false, message: 'That image link is not allowed. Upload the photo again.' };
  }
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.updateUser({ data: { avatar_url: url } });
  if (error) return { ok: false, message: 'Could not save your photo. Please try again.' };
  await refreshToken(supabase);
  return { ok: true, message: url ? 'Photo updated.' : 'Photo removed.' };
}
