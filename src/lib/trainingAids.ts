import { supabase } from "./supabase";

// Each golfer's own training aids ("My aids"), kept on their profile like
// clubs in the bag. Names only, typed by the golfer. A browser copy makes the
// list show instantly and keeps working if the column is ever missing.

const CACHE_KEY = "rangeRat_training_aids";
export const MAX_AIDS = 30;
export const MAX_AID_LENGTH = 40;

export function cleanAidName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_AID_LENGTH);
}

function cleanList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of raw) {
    if (typeof v !== "string") continue;
    const name = cleanAidName(v);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= MAX_AIDS) break;
  }
  return out;
}

export function loadCachedAids(): string[] {
  try { return cleanList(JSON.parse(localStorage.getItem(CACHE_KEY) ?? "[]")); } catch { return []; }
}

function cache(aids: string[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(aids)); } catch {}
}

export async function fetchTrainingAids(): Promise<string[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return loadCachedAids();
  const { data, error } = await supabase.from("profiles").select("training_aids").eq("id", session.user.id).maybeSingle();
  if (error || !data) return loadCachedAids();
  const aids = cleanList(data.training_aids);
  cache(aids);
  return aids;
}

// Saves the whole list. Throws if the save fails; the browser copy is kept
// either way so nothing typed is lost.
export async function saveTrainingAids(aids: string[]): Promise<string[]> {
  const list = cleanList(aids);
  cache(list);
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");
  const { error } = await supabase.from("profiles").update({ training_aids: list }).eq("id", session.user.id);
  if (error) throw new Error(error.message);
  return list;
}

// Adds one aid (if new) and returns the saved list.
export async function addTrainingAid(current: string[], name: string): Promise<string[]> {
  const clean = cleanAidName(name);
  if (!clean || current.some((a) => a.toLowerCase() === clean.toLowerCase())) return cleanList(current);
  return saveTrainingAids([...current, clean]);
}
