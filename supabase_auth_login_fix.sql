-- Neighborly KC — FINAL AUTH REPAIR
-- Run this entire script in Supabase SQL Editor.
--
-- The previous migration only removed a few expected trigger names. If your
-- production project has a differently-named custom trigger on auth.users,
-- that trigger can still abort Auth and cause:
--   Database error saving new user
--
-- Neighborly KC does NOT need a custom auth.users trigger. The app creates or
-- repairs the public profiles row after Auth succeeds.

create extension if not exists pgcrypto;

-- Remove ALL user-created triggers from auth.users. PostgreSQL/Supabase
-- internal triggers are left untouched.
do $$
declare
  t record;
begin
  for t in
    select tgname
    from pg_trigger
    where tgrelid = 'auth.users'::regclass
      and not tgisinternal
  loop
    execute format('drop trigger if exists %I on auth.users', t.tgname);
  end loop;
end $$;

-- Make sure the public profile table is linked to Auth.
alter table public.profiles
  add column if not exists auth_user_id uuid references auth.users(id) on delete cascade;

alter table public.profiles
  add column if not exists is_admin boolean default false;

create unique index if not exists profiles_auth_user_id_key
  on public.profiles(auth_user_id)
  where auth_user_id is not null;

alter table public.profiles alter column id set default gen_random_uuid();

-- Public profile reads + owner-only writes.
alter table public.profiles enable row level security;

drop policy if exists "profiles public read" on public.profiles;
drop policy if exists "profiles own insert" on public.profiles;
drop policy if exists "profiles own update" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "profiles_authenticated_insert" on public.profiles;
drop policy if exists "profiles_authenticated_update" on public.profiles;

create policy "profiles public read"
on public.profiles for select using (true);

create policy "profiles own insert"
on public.profiles for insert to authenticated
with check (auth.uid() is not null and auth.uid() = auth_user_id);

create policy "profiles own update"
on public.profiles for update to authenticated
using (auth.uid() is not null and auth.uid() = auth_user_id)
with check (auth.uid() is not null and auth.uid() = auth_user_id);

grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;

-- VERIFICATION: this should return ZERO rows.
select tgname
from pg_trigger
where tgrelid = 'auth.users'::regclass
  and not tgisinternal;
