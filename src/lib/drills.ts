export type ClubGroup = "short-irons" | "long-irons" | "wedges" | "woods" | "driver" | "full-bag";
export type BucketSize = "small" | "medium" | "large" | "unlimited";
export type TimeAvailable = 15 | 30 | 45 | 60;
export type WarmUpPreset = "quick" | "standard" | "full";

// The original 4-goal system is the backbone of drill library keying.
export type Goal = "accuracy" | "consistency" | "distance" | "shot-shaping";

// The expanded 10-category system is what users see in the builder.
// Each category routes to 1-2 goals internally for drill pool selection.
export type PracticeCategory =
  | "ball-striking"
  | "distance-control"
  | "accuracy"
  | "shot-shaping"
  | "wedges"
  | "driver"
  | "short-game"
  | "random"
  | "course-prep"
  | "performance-test";

export type ContentType = "warmup" | "drill" | "focus" | "challenge" | "transfer" | "test";
export type SessionPhase = "Warm Up" | "Skill" | "Transfer" | "Challenge" | "Test";
export type PracticeStyle = "foundation" | "development" | "performance" | "elite";
export type PlayerLevel = "new" | "casual" | "regular" | "competitive";
export type PracticeEnvironment = "range" | "green" | "both";

export interface DrillTemplate {
  name: string;
  description: string;
  clubDescriptions?: Partial<Record<ClubGroup, string>>;
  weight: number;
  env?: PracticeEnvironment;
  styles?: PracticeStyle[];
}

export interface FocusTemplate {
  name: string;
  description: string;
}

export interface ScoredTemplate {
  name: string;
  describe: (style: PracticeStyle) => string;
}

export interface TransferTemplate {
  name: string;
  describe: (style: PracticeStyle) => string;
}

export interface SessionDrill {
  id: string;
  club: string;
  drillName: string;
  description: string;
  balls: number;
  unit?: string;
  isTarget?: boolean;
  type?: ContentType;
  phase?: SessionPhase;
}

// ─── Canonical club registry ─────────────────────────────────────────────────
// Single source of truth for club names, groups, and sort order.
// Used by session generation, PLYP, Combine, and the onboarding picker.

export interface CanonicalClub {
  id: string;
  name: string;
  group: ClubGroup;
  type: string;
  sortOrder: number;
}

export const CANONICAL_CLUBS: CanonicalClub[] = [
  { id: "lw",     name: "Lob Wedge",       group: "wedges",      type: "wedge",  sortOrder: 1  },
  { id: "sw",     name: "Sand Wedge",      group: "wedges",      type: "wedge",  sortOrder: 2  },
  { id: "gw",     name: "Gap Wedge",       group: "wedges",      type: "wedge",  sortOrder: 3  },
  { id: "pw",     name: "Pitching Wedge",  group: "wedges",      type: "wedge",  sortOrder: 4  },
  { id: "9i",     name: "9 Iron",          group: "short-irons", type: "iron",   sortOrder: 5  },
  { id: "8i",     name: "8 Iron",          group: "short-irons", type: "iron",   sortOrder: 6  },
  { id: "7i",     name: "7 Iron",          group: "short-irons", type: "iron",   sortOrder: 7  },
  { id: "6i",     name: "6 Iron",          group: "long-irons",  type: "iron",   sortOrder: 8  },
  { id: "5i",     name: "5 Iron",          group: "long-irons",  type: "iron",   sortOrder: 9  },
  { id: "4i",     name: "4 Iron",          group: "long-irons",  type: "iron",   sortOrder: 10 },
  { id: "5h",     name: "5 Hybrid",        group: "long-irons",  type: "hybrid", sortOrder: 9  },
  { id: "4h",     name: "4 Hybrid",        group: "long-irons",  type: "hybrid", sortOrder: 10 },
  { id: "3h",     name: "3 Hybrid",        group: "woods",       type: "hybrid", sortOrder: 11 },
  { id: "5w",     name: "5 Wood",          group: "woods",       type: "wood",   sortOrder: 12 },
  { id: "3w",     name: "3 Wood",          group: "woods",       type: "wood",   sortOrder: 13 },
  { id: "driver", name: "Driver",          group: "driver",      type: "wood",   sortOrder: 14 },
];

// Lookup helpers
function canonicalByName(name: string): CanonicalClub | undefined {
  return CANONICAL_CLUBS.find(c => c.name === name);
}

function canonicalById(id: string): CanonicalClub | undefined {
  return CANONICAL_CLUBS.find(c => c.id === id);
}

// Given a club name, find the closest match in the user's bag.
// Falls back to the original name when the bag is empty or no match found.
function substituteClub(clubName: string, bag: BagClub[]): string {
  if (bag.length === 0) return clubName;
  const canonical = canonicalByName(clubName);
  if (!canonical) return clubName;
  const inBag = bag.find(b => b.name === clubName || b.id === canonical.id);
  if (inBag) return inBag.name;
  const sameGroup = bag
    .map(b => ({ bag: b, canon: canonicalById(b.id) }))
    .filter(x => x.canon && x.canon.group === canonical.group)
    .sort((a, b) =>
      Math.abs((a.canon!.sortOrder) - canonical.sortOrder) -
      Math.abs((b.canon!.sortOrder) - canonical.sortOrder)
    );
  return sameGroup[0]?.bag.name ?? clubName;
}

// ─── UI constants ────────────────────────────────────────────────────────────

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

// Legacy 4-goal list (kept for back-compat with saved sessions)
export const GOALS: { value: Goal; label: string }[] = [
  { value: "accuracy",     label: "Accuracy"     },
  { value: "consistency",  label: "Consistency"  },
  { value: "distance",     label: "Distance"     },
  { value: "shot-shaping", label: "Shot Shaping" },
];

// New 10-category list shown in the builder
export const CATEGORIES: { value: PracticeCategory; label: string; description: string; env: PracticeEnvironment }[] = [
  { value: "ball-striking",     label: "Ball Striking",      description: "Contact, strike patterns, consistency",          env: "range" },
  { value: "distance-control",  label: "Distance Control",   description: "Carry numbers, yardage games, ladder drills",    env: "range" },
  { value: "accuracy",          label: "Accuracy",           description: "Target windows, alignment, miss patterns",       env: "range" },
  { value: "shot-shaping",      label: "Shot Shaping",       description: "Draw, fade, trajectory, 9-shot grid",            env: "range" },
  { value: "wedges",            label: "Wedges",             description: "Scoring zone, partial swings, distance ladders", env: "range" },
  { value: "driver",            label: "Driver",             description: "Speed, fairway finding, tee shot strategy",      env: "range" },
  { value: "short-game",        label: "Short Game",         description: "Chipping, pitching, greenside touch",            env: "green" },
  { value: "random",            label: "Random Practice",    description: "No pattern, max variety, simulate the course",   env: "range" },
  { value: "course-prep",       label: "Course Preparation", description: "Simulated holes, pre-round pressure",            env: "range" },
  { value: "performance-test",  label: "Performance Test",   description: "Standardized scoring, track improvement",        env: "range" },
];

export const WARM_UP_PRESETS: { value: WarmUpPreset; label: string; minutes: number }[] = [
  { value: "quick",    label: "Quick",    minutes: 10 },
  { value: "standard", label: "Standard", minutes: 20 },
  { value: "full",     label: "Full",     minutes: 30 },
];

export const PLAYER_LEVELS: { value: PlayerLevel; label: string; hint: string }[] = [
  { value: "new",         label: "New to golf",  hint: "Still building the basics" },
  { value: "casual",      label: "Casual",       hint: "Out a few times a month" },
  { value: "regular",     label: "Regular",      hint: "Most weeks; breaking 90 or 80" },
  { value: "competitive", label: "Competitive",  hint: "Low handicap, chasing scores" },
];

// ─── Category routing ────────────────────────────────────────────────────────
// Each category maps to goal(s) for drill pool selection, phase ratio overrides,
// and optional club group constraints.

interface CategoryRoute {
  goals: Goal[];
  clubConstraint?: ClubGroup[];
  phaseOverrides?: Partial<{ skill: number; transfer: number; challenge: number }>;
  drillShareOverride?: number;
}

const CATEGORY_ROUTES: Record<PracticeCategory, CategoryRoute> = {
  "ball-striking":    { goals: ["consistency"] },
  "distance-control": { goals: ["distance"] },
  "accuracy":         { goals: ["accuracy"] },
  "shot-shaping":     { goals: ["shot-shaping"] },
  "wedges":           { goals: ["accuracy", "distance"], clubConstraint: ["wedges"] },
  "driver":           { goals: ["accuracy", "distance"], clubConstraint: ["driver"] },
  "short-game":       { goals: ["consistency", "accuracy"] },
  "random":           { goals: ["accuracy", "consistency", "distance", "shot-shaping"] },
  "course-prep":      { goals: ["accuracy", "consistency"], phaseOverrides: { skill: 0.15, transfer: 0.40, challenge: 0.25 }, drillShareOverride: 0.30 },
  "performance-test": { goals: ["accuracy", "consistency"], phaseOverrides: { skill: 0.10, transfer: 0.10, challenge: 0.55 }, drillShareOverride: 0.20 },
};

// Convert a category to the goal(s) used for drill pool selection
function categoryToGoals(category: PracticeCategory): Goal[] {
  return CATEGORY_ROUTES[category].goals;
}

// Convert a legacy Goal to a PracticeCategory (for back-compat)
function goalToCategory(goal: Goal): PracticeCategory {
  switch (goal) {
    case "accuracy":     return "accuracy";
    case "consistency":  return "ball-striking";
    case "distance":     return "distance-control";
    case "shot-shaping": return "shot-shaping";
  }
}

// ─── Practice styles ─────────────────────────────────────────────────────────

export interface StyleProfile {
  label: string;
  blurb: string;
  phases: { skill: number; transfer: number; challenge: number };
  drillShareOfSkill: number;
}

export const STYLE_PROFILES: Record<PracticeStyle, StyleProfile> = {
  foundation: {
    label: "Foundation",
    blurb: "Structure, reps, and big targets to build a repeatable swing.",
    phases: { skill: 0.50, transfer: 0.25, challenge: 0.08 },
    drillShareOfSkill: 0.70,
  },
  development: {
    label: "Development",
    blurb: "A blend of reps and play with moderate pressure.",
    phases: { skill: 0.40, transfer: 0.28, challenge: 0.14 },
    drillShareOfSkill: 0.55,
  },
  performance: {
    label: "Performance",
    blurb: "Less instruction, more scoring and pressure.",
    phases: { skill: 0.30, transfer: 0.32, challenge: 0.20 },
    drillShareOfSkill: 0.40,
  },
  elite: {
    label: "Elite",
    blurb: "Mostly games, tests, and decisions under pressure.",
    phases: { skill: 0.22, transfer: 0.36, challenge: 0.24 },
    drillShareOfSkill: 0.28,
  },
};

export function deriveStyle(handicap?: number, level?: PlayerLevel): PracticeStyle {
  if (handicap !== undefined && !Number.isNaN(handicap)) {
    if (handicap >= 20) return "foundation";
    if (handicap >= 12) return "development";
    if (handicap >= 5)  return "performance";
    return "elite";
  }
  switch (level) {
    case "new":         return "foundation";
    case "casual":      return "foundation";
    case "regular":     return "development";
    case "competitive": return "performance";
    default:            return "development";
  }
}

export function recommendGoal(stats?: {
  gir?: number; fairways?: number; putts?: number; upAndDowns?: number;
}): { goal: Goal; reason: string } | null {
  if (!stats) return null;
  const candidates: { goal: Goal; severity: number; reason: string }[] = [];
  if (stats.gir !== undefined)
    candidates.push({ goal: "accuracy", severity: 65 - stats.gir, reason: `greens in regulation are at ${stats.gir}%` });
  if (stats.fairways !== undefined)
    candidates.push({ goal: "accuracy", severity: 60 - stats.fairways, reason: `you're hitting ${stats.fairways}% of fairways` });
  if (stats.putts !== undefined)
    candidates.push({ goal: "consistency", severity: (stats.putts - 32) * 1.5, reason: `averaging ${stats.putts} putts per round` });
  if (stats.upAndDowns !== undefined)
    candidates.push({ goal: "consistency", severity: (50 - stats.upAndDowns) * 0.6, reason: `your up-and-down rate is ${stats.upAndDowns}%` });
  const worst = candidates.filter(c => c.severity > 0).sort((a, b) => b.severity - a.severity)[0];
  return worst ? { goal: worst.goal, reason: worst.reason } : null;
}

// ─── Club definitions ────────────────────────────────────────────────────────

const CLUB_ORDER: string[] = CANONICAL_CLUBS
  .slice()
  .sort((a, b) => a.sortOrder - b.sortOrder)
  .map(c => c.name);

const CLUBS_BY_GROUP: Record<ClubGroup, string[]> = {
  wedges:       ["Lob Wedge", "Sand Wedge", "Gap Wedge", "Pitching Wedge"],
  "short-irons": ["9 Iron", "8 Iron", "7 Iron"],
  "long-irons":  ["6 Iron", "5 Iron", "4 Iron"],
  woods:         ["5 Wood", "3 Wood", "3 Hybrid"],
  driver:        ["Driver"],
  "full-bag":    ["Sand Wedge", "Pitching Wedge", "9 Iron", "7 Iron", "5 Iron", "3 Wood", "Driver"],
};

// ─── Drill library ───────────────────────────────────────────────────────────

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
      description: "Pick a target and focus solely on matching the distance, not left or right. Every shot that finishes pin-high counts as a point.",
      clubDescriptions: {
        wedges:        "This is your bread and butter. Pick 75%, 100%, and 125% of your full wedge distance. Alternate.",
        "short-irons": "Pick a specific yardage and hold it. 7 out of 10 pin-high is the goal.",
      },
      weight: 1.1,
    },
    {
      name: "9-Shot Ladder",
      description: "Hit alternating shots at three pins, near, mid, and far. Reset your count if you miss two in a row.",
      weight: 1,
      styles: ["development", "performance", "elite"],
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
        driver:       "Note whether misses are left, right, or both, that tells you if it's path or face angle.",
      },
      weight: 1,
    },
    {
      name: "Clock-Face Landing",
      description: "Imagine a clock face around your target. Call out where you want to land before each shot, 12 o'clock is straight, 11 is left, 1 is right. Check if you matched it.",
      weight: 0.9,
      styles: ["performance", "elite"],
    },
    {
      name: "Shrinking Target",
      description: "Start with a 30-yard window. Every time you land 3 in a row inside it, shrink the window by 5 yards. See how tight you can go.",
      weight: 1,
    },
    {
      name: "Commit and Hold",
      description: "Pick a target, commit fully, and hold your finish until the ball lands. If you flinch or move early, the rep doesn't count.",
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
        "long-irons":  "Long iron divots should be very shallow, just brushing the turf.",
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
      styles: ["development", "performance", "elite"],
    },
    {
      name: "Slow Motion Reps",
      description: "Hit 5 balls at 30% speed, focusing entirely on the feel of centered contact. Then hit 5 at full speed trying to recreate that feel.",
      weight: 0.9,
    },
    {
      name: "Two-Club Ladder",
      description: "Alternate between two clubs every other ball. Same target, same routine. Build the ability to switch gears without losing contact.",
      weight: 1,
    },
    {
      name: "Pressure Streak",
      description: "Hit acceptable shots in a row. Count your streak. One bad shot resets to zero. Try to beat your streak each set.",
      weight: 1,
      styles: ["development", "performance", "elite"],
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
      styles: ["development", "performance", "elite"],
    },
    {
      name: "Overspeed Rehearsal",
      description: "Take 3 practice swings as fast as you can, no ball, then immediately hit a ball trying to recreate that speed sensation.",
      clubDescriptions: {
        driver: "Overspeed training is most effective with the driver. Swing a lighter club or just a shaft first.",
      },
      weight: 1,
    },
    {
      name: "Distance Ladder",
      description: "Pick 4 yardage targets evenly spaced across your range. Hit one ball at each, working from nearest to farthest. Repeat.",
      clubDescriptions: {
        wedges: "50, 75, 100, 125 yards. This is your scoring zone, get obsessed with it.",
      },
      weight: 1.1,
    },
    {
      name: "Compression Check",
      description: "Focus entirely on striking down and through the ball. The sound should be a crisp click, not a thud. Hit 8 shots and count the clean ones.",
      clubDescriptions: {
        "short-irons": "Hands ahead of the ball at impact. Shaft leans toward the target.",
        "long-irons":  "Catch it thin? Ball is too far forward. Chunk it? Too far back.",
        woods:         "With fairway woods, you're sweeping, but contact still needs to be crisp.",
      },
      weight: 1,
    },
    {
      name: "Partial Swing Ladder",
      description: "Same club, 4 swings: half, three-quarter, stock, full. Note the distance difference between each. Knowing these numbers wins scoring holes.",
      clubDescriptions: {
        wedges: "These are your most important numbers inside 120 yards. Write them down.",
      },
      weight: 1,
    },
    {
      name: "Stock vs. Knockdown",
      description: "Alternate between your stock full swing and a knockdown (ball back, shorter finish). Track the carry difference. This is your wind shot.",
      weight: 0.95,
      styles: ["development", "performance", "elite"],
    },
  ],

  "shot-shaping": [
    {
      name: "Draw / Fade Switch",
      description: "Alternate intentional draw and fade on consecutive shots. Both must finish near the target line, shape without losing control.",
      clubDescriptions: {
        wedges:  "Wedge shapes are subtle. Open or close the face slightly rather than changing your swing path dramatically.",
        driver:  "Set up for your shape before you swing. Commit to a start line and trust the curve.",
      },
      weight: 1,
    },
    {
      name: "Trajectory Window",
      description: "Hit 3 low, 3 stock, 3 high to the same target. Only the flight changes, same target, same effort.",
      clubDescriptions: {
        driver:  "Low driver: ball back, hands forward, punch finish. High driver: tee it up, ball forward, feel like you're hitting up.",
      },
      weight: 1,
    },
    {
      name: "Worst-Ball Shaping",
      description: "Hit two shots aiming for a specific shape. Play the worse one again. Repeat until you nail the shape two in a row.",
      weight: 1,
      styles: ["development", "performance", "elite"],
    },
    {
      name: "9-Shot Grid",
      description: "Hit all 9 shots in the matrix: low-draw, low-straight, low-fade, mid-draw, mid-straight, mid-fade, high-draw, high-straight, high-fade. Check each one off.",
      weight: 0.85,
      styles: ["performance", "elite"],
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
      styles: ["development", "performance", "elite"],
    },
    {
      name: "3-Club Shape Test",
      description: "Take three different clubs and hit a draw with each. Then repeat with a fade. Some clubs shape easier than others, build that awareness.",
      weight: 0.9,
      styles: ["performance", "elite"],
    },
    {
      name: "Shot Shape Streak",
      description: "Pick one shape. Hit it until you miss, then switch to the other shape. Track your best streak for each.",
      weight: 1,
    },
  ],
};

// ─── Focus library ───────────────────────────────────────────────────────────

export const FOCUS_BY_GOAL: Record<Goal, FocusTemplate[]> = {
  accuracy: [
    { name: "Start Line", description: "Pick an intermediate spot a foot ahead of the ball and roll every shot directly over it." },
    { name: "Commit to a Target", description: "Choose one precise target, not a general direction. Fully commit before the club moves." },
    { name: "One Look", description: "One look at the target, then go. Trust your aim instead of re-checking it." },
    { name: "Narrow Window", description: "Picture a 10-yard-wide gate out at your target and send every ball through it." },
    { name: "Soft Hands", description: "Relax your grip pressure to about a 4 out of 10. Tension is what steers the face offline." },
    { name: "Quiet Finish", description: "Hold a balanced, still finish on every shot. Aim comes from control, not effort." },
  ],
  consistency: [
    { name: "Center Face", description: "Feel the ball leave the middle of the face. Listen for the flush sound on each strike." },
    { name: "Same Tempo", description: "Count '1-2' going back and '3' through impact on every swing, whatever the club." },
    { name: "Full Routine", description: "Run your complete pre-shot routine before every single ball. No shortcuts." },
    { name: "Hold the Finish", description: "Freeze your finish for three seconds after each shot. If you can't, you swung too hard." },
    { name: "One Swing Thought", description: "Pick a single feel for this whole block and stick with it. No mid-block tinkering." },
    { name: "Breathe & Reset", description: "Take one slow breath before each ball. Rehearse the calm you want on the course." },
  ],
  distance: [
    { name: "Ground Up", description: "Feel your lead foot press into the ground before you fire. Speed starts from the ground." },
    { name: "Complete the Turn", description: "Finish your backswing turn fully. Don't let the transition rush you off the top." },
    { name: "Lazy Start, Fast Finish", description: "Let the club fall gently before you accelerate. The speed belongs at the bottom." },
    { name: "Athletic Setup", description: "Set up wide and ready, like you're about to jump. Stay tall and turn through." },
    { name: "Release Through", description: "Let the clubhead pass your hands through impact. Free speed, not a steered hit." },
    { name: "Commit to Speed", description: "Pick your number and swing to carry it, no flinching or holding back mid-swing." },
  ],
  "shot-shaping": [
    { name: "See It First", description: "Picture the full curve before you swing, then shape the shot you just saw." },
    { name: "Start-Line First", description: "The start line matters more than the curve. Pick it, hit it, let the shape happen." },
    { name: "Face Awareness", description: "Feel where the face points at impact, that's what sets your start line." },
    { name: "Commit to the Curve", description: "Once you pick draw or fade, fully commit. Half-shaped shots leak into trouble." },
    { name: "Match a Height", description: "Pair every shape with a trajectory, low draw, high fade. Shape and flight together." },
    { name: "Both Ways Ready", description: "Remind yourself you can move it either direction, then pick the shape the hole asks for." },
  ],
};

// ─── Challenge library ───────────────────────────────────────────────────────

const STYLE_INDEX: Record<PracticeStyle, 0 | 1 | 2 | 3> = {
  foundation: 0, development: 1, performance: 2, elite: 3,
};
function pick<T>(style: PracticeStyle, vals: readonly [T, T, T, T]): T {
  return vals[STYLE_INDEX[style]];
}

export const CHALLENGE_BY_GOAL: Record<Goal, ScoredTemplate[]> = {
  accuracy: [
    { name: "Fairway Finder", describe: s => `Set two markers ${pick(s, [30, 24, 18, 12])} yards apart as your fairway. Land ${pick(s, [5, 6, 7, 8])} of 10 inside them.` },
    { name: "Target Window", describe: s => `Pick a ${pick(s, [25, 20, 15, 10])}-yard-wide window. Score a point for each shot that finishes inside, beat ${pick(s, [5, 6, 7, 8])}/10.` },
    { name: "Three in a Row", describe: s => `Hit ${pick(s, [2, 3, 3, 4])} shots in a row inside your window. Miss one and the count resets to zero.` },
    { name: "Edge to Edge", describe: s => `Alternate aiming at the left and right edge of your target zone. Start ${pick(s, [5, 6, 7, 8])} of 10 on the called side.` },
    { name: "Progressive Target", describe: s => `Start with a generous target. Hit ${pick(s, [2, 2, 3, 3])} in a row to shrink it by 5 yards. How small can you go?` },
  ],
  consistency: [
    { name: "Flush Count", describe: s => `Hit 10 shots and count the flush, center-face strikes. Beat ${pick(s, [4, 5, 6, 7])}/10.` },
    { name: "Carbon Copy", describe: s => `Repeat one ball flight exactly. Count your longest streak of matching shots, beat ${pick(s, [3, 4, 5, 6])} in a row.` },
    { name: "No Two Alike Penalty", describe: s => `Same strike, same flight, every ball. Score ${pick(s, [6, 7, 8, 9])} of 10 that you'd call identical.` },
    { name: "Up-to-Speed Ladder", describe: s => `Sets of smooth-stock-committed. Every committed swing must still hold its line, clear ${pick(s, [2, 3, 4, 5])} clean sets.` },
    { name: "10-Ball Audit", describe: s => `10 stock shots, full routine. Grade each: solid, ok, or miss. Beat ${pick(s, [5, 6, 7, 8])} solids.` },
  ],
  distance: [
    { name: "Carry Window", describe: s => `Pick your stock number. Land ${pick(s, [5, 6, 7, 8])} of 10 within ${pick(s, [12, 9, 6, 4])} yards of it.` },
    { name: "Long & In Play", describe: s => `Max carry that still finishes in a ${pick(s, [40, 32, 24, 16])}-yard window. Score ${pick(s, [5, 6, 7, 8])} of 10.` },
    { name: "Number Caller", describe: s => `Call a carry number before each ball and try to match it. Get ${pick(s, [4, 5, 6, 7])} of 10 within a flag's length.` },
    { name: "Speed Stretch", describe: s => `Carry one club-length past your stock distance while keeping it in play, ${pick(s, [4, 5, 6, 7])} of 10.` },
    { name: "3-Distance Challenge", describe: s => `Pick three yardages: short, stock, long. Hit ${pick(s, [2, 2, 3, 3])} of each. Score how many finish within ${pick(s, [10, 8, 6, 4])} yards.` },
  ],
  "shot-shaping": [
    { name: "Shape on Call", describe: s => `Call draw or fade on each ball. Count how many of 10 curve the right way, beat ${pick(s, [5, 6, 7, 8])}.` },
    { name: "Start-Line Gate", describe: s => `Start ${pick(s, [5, 6, 7, 8])} of 10 on your chosen line, then let the ball curve back to target.` },
    { name: "Both Ways", describe: s => `Alternate a draw and a fade to the same target. Score ${pick(s, [3, 4, 5, 6])} pairs where both work.` },
    { name: "Escape Artist", describe: s => `Imagine a tree on your line. Start the ball around it and curve back, ${pick(s, [4, 5, 6, 7])} of 10 finish near target.` },
    { name: "Shape and Distance", describe: s => `Call the shape AND a carry number before each ball. Both must be right. Beat ${pick(s, [3, 4, 5, 6])}/10.` },
  ],
};

// ─── Transfer library ────────────────────────────────────────────────────────

export const TRANSFER_TEMPLATES: TransferTemplate[] = [
  {
    name: "Practice Like You Play",
    describe: s => pick(s, [
      "Run your full routine on every ball and say your club and target out loud before each shot.",
      "Change clubs every ball, commit to a real target, and judge the result like it counts.",
      "Play imaginary holes, tee shot, then approach, and grade each shot good or bad.",
      "Play 9 holes in your head. A poor shot means you replay that hole before moving on.",
    ]),
  },
  {
    name: "Random Club Switch",
    describe: s => pick(s, [
      "Never hit the same club twice in a row. Pick a target that fits each one.",
      "Switch clubs every ball and change your target to match the club.",
      "Random club, random target, full routine, like you never get two of the same shot on the course.",
      "Random club and target each ball; one bad strike means you owe yourself two good ones.",
    ]),
  },
  {
    name: "One-Ball Routine",
    describe: s => pick(s, [
      "One ball, full routine, no rehearsal swing. Make the first one count.",
      "Single ball per target with your complete routine, no do-overs.",
      "First-ball-only: one shot per target, score yourself on the result you'd accept on the course.",
      "One ball per target under self-imposed pressure: name the shot, hit it, live with it.",
    ]),
  },
  {
    name: "Par-18 Game",
    describe: s => pick(s, [
      "Pick a target and try to 'hit the green', a generous zone. Score yourself across 9 targets.",
      "Nine targets, one ball each, a fair-sized green. Count how many you find.",
      "Nine 'greens' of realistic size. Track greens hit out of 9 and try to beat it next time.",
      "Nine tight targets, one ball each. This is your scoring round, log the number and chase it.",
    ]),
  },
  {
    name: "Worst-Ball",
    describe: s => pick(s, [
      "Hit two balls to a target and play the worse one again until you put a good one down.",
      "Two balls per target; replay the worse shot. Move on after one you're happy with.",
      "Worst-ball to each target, you only advance after the bad shot becomes a good one.",
      "Worst-ball, and you need two acceptable shots in a row before moving to the next target.",
    ]),
  },
  {
    name: "Imaginary Scorecard",
    describe: s => pick(s, [
      "Pick 6 targets and play each as a hole. Give yourself a fairway score and an approach score for each one.",
      "Play 6 holes in your head. Tee shot, then approach. Write down how many greens you hit.",
      "6-hole mini-round: full routine, tee shot then approach. Log your GIR and try to beat it next time.",
      "6 holes, full process. Keep a scorecard. Replay any hole you double-bogey. This is your real practice.",
    ]),
  },
  {
    name: "First-Ball Commit",
    describe: s => pick(s, [
      "No warm-up swings. Step up, one look, swing. The first ball is the only ball that matters on the course.",
      "One shot per club, no do-overs. Score each: in play or not. Move on either way.",
      "Step up cold to each shot. Full routine, one ball. Grade yourself honestly on commit level, not result.",
      "Cold-start each shot. No preview swings. The discipline is in the process, not the outcome.",
    ]),
  },
];

// ─── Test library ────────────────────────────────────────────────────────────

export const TEST_BY_GOAL: Record<Goal, ScoredTemplate[]> = {
  accuracy: [
    { name: "Fairway Finder Test", describe: s => `Final test: a ${pick(s, [28, 22, 16, 10])}-yard fairway. Count how many of 10 you keep in play, beat ${pick(s, [5, 6, 7, 8])}.` },
    { name: "Bullseye Test", describe: s => `Final test: pick the tightest target you trust. Hit 10 and count how many finish within ${pick(s, [15, 12, 8, 5])} yards. Log the number.` },
  ],
  consistency: [
    { name: "Strike Test", describe: s => `Final test: 10 stock shots. Count the flush, centered strikes, beat ${pick(s, [4, 5, 6, 7])}.` },
    { name: "Streak Test", describe: s => `Final test: how many acceptable shots in a row can you hit? Beat ${pick(s, [4, 5, 7, 9])}.` },
  ],
  distance: [
    { name: "Carry Test", describe: s => `Final test: how many of 10 carry within ${pick(s, [12, 9, 6, 4])} yards of your number? Beat ${pick(s, [5, 6, 7, 8])}.` },
    { name: "Ladder Test", describe: s => `Final test: 3 distances, 3 balls each. Score how many land within ${pick(s, [10, 8, 6, 4])} yards. Beat ${pick(s, [5, 6, 7, 8])}/9.` },
  ],
  "shot-shaping": [
    { name: "Shape Test", describe: s => `Final test: call your shape on each ball. Count how many of 10 curve as called, beat ${pick(s, [5, 6, 7, 8])}.` },
    { name: "Both-Ways Test", describe: s => `Final test: 5 draws, then 5 fades. Count how many do what you asked, beat ${pick(s, [5, 6, 7, 8])}/10.` },
  ],
};

// ─── Warm-up library ─────────────────────────────────────────────────────────

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
    description: "Grab a wedge. Half swings only, focus on tempo and clean contact. This is not practice, it's just getting loose.",
    count: 10,
    unit: "balls",
  },
  {
    name: "Quarter to Three-Quarter",
    description: "Mid iron. Build from quarter to three-quarter swings at the same tempo. Feel the swing, don't force it.",
    count: 10,
    unit: "balls",
  },
  {
    name: "Stock Short Iron",
    description: "Pick a short iron from your bag. Smooth, stock swings to a target. Find your rhythm.",
    count: 8,
    unit: "balls",
  },
  {
    name: "Stock Mid Iron",
    description: "Full but smooth swings. Lock in your stock shot, this is your baseline for the rest of the session.",
    count: 8,
    unit: "balls",
  },
];

const WARM_UP_COUNT_BY_PRESET: Record<WarmUpPreset, number> = {
  quick:    3,
  standard: 4,
  full:     5,
};

// ─── Session generation ──────────────────────────────────────────────────────

// Minimal bag club shape (matches db.ts Club type loosely)
export interface BagClub {
  id: string;
  name: string;
  type: string;
  sortOrder?: number;
}

export interface GenerateInput {
  clubGroups: ClubGroup[];
  bucket: BucketSize;
  time: TimeAvailable;
  goal: Goal;               // primary goal (kept for back-compat)
  goals?: Goal[];           // 1-2 goals; falls back to [goal] when absent
  category?: PracticeCategory;   // new: primary category
  categories?: PracticeCategory[]; // new: 1-2 categories
  handicap?: number;
  level?: PlayerLevel;
  style?: PracticeStyle;
  customBalls?: number;
  customMinutes?: number;
  warmUpBalls?: number;
  bag?: BagClub[];          // user's actual clubs from Supabase
}

// Estimated minutes per block, used to cap block count by time
const MINUTES_PER_BLOCK = 3.5;

function sortClubsShortToLong(clubs: string[]): string[] {
  return [...clubs].sort((a, b) => {
    const ai = CLUB_ORDER.indexOf(a);
    const bi = CLUB_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

function resolveClubs(groups: ClubGroup[], bag?: BagClub[]): string[] {
  // When the user has a bag, filter from it
  if (bag && bag.length > 0) {
    if (groups.includes("full-bag")) {
      return bag
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map(c => c.name);
    }
    const targetGroups = new Set(groups);
    const matched = bag.filter(b => {
      const canonical = canonicalById(b.id);
      if (!canonical) return false;
      return targetGroups.has(canonical.group);
    });
    if (matched.length > 0) {
      return matched
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map(c => c.name);
    }
  }

  // Fallback: hardcoded lists
  if (groups.includes("full-bag")) {
    return [...CLUBS_BY_GROUP["full-bag"]];
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

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function clubToGroup(club: string): ClubGroup | null {
  for (const [group, clubs] of Object.entries(CLUBS_BY_GROUP) as [ClubGroup, string[]][]) {
    if (group === "full-bag") continue;
    if (clubs.includes(club)) return group;
  }
  const canonical = canonicalByName(club);
  if (canonical) return canonical.group;
  return null;
}

const UNLIMITED_COUNTS: Record<ContentType, number> = {
  warmup: 10, drill: 15, focus: 20, transfer: 20, challenge: 10, test: 10,
};

function ballsToBlocks(balls: number, target: number, max: number): number {
  if (balls <= 0) return 0;
  return Math.min(max, Math.max(1, Math.round(balls / target)));
}

function pickSpread(clubs: string[], n: number): string[] {
  if (n <= 0 || clubs.length === 0) return [];
  if (n >= clubs.length) return Array.from({ length: n }, (_, i) => clubs[i % clubs.length]);
  return Array.from({ length: n }, (_, i) =>
    clubs[Math.round((i * (clubs.length - 1)) / (n - 1 || 1))],
  );
}

// Filter drills by practice style when the drill has a style restriction
function filterByStyle<T extends { styles?: PracticeStyle[] }>(templates: T[], style: PracticeStyle): T[] {
  const filtered = templates.filter(t => !t.styles || t.styles.includes(style));
  return filtered.length > 0 ? filtered : templates;
}

export function generateSession(input: GenerateInput): SessionDrill[] {
  // Resolve categories to goals
  const categories = input.categories?.length
    ? input.categories
    : input.category
    ? [input.category]
    : null;

  let goals: Goal[];
  let phaseOverrides: Partial<{ skill: number; transfer: number; challenge: number }> | undefined;
  let drillShareOverride: number | undefined;
  let clubGroupOverride: ClubGroup[] | undefined;

  if (categories) {
    const primaryRoute = CATEGORY_ROUTES[categories[0]];
    goals = categories.length > 1
      ? [...new Set([...primaryRoute.goals, ...CATEGORY_ROUTES[categories[1]].goals])].slice(0, 4)
      : primaryRoute.goals;
    phaseOverrides = primaryRoute.phaseOverrides;
    drillShareOverride = primaryRoute.drillShareOverride;
    clubGroupOverride = primaryRoute.clubConstraint;

    // For "random" category, shuffle goals so each session feels different
    if (categories[0] === "random") goals = shuffle(goals);
  } else {
    goals = (input.goals && input.goals.length ? input.goals : [input.goal]).slice(0, 2);
  }

  const style = input.style ?? deriveStyle(input.handicap, input.level);
  const profile = STYLE_PROFILES[style];

  const effectiveGroups = clubGroupOverride ?? input.clubGroups;
  const clubs = resolveClubs(effectiveGroups, input.bag);
  if (clubs.length === 0) return [];

  const isUnlimited = input.bucket === "unlimited";
  const rawBalls = isUnlimited
    ? 0
    : (input.customBalls ?? BUCKET_SIZES.find((b) => b.value === input.bucket)!.balls);
  const T = isUnlimited ? 0 : Math.max(0, rawBalls - (input.warmUpBalls ?? 0));

  // Time-based block cap: don't generate more blocks than fit in the available time
  const availableMinutes = input.customMinutes ?? input.time;
  const warmUpMinutes = input.warmUpBalls ? Math.ceil(input.warmUpBalls / 3) : 0;
  const practiceMinutes = Math.max(5, availableMinutes - warmUpMinutes);
  const maxBlocksByTime = Math.max(2, Math.floor(practiceMinutes / MINUTES_PER_BLOCK));

  // Apply phase overrides from category routing
  const phases = phaseOverrides
    ? { ...profile.phases, ...phaseOverrides }
    : profile.phases;
  const effectiveDrillShare = drillShareOverride ?? profile.drillShareOfSkill;

  // Pre-shuffle each library per goal, filtered by style
  const drillPools = new Map<Goal, DrillTemplate[]>();
  const focusPools = new Map<Goal, FocusTemplate[]>();
  const challengePools = new Map<Goal, ScoredTemplate[]>();
  for (const g of goals) {
    drillPools.set(g, shuffle(filterByStyle(DRILLS_BY_GOAL[g], style)));
    focusPools.set(g, shuffle(FOCUS_BY_GOAL[g]));
    challengePools.set(g, shuffle(CHALLENGE_BY_GOAL[g]));
  }
  const transferPool = shuffle(TRANSFER_TEMPLATES);

  // Phase ball budgets
  let skillBalls = 0, transferBalls = 0, challengeBalls = 0, testBalls = 0;
  if (!isUnlimited) {
    skillBalls     = Math.round(T * phases.skill);
    transferBalls  = Math.round(T * phases.transfer);
    challengeBalls = Math.round(T * phases.challenge);
    if (skillBalls < 5)     skillBalls = 0;
    if (transferBalls < 5)  transferBalls = 0;
    if (challengeBalls < 5) challengeBalls = 0;
    testBalls = Math.max(0, T - skillBalls - transferBalls - challengeBalls);
  }

  const drillBalls = Math.round(skillBalls * effectiveDrillShare);
  const focusBalls = skillBalls - drillBalls;

  // Block counts, capped by time
  let drillN: number, focusN: number, transferN: number, challengeN: number, testN: number;
  if (isUnlimited) {
    drillN     = effectiveDrillShare >= 0.5 ? 2 : 1;
    focusN     = 1;
    transferN  = 1;
    challengeN = style === "performance" || style === "elite" ? 2 : 1;
    testN      = 1;
  } else {
    drillN     = ballsToBlocks(drillBalls, 12, 3);
    focusN     = ballsToBlocks(focusBalls, 14, 2);
    transferN  = ballsToBlocks(transferBalls, 16, 2);
    challengeN = ballsToBlocks(challengeBalls, 10, 2);
    testN      = testBalls > 0 ? 1 : 0;
  }

  // Apply time cap: trim blocks from the middle phases first if we exceed
  let totalBlocks = drillN + focusN + transferN + challengeN + testN;
  while (totalBlocks > maxBlocksByTime && totalBlocks > 2) {
    if (focusN > 1)          { focusN--;     totalBlocks--; continue; }
    if (transferN > 1)       { transferN--;  totalBlocks--; continue; }
    if (drillN > 1)          { drillN--;     totalBlocks--; continue; }
    if (challengeN > 1)      { challengeN--; totalBlocks--; continue; }
    if (focusN > 0)          { focusN--;     totalBlocks--; continue; }
    if (transferN > 0)       { transferN--;  totalBlocks--; continue; }
    break;
  }

  // Build block plan
  type Plan = { type: ContentType; phase: SessionPhase };
  const plan: Plan[] = [];
  for (let i = 0; i < Math.max(drillN, focusN); i++) {
    if (i < drillN) plan.push({ type: "drill", phase: "Skill" });
    if (i < focusN) plan.push({ type: "focus", phase: "Skill" });
  }
  for (let i = 0; i < transferN; i++)  plan.push({ type: "transfer",  phase: "Transfer" });
  for (let i = 0; i < challengeN; i++) plan.push({ type: "challenge", phase: "Challenge" });
  for (let i = 0; i < testN; i++)      plan.push({ type: "test",      phase: "Test" });
  if (plan.length === 0) return [];

  // Ball distribution
  const counts = (n: number, balls: number): number[] =>
    n > 0 ? (isUnlimited ? Array(n).fill(0) : allocateExact(balls, Array(n).fill(1), 5)) : [];
  const drillCounts     = counts(drillN, drillBalls);
  const focusCounts     = counts(focusN, focusBalls);
  const transferCounts  = counts(transferN, transferBalls);
  const challengeCounts = counts(challengeN, challengeBalls);
  const testCounts      = counts(testN, testBalls);

  const skillClubs = pickSpread(clubs, drillN + focusN);

  // Assemble
  const used = new Map<string, number>();
  const draw = (goal: Goal, type: ContentType): number => {
    const key = `${goal}|${type}`;
    const k = used.get(key) ?? 0;
    used.set(key, k + 1);
    return k;
  };
  const ballsFor = (type: ContentType, perPhase: number[], idx: number): number =>
    isUnlimited ? UNLIMITED_COUNTS[type] : (perPhase[idx] ?? 0);

  let di = 0, fi = 0, ti = 0, ci = 0, sci = 0;
  const bag = input.bag ?? [];
  const result: SessionDrill[] = [];

  plan.forEach((p, idx) => {
    const goal = goals[idx % goals.length];
    const id = `${p.type}-${idx}`;

    if (p.type === "drill") {
      const pool = drillPools.get(goal)!;
      const drill = pool[draw(goal, "drill") % pool.length];
      let club = skillClubs[sci++] ?? clubs[0];
      club = substituteClub(club, bag);
      const group = clubToGroup(club);
      const description = (group && drill.clubDescriptions?.[group]) ?? drill.description;
      result.push({ id: `${id}-${drill.name}`, club, drillName: drill.name, description,
        balls: ballsFor("drill", drillCounts, di++), unit: "balls", isTarget: isUnlimited,
        type: "drill", phase: "Skill" });

    } else if (p.type === "focus") {
      const pool = focusPools.get(goal)!;
      const f = pool[draw(goal, "focus") % pool.length];
      let club = skillClubs[sci++] ?? clubs[0];
      club = substituteClub(club, bag);
      result.push({ id: `${id}-${f.name}`, club, drillName: `Focus: ${f.name}`, description: f.description,
        balls: ballsFor("focus", focusCounts, fi++), unit: "balls", isTarget: isUnlimited,
        type: "focus", phase: "Skill" });

    } else if (p.type === "transfer") {
      const t = transferPool[ti % transferPool.length];
      result.push({ id: `${id}-${t.name}`, club: "Mixed", drillName: t.name, description: t.describe(style),
        balls: ballsFor("transfer", transferCounts, ti++), unit: "balls", isTarget: isUnlimited,
        type: "transfer", phase: "Transfer" });

    } else if (p.type === "challenge") {
      const pool = challengePools.get(goal)!;
      const c = pool[draw(goal, "challenge") % pool.length];
      result.push({ id: `${id}-${c.name}`, club: "Mixed", drillName: c.name, description: c.describe(style),
        balls: ballsFor("challenge", challengeCounts, ci++), unit: "balls", isTarget: isUnlimited,
        type: "challenge", phase: "Challenge" });

    } else {
      const pool = TEST_BY_GOAL[goal];
      const t = pool[draw(goal, "test") % pool.length];
      result.push({ id: `${id}-${t.name}`, club: "Mixed", drillName: t.name, description: t.describe(style),
        balls: ballsFor("test", testCounts, 0), unit: "balls", isTarget: isUnlimited,
        type: "test", phase: "Test" });
    }
  });

  return result;
}

// Distribute `total` integers across `weights.length` slots proportionally.
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
    type:     "warmup" as ContentType,
    phase:    "Warm Up" as SessionPhase,
  }));
}

export function warmUpBallCount(preset: WarmUpPreset): number {
  const count = WARM_UP_COUNT_BY_PRESET[preset];
  return WARM_UP_LIBRARY.slice(0, count)
    .filter((item) => item.unit === "balls")
    .reduce((sum, item) => sum + item.count, 0);
}
