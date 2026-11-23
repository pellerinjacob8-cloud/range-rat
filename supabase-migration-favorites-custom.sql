-- Custom sessions save fix
-- Run in Supabase SQL Editor (Dashboard -> SQL Editor -> New query -> paste -> Run).
-- Custom sessions (built in /custom-session) are stored in favorites with
-- session_input = null, which is how the app tells them apart from saved
-- generated sessions. The column was created NOT NULL, so every custom
-- session save failed. Run on 2026-11-22.

alter table public.favorites alter column session_input drop not null;
