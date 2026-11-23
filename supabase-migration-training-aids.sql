-- Training aids migration
-- Run in Supabase SQL Editor (Dashboard -> SQL Editor -> New query -> paste -> Run).
-- Each golfer's own list of training aids ("My aids"), stored as a JSON
-- array of names on their profile. profiles already has the grants the app
-- needs, and account deletion already removes the profile row.
-- Run on 2026-11-22. The app falls back to a browser copy if it's missing.

alter table public.profiles add column if not exists training_aids jsonb not null default '[]'::jsonb;
