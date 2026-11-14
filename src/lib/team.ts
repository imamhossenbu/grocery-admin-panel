import 'server-only';
import { randomBytes } from 'node:crypto';
import type { User } from '@supabase/supabase-js';
import { ADMIN_ROLE, isAdminAppMetadata } from './admin-role';
import { StoreError, getDb } from './supabase-db';

/**
 * Admin team management (Settings → Team, Customers → Make admin).
 *
 * The role lives in app_metadata.role, which only the secret key can write,
 * so customers can never grant it to themselves. Every change here runs in
 * /api/store after requireAdmin() (an Auth-server check of the caller).
 *
 * Guards: an admin cannot remove their own access, and the last admin can
 * never be removed (nobody could sign in to fix it).
 *
 * Note: writes check the role with the Auth server, so a removed admin can
 * change nothing from that moment. Page views verify the session token
 * locally, so they may still *see* pages until their token expires (≤ 1 h).
 */

async function allUsers(): Promise<User[]> {
  const db = getDb();
  const out: User[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new StoreError(502, 'AUTH_ERROR', `Could not read accounts: ${error.message}`);
    out.push(...data.users);
    if (data.users.length < 200) break;
  }
  return out;
}

async function getUser(id: string): Promise<User> {
  const { data, error } = await getDb().auth.admin.getUserById(id);
  if (error || !data.user) throw new StoreError(404, 'NOT_FOUND', 'That account no longer exists.');
  return data.user;
}

async function writeRole(user: User, admin: boolean): Promise<void> {
  // Supabase MERGES app_metadata on update (other keys such as provider or
  // demo flags are kept), so removing the role means sending role: null —
  // leaving the key out would keep the old "admin" value.
  const { error } = await getDb().auth.admin.updateUserById(user.id, { app_metadata: { role: admin ? ADMIN_ROLE : null } });
  if (error) throw new StoreError(502, 'AUTH_ERROR', `Could not change the role: ${error.message}`);
  // Read back: never report success unless the role really changed.
  const after = await getUser(user.id);
  if (isAdminAppMetadata(after.app_metadata) !== admin) {
    throw new StoreError(502, 'AUTH_ERROR', 'The role did not change. Please try again.');
  }
}

/** Grants or removes admin access for an existing account. */
export async function setAdminRole(actorId: string, userId: string, admin: boolean): Promise<void> {
  const user = await getUser(userId);
  if (isAdminAppMetadata(user.app_metadata) === admin) return; // already as requested
  if (!admin) {
    if (userId === actorId) {
      throw new StoreError(400, 'VALIDATION_ERROR', 'You can’t remove your own admin access. Ask another admin to do it.');
    }
    const admins = (await allUsers()).filter((u) => isAdminAppMetadata(u.app_metadata));
    if (admins.length <= 1) {
      throw new StoreError(400, 'VALIDATION_ERROR', 'This is the last admin. Add another admin first.');
    }
  }
  await writeRole(user, admin);
}

export interface AddAdminResult {
  id: string;
  /** true when a new account was created (then `password` is set). */
  created: boolean;
  /** One-time temporary password for a new account; never stored or logged. */
  password?: string;
}

function temporaryPassword(): string {
  // 14 random characters from an unambiguous alphabet, plus a digit and a symbol.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = randomBytes(14);
  let out = '';
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `${out}7!`;
}

/**
 * Makes `email` an admin: promotes the existing account (e.g. a customer),
 * or creates a confirmed account with a temporary password to hand over.
 */
export async function addAdmin(input: { email: string; name: string | null }): Promise<AddAdminResult> {
  const email = input.email.toLowerCase();
  const existing = (await allUsers()).find((u) => (u.email ?? '').toLowerCase() === email);
  if (existing) {
    if (isAdminAppMetadata(existing.app_metadata)) {
      throw new StoreError(409, 'CONFLICT', `${email} is already an admin.`);
    }
    await writeRole(existing, true);
    return { id: existing.id, created: false };
  }

  const password = temporaryPassword();
  const { data, error } = await getDb().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: input.name ? { full_name: input.name } : {},
    app_metadata: { role: ADMIN_ROLE },
  });
  if (error || !data.user) throw new StoreError(502, 'AUTH_ERROR', `Could not create the account: ${error?.message ?? 'unknown error'}`);
  return { id: data.user.id, created: true, password };
}
