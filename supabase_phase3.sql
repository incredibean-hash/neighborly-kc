-- Neighborly KC Phase 3: People, profiles, and connections
create table if not exists connections (
  id uuid default gen_random_uuid() primary key,
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint connections_not_self check (requester_id <> addressee_id),
  constraint connections_unique_pair unique (requester_id, addressee_id)
);
create index if not exists connections_requester_idx on connections(requester_id, status);
create index if not exists connections_addressee_idx on connections(addressee_id, status);
alter table connections enable row level security;
drop policy if exists "connections participants read" on connections;
create policy "connections participants read" on connections for select using (auth.uid() = requester_id or auth.uid() = addressee_id);
drop policy if exists "connections requester insert" on connections;
create policy "connections requester insert" on connections for insert with check (auth.uid() = requester_id);
drop policy if exists "connections participant update" on connections;
create policy "connections participant update" on connections for update using (auth.uid() = requester_id or auth.uid() = addressee_id) with check (auth.uid() = requester_id or auth.uid() = addressee_id);
drop policy if exists "connections participant delete" on connections;
create policy "connections participant delete" on connections for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);
create unique index if not exists connections_unique_undirected_pair_idx
  on connections (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create or replace function notify_new_connection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare requester_name text;
begin
  select full_name into requester_name from profiles where auth_user_id = new.requester_id limit 1;
  insert into notifications(user_id, actor_id, type, message)
  values (new.addressee_id, new.requester_id, 'connection', coalesce(requester_name, 'A neighbor') || ' wants to connect with you');
  return new;
end;
$$;

drop trigger if exists trg_notify_new_connection on connections;
create trigger trg_notify_new_connection
after insert on connections
for each row execute function notify_new_connection();
