-- Putting Green practice area migration
-- Run in Supabase SQL Editor (Dashboard -> SQL Editor -> New query -> paste -> Run).
-- Safe to run before or after the code deploys; the app falls back gracefully
-- if these columns don't exist yet.

-- Track which practice area a session belongs to, and the scored
-- makes/attempts for putting sessions (used for the session-level
-- make percentage; the design allows a per-distance confidence/trend
-- view to be added later without another schema change).
alter table sessions add column if not exists area text not null default 'range';
alter table sessions add column if not exists makes integer;
alter table sessions add column if not exists attempts integer;

-- If you previously ran an earlier version of this migration that created a
-- `putting_zones` table (for user-adjustable distance ranges): that feature
-- was replaced by a fixed distance ladder shared by every user, so the table
-- is no longer used by the app. Safe to leave in place or drop manually:
--   drop table if exists putting_zones;
