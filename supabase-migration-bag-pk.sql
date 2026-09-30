-- Bag primary key fix
-- Run in Supabase SQL Editor (Dashboard -> SQL Editor -> New query -> paste -> Run).
-- No code deploy needed; the existing saveBag() upsert resolves conflicts on
-- the primary key, so it picks up the new key automatically.

-- The bag table was keyed on `id` alone, but onboarding saves clubs with fixed
-- ids ("driver", "7i", "pw", ...). The first user to save a Driver owned that
-- id for the whole table, and every later user's upsert hit their row, was
-- blocked by RLS, and onboarding showed "Something went wrong". Key the table
-- per user instead, matching yardages (user_id, club_id).
alter table bag drop constraint if exists bag_pkey;
alter table bag add primary key (user_id, id);
