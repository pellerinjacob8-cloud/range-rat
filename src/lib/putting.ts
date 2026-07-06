import type { SessionDrill, TimeAvailable } from "./drills";

export type PuttZone = "short" | "mid" | "lag";

export interface PuttZoneRange {
  zone: PuttZone;
  label: string;
  minFeet: number;
  maxFeet: number | null; // null = open-ended (lag)
}

// Shipped defaults, confirmed with Jacob 2026-07-06.
export const PUTT_ZONES: PuttZoneRange[] = [
  { zone: "short", label: "Short Putts",     minFeet: 3,  maxFeet: 5    },
  { zone: "mid",   label: "Mid-Range Putts", minFeet: 5,  maxFeet: 15   },
  { zone: "lag",   label: "Lag Putts",       minFeet: 15, maxFeet: null },
];

// Progression order for a session. Change this one line to flip direction.
export const ZONE_ORDER: PuttZone[] = ["short", "mid", "lag"];

// Same block-length assumption as the range generator (drills.ts), since a
// putting rep + walk-and-retrieve takes roughly the same time.
const MINUTES_PER_BLOCK = 3.5;

const ZONE_CUES: Record<PuttZone, string[]> = {
  short: [
    "Same hole, same distance. Focus on a repeatable stroke.",
    "Pick a line and commit before every putt.",
    "Square the putter face at address, hold your finish.",
  ],
  mid: [
    "Read the line, commit, roll it.",
    "Pick your entry point on the cup before every putt.",
    "Focus on start line first, speed second.",
  ],
  lag: [
    "Putt to different holes. Focus on leaving it inside 3 feet.",
    "Speed control only, don't worry about the line.",
    "Match your practice swing feel to the actual putt.",
  ],
};

function zoneLabel(range: PuttZoneRange): string {
  return range.maxFeet === null
    ? `${range.label} — ${range.minFeet}+ ft`
    : `${range.label} — ${range.minFeet}-${range.maxFeet} ft`;
}

function pickSpread<T>(items: T[], n: number): T[] {
  if (n <= 0 || items.length === 0) return [];
  if (n >= items.length) return Array.from({ length: n }, (_, i) => items[i % items.length]);
  return Array.from({ length: n }, (_, i) =>
    items[Math.round((i * (items.length - 1)) / (n - 1 || 1))],
  );
}

// An open-ended session starts with this many sets per selected zone. Guided
// mode loops through them endlessly; list mode can append more rounds.
export const UNLIMITED_SETS_PER_ZONE = 3;

export interface PuttingGenerateInput {
  zones: PuttZone[]; // 1-3, any combination
  zoneRanges?: Partial<Record<PuttZone, { minFeet: number; maxFeet: number | null }>>;
  ballCount: number; // fixed balls the user owns for this session, e.g. 3, 6, 9
  time: TimeAvailable | "unlimited";
}

function resolveRanges(input: PuttingGenerateInput): PuttZoneRange[] {
  const zones = ZONE_ORDER.filter((z) => input.zones.includes(z));
  return zones.map((zone) => {
    const base = PUTT_ZONES.find((z) => z.zone === zone)!;
    const override = input.zoneRanges?.[zone];
    return override ? { ...base, ...override } : base;
  });
}

function buildBlock(range: PuttZoneRange, index: number, ballCount: number): SessionDrill {
  const cues = ZONE_CUES[range.zone];
  return {
    id: `putt-${index}-${range.zone}`,
    club: zoneLabel(range),
    drillName: range.label,
    description: cues[index % cues.length],
    balls: ballCount,
    unit: "balls",
    type: "drill",
    phase: "Skill",
  };
}

export function generatePuttingSession(input: PuttingGenerateInput): SessionDrill[] {
  const ranges = resolveRanges(input);
  if (ranges.length === 0 || input.ballCount <= 0) return [];

  const totalBlocks = input.time === "unlimited"
    ? ranges.length * UNLIMITED_SETS_PER_ZONE
    : Math.max(1, Math.round(input.time / MINUTES_PER_BLOCK));
  const blockZones = pickSpread(ranges, totalBlocks);

  return blockZones.map((range, i) => buildBlock(range, i, input.ballCount));
}

// One more round for an open-ended session: a single extra set per selected
// zone, with ids continuing past the existing block count so nothing collides.
export function extendPuttingSession(
  input: PuttingGenerateInput,
  existingCount: number,
): SessionDrill[] {
  const ranges = resolveRanges(input);
  if (ranges.length === 0 || input.ballCount <= 0) return [];
  return ranges.map((range, i) => buildBlock(range, existingCount + i, input.ballCount));
}
