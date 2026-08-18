-- Run once in Supabase SQL Editor. This also upgrades an older placeholder
-- push_subscriptions table if one already exists.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,endpoint)
);

alter table public.push_subscriptions add column if not exists id uuid default gen_random_uuid();
alter table public.push_subscriptions add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.push_subscriptions add column if not exists endpoint text;
alter table public.push_subscriptions add column if not exists p256dh text;
alter table public.push_subscriptions add column if not exists auth text;
alter table public.push_subscriptions add column if not exists user_agent text;
alter table public.push_subscriptions add column if not exists created_at timestamptz default now();
alter table public.push_subscriptions add column if not exists updated_at timestamptz default now();

-- Old placeholder rows cannot be linked safely to an account. Devices will
-- create fresh subscriptions after their users tap Enable alerts.
delete from public.push_subscriptions
where user_id is null or endpoint is null or p256dh is null or auth is null;

alter table public.push_subscriptions alter column id set not null;
alter table public.push_subscriptions alter column user_id set not null;
alter table public.push_subscriptions alter column endpoint set not null;
alter table public.push_subscriptions alter column p256dh set not null;
alter table public.push_subscriptions alter column auth set not null;
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);
create unique index if not exists push_subscriptions_user_endpoint_idx on public.push_subscriptions(user_id,endpoint);
