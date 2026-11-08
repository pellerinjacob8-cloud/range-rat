-- Range practice: record which areas each session covered so Pro can plan
-- around what a golfer has been skipping (practice balance).
-- Values: wedges, irons, control, tee-shots, holes.
-- Nullable so existing rows stay valid. Until this runs, the app saves
-- sessions without it and practice balance stays off.
-- Run in the Supabase SQL Editor.

alter table public.sessions
  add column if not exists practice_areas text[];
