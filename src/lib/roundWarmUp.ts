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
  activity: string; // e.g. "Pitching Wedge"
  amount: string; // e.g. "10 balls" or "5 min"
  tip: string;
}

export const ROUND_DURATIONS: RoundDuration[] = [15, 30, 45, 60];

const ITEMS_BY_DURATION: Record<RoundDuration, Omit<RoundWarmUpItem, "id">[]> = {
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
      tip: "Inside 4 ft. Build confidence — back of the cup.",
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
      tip: "Pick a 10-yard wide window — land it inside.",
    },
    {
      section: "Long Irons",
      activity: "5 Iron / Hybrid",
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
      tip: "Two- and three-footers — wrong, focus on speed.",
    },
    {
      section: "Putting",
      activity: "Mid Putts",
      amount: "5 min",
      tip: "10–20 ft. Read, then trust the line.",
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
      activity: "Sand Wedge — Soft",
      amount: "10 balls",
      tip: "30–50 yards. Land it like a feather.",
    },
    {
      section: "Wedges",
      activity: "Pitching Wedge — Stock",
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
      activity: "Driver — Stock",
      amount: "6 balls",
      tip: "Tee high, athletic stance, easy speed.",
    },
    {
      section: "Driver",
      activity: "Driver — Committed",
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
      tip: "10–20 ft. Read, breathe, commit to the line.",
    },
    {
      section: "Putting",
      activity: "Short Putts",
      amount: "5 min",
      tip: "Inside 4 ft. Five in a row before you walk off.",
    },
  ],
};

export function buildRoundWarmUp(duration: RoundDuration): RoundWarmUpItem[] {
  return ITEMS_BY_DURATION[duration].map((item, i) => ({
    id: `${duration}-${i}-${item.activity}`,
    ...item,
  }));
}
