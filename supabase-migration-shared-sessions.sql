-- Shared sessions migration
-- Run in Supabase SQL Editor (Dashboard -> SQL Editor -> New query -> paste -> Run).
-- Run this before the code deploys. Until it exists, Share shows an error
-- and shared links show "This session isn't available".

create table if not exists shared_sessions (
  code text primary key check (code ~ '^[a-z0-9]{8}$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  sender_name text not null default '' check (char_length(sender_name) <= 20),
  name text not null check (char_length(name) between 1 and 80),
  blocks jsonb not null check (jsonb_typeof(blocks) = 'array' and jsonb_array_length(blocks) between 1 and 40),
  created_at timestamptz not null default now()
);

create index if not exists shared_sessions_user_id_idx on shared_sessions (user_id);

alter table shared_sessions enable row level security;

-- Senders can see, create and remove their own shares. Nobody can list
-- other people's shares; links are opened through get_shared_session below.
drop policy if exists "Users read own shared sessions" on shared_sessions;
create policy "Users read own shared sessions" on shared_sessions
  for select using (auth.uid() = user_id);

drop policy if exists "Users insert own shared sessions" on shared_sessions;
create policy "Users insert own shared sessions" on shared_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users delete own shared sessions" on shared_sessions;
create policy "Users delete own shared sessions" on shared_sessions
  for delete using (auth.uid() = user_id);

-- Opening a link: returns one share by its code, without the sender's
-- account id. Works logged out (anon) so the public /s/<code> page can load.
create or replace function get_shared_session(share_code text)
returns table (sender_name text, name text, blocks jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select s.sender_name, s.name, s.blocks
  from shared_sessions s
  where s.code = share_code;
$$;

revoke all on function get_shared_session(text) from public;
grant execute on function get_shared_session(text) to anon, authenticated;

-- This project doesn't grant table access automatically to tables made in the
-- SQL Editor, so grant it here. RLS above still limits signed-in users to their
-- own rows. service_role is used by api/delete-account.ts to clear this table;
-- without it, account deletion fails.
grant select, insert, delete on shared_sessions to authenticated;
grant select, insert, update, delete on shared_sessions to service_role;
