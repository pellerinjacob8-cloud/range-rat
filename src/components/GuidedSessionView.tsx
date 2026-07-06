import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { cn } from "@/lib/utils";
import type { SessionDrill } from "@/lib/drills";
import { PHASE_META, phaseOf } from "@/lib/phases";

interface GuidedSessionViewProps {
  session: SessionDrill[];
  onComplete: () => void;
  onReset: () => void;
  onSwitchView: () => void;
}

// Shared Guided/List switch shown at the top of both session views. Tapping
// the inactive side flips modes while the session (and List progress) is kept.
export function ViewToggle({ mode, onSwitch }: { mode: "guided" | "list"; onSwitch: () => void }) {
  return (
    <div className="inline-flex rounded-full border border-border bg-card p-0.5">
      {(["guided", "list"] as const).map((m) => {
        const active = mode === m;
        return (
          <button
            key={m}
            type="button"
            onClick={() => { if (!active) onSwitch(); }}
            aria-pressed={active}
            className={cn(
              "rounded-full px-4 py-1.5 text-[12px] font-bold uppercase tracking-[0.08em] transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground active:bg-muted",
            )}
          >
            {m === "guided" ? "Guided" : "List"}
          </button>
        );
      })}
    </div>
  );
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function GuidedSessionView({ session, onComplete, onReset, onSwitchView }: GuidedSessionViewProps) {
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());

  // Timer, uses wall-clock diff so it keeps running when app is backgrounded
  useEffect(() => {
    startRef.current = Date.now();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const drill = session[index];
  const total = session.length;
  const isLast = index === total - 1;
  const isFirst = index === 0;

  // Phase context: which phase this drill belongs to, and the user's position
  // within it. Phases run in contiguous order, so a simple scan is exact.
  const phase = phaseOf(drill);
  const phaseMeta = PHASE_META[phase];
  const PhaseIcon = phaseMeta.icon;
  const { inPhaseIndex, phaseCount } = useMemo(() => {
    const same = session.filter((d) => phaseOf(d) === phase);
    return {
      inPhaseIndex: same.findIndex((d) => d.id === drill.id) + 1,
      phaseCount: same.length,
    };
  }, [session, phase, drill.id]);

  const advance = () => {
    if (isLast) {
      onComplete();
    } else {
      setIndex((i) => i + 1);
    }
  };

  const goBack = () => {
    if (!isFirst) setIndex((i) => i - 1);
  };

  const progressPct = ((index) / total) * 100;

  return (
    <AppShell showBack onBack={onReset}>
      {/* Progress bar */}
      <div className="h-1 w-full rounded-full bg-muted overflow-hidden -mx-4 px-0" style={{ width: "calc(100% + 2rem)", marginLeft: "-1rem" }}>
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="flex flex-col min-h-[calc(100vh-10rem)] pt-6">

        {/* Guided/List view switch */}
        <div className="flex justify-center pb-4">
          <ViewToggle mode="guided" onSwitch={onSwitchView} />
        </div>

        {/* Top meta row */}
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Drill {index + 1} of {total}
          </p>
          <p className="text-[13px] font-semibold tabular-nums text-muted-foreground">
            {formatElapsed(elapsed)}
          </p>
        </div>

        {/* Phase banner: re-keyed on phase so it animates in as the user crosses
            from one phase into the next, keeping the session's arc legible. */}
        <div
          key={phase}
          className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <div className="flex items-center gap-2">
            <PhaseIcon className="h-4 w-4 text-primary" />
            <span className="text-[13px] font-bold uppercase tracking-[0.18em] text-primary">
              {phase}
            </span>
            <span className="ml-auto text-[12px] font-semibold tabular-nums text-muted-foreground">
              {inPhaseIndex} of {phaseCount}
            </span>
          </div>
          <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">
            {phaseMeta.purpose}
          </p>
        </div>

        {/* Main drill card, centered vertically */}
        <div className="flex flex-1 flex-col items-center justify-center text-center px-2 py-8">

          {/* Club group label */}
          <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-primary">
            {drill.club}
          </p>

          {/* Drill name */}
          <h1 className="mt-3 font-display text-[42px] leading-[1.0] tracking-[-0.01em]">
            {drill.drillName}
          </h1>

          {/* Description */}
          {drill.description && (
            <p className="mt-4 text-[16px] text-muted-foreground max-w-[300px] leading-relaxed">
              {drill.description}
            </p>
          )}

          {/* Ball count pill */}
          <div className="mt-8 flex items-baseline gap-2 rounded-2xl border border-border bg-card px-8 py-5">
            <span className="font-stats text-[64px] leading-none tabular-nums text-primary">
              {drill.balls > 0 ? drill.balls : "–"}
            </span>
            <span className="text-[15px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {drill.balls > 0 ? "balls" : (drill.unit ?? "")}
            </span>
          </div>
        </div>

        {/* Bottom controls */}
        <div className="pb-10 space-y-3">
          {/* Mark complete */}
          <button
            type="button"
            onClick={advance}
            className="h-16 w-full rounded-[14px] bg-primary text-primary-foreground font-bold text-[15px] uppercase tracking-[0.06em] active:opacity-90 transition-opacity"
          >
            {isLast ? "Complete Session" : "Complete"}
          </button>

          {/* Back / nav row */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={goBack}
              disabled={isFirst}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-[14px] border border-border bg-card py-4 text-sm font-bold uppercase tracking-[0.06em] transition-colors",
                isFirst ? "opacity-30" : "text-muted-foreground active:bg-muted",
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              type="button"
              onClick={onReset}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[14px] border border-border bg-card py-4 text-sm font-bold uppercase tracking-[0.06em] text-muted-foreground active:bg-muted"
            >
              Quit
            </button>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
