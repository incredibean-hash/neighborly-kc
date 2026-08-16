-- Neighborly KC: Auth login repair for "Database error saving new user"
-- Run this ONCE in Supabase SQL Editor if email/OTP signup still reports
-- "Database error saving new user". This repairs the common custom profile
-- trigger that fails when Supabase Auth creates a new user.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists auth_user_id uuid references auth.users(id) on delete cascade;
alter table public.profiles
  add column if not exists is_admin boolean default false;

create unique index if not exists profiles_auth_user_id_key
  on public.profiles(auth_user_id)
  where auth_user_id is not null;

-- Remove the common broken profile-creation trigger names, if present.
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_created_profile on auth.users;
drop trigger if exists handle_new_user on auth.users;

-- Create one safe profile row for new Auth users. The app can still update the
-- row later with neighborhood, ZIP, and avatar details.
create or replace function public.handle_new_neighborly_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, auth_user_id, full_name, email, street_address)
  values (
    gen_random_uuid(),
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email,''),'@',1), 'Neighbor'),
    new.email,
    ''
  )
  on conflict (auth_user_id) do update
    set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists trg_neighborly_auth_user on auth.users;
create trigger trg_neighborly_auth_user
after insert on auth.users
for each row execute function public.handle_new_neighborly_user();

-- Make sure the Auth-created profile can be read publicly and edited by its owner.
alter table public.profiles enable row level security;
drop policy if exists "profiles public read" on public.profiles;
create policy "profiles public read" on public.profiles
  for select using (true);

drop policy if exists "profiles own insert" on public.profiles;
create policy "profiles own insert" on public.profiles
  for insert with check (auth.uid() = auth_user_id);

drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles
  for update using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);
