-- Neighborly KC — FINAL profile RLS fix
-- Run this entire script in Supabase Dashboard > SQL Editor.
-- It fixes the "new row violates row-level security policy" error
-- when a signed-in member creates their own profile.

begin;

-- Make sure profiles uses Supabase Auth UUIDs for the owner link.
alter table public.profiles
  add column if not exists auth_user_id uuid references auth.users(id) on delete cascade;

-- Keep one profile per authenticated user.
create unique index if not exists profiles_auth_user_id_key
  on public.profiles(auth_user_id)
  where auth_user_id is not null;

-- Make profile IDs self-generating as a second safety net.
create extension if not exists pgcrypto;
alter table public.profiles alter column id set default gen_random_uuid();

-- RLS: rebuild the profile policies so the signed-in owner can create/update
-- their own row, while profile data remains publicly readable.
alter table public.profiles enable row level security;

drop policy if exists "profiles public read" on public.profiles;
drop policy if exists "profiles own insert" on public.profiles;
drop policy if exists "profiles own update" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "profiles_authenticated_insert" on public.profiles;
drop policy if exists "profiles_authenticated_update" on public.profiles;

create policy "profiles public read"
on public.profiles
for select
using (true);

create policy "profiles own insert"
on public.profiles
for insert
to authenticated
with check (
  auth.uid() is not null
  and auth.uid() = auth_user_id
);

create policy "profiles own update"
on public.profiles
for update
to authenticated
using (
  auth.uid() is not null
  and auth.uid() = auth_user_id
)
with check (
  auth.uid() is not null
  and auth.uid() = auth_user_id
);

-- Ensure the API role can use the table; RLS still controls row access.
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;

-- Profile-photo storage policies. The app stores each member's photo at
-- profile-photos/<their-auth-user-id>/avatar.<ext>
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "profile photos public read" on storage.objects;
drop policy if exists "profile photos own insert" on storage.objects;
drop policy if exists "profile photos own update" on storage.objects;
drop policy if exists "profile photos own delete" on storage.objects;


create policy "profile photos public read"
on storage.objects
for select
using (bucket_id = 'profile-photos');

create policy "profile photos own insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "profile photos own update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "profile photos own delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

commit;
