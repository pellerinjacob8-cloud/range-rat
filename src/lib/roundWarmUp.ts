import { CANONICAL_CLUBS, type BagClub } from "./drills";

export type RoundDuration = 15 | 30 | 45 | 60;

export type RoundSection =
  | "Stretch"
  | "Wedges"
  | "Short Irons"
  | "Mid Irons"
  | "Long Irons"
  | "Woods"
  | "Driver"
  | "Putting";

export interface RoundWarmUpItem {
  id: string;
  section: RoundSection;
  activity: string;
  amount: string;
  tip: string;
}

export const ROUND_DURATIONS: RoundDuration[] = [15, 30, 45, 60];

// Substitute a club name for the closest match in the user's bag.
// Returns the original name when no bag is provided or no match found.
function sub(clubName: string, bag?: BagClub[]): string {
  if (!bag || bag.length === 0) return clubName;
  const exact = bag.find(b => b.name === clubName);
  if (exact) return exact.name;

  const canonical = CANONICAL_CLUBS.find(c => c.name === clubName);
  if (!canonical) return clubName;

  const sameGroup = bag
    .map(b => ({ bag: b, canon: CANONICAL_CLUBS.find(c => c.id === b.id) }))
    .filter(x => x.canon && x.canon.group === canonical.group)
    .sort((a, b) =>
      Math.abs(a.canon!.sortOrder - canonical.sortOrder) -
      Math.abs(b.canon!.sortOrder - canonical.sortOrder)
    );
  return sameGroup[0]?.bag.name ?? clubName;
}

// Check if the user has any club in a given section's group.
// Used to skip sections the user can't hit (e.g. no woods in bag).
function hasSectionClub(section: RoundSection, bag?: BagClub[]): boolean {
  if (!bag || bag.length === 0) return true;
  const groupMap: Partial<Record<RoundSection, string[]>> = {
    "Wedges": ["wedge"],
    "Short Irons": ["iron"],
    "Mid Irons": ["iron"],
    "Long Irons": ["iron", "hybrid"],
    "Woods": ["wood", "hybrid"],
    "Driver": ["wood"],
  };
  const types = groupMap[section];
  if (!types) return true;
  if (section === "Driver") return bag.some(b => b.id === "driver");
  return bag.some(b => types.includes(b.type));
}

interface TemplateItem {
  section: RoundSection;
  activity: string;
  amount: string;
  tip: string;
}

const ITEMS_BY_DURATION: Record<RoundDuration, TemplateItem[]> = {
  15: [
    {
      section: "Stretch",
      activity: "Dynamic Stretch",
      amount: "2 min",
      tip: "Loosen shoulders, hips, and wrists. Keep it light.",
    },
    {
      section: "Wedges",
      activity: "Pitching Wedge",
      amount: "10 balls",
      tip: "Half swings, smooth tempo. Just feel the ball.",
    },
    {
      section: "Mid Irons",
      activity: "7 Iron",
      amount: "10 balls",
      tip: "Three-quarter swings, pick a target each shot.",
    },
    {
      section: "Driver",
      activity: "Driver",
      amount: "5 balls",
      tip: "80% effort. Find the fairway, not the fence.",
    },
  ],
  30: [
    {
      section: "Stretch",
      activity: "Dynamic Stretch",
      amount: "3 min",
      tip: "Add a few torso twists and arm circles.",
    },
    {
      section: "Wedges",
      activity: "Sand Wedge",
      amount: "10 balls",
      tip: "Easy half swings to wake up your hands.",
    },
    {
      section: "Short Irons",
      activity: "9 Iron",
      amount: "10 balls",
      tip: "Three-quarter swings. Focus on clean contact.",
    },
    {
      section: "Mid Irons",
      activity: "7 Iron",
      amount: "10 balls",
      tip: "Stock swing. Pick a target every ball.",
    },
    {
      section: "Driver",
      activity: "Driver",
      amount: "5 balls",
      tip: "Tee it high, swing within yourself.",
    },
    {
      section: "Putting",
      activity: "Lag Putts",
      amount: "5 min",
      tip: "30+ ft putts. Speed first, line second.",
    },
    {
      section: "Putting",
      activity: "Short Putts",
      amount: "5 min",
      tip: "Inside 4 ft. Build confidence, back of the cup.",
    },
  ],
  45: [
    {
      section: "Stretch",
      activity: "Dynamic Stretch",
      amount: "5 min",
      tip: "Full body. Add slow practice swings to finish.",
    },
    {
      section: "Wedges",
      activity: "Sand Wedge",
      amount: "10 balls",
      tip: "Land softly. Half and three-quarter swings.",
    },
    {
      section: "Short Irons",
      activity: "9 Iron",
      amount: "10 balls",
      tip: "Stock shot. Eyes on the back of the ball.",
    },
    {
      section: "Mid Irons",
      activity: "7 Iron",
      amount: "10 balls",
      tip: "Pick a 10-yard wide window, land it inside.",
    },
    {
      section: "Long Irons",
      activity: "5 Iron",
      amount: "8 balls",
      tip: "Sweep, don't dig. Smooth full swings.",
    },
    {
      section: "Woods",
      activity: "3 Wood",
      amount: "8 balls",
      tip: "Tee it low. Same tempo as your iron swing.",
    },
    {
      section: "Driver",
      activity: "Driver",
      amount: "6 balls",
      tip: "Pick a fairway target. Commit to the shape.",
    },
    {
      section: "Putting",
      activity: "Lag Putts",
      amount: "5 min",
      tip: "Focus on speed from 30+ ft.",
    },
    {
      section: "Putting",
      activity: "Mid Putts",
      amount: "5 min",
      tip: "10-20 ft. Read, then trust the line.",
    },
    {
      section: "Putting",
      activity: "Short Putts",
      amount: "5 min",
      tip: "Inside 4 ft. Walk off the green confident.",
    },
  ],
  60: [
    {
      section: "Stretch",
      activity: "Extended Stretch",
      amount: "8 min",
      tip: "Full mobility routine + slow rehearsal swings.",
    },
    {
      section: "Wedges",
      activity: "Sand Wedge, Soft",
      amount: "10 balls",
      tip: "30-50 yards. Land it like a feather.",
    },
    {
      section: "Wedges",
      activity: "Pitching Wedge, Stock",
      amount: "10 balls",
      tip: "Full but smooth. Lock in your stock yardage.",
    },
    {
      section: "Short Irons",
      activity: "9 Iron",
      amount: "10 balls",
      tip: "Pick a tight target. Commit to one shape.",
    },
    {
      section: "Mid Irons",
      activity: "7 Iron",
      amount: "10 balls",
      tip: "Hold your finish on every swing.",
    },
    {
      section: "Long Irons",
      activity: "5 Iron",
      amount: "8 balls",
      tip: "Ball forward, smooth tempo. Sweep through.",
    },
    {
      section: "Long Irons",
      activity: "Hybrid",
      amount: "8 balls",
      tip: "Hit it like a long iron, not a wood.",
    },
    {
      section: "Woods",
      activity: "3 Wood",
      amount: "8 balls",
      tip: "Tee it low off the deck. Stay smooth.",
    },
    {
      section: "Driver",
      activity: "Driver, Stock",
      amount: "6 balls",
      tip: "Tee high, athletic stance, easy speed.",
    },
    {
      section: "Driver",
      activity: "Driver, Committed",
      amount: "4 balls",
      tip: "Pick the shape you'll start with on #1.",
    },
    {
      section: "Putting",
      activity: "Lag Putts",
      amount: "5 min",
      tip: "30+ ft. Roll it past the hole the right amount.",
    },
    {
      section: "Putting",
      activity: "Mid Putts",
      amount: "5 min",
      tip: "10-20 ft. Read, breathe, commit to the line.",
    },
    {
      section: "Putting",
      activity: "Short Putts",
      amount: "5 min",
      tip: "Inside 4 ft. Five in a row before you walk off.",
    },
  ],
};

// Club names that appear in activity strings and can be substituted
const SUBSTITUTABLE = [
  "Sand Wedge", "Pitching Wedge", "9 Iron", "8 Iron",
  "7 Iron", "6 Iron", "5 Iron", "4 Iron",
  "Hybrid", "3 Wood", "5 Wood", "Driver",
];

function substituteActivity(activity: string, bag?: BagClub[]): string {
  if (!bag || bag.length === 0) return activity;
  for (const club of SUBSTITUTABLE) {
    if (activity.includes(club)) {
      const replacement = sub(club, bag);
      if (replacement !== club) {
        return activity.replace(club, replacement);
      }
    }
  }
  return activity;
}

export function buildRoundWarmUp(duration: RoundDuration, bag?: BagClub[]): RoundWarmUpItem[] {
  return ITEMS_BY_DURATION[duration]
    .filter(item => hasSectionClub(item.section, bag))
    .map((item, i) => ({
      id: `${duration}-${i}-${item.activity}`,
      section: item.section,
      activity: substituteActivity(item.activity, bag),
      amount: item.amount,
      tip: item.tip,
    }));
}
