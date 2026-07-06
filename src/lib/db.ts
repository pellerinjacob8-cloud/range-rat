/**
 * Supabase data layer, replaces localStorage for all persistent user data.
 * Falls back gracefully if the user is not logged in.
 */
import { supabase } from "./supabase";
import type { GenerateInput, SessionDrill } from "./drills";

async function getLocalUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Profile {
  firstName: string;
  lastName: string;
  handedness?: "lefty" | "righty";
  createdDate: number;
  theme?: "light" | "dark";
  handicap?: number;
}

export interface HandicapSnapshot {
  id: string;
  handicap: number;
  gir?: number;
  fairways?: number;
  putts?: number;
  upAndDowns?: number;
  recordedAt: string;
}

export interface SavedSession {
  id: string;
  completedAt: string;
  filters: { goal: string; bucket: string; time: number };
  totalBalls: number;
  drillCount: number;
}

export interface Club {
  id: string;
  name: string;
  type: string;
  brand?: string;
  model?: string;
  parentSetId?: string;
  ironNumber?: number;
  sortOrder?: number;
}

export type SwingYardages = {
  halfSwing: number | null;
  threeQuarterSwing: number | null;
  fullSwing: number | null;
};

export type YardageMap = Record<string, SwingYardages>;

export interface Favorite {
  id: string;
  name: string;
  sessionInput: GenerateInput | null;
  session: SessionDrill[];
  createdAt: number;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function fetchProfile(): Promise<Profile | null> {
  const user = await getLocalUser();
  if (!user) return null;

  // maybeSingle: returns null (not a 406 error) when the profile row doesn't
  // exist yet, e.g. a new user mid-onboarding.
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) return null;

  return {
    firstName: data.first_name ?? "",
    lastName: data.last_name ?? "",
    handedness: data.handedness ?? undefined,
    createdDate: data.created_date ?? Date.now(),
    theme: (data.theme as "light" | "dark") ?? undefined,
    handicap: data.handicap ?? undefined,
  };
}

export async function saveProfile(profile: Partial<Profile>): Promise<void> {
  const user = await getLocalUser();
  if (!user) throw new Error("No active session");

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    first_name: profile.firstName ?? "",
    last_name: profile.lastName ?? "",
    handedness: profile.handedness ?? null,
    created_date: profile.createdDate ?? Date.now(),
    theme: profile.theme ?? null,
    handicap: profile.handicap ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);

  // Keep localStorage in sync so loadProfileName() still works for nav
  try {
    localStorage.setItem("rangeRat_profile", JSON.stringify({
      firstName: profile.firstName ?? "",
      lastName: profile.lastName ?? "",
      handedness: profile.handedness,
      createdDate: profile.createdDate ?? Date.now(),
    }));
  } catch {}
}

export async function saveHandicapSnapshot(
  handicap: number,
  stats?: { gir?: number; fairways?: number; putts?: number; upAndDowns?: number },
  recordedAt?: string
): Promise<HandicapSnapshot | null> {
  const user = await getLocalUser();
  if (!user) return null;

  const row: Record<string, unknown> = {
    user_id: user.id,
    handicap,
    gir: stats?.gir ?? null,
    fairways: stats?.fairways ?? null,
    putts: stats?.putts ?? null,
    up_and_downs: stats?.upAndDowns ?? null,
  };
  if (recordedAt) row.recorded_at = recordedAt;

  // Try full insert with stats columns first
  const { data, error } = await supabase
    .from("handicap_history")
    .insert(row)
    .select("id, handicap, gir, fairways, putts, up_and_downs, recorded_at")
    .single();

  if (data) {
    return {
      id: data.id,
      handicap: data.handicap,
      gir: data.gir ?? undefined,
      fairways: data.fairways ?? undefined,
      putts: data.putts ?? undefined,
      upAndDowns: data.up_and_downs ?? undefined,
      recordedAt: data.recorded_at,
    };
  }

  // Fallback: stats columns may not exist yet, insert handicap only
  if (error) {
    const { data: fallback } = await supabase
      .from("handicap_history")
      .insert({ user_id: user.id, handicap })
      .select("id, handicap, recorded_at")
      .single();
    if (!fallback) return null;
    return { id: fallback.id, handicap: fallback.handicap, recordedAt: fallback.recorded_at };
  }

  return null;
}

export async function deleteHandicapSnapshot(id: string): Promise<void> {
  const user = await getLocalUser();
  if (!user) return;
  await supabase.from("handicap_history").delete().eq("id", id).eq("user_id", user.id);
}

export async function fetchHandicapHistory(): Promise<HandicapSnapshot[]> {
  const user = await getLocalUser();
  if (!user) return [];

  // Try with stats columns first
  const { data, error } = await supabase
    .from("handicap_history")
    .select("id, handicap, gir, fairways, putts, up_and_downs, recorded_at")
    .eq("user_id", user.id)
    .order("recorded_at", { ascending: true });

  if (data) {
    return data.map(r => ({
      id: r.id,
      handicap: r.handicap,
      gir: r.gir ?? undefined,
      fairways: r.fairways ?? undefined,
      putts: r.putts ?? undefined,
      upAndDowns: r.up_and_downs ?? undefined,
      recordedAt: r.recorded_at,
    }));
  }

  // Fallback: stats columns may not exist yet
  if (error) {
    const { data: basic } = await supabase
      .from("handicap_history")
      .select("id, handicap, recorded_at")
      .eq("user_id", user.id)
      .order("recorded_at", { ascending: true });
    if (!basic) return [];
    return basic.map(r => ({ id: r.id, handicap: r.handicap, recordedAt: r.recorded_at }));
  }

  return [];
}

export async function saveTheme(theme: "light" | "dark"): Promise<void> {
  const user = await getLocalUser();
  if (!user) return;
  await supabase.from("profiles").update({ theme }).eq("id", user.id);
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function fetchSessions(): Promise<SavedSession[]> {
  const user = await getLocalUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false });

  // Surface real query failures so callers can show an error state instead of
  // silently rendering zero stats to a user who has real history.
  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => ({
    id: r.id,
    completedAt: r.completed_at,
    filters: { goal: r.goal, bucket: r.bucket, time: r.time_minutes },
    totalBalls: r.total_balls,
    drillCount: r.drill_count,
  }));
}

export async function saveSession(session: SavedSession): Promise<void> {
  const user = await getLocalUser();
  if (!user) return;

  const { error } = await supabase.from("sessions").upsert({
    id: session.id,
    user_id: user.id,
    completed_at: session.completedAt,
    goal: session.filters.goal,
    bucket: session.filters.bucket,
    time_minutes: session.filters.time,
    total_balls: session.totalBalls,
    drill_count: session.drillCount,
  });
  if (error) throw new Error(error.message);
}

// ─── Bag ──────────────────────────────────────────────────────────────────────

export async function fetchBag(): Promise<Club[]> {
  const user = await getLocalUser();
  if (!user) return [];

  const { data } = await supabase
    .from("bag")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    brand: r.brand ?? undefined,
    model: r.model ?? undefined,
    parentSetId: r.parent_set_id ?? undefined,
    ironNumber: r.iron_number ?? undefined,
    sortOrder: r.sort_order,
  }));
}

export async function saveBag(clubs: Club[]): Promise<void> {
  const user = await getLocalUser();
  if (!user) return;

  // Upsert first, prune second: if the write fails we keep the old bag
  // instead of having deleted it and lost the user's clubs.
  if (clubs.length > 0) {
    const { error } = await supabase.from("bag").upsert(
      clubs.map((c, i) => ({
        id: c.id,
        user_id: user.id,
        name: c.name,
        type: c.type,
        brand: c.brand ?? null,
        model: c.model ?? null,
        parent_set_id: c.parentSetId ?? null,
        iron_number: c.ironNumber ?? null,
        sort_order: i,
      }))
    );
    if (error) throw new Error(error.message);
  }

  // Remove clubs no longer in the bag
  const clubIds = clubs.map(c => c.id);
  const prune = supabase.from("bag").delete().eq("user_id", user.id);
  const { error: pruneError } = clubIds.length > 0
    ? await prune.not("id", "in", `(${clubIds.join(",")})`)
    : await prune;
  if (pruneError) throw new Error(pruneError.message);
}

// ─── Yardages ─────────────────────────────────────────────────────────────────

export async function fetchYardages(): Promise<YardageMap> {
  const user = await getLocalUser();
  if (!user) return {};

  const { data } = await supabase
    .from("yardages")
    .select("*")
    .eq("user_id", user.id);

  const map: YardageMap = {};
  for (const r of data ?? []) {
    map[r.club_id] = {
      halfSwing: r.half_swing ?? null,
      threeQuarterSwing: r.three_quarter_swing ?? null,
      fullSwing: r.full_swing ?? null,
    };
  }
  return map;
}

export async function saveYardage(
  clubId: string,
  yardages: SwingYardages
): Promise<void> {
  const user = await getLocalUser();
  if (!user) return;

  const { error } = await supabase.from("yardages").upsert({
    user_id: user.id,
    club_id: clubId,
    half_swing: yardages.halfSwing,
    three_quarter_swing: yardages.threeQuarterSwing,
    full_swing: yardages.fullSwing,
  });
  if (error) throw new Error(error.message);
}

// ─── Favorites ────────────────────────────────────────────────────────────────

export async function fetchFavorites(): Promise<Favorite[]> {
  const user = await getLocalUser();
  if (!user) return [];

  const { data } = await supabase
    .from("favorites")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    sessionInput: (r.session_input as GenerateInput) ?? null,
    session: r.session as SessionDrill[],
    createdAt: r.created_at,
  }));
}

export async function insertCustomSession(fav: Favorite): Promise<void> {
  const user = await getLocalUser();
  if (!user) return;
  const { error } = await supabase.from("favorites").insert({
    id: fav.id,
    user_id: user.id,
    name: fav.name,
    session_input: null,
    session: fav.session,
    created_at: fav.createdAt,
  });
  if (error) throw new Error(error.message);
}

export async function insertFavorite(fav: Favorite): Promise<void> {
  const user = await getLocalUser();
  if (!user) return;

  const { error } = await supabase.from("favorites").insert({
    id: fav.id,
    user_id: user.id,
    name: fav.name,
    session_input: fav.sessionInput,
    session: fav.session,
    created_at: fav.createdAt,
  });
  if (error) throw new Error(error.message);
}

export async function removeFavorite(id: string): Promise<void> {
  const user = await getLocalUser();
  if (!user) return;

  const { error } = await supabase.from("favorites").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(error.message);
}

// ─── Migration, copy localStorage data to Supabase on first login ────────────

export async function migrateFromLocalStorage(): Promise<void> {
  const user = await getLocalUser();
  if (!user) return;

  const migrationKey = `range-rat:migrated:${user.id}`;
  if (localStorage.getItem(migrationKey)) return;

  try {
    // Profile
    const rawProfile = localStorage.getItem("rangeRat_profile");
    if (rawProfile) {
      const p = JSON.parse(rawProfile);
      await saveProfile({
        firstName: p.firstName ?? p.name ?? "",
        lastName: p.lastName ?? "",
        handedness: p.handedness,
        createdDate: p.createdDate ?? Date.now(),
      });
    }

    // Sessions
    const rawSessions = localStorage.getItem("range-rat:sessions");
    if (rawSessions) {
      const sessions = JSON.parse(rawSessions) as SavedSession[];
      for (const s of sessions) await saveSession(s);
    }

    // Bag
    const rawBag = localStorage.getItem("rangeRat_bag");
    if (rawBag) {
      const clubs = JSON.parse(rawBag) as Club[];
      await saveBag(clubs);
    }

    // Yardages
    const rawYardages = localStorage.getItem("rangeRat_yardages");
    if (rawYardages) {
      const yardages = JSON.parse(rawYardages) as YardageMap;
      for (const [clubId, y] of Object.entries(yardages)) {
        await saveYardage(clubId, y);
      }
    }

    // Favorites
    const rawFavs = localStorage.getItem("range-rat:favorites");
    if (rawFavs) {
      const favs = JSON.parse(rawFavs) as Favorite[];
      for (const f of favs) await insertFavorite(f);
    }
  } catch (e) {
    console.warn("Migration error:", e);
  }

  localStorage.setItem(migrationKey, "1");
}
