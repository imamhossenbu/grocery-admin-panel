# FreshBasket Grocery Admin Panel

A standalone management dashboard for the FreshBasket Grocery platform built with Next.js (App Router), Tailwind CSS, TypeScript, Supabase (Postgres) and Cloudinary.

## Features
- **Product Management**: Create, edit, toggle active status, adjust stock/prices, and delete products
- **Category Management**: Manage fresh fruit, vegetable, dairy, and grocery aisles
- **Order Pipeline & Status Tracker**: Manage Cash on Delivery orders (Pending -> Confirmed -> Packed -> Out for delivery -> Delivered / Cancelled)
- **Image Upload**: Cloudinary first, with fallback to Supabase Storage (JPEG, PNG, WebP, AVIF or GIF, max 5 MB)
- **Coupon Manager**: Create percentage or fixed-amount discount coupons

## How data is stored
All store data lives in Postgres tables in your Supabase project: `categories`, `products`, `coupons`, `orders` (plus `reviews`, `profiles`, `newsletter_subscribers` and `contact_messages`, used by the storefront). The schema is in [`supabase/schema.sql`](supabase/schema.sql); the same file lives in the `grocery-store` repo and the two copies must stay identical.

- Row Level Security is on for every table. The public (publishable) key can only read the catalog; orders and coupons are reachable only from server code.
- This admin panel reads and writes through its own API route (`/api/store`), which runs on the server with `SUPABASE_SECRET_KEY`. The secret key is never sent to the browser.
- Each admin action changes only the row it concerns. Order status changes go through the `set_order_status` SQL function, which records the status history and puts stock back when an order is cancelled.
- The old `ecommerce-store/database.json` file in Supabase Storage is no longer read or written by this app.

## Who can sign in
Every page and API route requires an **admin** sign-in (email + password, Supabase Auth).

The storefront's customers sign in to the same Supabase project, so being signed in is not enough: an admin is a user whose **`app_metadata.role` is `"admin"`**. `app_metadata` can only be changed with the secret key, so customers cannot give themselves the role. A non-admin who signs in at `/login` is signed out again and sees "This account does not have admin access".

How it is enforced:
- `src/proxy.ts` refreshes the session cookies on every request and checks the role from the verified token claims (`getClaims()`). Signed-out visitors and non-admins are redirected to `/login?next=...`; `/api/*` answers `401` (not signed in) or `403` (signed in, not an admin) as JSON.
- `/api/store` and `/api/upload` check again themselves with `requireAdmin()` (`src/lib/auth.ts`), which asks Supabase Auth for the current user (`getUser()`), so a revoked role takes effect immediately for every data change.
- The navbar shows the signed-in admin's email and a **Sign out** button.

## Setup

### 1. Environment variables
Copy `.env.example` to `.env.local` and fill in your own values (Supabase Dashboard -> Project Settings -> API):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SECRET_KEY=your_supabase_secret_key
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset
```
`.env.local` is git-ignored. Never commit real keys.

### 2. Create the database tables (once)
Open Supabase Dashboard -> SQL Editor, paste the whole of `supabase/schema.sql` and run it. It is safe to re-run.

### 3. Copy the existing catalog and orders into the tables (once)
In the `grocery-store` repo:
```bash
npm run db:migrate
```

Until step 2 is done, the admin panel shows a "Database is not set up yet" notice instead of any data.

### 4. Create the first admin (once)
```bash
npm run admin:create -- you@example.com
```
- If the user does not exist yet, it is created (email already confirmed) with a strong random password that is **printed once**: store it in a password manager. To choose the password yourself: `npm run admin:create -- you@example.com --password 'your-long-password'` (8-72 characters).
- If the user already exists (for example, a storefront account), it is promoted to admin; its password and other `app_metadata` are left as they are.
- Remove admin access again with `npm run admin:create -- --revoke you@example.com`.
- `npm run admin:create -- --help` shows the usage.

The script reads `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` from `.env.local` and calls the Supabase Auth admin API (`/auth/v1/admin/users`). It never prints the secret key. You can also set the role by hand in Supabase Dashboard -> SQL Editor:
```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'
where email = 'you@example.com';
```
A role change reaches the browser's token at the next token refresh (sign out and in again to see it at once); the API routes see it immediately.

### 5. Run the admin panel
```bash
npm install
npm run dev -- -p 3001
```
Open [http://localhost:3001](http://localhost:3001) and sign in with the admin account from step 4 (the storefront uses port 3000).

## API

`POST /api/store` takes `{ action, payload }` and returns `{ success: true, result }` (the pages re-read their data through server components). Main actions: `SAVE_PRODUCT`, `DELETE_PRODUCT`, `TOGGLE_PRODUCT_ACTIVE`, `TOGGLE_PRODUCT_FEATURED`, `QUICK_STOCK_UPDATE`, `SAVE_CATEGORY`, `DELETE_CATEGORY`, `UPDATE_ORDER_STATUS`, `DELETE_ORDER`, `SAVE_COUPON`, `DELETE_COUPON`.

It (and `POST /api/upload`) requires an admin session cookie: without one it answers `401 { "error": "UNAUTHENTICATED" }`, and for a signed-in non-admin `403 { "error": "FORBIDDEN" }`. The admin UI sends you to `/login` when it sees either.

Errors come back as `{ error: "CODE", message: "text shown to the admin" }` with status 400 (invalid input), 404 (row no longer exists), 409 (for example, deleting a category that still has products) or 503 (database not set up or unreachable).

Notes:
- A product id is also its storefront URL (`/product/<id>`). New products get a slug of their name (`Fresh Mango` -> `fresh-mango`, then `fresh-mango-2` if taken). The id of an existing product never changes.
- A category cannot be deleted while products still belong to it.
- Deleting an order does not put its stock back. To return stock, set the order to `Cancelled` instead.
