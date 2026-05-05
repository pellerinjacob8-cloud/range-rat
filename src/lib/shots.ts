export type ClubName =
  | "4 Iron"
  | "5 Iron"
  | "6 Iron"
  | "7 Iron"
  | "8 Iron"
  | "9 Iron"
  | "PW"
  | "GW"
  | "SW"
  | "LW"
  | "Hybrid"
  | "Wood"
  | "Driver";

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
  distance: number; // yards
}

export const CLUBS: ClubName[] = [
  "4 Iron",
  "5 Iron",
  "6 Iron",
  "7 Iron",
  "8 Iron",
  "9 Iron",
  "PW",
  "GW",
  "SW",
  "LW",
  "Hybrid",
  "Wood",
  "Driver",
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

// Distance bands per club category (yards, inclusive).
function distanceRange(club: ClubName): [number, number] {
  switch (club) {
    case "PW":
    case "GW":
    case "SW":
    case "LW":
      return [25, 100];
    case "8 Iron":
    case "9 Iron":
      return [100, 150];
    case "6 Iron":
    case "7 Iron":
      return [150, 200];
    case "4 Iron":
    case "5 Iron":
    case "Hybrid":
      return [180, 230];
    case "Wood":
      return [220, 260];
    case "Driver":
      return [250, 300];
  }
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDistance(club: ClubName): number {
  const [min, max] = distanceRange(club);
  // Round to nearest 5 yards for a clean target.
  const raw = Math.floor(Math.random() * (max - min + 1)) + min;
  return Math.round(raw / 5) * 5;
}

export function generateShot(): Shot {
  const club = pick(CLUBS);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    club,
    shape: pick(SHAPES),
    distance: randomDistance(club),
  };
}
