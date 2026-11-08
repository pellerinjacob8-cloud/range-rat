import { CANONICAL_CLUBS, type CanonicalClub, type SessionDrill } from "./drills";
import { phaseOf } from "./phases";

// Range practice plan: a short, fixed list of blocks built from how a real
// golfer practices. Each block is one club, a ball count, and one short cue.
// Extra coaching lives in `detail` and only shows behind the Tip button.

export type PlanLevel = "learning" | "experienced";
export type PlanLength = "quick" | "full";
export type AddOn = "control" | "tee-shots";

// What a Pro "Built for you" session leans into, picked from the last round.
export type PlanFocus = "tee-shots" | "approach" | "short-game" | "putting";

// Session plans. Standard is free; the rest are Pro.
export type PlanKind = "standard" | "scoring" | "striking" | "pre-round" | "play-holes";

// Areas a session covers, saved with each finished session so Pro can spot
// what a golfer has been skipping.
export type PracticeAreaKey = "wedges" | "irons" | "control" | "tee-shots" | "holes";

export interface PracticeBlock {
  id: string;
  section: string;
  club: string;
  balls: number;
  unit: string;      // "balls" for normal blocks; legacy saved items may use "min"
  cue: string;
  detail?: string;
  forYou?: boolean;  // added or boosted by Built for you or practice balance
  area?: PracticeAreaKey;
}

export interface PlanOptions {
  length: PlanLength;
  addOns: AddOn[];
  level: PlanLevel;
  focus?: PlanFocus | null;
  plan?: PlanKind;            // defaults to standard
  balance?: AddOn | null;     // Pro practice balance: add-on pulled in because it's been skipped
}

export const PLANS: { value: PlanKind; label: string; blurb: string; pro: boolean }[] = [
  { value: "standard",   label: "Standard",      blurb: "Warm-up, wedges, and irons.",                    pro: false },
  { value: "scoring",    label: "Scoring day",   blurb: "Wedges and short irons, where strokes are saved.", pro: true },
  { value: "striking",   label: "Ball striking", blurb: "Irons through driver, solid contact.",           pro: true },
  { value: "pre-round",  label: "Pre-round",     blurb: "A quick warm-up before you tee off.",            pro: true },
  { value: "play-holes", label: "Play holes",    blurb: "One ball per shot, like the course.",             pro: true },
];

// Which templates each Pro plan uses, in session order, with ball overrides.
const PLAN_BLOCKS: Record<Exclude<PlanKind, "standard">, { ids: string[]; balls?: Record<string, number> }> = {
  "scoring": {
    ids: ["warm-1", "warm-2", "warm-3", "chip-30", "dist-1", "dist-2", "wedge-ladder", "iron-1", "iron-approach"],
  },
  "striking": {
    ids: ["warm-1", "warm-2", "warm-3", "iron-1", "control-1", "control-2", "iron-2", "tee-1", "tee-2"],
  },
  "pre-round": {
    ids: ["warm-1", "warm-3", "dist-1", "iron-1", "iron-2", "tee-2"],
    balls: { "dist-1": 5, "iron-1": 5, "iron-2": 5, "tee-2": 5 },
  },
  "play-holes": {
    ids: ["warm-1", "warm-2", "warm-3", "dist-1", "h1-tee", "h1-approach", "h1-wedge", "h2-tee", "h2-approach", "h2-wedge", "h3-tee", "h3-wedge"],
  },
};

export interface BagClubLike {
  id: string;
  name: string;
}

export interface SwingYards {
  halfSwing: number | null;
  threeQuarterSwing: number | null;
  fullSwing: number | null;
}

// ─── Club resolution ─────────────────────────────────────────────────────────

type Slot = "wedge" | "short-wedge" | "full-wedge" | "short-iron" | "long-iron" | "driving-iron" | "driver";

// Canonical club ids, best match first. Learning golfers get hybrids before
// long irons for tee shots since they are easier to hit.
const SLOT_PREFS: Record<Slot, { learning: string[]; experienced: string[] }> = {
  "wedge":        { learning: ["pw", "gw", "sw", "lw"], experienced: ["pw", "gw", "sw", "lw"] },
  "short-wedge":  { learning: ["sw", "gw", "lw", "pw"], experienced: ["sw", "gw", "lw", "pw"] },
  "full-wedge":   { learning: ["pw", "gw", "sw"],       experienced: ["pw", "gw", "sw"] },
  "short-iron":   { learning: ["8i", "9i", "7i", "pw"], experienced: ["8i", "9i", "7i", "pw"] },
  "long-iron":    { learning: ["6i", "7i", "5h", "5i", "4h"], experienced: ["6i", "5i", "7i", "5h", "4i", "4h"] },
  "driving-iron": { learning: ["3h", "4h", "5h", "5w", "4i", "3i"], experienced: ["2i", "3i", "4i", "3h", "4h", "5w"] },
  "driver":       { learning: ["driver", "3w", "5w"],  experienced: ["driver", "3w", "5w"] },
};

// Used when the user has no saved bag yet.
const DEFAULT_CLUB: Record<Slot, string> = {
  "wedge": "Pitching Wedge",
  "short-wedge": "Sand Wedge",
  "full-wedge": "Pitching Wedge",
  "short-iron": "8 Iron",
  "long-iron": "6 Iron",
  "driving-iron": "3 Hybrid",
  "driver": "Driver",
};

function canonicalFor(club: BagClubLike): CanonicalClub | undefined {
  return CANONICAL_CLUBS.find((c) => c.id === club.id) ?? CANONICAL_CLUBS.find((c) => c.name === club.name);
}

interface ResolvedClub { name: string; id: string | null }

function resolveSlot(slot: Slot, level: PlanLevel, bag: BagClubLike[], avoid: Set<string>): ResolvedClub | null {
  if (bag.length === 0) return { name: DEFAULT_CLUB[slot], id: null };
  const byCanon = new Map<string, BagClubLike>();
  for (const b of bag) {
    const c = canonicalFor(b);
    if (c && !byCanon.has(c.id)) byCanon.set(c.id, b);
  }
  for (const id of SLOT_PREFS[slot][level]) {
    const hit = byCanon.get(id);
    if (hit && !avoid.has(hit.name)) return { name: hit.name, id: hit.id };
  }
  return null;
}

// ─── Block templates ─────────────────────────────────────────────────────────

// "plan": only used by a Pro plan, never by Standard.
type Include = "always" | "full" | "focus" | "plan" | AddOn;

interface Template {
  id: string;
  section: string;
  area: PracticeAreaKey;
  slot: Slot | { same: string };
  avoidSameAs?: string[];
  balls: number;
  include: Include;
  cue: Record<PlanLevel, string>;
  detail: Record<PlanLevel, string>;
}

const HOLE_TIP = {
  learning: "One ball, then move on, just like the course. No do-overs.",
  experienced: "One ball per shot, no mulligans. Full routine every time, then play the next shot from wherever it went.",
};

// {half}, {three} and {full} are replaced with the golfer's saved wedge yardages.
const TEMPLATES: Template[] = [
  {
    id: "warm-1", section: "Warm-up", area: "wedges", slot: "wedge", balls: 3, include: "always",
    cue: { learning: "Half swings, just make contact", experienced: "50% swings, loosen up" },
    detail: {
      learning: "Hands go back to about hip height. Don't worry where it goes, just brush the grass.",
      experienced: "No target yet. Feel the club and find clean contact.",
    },
  },
  {
    id: "warm-2", section: "Warm-up", area: "wedges", slot: { same: "warm-1" }, balls: 3, include: "always",
    cue: { learning: "A little bigger swing", experienced: "75% swings" },
    detail: {
      learning: "Hands go back to about shoulder height. Same easy rhythm.",
      experienced: "Same tempo as before, just a longer swing.",
    },
  },
  {
    id: "warm-3", section: "Warm-up", area: "wedges", slot: { same: "warm-1" }, balls: 3, include: "always",
    cue: { learning: "Full swing, stay smooth", experienced: "90% swings" },
    detail: {
      learning: "A full swing doesn't mean a hard swing. Finish facing the target.",
      experienced: "Almost full. Keep it smooth enough to hold your finish.",
    },
  },
  {
    id: "chip-30", section: "Short game", area: "wedges", slot: "short-wedge", balls: 6, include: "plan",
    cue: { learning: "Land it near a close target", experienced: "Carry it 30 yards" },
    detail: {
      learning: "Small swing, like a long putt with a wedge. Pick a spot close by and land it there.",
      experienced: "Pick a landing spot at 30 yards. Short backswing, keep the finish the same length.",
    },
  },
  {
    id: "dist-1", section: "Distance control", area: "wedges", slot: "short-wedge", balls: 6, include: "always",
    cue: { learning: "Land it near the closest flag", experienced: "Carry it {half} yards" },
    detail: {
      learning: "Pick the nearest flag on the range. Try a few swing sizes until one lands close.",
      experienced: "Pick a flag at {half} yards. Same swing length every ball, change nothing but the feel.",
    },
  },
  {
    id: "dist-2", section: "Distance control", area: "wedges", slot: "full-wedge", balls: 6, include: "full",
    cue: { learning: "Land it near a farther flag", experienced: "Carry it {full} yards" },
    detail: {
      learning: "Pick a flag a bit farther out. A smooth full swing is enough.",
      experienced: "Pick a flag at {full} yards. Note where your misses land: short, long, or on line.",
    },
  },
  {
    id: "wedge-ladder", section: "Distance control", area: "wedges", slot: { same: "dist-2" }, balls: 9, include: "plan",
    cue: { learning: "Close flag, middle flag, far flag", experienced: "3 at {half}, 3 at {three}, 3 at {full}" },
    detail: {
      learning: "Three balls to each flag, nearest first. Change the size of your swing, not how hard you swing.",
      experienced: "Half, three-quarter, and full swings with the same club. Same tempo on every one.",
    },
  },
  {
    id: "iron-1", section: "Irons", area: "irons", slot: "short-iron", balls: 10, include: "always",
    cue: { learning: "Pick one flag, aim every ball at it", experienced: "Pick a target, commit to it" },
    detail: {
      learning: "Stand behind the ball and pick your flag before every shot. Aim the clubface first, then your feet.",
      experienced: "Pick a specific spot, not just a direction. Step away and reset if you don't feel committed.",
    },
  },
  {
    id: "iron-approach", section: "Irons", area: "irons", slot: { same: "iron-1" }, balls: 6, include: "focus",
    cue: { learning: "New flag every ball", experienced: "New target every ball, full routine" },
    detail: {
      learning: "On the course you never hit the same shot twice. Switching targets trains your aim.",
      experienced: "Play each ball like an approach shot. Pick the target, picture it, then go.",
    },
  },
  {
    id: "control-1", section: "Control", area: "control", slot: { same: "iron-1" }, balls: 9, include: "control",
    cue: { learning: "New target every ball", experienced: "3 draws, 3 cuts, 3 straight" },
    detail: {
      learning: "Aim at a different flag on each ball. Line up the clubface first, then your feet.",
      experienced: "A draw curves toward your lead side, a cut toward your trail side. Start with the straight ones if it gets messy.",
    },
  },
  {
    id: "control-2", section: "Control", area: "control", slot: { same: "iron-1" }, balls: 6, include: "control",
    cue: { learning: "Hold your finish until it lands", experienced: "3 low, 3 high" },
    detail: {
      learning: "Finish with your belt buckle facing the target and stay there. Balance makes contact better.",
      experienced: "Low: ball back in your stance, shorter finish. High: ball forward, full finish.",
    },
  },
  {
    id: "iron-2", section: "Irons", area: "irons", slot: "long-iron", avoidSameAs: ["iron-1"], balls: 10, include: "always",
    cue: { learning: "Tee it low, sweep it off", experienced: "Pick a target, commit to it" },
    detail: {
      learning: "A low tee makes longer clubs easier. Sweep the ball off the tee, no need to hit down hard.",
      experienced: "Same routine as your short iron. Longer clubs show misses more, so stay committed.",
    },
  },
  {
    id: "tee-1", section: "Tee shots", area: "tee-shots", slot: "driving-iron", avoidSameAs: ["iron-2"], balls: 6, include: "tee-shots",
    cue: { learning: "Aim between two flags", experienced: "Pick a fairway, full routine" },
    detail: {
      learning: "Pretend two flags are the edges of a fairway. Anything between them is a good shot.",
      experienced: "Pre-shot routine: stand behind the ball, pick a line, one practice swing, step in, go.",
    },
  },
  {
    id: "tee-2", section: "Tee shots", area: "tee-shots", slot: "driver", avoidSameAs: ["tee-1"], balls: 6, include: "tee-shots",
    cue: { learning: "Tee it high, smooth swing", experienced: "Pick a fairway, full routine" },
    detail: {
      learning: "Half the ball above the top of the driver. Swing smooth, speed comes later.",
      experienced: "Every ball is a first tee shot. Full routine, pick the fairway, commit.",
    },
  },
  // ── Play holes: one ball per shot, like the course ──
  {
    id: "h1-tee", section: "Play holes", area: "holes", slot: { same: "tee-2" }, balls: 1, include: "plan",
    cue: { learning: "Hole 1: hit it between two flags", experienced: "Hole 1: pick a fairway, full routine" },
    detail: { learning: HOLE_TIP.learning, experienced: HOLE_TIP.experienced },
  },
  {
    id: "h1-approach", section: "Play holes", area: "holes", slot: { same: "iron-1" }, balls: 1, include: "plan",
    cue: { learning: "Hole 1: aim at the nearest green", experienced: "Hole 1: approach, pick your target" },
    detail: { learning: HOLE_TIP.learning, experienced: HOLE_TIP.experienced },
  },
  {
    id: "h1-wedge", section: "Play holes", area: "holes", slot: { same: "dist-1" }, balls: 1, include: "plan",
    cue: { learning: "Hole 1: land it near a flag", experienced: "Hole 1: get it close" },
    detail: { learning: HOLE_TIP.learning, experienced: HOLE_TIP.experienced },
  },
  {
    id: "h2-tee", section: "Play holes", area: "holes", slot: { same: "tee-2" }, balls: 1, include: "plan",
    cue: { learning: "Hole 2: pick new flags for your fairway", experienced: "Hole 2: new fairway, full routine" },
    detail: { learning: HOLE_TIP.learning, experienced: HOLE_TIP.experienced },
  },
  {
    id: "h2-approach", section: "Play holes", area: "holes", slot: { same: "iron-2" }, balls: 1, include: "plan",
    cue: { learning: "Hole 2: aim at a far green", experienced: "Hole 2: long approach, pick your target" },
    detail: { learning: HOLE_TIP.learning, experienced: HOLE_TIP.experienced },
  },
  {
    id: "h2-wedge", section: "Play holes", area: "holes", slot: { same: "dist-1" }, balls: 1, include: "plan",
    cue: { learning: "Hole 2: land it near a flag", experienced: "Hole 2: get it close" },
    detail: { learning: HOLE_TIP.learning, experienced: HOLE_TIP.experienced },
  },
  {
    id: "h3-tee", section: "Play holes", area: "holes", slot: { same: "iron-1" }, balls: 1, include: "plan",
    cue: { learning: "Hole 3: short hole, aim at a flag", experienced: "Hole 3: par 3, pick a flag, full routine" },
    detail: { learning: HOLE_TIP.learning, experienced: HOLE_TIP.experienced },
  },
  {
    id: "h3-wedge", section: "Play holes", area: "holes", slot: { same: "dist-1" }, balls: 1, include: "plan",
    cue: { learning: "Hole 3: land it near a flag", experienced: "Hole 3: get it close" },
    detail: { learning: HOLE_TIP.learning, experienced: HOLE_TIP.experienced },
  },
];

// Which blocks a focus pulls in, and how many extra balls they get.
const FOCUS_BOOST: Record<Exclude<PlanFocus, "putting">, { ids: string[]; extra: number }> = {
  "tee-shots":  { ids: ["tee-1", "tee-2"], extra: 3 },
  "approach":   { ids: ["iron-approach"], extra: 0 },
  "short-game": { ids: ["dist-1", "dist-2"], extra: 3 },
};

function fill(text: string, yards: { half: number; three: number; full: number }): string {
  return text
    .replace(/\{half\}/g, String(yards.half))
    .replace(/\{three\}/g, String(yards.three))
    .replace(/\{full\}/g, String(yards.full));
}

const roundTo5 = (n: number) => Math.round(n / 5) * 5;

export function buildPlan(
  opts: PlanOptions,
  bag: BagClubLike[],
  yardages: Record<string, SwingYards> = {},
): PracticeBlock[] {
  const planKind = opts.plan ?? "standard";
  const proPlan = planKind === "standard" ? null : PLAN_BLOCKS[planKind];
  // Built for you and practice balance shape the Standard plan only; Pro
  // plans are fixed so they stay predictable.
  const boost = !proPlan && opts.focus && opts.focus !== "putting" ? FOCUS_BOOST[opts.focus] : null;
  const balance = !proPlan && opts.length === "quick" && opts.balance && !opts.addOns.includes(opts.balance) ? opts.balance : null;
  const picked = new Map<string, ResolvedClub>();
  const byId = new Map<string, PracticeBlock>();

  for (const t of TEMPLATES) {
    const boosted = !!boost && boost.ids.includes(t.id);
    const balanced = !!balance && t.include === balance;
    const included = proPlan
      ? proPlan.ids.includes(t.id)
      : t.include === "always" ||
        (t.include === "full" && opts.length === "full") ||
        ((t.include === "control" || t.include === "tee-shots") &&
          (opts.addOns.includes(t.include) || opts.length === "full")) ||
        boosted ||
        balanced;

    // Resolve the club even for skipped blocks so "same club" references work.
    let club: ResolvedClub | null;
    if (typeof t.slot === "object") {
      club = picked.get(t.slot.same) ?? null;
    } else {
      const avoid = new Set((t.avoidSameAs ?? []).map((id) => picked.get(id)?.name).filter(Boolean) as string[]);
      club = resolveSlot(t.slot, opts.level, bag, avoid);
    }
    if (club) picked.set(t.id, club);
    if (!included || !club) continue;

    // Wedge targets come from the golfer's saved yardages for that club.
    const y = club.id ? yardages[club.id] : undefined;
    const half = y?.halfSwing ? roundTo5(y.halfSwing) : 50;
    const three = y?.threeQuarterSwing ? roundTo5(y.threeQuarterSwing) : 70;
    const full = y?.fullSwing ? roundTo5(y.fullSwing) : 90;

    byId.set(t.id, {
      id: t.id,
      section: t.section,
      area: t.area,
      club: club.name,
      balls: proPlan?.balls?.[t.id] ?? t.balls + (boosted ? boost!.extra : 0),
      unit: "balls",
      cue: fill(t.cue[opts.level], { half, three, full }),
      detail: fill(t.detail[opts.level], { half, three, full }),
      forYou: boosted || balanced || undefined,
    });
  }
  // Pro plans list their blocks in session order; Standard follows template order.
  if (proPlan) return proPlan.ids.map((id) => byId.get(id)).filter(Boolean) as PracticeBlock[];
  return Array.from(byId.values());
}

export function totalBalls(blocks: PracticeBlock[]): number {
  return blocks.filter((b) => b.unit === "balls").reduce((s, b) => s + b.balls, 0);
}

// About 50 seconds a ball at a relaxed range pace, rounded to 5 minutes.
export function estimateMinutes(blocks: PracticeBlock[]): number {
  return Math.max(10, roundTo5((totalBalls(blocks) * 50) / 60));
}

// ─── Built for you (Pro) ─────────────────────────────────────────────────────

export interface RoundStats {
  gir?: number;        // percent
  fairways?: number;   // percent
  putts?: number;      // per round
  upAndDowns?: number; // count
}

// Same thresholds as recommendGoal in drills.ts, but keeps which stat won so
// the session can target it and say why in plain words.
// `reason` is the Pro line; `stat` is the plain number used in the free prompt.
export function pickFocus(stats?: RoundStats): { focus: PlanFocus; reason: string; stat: string } | null {
  if (!stats) return null;
  const c: { focus: PlanFocus; severity: number; reason: string; stat: string }[] = [];
  if (stats.fairways !== undefined)
    c.push({ focus: "tee-shots", severity: 60 - stats.fairways, reason: `${stats.fairways}% of fairways last round. Extra tee shots today.`, stat: `You hit ${stats.fairways}% of fairways last round` });
  if (stats.gir !== undefined)
    c.push({ focus: "approach", severity: 65 - stats.gir, reason: `${stats.gir}% of greens last round. Extra approach shots today.`, stat: `You hit ${stats.gir}% of greens last round` });
  if (stats.putts !== undefined)
    c.push({ focus: "putting", severity: (stats.putts - 32) * 1.5, reason: `${stats.putts} putts last round. The putting green will help most today.`, stat: `You had ${stats.putts} putts last round` });
  if (stats.upAndDowns !== undefined && stats.gir !== undefined) {
    const missed = Math.round((1 - stats.gir / 100) * 18);
    if (missed > 0) {
      const made = Math.min(stats.upAndDowns, missed);
      const rate = Math.round((made / missed) * 100);
      c.push({ focus: "short-game", severity: (50 - rate) * 0.6, reason: `${made} of ${missed} up and downs last round. Extra wedge work today.`, stat: `You got up and down ${made} of ${missed} times last round` });
    }
  }
  const worst = c.filter((x) => x.severity > 0).sort((a, b) => b.severity - a.severity)[0];
  return worst ? { focus: worst.focus, reason: worst.reason, stat: worst.stat } : null;
}

// ─── Practice areas and balance (Pro) ────────────────────────────────────────

const SECTION_AREA: Record<string, PracticeAreaKey> = {
  "Warm-up": "wedges",
  "Short game": "wedges",
  "Distance control": "wedges",
  "Irons": "irons",
  "Control": "control",
  "Tee shots": "tee-shots",
  "Play holes": "holes",
};

function areaOfBlock(b: PracticeBlock): PracticeAreaKey | null {
  if (b.area) return b.area;
  if (SECTION_AREA[b.section]) return SECTION_AREA[b.section];
  const c = canonicalFor({ id: "", name: b.club });
  if (!c) return null;
  if (c.type === "wedge") return "wedges";
  if (c.type === "iron" || c.type === "hybrid") return "irons";
  return "tee-shots";
}

// Distinct areas covered by the blocks a golfer actually finished. A tee
// shot on a par 4 in Play holes counts as tee shot work too.
export function areasOf(blocks: PracticeBlock[]): PracticeAreaKey[] {
  const out = new Set<PracticeAreaKey>();
  for (const blk of blocks) {
    const a = areaOfBlock(blk);
    if (!a) continue;
    out.add(a);
    if (a === "holes" && (blk.id === "h1-tee" || blk.id === "h2-tee")) out.add("tee-shots");
  }
  return Array.from(out);
}

export interface TrackedSession {
  completedAt: string;
  practiceAreas?: string[];
}

const AREA_WORDS: Record<AddOn, string> = { "tee-shots": "tee shot", "control": "shot control" };
const NEGLECT_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

// The optional area (tee shots or control) a golfer has skipped longest.
// Needs at least 3 sessions recorded with areas, so new users aren't nagged.
export function pickNeglected(sessions: TrackedSession[], now = Date.now()): { addOn: AddOn; line: string } | null {
  const tracked = sessions
    .filter((s) => Array.isArray(s.practiceAreas))
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  if (tracked.length < 3) return null;
  const oldest = new Date(tracked[tracked.length - 1].completedAt).getTime();

  const candidates = (["tee-shots", "control"] as AddOn[]).map((addOn) => {
    const idx = tracked.findIndex((s) => s.practiceAreas!.includes(addOn));
    if (idx === -1) {
      return { addOn, never: true, days: Math.floor((now - oldest) / DAY_MS), line: `No ${AREA_WORDS[addOn]} work in your last ${tracked.length} sessions` };
    }
    const days = Math.floor((now - new Date(tracked[idx].completedAt).getTime()) / DAY_MS);
    return { addOn, never: false, days, line: `No ${AREA_WORDS[addOn]} work in ${days} days` };
  });
  const worst = candidates
    .filter((c) => c.never || c.days >= NEGLECT_DAYS)
    .sort((a, b) => b.days - a.days)[0];
  return worst ? { addOn: worst.addOn, line: worst.line } : null;
}

// ─── Saved session conversion ────────────────────────────────────────────────

// Blocks are stored in favorites as SessionDrill rows so the existing tables
// keep working: cue goes in drillName, the tip in description.
export function blocksToDrills(blocks: PracticeBlock[]): SessionDrill[] {
  return blocks.map((b) => ({
    id: b.id,
    club: b.club,
    drillName: b.cue,
    description: b.detail ?? "",
    balls: b.balls,
    unit: b.unit,
    type: "drill",
    section: b.section,
  }));
}

const LEGACY_SECTION: Record<string, string> = {
  "Warm Up": "Warm-up",
  "Skill": "Skill",
  "Transfer": "On course",
  "Challenge": "Challenge",
  "Test": "Test",
};

// Older generated favorites and Pro custom sessions run in the same block
// view. Their long descriptions move behind the Tip button.
export function drillsToBlocks(drills: SessionDrill[]): PracticeBlock[] {
  return drills.map((d) => {
    const club = !d.club || d.club === "Mixed" ? "Your choice" : d.club === "Warm Up" ? "Any club" : d.club;
    return {
      id: d.id,
      section: d.section ?? LEGACY_SECTION[phaseOf(d)] ?? "Practice",
      club,
      balls: d.balls,
      unit: d.unit ?? "balls",
      cue: d.drillName || "Hit to a target",
      detail: d.description || undefined,
    };
  });
}

// ─── Level ───────────────────────────────────────────────────────────────────

// Handicap 20+ (or "new"/"casual" self-rating) reads as learning.
export function levelFrom(handicap?: number, selfLevel?: string | null): PlanLevel {
  if (handicap !== undefined && !Number.isNaN(handicap)) return handicap >= 20 ? "learning" : "experienced";
  if (selfLevel === "new" || selfLevel === "casual") return "learning";
  if (selfLevel === "regular" || selfLevel === "competitive") return "experienced";
  return "learning";
}
