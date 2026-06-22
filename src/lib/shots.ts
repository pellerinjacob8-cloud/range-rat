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

// Distance bands per club type (yards, inclusive).
function distanceRange(club: ClubName): [number, number] {
  const canonical = CANONICAL_CLUBS.find(c => c.name === club);
  if (!canonical) return [100, 180];

  switch (canonical.type) {
    case "wedge":
      return [25, 120];
    case "iron":
      if (canonical.sortOrder <= 7) return [100, 170]; // short irons
      return [150, 210]; // long irons
    case "hybrid":
      return [170, 230];
    case "wood":
      if (canonical.id === "driver") return [230, 300];
      return [200, 260];
    default:
      return [100, 180];
  }
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDistance(club: ClubName): number {
  const [min, max] = distanceRange(club);
  const raw = Math.floor(Math.random() * (max - min + 1)) + min;
  return Math.round(raw / 5) * 5;
}

export interface GenerateShotOptions {
  bag?: BagClub[];
  style?: PracticeStyle;
}

export function generateShot(options?: GenerateShotOptions): Shot {
  const clubPool = options?.bag?.length
    ? options.bag.map(c => c.name)
    : CLUBS;
  const shapePool = shapesForStyle(options?.style);

  const club = pick(clubPool);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    club,
    shape: pick(shapePool),
    distance: randomDistance(club),
  };
}
