import { useEffect, useRef } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as appSupabase } from "@/lib/supabase";

// Product usage events, stored in public.app_events (supabase-migration-app-events.sql).
// Only non-personal details go in properties: no emails, names, or free text.

type Props = Record<string, string | number | boolean | null | undefined>;

// Fire and forget. Never throws, never blocks the UI. Logged-out users are skipped.
// The signed-in user is read from the local session (no network call); the
// insert policy still only accepts rows for the caller's own user id.
export async function trackEvent(supabase: SupabaseClient, eventName: string, properties: Props = {}): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const user = data?.session?.user;
    if (!user) return;
    const { error } = await supabase.from("app_events").insert({
      user_id: user.id,
      event_name: eventName,
      properties,
    });
    if (error && import.meta.env?.DEV) console.warn("trackEvent failed", error);
  } catch (e) {
    if (import.meta.env?.DEV) console.warn("trackEvent error", e);
  }
}

// App call sites: the shared client, without awaiting.
export function track(eventName: string, properties: Props = {}): void {
  void trackEvent(appSupabase, eventName, properties);
}

// For screens that autosave on every edit (bag, yardages): send one event
// after the edits settle instead of one per change.
const pending = new Map<string, ReturnType<typeof setTimeout>>();
export function trackSettled(eventName: string, properties: Props = {}, waitMs = 3000): void {
  const prev = pending.get(eventName);
  if (prev) clearTimeout(prev);
  pending.set(eventName, setTimeout(() => {
    pending.delete(eventName);
    track(eventName, properties);
  }, waitMs));
}

// Sends an event once when a screen mounts (e.g. a game's results screen).
// The ref guard keeps React strict mode's double effect from sending it twice.
export function useTrackOnce(eventName: string, properties: Props = {}): void {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track(eventName, properties);
    // Mount only: properties are captured from the first render on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// For a call right before a full page navigation (window.location.href), which
// would cancel an in-flight insert: waits for the event, but never longer than maxWaitMs.
export function trackBeforeLeaving(eventName: string, properties: Props = {}, maxWaitMs = 800): Promise<void> {
  return Promise.race([
    trackEvent(appSupabase, eventName, properties),
    new Promise<void>((resolve) => setTimeout(resolve, maxWaitMs)),
  ]);
}
