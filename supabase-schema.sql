
-- Enable UUID
create extension if not exists pgcrypto;

create table neighborhoods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text default 'Kansas City',
  state text default 'MO',
  zip text not null,
  slug text unique not null,
  member_count int default 0,
  created_at timestamp default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  street_address text not null,
  zip text not null,
  neighborhood_id uuid references neighborhoods(id),
  house_label text,
  verified boolean default false,
  verified_at timestamp,
  verification_method text,
  created_at timestamp default now()
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references profiles(id) on delete cascade,
  neighborhood_id uuid references neighborhoods(id),
  category text check (category in ('General','For Sale & Free','Safety Alert','Recommendation','Event','Lost & Found')),
  body text not null,
  created_at timestamp default now()
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  author_id uuid references profiles(id),
  body text not null,
  created_at timestamp default now()
);

create table verification_codes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  code text not null,
  expires_at timestamp default (now() + interval '14 days')
);

alter table profiles enable row level security;
alter table posts enable row level security;
alter table comments enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id);
create policy "same neighborhood sees posts" on posts for select using (
  neighborhood_id = (select neighborhood_id from profiles where id = auth.uid())
);
create policy "verified can post" on posts for insert with check (auth.uid() = author_id);

insert into neighborhoods (name, zip, slug, member_count) values
('Parkwood Hills', '64155', 'parkwood-hills', 412),
('Gladstone', '64119', 'gladstone', 2103),
('Shoal Creek', '64156', 'shoal-creek', 1842),
('Liberty Oaks', '64068', 'liberty-oaks', 980),
('Briarcliff', '64116', 'briarcliff', 650);
