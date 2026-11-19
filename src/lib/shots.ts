import { CANONICAL_CLUBS, type BagClub, type PracticeStyle } from "./drills";

// Club names now come from CANONICAL_CLUBS. The ClubName type accepts any
// canonical name so PLYP and Game mode stay consistent with sessions.
export type ClubName = string;

export type ShotShape =
  | "Low Draw"
  | "Low Fade"
  | "Low Straight"
  | "Mid Draw"
  | "Mid Fade"
  | "Mid Straight"
  | "High Draw"
  | "High Fade"
  | "High Straight";

export interface Shot {
  id: string;
  club: ClubName;
  shape: ShotShape;
  distance: number;
}

// Default clubs used when no bag is provided (matches canonical names)
export const CLUBS: ClubName[] = CANONICAL_CLUBS.map(c => c.name);

// Shape pools by difficulty. Foundation/development get simpler shapes;
// performance/elite get the full matrix.
const SIMPLE_SHAPES: ShotShape[] = [
  "Mid Draw",
  "Mid Fade",
  "Mid Straight",
];

const STANDARD_SHAPES: ShotShape[] = [
  "Low Straight",
  "Mid Draw",
  "Mid Fade",
  "Mid Straight",
  "High Straight",
];

export const SHAPES: ShotShape[] = [
  "Low Draw",
  "Low Fade",
  "Low Straight",
  "Mid Draw",
  "Mid Fade",
  "Mid Straight",
  "High Draw",
  "High Fade",
  "High Straight",
];

function shapesForStyle(style?: PracticeStyle): ShotShape[] {
  switch (style) {
    case "foundation":  return SIMPLE_SHAPES;
    case "development": return STANDARD_SHAPES;
    default:            return SHAPES;
  }
}

// Typical full-swing carry in yards, used when a club has no saved yardage.
const STANDARD_CARRY: Record<string, number> = {
  lw: 70, sw: 85, gw: 100, pw: 115,
  "9i": 125, "8i": 135, "7i": 145, "6i": 155, "5i": 165, "4i": 175, "3i": 185, "2i": 195,
  "5h": 175, "4h": 185, "3h": 195,
  "5w": 205, "3w": 220, driver: 240,
};
const TYPE_CARRY: Record<string, number> = { wedge: 100, iron: 150, hybrid: 190, wood: 215, driver: 240 };

// Shots land within this share of the club's carry, up or down.
export const DISTANCE_SPREAD = 0.1;

export type ShotClub = { id: string; name: string; type?: string; ironNumber?: number };
export type CarryMap = Record<string, { fullSwing: number | null } | undefined>;

// Club names are free text in the bag editor ("2i", "56°", "Srixon 3 Wood"),
// so match the canonical list first, then read a number and a club word.
export function standardCarry(club: ShotClub): number {
  const canonical = CANONICAL_CLUBS.find((c) => c.id === club.id || c.name === club.name);
  if (canonical) return STANDARD_CARRY[canonical.id];
  const name = club.name.toLowerCase();
  if (club.type === "driver" || name.includes("driver")) return STANDARD_CARRY.driver;
  if (name.includes("lob")) return STANDARD_CARRY.lw;
  if (name.includes("sand")) return STANDARD_CARRY.sw;
  if (name.includes("gap") || name.includes("approach")) return STANDARD_CARRY.gw;
  if (name.includes("pitch")) return STANDARD_CARRY.pw;
  const loft = [...name.matchAll(/(\d{2})\s*(°|deg)?/g)]
    .find((m) => (club.type === "wedge" || m[2]) && +m[1] >= 44 && +m[1] <= 64);
  if (loft) return Math.round(115 - (+loft[1] - 46) * 3.2);
  const n = club.ironNumber ?? Number(name.match(/\b(\d)\s*-?\s*(i|iron|h|hybrid|w|wood)\b/)?.[1] ?? NaN);
  const kind = name.match(/\b\d\s*-?\s*(i|iron|h|hybrid|w|wood)\b/)?.[1]?.[0]
    ?? (club.type === "hybrid" ? "h" : club.type === "wood" ? "w" : club.type === "iron" ? "i" : undefined);
  if (kind && Number.isFinite(n)) {
    if (kind === "i" && n === 10) return STANDARD_CARRY.pw;
    const key = `${n}${kind}`;
    if (STANDARD_CARRY[key]) return STANDARD_CARRY[key];
    if (kind === "w" && n === 7) return 195;
    if (kind === "h") return Math.max(165, 205 - (n - 2) * 10);
  }
  return TYPE_CARRY[club.type ?? ""] ?? 150;
}

// The club's saved full-swing yardage when there is one, else the standard.
export function clubCarry(club: ShotClub, yardages?: CarryMap): number {
  const saved = yardages?.[club.id]?.fullSwing;
  return saved && saved > 0 ? saved : standardCarry(club);
}

export function distanceWindow(carry: number): [number, number] {
  const lo = Math.max(10, Math.round((carry * (1 - DISTANCE_SPREAD)) / 5) * 5);
  const hi = Math.max(lo, Math.round((carry * (1 + DISTANCE_SPREAD)) / 5) * 5);
  return [lo, hi];
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// A random distance in 5-yard steps inside the club's window.
export function randomDistance(club: ShotClub, yardages?: CarryMap, rand = Math.random): number {
  const [lo, hi] = distanceWindow(clubCarry(club, yardages));
  const steps = Math.round((hi - lo) / 5);
  return lo + Math.floor(rand() * (steps + 1)) * 5;
}

export interface GenerateShotOptions {
  bag?: BagClub[];
  style?: PracticeStyle;
  yardages?: CarryMap; // saved yardages by bag club id
}

export function generateShot(options?: GenerateShotOptions): Shot {
  const clubPool: ShotClub[] = options?.bag?.length ? options.bag : CANONICAL_CLUBS;
  const shapePool = shapesForStyle(options?.style);

  const club = pick(clubPool);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    club: club.name,
    shape: pick(shapePool),
    distance: randomDistance(club, options?.yardages),
  };
}
