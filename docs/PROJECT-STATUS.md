# FreshBasket admin — project status

The full status and handoff notes for both repos (setup on another device,
what is done, what was and was not checked, what is left, open decisions and
security follow-ups) live in the storefront repo:

`grocery-store/docs/PROJECT-STATUS.md` (branch `feature/multi-page-store`)

Quick facts for this repo:

- Work is on branch `feature/postgres-and-auth`; `main` still has the old version.
- `npm install`, create `.env.local` from `.env.example`, then `npm run dev` (port 3001).
- Sign-in requires a Supabase Auth user with `app_metadata.role = "admin"`
  (`npm run admin:create -- <email>` promotes or creates one).
- The rebuilt sidebar dashboard type-checks, lints and builds, but the signed-in
  pages have not been visually reviewed yet.
