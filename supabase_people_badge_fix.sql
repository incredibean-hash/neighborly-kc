-- Neighborly KC production repair: People page + Verified badge
-- Run this once in Supabase SQL Editor. Safe to re-run.

alter table public.profiles
  add column if not exists is_verified boolean default false;

-- Your production schema may still have the older `verified` column.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='profiles' and column_name='verified') then
    execute 'update public.profiles set is_verified = coalesce(verified,false) where is_verified is distinct from coalesce(verified,false)';
  end if;
end $$;

create index if not exists profiles_is_verified_idx on public.profiles(is_verified);
