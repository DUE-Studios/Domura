-- Waiting list for the Domura launch. Rows are written only by the landing page
-- API (service role); RLS is enabled with no policies so anon/auth clients
-- cannot read or write emails.
create extension if not exists citext;

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  source text,
  locale text,
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  unsubscribed_at timestamptz
);

alter table public.waitlist enable row level security;

create index if not exists waitlist_pending_idx
  on public.waitlist (created_at)
  where notified_at is null and unsubscribed_at is null;
