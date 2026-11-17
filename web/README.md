# Domura web (waiting list)

Static landing page (`public/`) plus one Vercel function (`api/waitlist.js`) that stores emails in Supabase `public.waitlist` (migration in `backend/supabase/migrations/`).

## Deploy (Vercel)

- Root directory: `web`
- Env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server-only, never exposed to the browser)

## Notify on App Store launch

```sh
cd web
cp .env.example .env   # fill Supabase, Resend, sender and App Store URL
node --env-file=.env scripts/notify-waitlist.mjs --dry-run
node --env-file=.env scripts/notify-waitlist.mjs
```

Each address is emailed once; `notified_at` is stamped so reruns skip it.
