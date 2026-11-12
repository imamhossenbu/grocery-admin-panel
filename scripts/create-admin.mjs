#!/usr/bin/env node
// Grants (or revokes) admin access to the FreshBasket admin panel.
//
//   npm run admin:create -- <email> [--password <pw>]
//   npm run admin:create -- --revoke <email>
//
// An admin is a Supabase Auth user whose app_metadata.role is "admin".
// app_metadata can only be written with the secret key, which is why this is
// a local script and not a page in the app. It talks to the Auth admin REST
// API (/auth/v1/admin/users) with SUPABASE_SECRET_KEY from .env.local.
// The secret key is never printed.

import { randomBytes } from 'node:crypto';

const ROLE = 'admin';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const USAGE = `Usage:
  npm run admin:create -- <email> [--password <password>]
      Promote an existing user to admin, or create a new confirmed admin user.
      Without --password a strong random password is generated and printed once.
      (--password is only used when the user is created; an existing user's
      password is never changed.)

  npm run admin:create -- --revoke <email>
      Remove the admin role from a user (the account itself is kept).

  npm run admin:create -- --help

Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY from .env.local.`;

function fail(message, code = 1) {
  console.error(`Error: ${message}`);
  process.exit(code);
}

function parseArgs(argv) {
  const opts = { email: null, password: null, revoke: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg === '--password') {
      const value = argv[++i];
      if (value === undefined || value.startsWith('--')) fail('--password needs a value.\n\n' + USAGE);
      opts.password = value;
    } else if (arg.startsWith('--password=')) {
      opts.password = arg.slice('--password='.length);
    } else if (arg === '--revoke') {
      opts.revoke = true;
      const value = argv[i + 1];
      if (value !== undefined && !value.startsWith('--')) {
        if (opts.email) fail('Only one email address can be given.\n\n' + USAGE);
        opts.email = value;
        i++;
      }
    } else if (arg.startsWith('--')) {
      fail(`Unknown option "${arg}".\n\n${USAGE}`);
    } else {
      if (opts.email) fail('Only one email address can be given.\n\n' + USAGE);
      opts.email = arg;
    }
  }
  return opts;
}

function generatePassword() {
  // 24 base64url characters = 144 bits of randomness; insist on a letter and
  // a digit so it also satisfies common password policies.
  for (;;) {
    const pw = randomBytes(18).toString('base64url');
    if (/[A-Za-z]/.test(pw) && /\d/.test(pw)) return pw;
  }
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
  console.log(USAGE);
  process.exit(0);
}
if (!opts.email) fail('An email address is required.\n\n' + USAGE);

const email = opts.email.trim().toLowerCase();
if (!EMAIL_RE.test(email) || email.length > 200) fail(`"${opts.email}" is not a valid email address.`);
if (opts.revoke && opts.password !== null) fail('--password cannot be combined with --revoke.');
if (opts.password !== null && (opts.password.length < 8 || opts.password.length > 72)) {
  fail('The password must be 8 to 72 characters long.');
}

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY || '';
if (!SUPABASE_URL) fail('NEXT_PUBLIC_SUPABASE_URL is not set (expected in .env.local).');
if (!SECRET_KEY) fail('SUPABASE_SECRET_KEY is not set (expected in .env.local).');

const ADMIN_API = `${SUPABASE_URL}/auth/v1/admin/users`;

async function authAdmin(method, path, body) {
  let res;
  try {
    res = await fetch(`${ADMIN_API}${path}`, {
      method,
      headers: {
        apikey: SECRET_KEY,
        Authorization: `Bearer ${SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    fail(`Could not reach Supabase Auth (${err instanceof Error ? err.message : 'network error'}).`);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = data?.msg || data?.message || data?.error_description || data?.error || res.statusText;
    const code = data?.error_code ? ` [${data.error_code}]` : '';
    fail(`Supabase Auth answered ${res.status}${code}: ${detail}`);
  }
  return data;
}

/** Finds a user by exact (case-insensitive) email, paging through the list. */
async function findUserByEmail(target) {
  const perPage = 200;
  for (let page = 1; page <= 500; page++) {
    const data = await authAdmin('GET', `?page=${page}&per_page=${perPage}`);
    const users = Array.isArray(data?.users) ? data.users : [];
    const match = users.find((u) => typeof u.email === 'string' && u.email.toLowerCase() === target);
    if (match) return match;
    if (users.length < perPage) return null;
  }
  fail('Too many users to search; aborting.');
}

function hasAdminRole(user) {
  return user?.app_metadata?.role === ROLE;
}

const existing = await findUserByEmail(email);

if (opts.revoke) {
  if (!existing) fail(`No user with email ${email} exists.`);
  if (!hasAdminRole(existing)) {
    console.log(`${email} is not an admin; nothing to change.`);
    process.exit(0);
  }
  // The Auth server merges app_metadata on update; a null value deletes the
  // key, so every other app_metadata entry is preserved.
  const updated = await authAdmin('PUT', `/${existing.id}`, { app_metadata: { role: null } });
  if (hasAdminRole(updated)) fail('The Auth server did not remove the role. Check the user in the Supabase dashboard.');
  console.log(`Revoked admin access from ${email}.`);
  console.log('Note: an access token issued before now stays valid until it expires (1 hour by default),');
  console.log('but the admin API routes re-check the role with the Auth server on every request.');
  process.exit(0);
}

if (existing) {
  if (opts.password !== null) {
    console.warn('Note: the user already exists, so --password was ignored (the password was not changed).');
  }
  if (hasAdminRole(existing)) {
    console.log(`${email} is already an admin; nothing to change.`);
    process.exit(0);
  }
  const appMetadata = { ...(existing.app_metadata || {}), role: ROLE };
  const updated = await authAdmin('PUT', `/${existing.id}`, { app_metadata: appMetadata });
  if (!hasAdminRole(updated)) fail('The Auth server did not store the role. Check the user in the Supabase dashboard.');
  console.log(`Promoted existing user ${email} to admin.`);
  if (!existing.email_confirmed_at && !existing.confirmed_at) {
    console.log('Warning: this email address is not confirmed yet, so signing in may fail until it is.');
  }
  process.exit(0);
}

const generated = opts.password === null;
const password = generated ? generatePassword() : opts.password;
const created = await authAdmin('POST', '', {
  email,
  password,
  email_confirm: true,
  app_metadata: { role: ROLE },
});
if (!hasAdminRole(created)) fail('The user was created but the role was not stored. Run this command again to promote it.');

console.log(`Created admin user ${email}.`);
if (generated) {
  console.log('');
  console.log(`  Password: ${password}`);
  console.log('');
  console.log('This password is shown only once. Store it in a password manager now.');
}
