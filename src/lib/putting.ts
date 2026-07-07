import type { TimeAvailable } from "./drills";

// Train -> Measure -> Move. Fixed distance ladders (same for every user, so
// sessions are comparable week to week and player to player), grouped into
// stations. Each station is always SETS_PER_STATION scored sets of the same
// putt, repeated, before moving to the next distance.
//
// Stations are ranges ("6-8 ft"), not a single exact number: nobody can pace
// off an exact distance on a practice green without a tool, and a range
// still repeats the same station every time the session is run.

export type PuttCategory = "short" | "medium" | "long";
export type PuttingMode = "short" | "medium" | "long" | "mixed" | "complete";

export interface PuttStation {
  minFt: number;
  maxFt: number;
  category: PuttCategory;
}

// Short widened from the original 4/5/6 (too tight, felt identical station to
// station) to real gaps. Medium/Long already had good spread; kept as small
// ranges around the original anchors (8/10/12/15, 20/30/40/50).
const SHORT_LADDER: [number, number][]  = [[3, 5], [6, 8], [9, 11]];
const MEDIUM_LADDER: [number, number][] = [[8, 9], [10, 11], [12, 13], [14, 16]];
const LONG_LADDER: [number, number][]   = [[18, 22], [28, 32], [38, 42], [48, 52]];

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

function toStations(ladder: [number, number][], category: PuttCategory): PuttStation[] {
  return ladder.map(([minFt, maxFt]) => ({ minFt, maxFt, category }));
}

// The full ladder for a mode. Called again (not memoized) so "mixed" can
// reshuffle on every lap of an unlimited session for game-like variability.
export function buildLadder(mode: PuttingMode): PuttStation[] {
  const short = toStations(SHORT_LADDER, "short");
  const medium = toStations(MEDIUM_LADDER, "medium");
  const long = toStations(LONG_LADDER, "long");
  switch (mode) {
    case "short": return short;
    case "medium": return medium;
    case "long": return long;
    case "complete": return [...short, ...medium, ...long];
    case "mixed": return shuffle([...short, ...medium, ...long]);
  }
}

export function stationLabel(station: PuttStation): string {
  return `${station.minFt}-${station.maxFt} ft`;
}

// Light, optional guidance so a new player knows what to go find without the
// app feeling like it's issuing orders. Difficulty ramps with the station's
// position in its own category: first station in a category is the easiest
// ask, later ones nudge toward more texture. Nothing here is enforced.
// (Down the line: could key off the player's handicap instead of a flat
// per-slot ramp, so a low handicap sees harder prompts sooner. Not built.)
const STAGE_TIPS = [
  "Find a flat, straight putt. This one's about tempo, not the line.",
  "Look for a putt with a touch of break, if you can find one.",
  "Bonus challenge: a putt with some slope or break really tests it.",
];

export function stationTip(station: PuttStation, indexInCategory: number): string {
  if (station.category === "long") {
    return indexInCategory === 0
      ? "Find a clear, mostly flat line to start. Focus on getting it close, not in."
      : "Try one with a bit of slope. Speed control is the whole game here.";
  }
  return STAGE_TIPS[Math.min(indexInCategory, STAGE_TIPS.length - 1)];
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
  minFt: number;
  maxFt: number;
  category: PuttCategory;
  setNumber: number; // 1..SETS_PER_STATION
  ballCount: number;
  makes: number; // long category: count that finished inside LONG_TARGET_FT
}

export interface StationResult {
  minFt: number;
  maxFt: number;
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
  { value: "short",    label: "Short Putting",     blurb: "3-11 ft · Build consistency on knee-knockers" },
  { value: "medium",   label: "Medium Putting",    blurb: "8-16 ft · The scoring zone" },
  { value: "long",     label: "Long Putting",      blurb: "18-52 ft · Distance control" },
  { value: "mixed",    label: "Mixed Putting",     blurb: "All distances, randomized order" },
  { value: "complete", label: "Complete Practice", blurb: "Full ladder, short to long" },
];

export function categoryLabel(category: PuttCategory): string {
  return category === "short" ? "Short Putt" : category === "medium" ? "Medium Putt" : "Long Putt";
}
