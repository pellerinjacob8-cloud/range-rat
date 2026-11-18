-- App events migration (product usage tracking)
-- Run in Supabase SQL Editor (Dashboard -> SQL Editor -> New query -> paste -> Run).
-- Safe to run before or after the code deploys; until this table exists the
-- app's trackEvent calls fail quietly and nothing else changes.
-- Signed-in users can insert their own events only. There is no select
-- policy, so users cannot read events; query them in the SQL Editor.

create table public.app_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null check (char_length(event_name) <= 64),
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index app_events_name_created_idx on public.app_events (event_name, created_at);
create index app_events_user_created_idx on public.app_events (user_id, created_at);

alter table public.app_events enable row level security;

create policy "insert own events"
  on public.app_events
  for insert
  to authenticated
  with check (user_id = auth.uid());
