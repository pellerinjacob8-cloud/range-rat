import { Flame, Target, RotateCcw, Zap, Trophy, type LucideIcon } from "lucide-react";
import type { SessionDrill, SessionPhase } from "./drills";

// Single source of truth for how each session phase is presented.
//  - blurb:   short tag for the List View phase header
//  - purpose: a full sentence shown in Guided Mode so a solo user understands
//             what this phase is for as they enter it
export const PHASE_META: Record<
  SessionPhase,
  { icon: LucideIcon; blurb: string; purpose: string }
> = {
  "Warm Up":   { icon: Flame,     blurb: "Loosen up, no scoring.",     purpose: "Loosen up and find your tempo. Nothing counts yet." },
  "Skill":     { icon: Target,    blurb: "Drills and focus blocks.",   purpose: "Build the move with focused, repeatable reps." },
  "Transfer":  { icon: RotateCcw, blurb: "Practice like you play.",    purpose: "Take it to the course. One ball, full routine, new target each time." },
  "Challenge": { icon: Zap,       blurb: "Add some pressure.",         purpose: "Raise the stakes. Hit the target with something on the line." },
  "Test":      { icon: Trophy,    blurb: "End with a score.",          purpose: "Put a number on it and see where your game stands today." },
};

export const PHASE_ORDER: SessionPhase[] = ["Warm Up", "Skill", "Transfer", "Challenge", "Test"];

// A block's phase, falling back for any legacy session saved before phases
// were tagged on each drill.
export function phaseOf(d: SessionDrill): SessionPhase {
  return d.phase ?? (d.club === "Warm Up" ? "Warm Up" : "Skill");
}
