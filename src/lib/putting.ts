import type { TimeAvailable } from "./drills";

// Train -> Measure -> Move. Fixed distance ladders (same for every user, so
// sessions are comparable week to week and player to player), grouped into
// stations. Each station is always SETS_PER_STATION scored sets of the same
// exact putt, repeated, before moving to the next distance.

export type PuttCategory = "short" | "medium" | "long";
export type PuttingMode = "short" | "medium" | "long" | "mixed" | "complete";

export interface PuttStation {
  distanceFt: number;
  category: PuttCategory;
}

const SHORT_LADDER = [4, 5, 6];
const MEDIUM_LADDER = [8, 10, 12, 15];
const LONG_LADDER = [20, 30, 40, 50];

// Long putts aren't judged by makes; judged by finishing inside this radius.
export const LONG_TARGET_FT = 3;

export const SETS_PER_STATION = 3;
const MINUTES_PER_SET = 2; // hit the set, retrieve, reset

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// The full ladder for a mode. Called again (not memoized) so "mixed" can
// reshuffle on every lap of an unlimited session for game-like variability.
export function buildLadder(mode: PuttingMode): PuttStation[] {
  const short = SHORT_LADDER.map((d) => ({ distanceFt: d, category: "short" as const }));
  const medium = MEDIUM_LADDER.map((d) => ({ distanceFt: d, category: "medium" as const }));
  const long = LONG_LADDER.map((d) => ({ distanceFt: d, category: "long" as const }));
  switch (mode) {
    case "short": return short;
    case "medium": return medium;
    case "long": return long;
    case "complete": return [...short, ...medium, ...long];
    case "mixed": return shuffle([...short, ...medium, ...long]);
  }
}

export interface PuttingSessionConfig {
  mode: PuttingMode;
  ballCount: number;
  time: TimeAvailable | "unlimited";
}

// Initial station queue. Fixed time gets a soft target (time / minutes-per-
// station, minutes-per-station = SETS_PER_STATION * MINUTES_PER_SET) capped
// to the ladder length. Unlimited gets the full ladder; the runner extends it
// with another buildLadder() call once it's exhausted (see the UI layer).
export function planStations(config: PuttingSessionConfig): PuttStation[] {
  const ladder = buildLadder(config.mode);
  if (config.time === "unlimited") return ladder;
  const minutesPerStation = SETS_PER_STATION * MINUTES_PER_SET;
  const target = Math.max(1, Math.round(config.time / minutesPerStation));
  return target >= ladder.length ? ladder : ladder.slice(0, target);
}

export interface SetResult {
  distanceFt: number;
  category: PuttCategory;
  setNumber: number; // 1..SETS_PER_STATION
  ballCount: number;
  makes: number; // long category: count that finished inside LONG_TARGET_FT
}

export interface StationResult {
  distanceFt: number;
  category: PuttCategory;
  sets: SetResult[];
}

export interface Summary {
  attempts: number;
  makes: number;
  pct: number;
}

export function summarizeStation(sets: SetResult[]): Summary {
  const attempts = sets.reduce((s, x) => s + x.ballCount, 0);
  const makes = sets.reduce((s, x) => s + x.makes, 0);
  return { attempts, makes, pct: attempts > 0 ? Math.round((makes / attempts) * 100) : 0 };
}

export function summarizeSession(results: StationResult[]): Summary {
  const attempts = results.reduce((s, r) => s + r.sets.reduce((a, x) => a + x.ballCount, 0), 0);
  const makes = results.reduce((s, r) => s + r.sets.reduce((a, x) => a + x.makes, 0), 0);
  return { attempts, makes, pct: attempts > 0 ? Math.round((makes / attempts) * 100) : 0 };
}

export const PUTTING_MODES: { value: PuttingMode; label: string; blurb: string }[] = [
  { value: "short",    label: "Short Putting",     blurb: "4-6 ft · Build consistency on knee-knockers" },
  { value: "medium",   label: "Medium Putting",    blurb: "8-15 ft · The scoring zone" },
  { value: "long",     label: "Long Putting",      blurb: "20-50 ft · Distance control" },
  { value: "mixed",    label: "Mixed Putting",     blurb: "All distances, randomized order" },
  { value: "complete", label: "Complete Practice", blurb: "Full ladder, short to long" },
];

export function categoryLabel(category: PuttCategory): string {
  return category === "short" ? "Short Putt" : category === "medium" ? "Medium Putt" : "Long Putt";
}
