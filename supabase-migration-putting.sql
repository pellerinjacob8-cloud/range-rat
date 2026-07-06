-- Putting Green practice area migration
-- Run in Supabase SQL Editor (Dashboard -> SQL Editor -> New query -> paste -> Run).
-- Safe to run before or after the code deploys; the app falls back gracefully
-- if the column/table don't exist yet.

-- 1. Track which practice area a session belongs to
alter table sessions add column if not exists area text not null default 'range';

-- 2. Per-user custom putting zone distances
create table if not exists putting_zones (
  user_id uuid not null references auth.users(id) on delete cascade,
  zone text not null check (zone in ('short', 'mid', 'lag')),
  min_feet integer not null,
  max_feet integer, -- null = open-ended (lag)
  updated_at timestamptz not null default now(),
  primary key (user_id, zone)
);

alter table putting_zones enable row level security;

drop policy if exists "users manage their own putting zones" on putting_zones;
create policy "users manage their own putting zones"
  on putting_zones for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
