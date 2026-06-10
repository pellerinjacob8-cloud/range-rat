export type ClubGroup = "short-irons" | "long-irons" | "wedges" | "woods" | "driver" | "full-bag";
export type BucketSize = "small" | "medium" | "large" | "unlimited";
export type TimeAvailable = 15 | 30 | 45 | 60;
export type Goal = "accuracy" | "consistency" | "distance" | "shot-shaping";
export type WarmUpPreset = "quick" | "standard" | "full";

export interface DrillTemplate {
  name: string;
  description: string;
  // Club-group-specific description overrides
  clubDescriptions?: Partial<Record<ClubGroup, string>>;
  weight: number;
}

export interface SessionDrill {
  id: string;
  club: string;
  drillName: string;
  description: string;
  balls: number;
  unit?: string; // e.g. "balls", "putts", "reps", "min"
  isTarget?: boolean; // true in unlimited mode — balls are a suggested rep count
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
  { value: "small",     label: "Small",     balls: 30  },
  { value: "medium",    label: "Medium",    balls: 60  },
  { value: "large",     label: "Large",     balls: 100 },
  { value: "unlimited", label: "Unlimited", balls: 0   },
];

export const TIMES: TimeAvailable[] = [15, 30, 45, 60];

export const GOALS: { value: Goal; label: string }[] = [
  { value: "accuracy",     label: "Accuracy"     },
  { value: "consistency",  label: "Consistency"  },
  { value: "distance",     label: "Distance"     },
  { value: "shot-shaping", label: "Shot Shaping" },
];

export const WARM_UP_PRESETS: { value: WarmUpPreset; label: string; minutes: number }[] = [
  { value: "quick",    label: "Quick",    minutes: 10 },
  { value: "standard", label: "Standard", minutes: 20 },
  { value: "full",     label: "Full",     minutes: 30 },
];

// ─── Club definitions ─────────────────────────────────────────────────────────

// Canonical short-to-long order used to sort clubs across all groups.
// Sessions always progress from shortest to longest.
const CLUB_ORDER: string[] = [
  "Lob Wedge",
  "Sand Wedge",
  "Gap Wedge",
  "Pitching Wedge",
  "9 Iron",
  "8 Iron",
  "7 Iron",
  "6 Iron",
  "5 Iron",
  "4 Iron",
  "5 Wood / Hybrid",
  "3 Wood",
  "Driver",
];

const CLUBS_BY_GROUP: Record<ClubGroup, string[]> = {
  wedges:       ["Lob Wedge", "Sand Wedge", "Gap Wedge", "Pitching Wedge"],
  "short-irons": ["9 Iron", "8 Iron", "Pitching Wedge"],
  "long-irons":  ["7 Iron", "6 Iron", "5 Iron", "4 Iron"],
  woods:         ["5 Wood / Hybrid", "3 Wood"],
  driver:        ["Driver"],
  // Full bag: one representative per group, short to long
  "full-bag":    ["Sand Wedge", "Pitching Wedge", "9 Iron", "7 Iron", "5 Iron", "3 Wood", "Driver"],
};

// ─── Drill library ────────────────────────────────────────────────────────────
// 7–8 drills per goal. Each drill has a default description plus optional
// club-group overrides so cues feel appropriate for the club being hit.

export const DRILLS_BY_GOAL: Record<Goal, DrillTemplate[]> = {

  accuracy: [
    {
      name: "Gate Drill",
      description: "Place two tees just wider than your clubhead on the target line. Strike through the gate cleanly on every rep.",
      clubDescriptions: {
        wedges:        "Set the gate at your ideal contact point. Focus on a shallow, precise entry.",
        driver:        "Set tees outside the ball on your target line. Brush through without clipping either tee.",
      },
      weight: 1,
    },
    {
      name: "Target Window",
      description: "Pick a narrow landing zone. Score 1 point for every shot that stays inside it. Try to finish 7 out of 10.",
      clubDescriptions: {
        wedges:        "Use two range markers to create a 10-yard window. Land it soft.",
        "long-irons":  "Pick a fairway segment. Track misses left vs right to spot a pattern.",
        driver:        "Pick two range markers as your fairway. Count how many stay between them.",
      },
      weight: 1,
    },
    {
      name: "Pin-High Challenge",
      description: "Pick a target and focus solely on matching the distance — not left or right. Every shot that finishes pin-high counts as a point.",
      clubDescriptions: {
        wedges:        "This is your bread and butter. Pick 75%, 100%, and 125% of your full wedge distance. Alternate.",
        "short-irons": "Pick a specific yardage and hold it. 7 out of 10 pin-high is the goal.",
      },
      weight: 1.1,
    },
    {
      name: "9-Shot Ladder",
      description: "Hit alternating shots at three pins — near, mid, and far. Reset your count if you miss two in a row.",
      weight: 1,
    },
    {
      name: "Alignment Check",
      description: "Lay a club on the ground along your target line before every shot. Address the ball, check your feet and shoulders are parallel, then swing.",
      clubDescriptions: {
        driver: "Aim is the most common driver error. Get obsessive about it here.",
      },
      weight: 0.9,
    },
    {
      name: "Miss Pattern Drill",
      description: "Hit 10 balls and note where every miss goes. If 6+ miss the same side, adjust your aim one ball width the other way and run it back.",
      clubDescriptions: {
        "long-irons": "Long irons exaggerate path errors. Be honest about the pattern.",
        driver:       "Note whether misses are left, right, or both — that tells you if it's path or face angle.",
      },
      weight: 1,
    },
    {
      name: "Clock-Face Landing",
      description: "Imagine a clock face around your target. Call out where you want to land before each shot — 12 o'clock is straight, 11 is left, 1 is right. Check if you matched it.",
      weight: 0.9,
    },
  ],

  consistency: [
    {
      name: "Same Swing x10",
      description: "10 balls in a row at 80% effort. Reset the count if tempo, contact, or ball flight breaks down.",
      clubDescriptions: {
        wedges:  "80% effort wedge swings should feel effortless. If you're working hard, slow down.",
        driver:  "80% with the driver is still fast. Focus on a smooth transition, not grip pressure.",
      },
      weight: 1.2,
    },
    {
      name: "Pre-Shot Routine",
      description: "Full routine before every single ball: step behind to visualize, pick an intermediate target, align, one look, swing. No shortcuts.",
      weight: 1,
    },
    {
      name: "Strike Zone",
      description: "Apply foot spray or put a small sticker on your clubface. Hit 10 balls and check where impact is. Aim to cluster strikes in the center.",
      clubDescriptions: {
        driver: "Heel strikes cause hooks, toe strikes cause fades. Center impact = straight and solid.",
      },
      weight: 1,
    },
    {
      name: "Divot Pattern",
      description: "Hit 8 shots and check your divot direction after each. Divots pointing left of target = out-to-in path. Divots right = in-to-out. Work toward straight or slightly right.",
      clubDescriptions: {
        wedges:        "Wedge divots should be shallow and point at the target.",
        "short-irons": "You want a slight downward strike. Divot starts after the ball, never before.",
        "long-irons":  "Long iron divots should be very shallow — just brushing the turf.",
        woods:         "Fairway wood: brush the turf, don't dig.",
        driver:        "No divot with the driver. You should be hitting up or level.",
      },
      weight: 1,
    },
    {
      name: "Identical Ball Flight",
      description: "Pick one specific shot shape and height. Hit 8 balls and try to duplicate it exactly. Variation is the enemy here.",
      weight: 1,
    },
    {
      name: "Tempo Drill",
      description: "Count a quiet '1' on the backswing, '2' at the top, '3' through impact. Keep the same count on every swing regardless of club.",
      weight: 1,
    },
    {
      name: "Eyes-Closed Contact",
      description: "Hit 5 balls with your eyes closed after you start the downswing. Forces you to feel the swing rather than steer it. Compare contact to normal swings.",
      weight: 0.85,
    },
    {
      name: "Slow Motion Reps",
      description: "Hit 5 balls at 30% speed, focusing entirely on the feel of centered contact. Then hit 5 at full speed trying to recreate that feel.",
      weight: 0.9,
    },
  ],

  distance: [
    {
      name: "Step-Up Speed",
      description: "Three swings in a row: 60%, 80%, 100% effort. Hold your finish on each. Then repeat the ladder.",
      clubDescriptions: {
        driver: "On the 100% swing, feel the ground with your lead foot before you fire. Speed comes from the ground up.",
      },
      weight: 1,
    },
    {
      name: "Carry Number Test",
      description: "Pick a target. Note your carry. Try to land 7 of 10 shots within 5 yards of it. Track whether you're short or long.",
      clubDescriptions: {
        wedges: "Know your carry numbers for every wedge. This is the drill that pays off most on the course.",
      },
      weight: 1,
    },
    {
      name: "Speed Sets",
      description: "Sets of 3 max-effort swings, then 2 controlled stock shots to recover timing. Repeat 3 sets.",
      clubDescriptions: {
        driver:       "Max effort means full rotation, not just a harder grip. Squeeze and release the glutes.",
        "long-irons": "Max effort on long irons is about compressing the ball, not swinging harder.",
      },
      weight: 1,
    },
    {
      name: "Launch Angle Play",
      description: "Hit 3 shots with the ball back in your stance (lower launch), 3 with it forward (higher launch). Feel how ball position changes your distance and flight.",
      weight: 0.9,
    },
    {
      name: "Overspeed Rehearsal",
      description: "Take 3 practice swings as fast as you can — no ball — then immediately hit a ball trying to recreate that speed sensation.",
      clubDescriptions: {
        driver: "Overspeed training is most effective with the driver. Swing a lighter club or just a shaft first.",
      },
      weight: 1,
    },
    {
      name: "Distance Ladder",
      description: "Pick 4 yardage targets evenly spaced across your range. Hit one ball at each, working from nearest to farthest. Repeat.",
      clubDescriptions: {
        wedges: "50 · 75 · 100 · 125 yards. This is your scoring zone — get obsessed with it.",
      },
      weight: 1.1,
    },
    {
      name: "Compression Check",
      description: "Focus entirely on striking down and through the ball. The sound should be a crisp click, not a thud. Hit 8 shots and count the clean ones.",
      clubDescriptions: {
        "short-irons": "Hands ahead of the ball at impact. Shaft leans toward the target.",
        "long-irons":  "Catch it thin? Ball is too far forward. Chunk it? Too far back.",
        woods:         "With fairway woods, you're sweeping — but contact still needs to be crisp.",
      },
      weight: 1,
    },
  ],

  "shot-shaping": [
    {
      name: "Draw / Fade Switch",
      description: "Alternate intentional draw and fade on consecutive shots. Both must finish near the target line — shape without losing control.",
      clubDescriptions: {
        wedges:  "Wedge shapes are subtle. Open or close the face slightly rather than changing your swing path dramatically.",
        driver:  "Set up for your shape before you swing. Commit to a start line and trust the curve.",
      },
      weight: 1,
    },
    {
      name: "Trajectory Window",
      description: "Hit 3 low, 3 stock, 3 high to the same target. Only the flight changes — same target, same effort.",
      clubDescriptions: {
        driver:  "Low driver: ball back, hands forward, punch finish. High driver: tee it up, ball forward, feel like you're hitting up.",
      },
      weight: 1,
    },
    {
      name: "Worst-Ball Shaping",
      description: "Hit two shots aiming for a specific shape. Play the worse one again. Repeat until you nail the shape two in a row.",
      weight: 1,
    },
    {
      name: "9-Shot Grid",
      description: "Hit all 9 shots in the matrix: low-draw, low-straight, low-fade · mid-draw, mid-straight, mid-fade · high-draw, high-straight, high-fade. Check each one off.",
      weight: 0.85,
    },
    {
      name: "Curve on Command",
      description: "Pick a shape (draw or fade) and try to start the ball right on your chosen start line, then curve it back. 6 of 8 on the start line is the target.",
      clubDescriptions: {
        "long-irons": "Long irons show shot shape more than any other club. Small face angle changes make a big difference.",
        driver:       "For driver, the start line comes from face angle. The curve comes from path. Focus on face first.",
      },
      weight: 1,
    },
    {
      name: "Obstacle Shot",
      description: "Pick an imaginary tree left of your target. Hit a shot that starts right of it and draws back to the pin. Then do the same with a tree on the right.",
      weight: 0.95,
    },
    {
      name: "3-Club Shape Test",
      description: "Take three different clubs and hit a draw with each. Then repeat with a fade. Some clubs shape easier than others — build that awareness.",
      weight: 0.9,
    },
  ],
};

// ─── Warm-up library ──────────────────────────────────────────────────────────

interface WarmUpItem {
  name: string;
  description: string;
  count: number;
  unit: string;
}

// Ordered from most-essential to nice-to-have. Earlier items are included for
// shorter presets; longer presets layer on more.
const WARM_UP_LIBRARY: WarmUpItem[] = [
  {
    name: "Light Stretching",
    description: "Loosen shoulders, hips, and wrists. Easy rotations — no force.",
    count: 2,
    unit: "min",
  },
  {
    name: "Easy Half Swings",
    description: "Grab a wedge. Half swings only — focus on tempo and clean contact. This is not practice, it's just getting loose.",
    count: 10,
    unit: "balls",
  },
  {
    name: "Short Putts",
    description: "Inside 4 ft. Sink them straight back, straight through. Build confidence before you start.",
    count: 10,
    unit: "putts",
  },
  {
    name: "Quarter to Three-Quarter",
    description: "Mid iron. Build from quarter to three-quarter swings at the same tempo. Feel the swing, don't force it.",
    count: 10,
    unit: "balls",
  },
  {
    name: "Lag Putts",
    description: "From around 30 ft. Focus on speed, not line. Get your touch dialed in.",
    count: 5,
    unit: "putts",
  },
  {
    name: "Short Chips",
    description: "Pick a target 15 ft out. Land softly and let it run. Hands ahead of the ball.",
    count: 10,
    unit: "balls",
  },
  {
    name: "Stock Mid Iron",
    description: "Full but smooth swings. Lock in your stock shot — this is your baseline for the rest of the session.",
    count: 8,
    unit: "balls",
  },
];

const WARM_UP_COUNT_BY_PRESET: Record<WarmUpPreset, number> = {
  quick:    3,
  standard: 5,
  full:     7,
};

// ─── Session generation ───────────────────────────────────────────────────────

export interface GenerateInput {
  clubGroups: ClubGroup[];
  bucket: BucketSize;
  time: TimeAvailable;
  goal: Goal;
  customBalls?: number;   // overrides bucket ball count when set
  customMinutes?: number; // overrides time when set
}

// Sort clubs in short-to-long order using the canonical CLUB_ORDER list.
function sortClubsShortToLong(clubs: string[]): string[] {
  return [...clubs].sort((a, b) => {
    const ai = CLUB_ORDER.indexOf(a);
    const bi = CLUB_ORDER.indexOf(b);
    // Unknown clubs go to the end
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

function resolveClubs(groups: ClubGroup[]): string[] {
  if (groups.includes("full-bag")) {
    return [...CLUBS_BY_GROUP["full-bag"]]; // already in correct order
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const g of groups) {
    for (const club of CLUBS_BY_GROUP[g]) {
      if (!seen.has(club)) {
        seen.add(club);
        result.push(club);
      }
    }
  }
  return sortClubsShortToLong(result);
}

// Fisher-Yates shuffle — returns a new array
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Resolve which club group a specific club belongs to (for description overrides)
function clubToGroup(club: string): ClubGroup | null {
  for (const [group, clubs] of Object.entries(CLUBS_BY_GROUP) as [ClubGroup, string[]][]) {
    if (group === "full-bag") continue;
    if (clubs.includes(club)) return group;
  }
  return null;
}

// Balls recommended per drill in unlimited mode, based on drill complexity.
const UNLIMITED_BALLS_PER_DRILL = 15;

export function generateSession(input: GenerateInput): SessionDrill[] {
  const isUnlimited = input.bucket === "unlimited";
  const totalBalls   = isUnlimited
    ? 0
    : (input.customBalls ?? BUCKET_SIZES.find((b) => b.value === input.bucket)!.balls);

  const clubs = resolveClubs(input.clubGroups);
  if (clubs.length === 0) return [];

  const minutes      = input.customMinutes ?? input.time;
  const drillsPerClub = minutes <= 15 ? 1 : minutes <= 45 ? 2 : 3;

  // Shuffle the pool so each session feels fresh, then cycle through it
  const pool = shuffle(DRILLS_BY_GOAL[input.goal]);

  // Build (club, drill) pairs — clubs already in short-to-long order
  const items: Array<{ club: string; drill: DrillTemplate; idx: number }> = [];
  clubs.forEach((club, ci) => {
    for (let di = 0; di < drillsPerClub; di++) {
      items.push({ club, drill: pool[(ci * drillsPerClub + di) % pool.length], idx: di });
    }
  });

  if (isUnlimited) {
    // Unlimited: assign a fixed target rep count per drill
    return items.map((item) => {
      const group = clubToGroup(item.club);
      const description =
        (group && item.drill.clubDescriptions?.[group]) ?? item.drill.description;
      return {
        id:          `${item.club}-${item.idx}-${item.drill.name}`,
        club:        item.club,
        drillName:   item.drill.name,
        description,
        balls:       UNLIMITED_BALLS_PER_DRILL,
        unit:        "balls",
        isTarget:    true,
      };
    });
  }

  // Bucket mode: allocate balls proportionally, sum must equal totalBalls exactly
  const weights   = items.map((it) => it.drill.weight);
  const ballCounts = allocateExact(totalBalls, weights, 3);

  return items.map((item, i) => {
    const group = clubToGroup(item.club);
    const description =
      (group && item.drill.clubDescriptions?.[group]) ?? item.drill.description;
    return {
      id:        `${item.club}-${item.idx}-${item.drill.name}`,
      club:      item.club,
      drillName: item.drill.name,
      description,
      balls:     ballCounts[i],
      unit:      "balls",
      isTarget:  false,
    };
  });
}

// Distribute `total` integers across `weights.length` slots proportionally.
// Every slot gets at least `min`. Sum of returned array always equals `total`.
function allocateExact(total: number, weights: number[], min = 3): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const sumW = weights.reduce((a, b) => a + b, 0);

  const baseMin = total >= min * n ? min : Math.floor(total / n);
  const extra   = total - baseMin * n;

  const exact   = weights.map((w) => (w / sumW) * extra);
  const floored = exact.map(Math.floor);
  let   rem     = extra - floored.reduce((a, b) => a + b, 0);
  const order   = exact
    .map((v, i) => ({ frac: v - Math.floor(v), i }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < rem; k++) floored[order[k].i]++;

  return floored.map((f) => baseMin + f);
}

// ─── Warm-up builder ─────────────────────────────────────────────────────────

export function buildWarmUp(preset: WarmUpPreset): SessionDrill[] {
  const count = WARM_UP_COUNT_BY_PRESET[preset];
  return WARM_UP_LIBRARY.slice(0, count).map((item, i) => ({
    id:       `warmup-${preset}-${i}-${item.name}`,
    club:     "Warm Up",
    drillName: item.name,
    description: item.description,
    balls:    item.count,
    unit:     item.unit,
    isTarget: false,
  }));
}
