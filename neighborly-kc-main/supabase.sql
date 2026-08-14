
-- Neighborly KC - Nextdoor Clone Schema
create table neighborhoods (id uuid default gen_random_uuid() primary key, slug text unique, name text, zip text, member_count int default 0, created_at timestamp default now());
create table profiles (id uuid default gen_random_uuid() primary key, full_name text, email text, street_address text, zip text, tier text, is_verified boolean default false, is_founder boolean default false, neighborhood_id uuid references neighborhoods(id));
create table posts (id uuid default gen_random_uuid() primary key, body text, content text, category text, neighborhood_id uuid, image_url text, author_name text, profiles jsonb, created_at timestamp default now());
create table comments (id uuid default gen_random_uuid() primary key, post_id uuid references posts(id) on delete cascade, content text, body text, author_name text, created_at timestamp default now());
create table likes (id uuid default gen_random_uuid() primary key, post_id uuid references posts(id) on delete cascade, comment_id uuid references comments(id) on delete cascade, author_name text, created_at timestamp default now());
create table dms (id uuid default gen_random_uuid() primary key, from_user text, to_user text, message text, body text, created_at timestamp default now());
create table verified_addresses (id uuid default gen_random_uuid() primary key, street text, zip text, full_address text, owner_name text, verified_at timestamp, approved_by text, via_bluetooth boolean default false);
create table bluetooth_approvals (id uuid default gen_random_uuid() primary key, token text unique, owner text, requester text, address text, street text, zip text, status text default 'pending', created_at timestamp default now(), approved_at timestamp);

-- Seed
insert into neighborhoods (slug, name, zip, member_count) values ('parkwood-hills','Parkwood Hills','64155',247),('glen-ayre','Glen Ayre','64155',189),('maple-woods','Maple Woods','64155',312) on conflict do nothing;

-- Storage
-- create bucket post-images public
