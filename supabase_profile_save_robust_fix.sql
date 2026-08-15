-- Neighborly KC: robust profile-save fix
-- Safe to run once in Supabase SQL Editor.
-- The app now generates a profile UUID itself, but this restores the DB default too.
create extension if not exists pgcrypto;
alter table public.profiles alter column id set default gen_random_uuid();

-- Keep one profile per signed-in Supabase Auth user when this index does not already exist.
create unique index if not exists profiles_auth_user_id_key on public.profiles(auth_user_id);
