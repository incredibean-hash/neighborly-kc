-- Neighborly KC Phase 3: People, profiles, and connections
-- Safe version: adds columns to an existing connections table.

alter table public.connections
  add column if not exists requester_id uuid references auth.users(id) on delete cascade;
alter table public.connections
  add column if not exists addressee_id uuid references auth.users(id) on delete cascade;
alter table public.connections
  add column if not exists status text default 'pending';
alter table public.connections
  add column if not exists updated_at timestamptz default now();

update public.connections set status='pending' where status is null;

create index if not exists connections_requester_idx on public.connections(requester_id, status);
create index if not exists connections_addressee_idx on public.connections(addressee_id, status);
create unique index if not exists connections_unique_undirected_pair_idx
  on public.connections (least(requester_id, addressee_id), greatest(requester_id, addressee_id))
  where requester_id is not null and addressee_id is not null;

do $$
begin
  begin
    alter table public.connections add constraint connections_status_check
      check (status in ('pending','accepted','declined'));
  exception when duplicate_object then null;
  end;
end $$;
