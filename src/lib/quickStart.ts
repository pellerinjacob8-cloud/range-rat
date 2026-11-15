import { buildPlan } from "@/lib/practicePlan";
import type { PlanLevel, PracticeBlock, SwingYards } from "@/lib/practicePlan";

// Quick start: /practice?start=quick drops a new golfer straight into a
// Standard Quick session (Home's first session card, and links from email).

export type QuickStartStep = "none" | "wait" | "resume" | "start";

export function quickStartStep(opts: {
  requested: boolean;     // ?start=quick is in the URL
  alreadyHandled: boolean; // this page load already started or skipped it
  hasActiveRun: boolean;   // a range or putting session is in progress
  dataLoaded: boolean;     // bag and profile (level) have loaded
}): QuickStartStep {
  if (!opts.requested || opts.alreadyHandled) return "none";
  // Never replace a session in progress: let it resume as usual.
  if (opts.hasActiveRun) return "resume";
  if (!opts.dataLoaded) return "wait";
  return "start";
}

// Always the free Standard Quick plan, whatever the builder last remembered,
// so Pro plans, add-ons and Built for you only apply when the golfer picks them.
export function quickStartBlocks(
  level: PlanLevel,
  bag: Parameters<typeof buildPlan>[1],
  yardages: Record<string, SwingYards>,
): PracticeBlock[] {
  return buildPlan({ plan: "standard", length: "quick", addOns: [], level, focus: null, balance: null }, bag, yardages);
}
