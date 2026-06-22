// ─── Types ────────────────────────────────────────────────────────────────────

export type CombineCategory = "wedge" | "mid-iron" | "long-game" | "driver";
export type SwingType = "Half" | "3/4" | "Full";
export type ShotShape = "Straight" | "Draw" | "Fade";
export type Trajectory = "Standard" | "Low" | "High";
export type StrikeQuality = "Pure" | "Solid" | "Average" | "Thin" | "Fat" | "Toe" | "Heel";
export type Direction =
  | "On Line"
  | "Slight Left" | "Slight Right"
  | "Moderate Left" | "Moderate Right"
  | "Severe Left" | "Severe Right";
export type DistanceControl = "Perfect" | "Close" | "Off";

export interface CombineShot {
  id: number;
  category: CombineCategory;
  yardage?: number; // undefined for driver
  swing: SwingType;
  shape: ShotShape;
  traj: Trajectory;
}

export interface ShotScoreInput {
  strikeQuality: StrikeQuality;
  direction: Direction;
  distanceControl?: DistanceControl; // wedge / iron / long-game
  fairwayHit?: boolean;              // driver only
}

export interface ScoredShot {
  shot: CombineShot;
  input: ShotScoreInput;
  shotScore: number; // 0–100
}

export interface CombineAttempt {
  id: string;
  completedAt: string;
  shots: ScoredShot[];
  categoryScores: {
    wedge: number;
    midIron: number;
    longGame: number;
    driver: number;
  };
  overallScore: number;
}

// ─── Shot Sequence (fixed, same every combine) ───────────────────────────────

export const COMBINE_SHOTS: CombineShot[] = [
  // Wedges, 15 shots (60×3, 70×3, 80×3, 90×3, 100×3)
  { id: 1,  category: "wedge",     yardage: 60,  swing: "Half", shape: "Straight", traj: "Standard" },
  { id: 2,  category: "wedge",     yardage: 60,  swing: "Half", shape: "Draw",     traj: "Low"      },
  { id: 3,  category: "wedge",     yardage: 60,  swing: "Half", shape: "Fade",     traj: "Standard" },
  { id: 4,  category: "wedge",     yardage: 70,  swing: "Half", shape: "Straight", traj: "Standard" },
  { id: 5,  category: "wedge",     yardage: 70,  swing: "3/4",  shape: "Draw",     traj: "Standard" },
  { id: 6,  category: "wedge",     yardage: 70,  swing: "3/4",  shape: "Fade",     traj: "Low"      },
  { id: 7,  category: "wedge",     yardage: 80,  swing: "3/4",  shape: "Straight", traj: "Standard" },
  { id: 8,  category: "wedge",     yardage: 80,  swing: "3/4",  shape: "Draw",     traj: "Standard" },
  { id: 9,  category: "wedge",     yardage: 80,  swing: "3/4",  shape: "Straight", traj: "High"     },
  { id: 10, category: "wedge",     yardage: 90,  swing: "Full", shape: "Straight", traj: "Standard" },
  { id: 11, category: "wedge",     yardage: 90,  swing: "Full", shape: "Fade",     traj: "Standard" },
  { id: 12, category: "wedge",     yardage: 90,  swing: "Full", shape: "Draw",     traj: "Low"      },
  { id: 13, category: "wedge",     yardage: 100, swing: "Full", shape: "Straight", traj: "Standard" },
  { id: 14, category: "wedge",     yardage: 100, swing: "Full", shape: "Draw",     traj: "Standard" },
  { id: 15, category: "wedge",     yardage: 100, swing: "Full", shape: "Fade",     traj: "High"     },

  // Mid Irons, 6 shots (120×3, 140×3)
  { id: 16, category: "mid-iron",  yardage: 120, swing: "Full", shape: "Straight", traj: "Standard" },
  { id: 17, category: "mid-iron",  yardage: 120, swing: "Full", shape: "Draw",     traj: "Standard" },
  { id: 18, category: "mid-iron",  yardage: 120, swing: "Full", shape: "Fade",     traj: "Low"      },
  { id: 19, category: "mid-iron",  yardage: 140, swing: "Full", shape: "Straight", traj: "Standard" },
  { id: 20, category: "mid-iron",  yardage: 140, swing: "Full", shape: "Draw",     traj: "High"     },
  { id: 21, category: "mid-iron",  yardage: 140, swing: "Full", shape: "Fade",     traj: "Standard" },

  // Long Game, 6 shots (160×3, 180×3)
  { id: 22, category: "long-game", yardage: 160, swing: "Full", shape: "Straight", traj: "Standard" },
  { id: 23, category: "long-game", yardage: 160, swing: "Full", shape: "Draw",     traj: "Standard" },
  { id: 24, category: "long-game", yardage: 160, swing: "Full", shape: "Fade",     traj: "Low"      },
  { id: 25, category: "long-game", yardage: 180, swing: "Full", shape: "Straight", traj: "Standard" },
  { id: 26, category: "long-game", yardage: 180, swing: "Full", shape: "Draw",     traj: "High"     },
  { id: 27, category: "long-game", yardage: 180, swing: "Full", shape: "Fade",     traj: "Standard" },

  // Driver, 6 shots
  { id: 28, category: "driver",    swing: "Full", shape: "Straight", traj: "Standard" },
  { id: 29, category: "driver",    swing: "Full", shape: "Draw",     traj: "Standard" },
  { id: 30, category: "driver",    swing: "Full", shape: "Fade",     traj: "Standard" },
  { id: 31, category: "driver",    swing: "Full", shape: "Straight", traj: "Low"      },
  { id: 32, category: "driver",    swing: "Full", shape: "Draw",     traj: "Standard" },
  { id: 33, category: "driver",    swing: "Full", shape: "Fade",     traj: "High"     },
];

// ─── Scoring ──────────────────────────────────────────────────────────────────

const STRIKE_SCORES: Record<StrikeQuality, number> = {
  Pure: 100, Solid: 82, Average: 60, Thin: 38, Fat: 22, Toe: 38, Heel: 38,
};

const DIRECTION_SCORES: Record<Direction, number> = {
  "On Line":       100,
  "Slight Left":    78, "Slight Right":    78,
  "Moderate Left":  42, "Moderate Right":  42,
  "Severe Left":     0, "Severe Right":     0,
};

const DISTANCE_SCORES: Record<DistanceControl, number> = {
  Perfect: 100, Close: 62, Off: 20,
};

export function calcShotScore(shot: CombineShot, input: ShotScoreInput): number {
  const strike = STRIKE_SCORES[input.strikeQuality] * 0.40;
  const direction = DIRECTION_SCORES[input.direction] * 0.35;
  const dc = shot.category === "driver"
    ? (input.fairwayHit ? 100 : 0) * 0.25
    : DISTANCE_SCORES[input.distanceControl!] * 0.25;
  return Math.round(strike + direction + dc);
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

export function calcAttemptScores(shots: ScoredShot[]): CombineAttempt["categoryScores"] & { overall: number } {
  const byCategory = (cat: CombineCategory) => shots.filter(s => s.shot.category === cat).map(s => s.shotScore);
  const wedge    = avg(byCategory("wedge"));
  const midIron  = avg(byCategory("mid-iron"));
  const longGame = avg(byCategory("long-game"));
  const driver   = avg(byCategory("driver"));
  // Weighted: wedge 15/33, midIron 6/33, longGame 6/33, driver 6/33
  const overall = avg(shots.map(s => s.shotScore));
  return { wedge, midIron, longGame, driver, overall };
}

export function skillLabel(score: number): string {
  if (score >= 90) return "Elite";
  if (score >= 80) return "Tournament";
  if (score >= 70) return "Competitive";
  if (score >= 55) return "Developing";
  return "Building";
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "range-rat:combine-attempts";

export function loadCombineAttempts(): CombineAttempt[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as CombineAttempt[]; }
  catch { return []; }
}

export function saveCombineAttempt(attempt: CombineAttempt): void {
  try {
    const existing = loadCombineAttempts();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, attempt]));
  } catch {}
}

export const CATEGORY_LABELS: Record<CombineCategory, string> = {
  "wedge":     "Wedges",
  "mid-iron":  "Mid Irons",
  "long-game": "Long Game",
  "driver":    "Driver",
};
