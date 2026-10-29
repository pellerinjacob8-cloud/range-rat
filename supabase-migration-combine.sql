-- Combine history migration
-- Run in Supabase SQL Editor (Dashboard -> SQL Editor -> New query -> paste -> Run).
-- Safe to run before or after the code deploys; until this table exists the
-- app keeps Combine history in the browser only, then uploads it on the next
-- visit to the Combine screen.

create table if not exists combine_attempts (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  completed_at timestamptz not null,
  shots jsonb not null,
  category_scores jsonb not null,
  overall_score integer not null,
  primary key (user_id, id)
);

alter table combine_attempts enable row level security;

drop policy if exists "Users read own combine attempts" on combine_attempts;
create policy "Users read own combine attempts" on combine_attempts
  for select using (auth.uid() = user_id);

drop policy if exists "Users insert own combine attempts" on combine_attempts;
create policy "Users insert own combine attempts" on combine_attempts
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users update own combine attempts" on combine_attempts;
create policy "Users update own combine attempts" on combine_attempts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users delete own combine attempts" on combine_attempts;
create policy "Users delete own combine attempts" on combine_attempts
  for delete using (auth.uid() = user_id);
