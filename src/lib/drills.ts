export type ClubGroup = "short-irons" | "long-irons" | "wedges" | "woods" | "driver" | "full-bag";
export type BucketSize = "small" | "medium" | "large";
export type TimeAvailable = 15 | 30 | 45 | 60;
export type Goal = "accuracy" | "consistency" | "distance" | "shot-shaping";
export type WarmUpPreset = "quick" | "standard" | "full";

export interface DrillTemplate {
  name: string;
  description: string;
  weight: number; // relative ball share within the club
}

export interface SessionDrill {
  id: string;
  club: string;
  drillName: string;
  description: string;
  balls: number;
  unit?: string; // e.g. "balls", "putts", "reps", "min"
}

// Base club groups shown in the picker (Full Bag is auto-derived).
export const BASE_CLUB_GROUPS: { value: ClubGroup; label: string }[] = [
  { value: "short-irons", label: "Short Irons" },
  { value: "long-irons", label: "Long Irons" },
  { value: "wedges", label: "Wedges" },
  { value: "woods", label: "Woods" },
  { value: "driver", label: "Driver" },
];

export const FULL_BAG_GROUP: { value: ClubGroup; label: string } = {
  value: "full-bag",
  label: "Full Bag",
};

export const BUCKET_SIZES: { value: BucketSize; label: string; balls: number }[] = [
  { value: "small", label: "Small", balls: 30 },
  { value: "medium", label: "Medium", balls: 60 },
  { value: "large", label: "Large", balls: 100 },
];

export const TIMES: TimeAvailable[] = [15, 30, 45, 60];

export const GOALS: { value: Goal; label: string }[] = [
  { value: "accuracy", label: "Accuracy" },
  { value: "consistency", label: "Consistency" },
  { value: "distance", label: "Distance" },
  { value: "shot-shaping", label: "Shot Shaping" },
];

export const WARM_UP_PRESETS: { value: WarmUpPreset; label: string; minutes: number }[] = [
  { value: "quick", label: "Quick", minutes: 10 },
  { value: "standard", label: "Standard", minutes: 20 },
  { value: "full", label: "Full", minutes: 30 },
];

const CLUBS_BY_GROUP: Record<ClubGroup, string[]> = {
  "short-irons": ["8 Iron", "9 Iron", "Pitching Wedge"],
  "long-irons": ["4 Iron", "5 Iron", "6 Iron", "7 Iron"],
  wedges: ["Pitching Wedge", "Gap Wedge", "Sand Wedge", "Lob Wedge"],
  woods: ["3 Wood", "5 Wood / Hybrid"],
  driver: ["Driver"],
  "full-bag": ["Driver", "3 Wood", "5 Iron", "7 Iron", "9 Iron", "Sand Wedge"],
};

const DRILLS_BY_GOAL: Record<Goal, DrillTemplate[]> = {
  accuracy: [
    {
      name: "Gate Drill",
      description: "Set two tees just wider than the clubhead. Strike through the gate cleanly.",
      weight: 1,
    },
    {
      name: "Target Window",
      description: "Pick a narrow target. Score 1 point for every shot landing inside it.",
      weight: 1,
    },
    {
      name: "9-Shot Ladder",
      description: "Hit alternating shots at three pins (near, mid, far). Reset after a miss.",
      weight: 1,
    },
  ],
  consistency: [
    {
      name: "Same Swing x10",
      description: "10 balls in a row at 80% effort. Reset count if tempo or contact changes.",
      weight: 1.2,
    },
    {
      name: "Pre-Shot Routine",
      description: "Full routine before every ball: visualize, align, breathe, swing.",
      weight: 1,
    },
    {
      name: "Strike Zone",
      description: "Use foot spray or a tee on the ground — track centered strikes out of 10.",
      weight: 1,
    },
  ],
  distance: [
    {
      name: "Step-Up Speed",
      description: "Three swings: 70%, 85%, 100%. Hold finish on each. Repeat the ladder.",
      weight: 1,
    },
    {
      name: "Carry Number Test",
      description: "Pick a target. Note carry. Try to land 7 of 10 within 5 yards of it.",
      weight: 1,
    },
    {
      name: "Speed Sets",
      description: "Sets of 3 max-effort swings, then 2 controlled stock shots to recover.",
      weight: 1,
    },
  ],
  "shot-shaping": [
    {
      name: "Draw / Fade Switch",
      description: "Alternate intentional draw and fade. Both must finish near the target line.",
      weight: 1,
    },
    {
      name: "Trajectory Window",
      description: "Hit 3 low, 3 stock, 3 high. Same target — only flight changes.",
      weight: 1,
    },
    {
      name: "Worst-Ball Shape",
      description: "Hit two shots, play the worse one again until you nail the shape.",
      weight: 1,
    },
  ],
};

const TIME_DRILL_BUDGET: Record<TimeAvailable, number> = {
  15: 1,
  30: 2,
  45: 2,
  60: 3,
};

// Warm-up library, ordered from most-essential to nice-to-have. Earlier items
// are included for shorter presets; longer presets layer on more items.
interface WarmUpItem {
  name: string;
  description: string;
  count: number;
  unit: string;
}

const WARM_UP_LIBRARY: WarmUpItem[] = [
  {
    name: "Light Stretching",
    description: "Loosen shoulders, hips, and wrists. Easy rotations, no force.",
    count: 2,
    unit: "min",
  },
  {
    name: "Easy Half Swings",
    description: "Wedge in hand. Half swings, focus on tempo and clean contact.",
    count: 10,
    unit: "balls",
  },
  {
    name: "Short Putts",
    description: "Inside 4 ft. Build confidence — sink them straight back, straight through.",
    count: 10,
    unit: "putts",
  },
  {
    name: "Quarter to Three-Quarter",
    description: "Mid iron. Build from quarter to three-quarter swings, same tempo.",
    count: 10,
    unit: "balls",
  },
  {
    name: "Lag Putts",
    description: "From around 30 ft. Focus on speed, not line.",
    count: 5,
    unit: "putts",
  },
  {
    name: "Short Chips",
    description: "Pick a target 15 ft out. Land softly and let it run.",
    count: 10,
    unit: "balls",
  },
  {
    name: "Stock Mid Iron",
    description: "Full but smooth swings. Lock in your stock shot before drills.",
    count: 8,
    unit: "balls",
  },
];

const WARM_UP_COUNT_BY_PRESET: Record<WarmUpPreset, number> = {
  quick: 3,
  standard: 5,
  full: 7,
};

export interface GenerateInput {
  clubGroups: ClubGroup[];
  bucket: BucketSize;
  time: TimeAvailable;
  goal: Goal;
  customBalls?: number;   // overrides bucket ball count when set
  customMinutes?: number; // overrides time when set
}

function resolveClubs(groups: ClubGroup[]): string[] {
  if (groups.includes("full-bag")) return [...CLUBS_BY_GROUP["full-bag"]];
  const result: string[] = [];
  for (const g of groups) {
    for (const club of CLUBS_BY_GROUP[g]) {
      if (!result.includes(club)) result.push(club);
    }
  }
  return result;
}

export function generateSession(input: GenerateInput): SessionDrill[] {
  const totalBalls = input.customBalls ?? BUCKET_SIZES.find((b) => b.value === input.bucket)!.balls;
  const clubs = resolveClubs(input.clubGroups);
  if (clubs.length === 0) return [];

  const minutes = input.customMinutes ?? input.time;
  const drillsPerClub = minutes <= 15 ? 1 : minutes <= 45 ? 2 : 3;
  const pool = DRILLS_BY_GOAL[input.goal];

  // Build the full ordered list of (club, drill) pairs first so we can
  // allocate balls globally — this guarantees the total always equals the bucket.
  const items: Array<{ club: string; drill: DrillTemplate; idx: number }> = [];
  clubs.forEach((club, ci) => {
    for (let di = 0; di < drillsPerClub; di++) {
      items.push({ club, drill: pool[(ci + di) % pool.length], idx: di });
    }
  });

  const weights = items.map((it) => it.drill.weight);
  const ballCounts = allocateExact(totalBalls, weights, 3);

  return items.map((item, i) => ({
    id: `${item.club}-${item.idx}-${item.drill.name}`,
    club: item.club,
    drillName: item.drill.name,
    description: item.drill.description,
    balls: ballCounts[i],
    unit: "balls",
  }));
}

// Distribute `total` integers across `weights.length` slots proportionally.
// Every slot gets at least `min` (reduced automatically when total is too small).
// The sum of the returned array is always exactly `total`.
function allocateExact(total: number, weights: number[], min = 3): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const sumW = weights.reduce((a, b) => a + b, 0);

  // If the bucket can't cover `min` per drill, lower the floor proportionally.
  const baseMin = total >= min * n ? min : Math.floor(total / n);
  const extra = total - baseMin * n;

  // Distribute the extra balls by weight, using largest-remainder rounding so
  // the sum comes out exact with no rounding drift.
  const exact = weights.map((w) => (w / sumW) * extra);
  const floored = exact.map(Math.floor);
  let rem = extra - floored.reduce((a, b) => a + b, 0);
  const order = exact
    .map((v, i) => ({ frac: v - Math.floor(v), i }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < rem; k++) floored[order[k].i]++;

  return floored.map((f) => baseMin + f);
}

export function buildWarmUp(preset: WarmUpPreset): SessionDrill[] {
  const count = WARM_UP_COUNT_BY_PRESET[preset];
  return WARM_UP_LIBRARY.slice(0, count).map((item, i) => ({
    id: `warmup-${preset}-${i}-${item.name}`,
    club: "Warm Up",
    drillName: item.name,
    description: item.description,
    balls: item.count,
    unit: item.unit,
  }));
}
