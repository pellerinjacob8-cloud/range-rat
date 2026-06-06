import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ProGate } from "@/components/ProGate";
import { ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { cn } from "@/lib/utils";
import {
  COMBINE_SHOTS,
  calcShotScore,
  calcAttemptScores,
  loadCombineAttempts,
  saveCombineAttempt,
  skillLabel,
  CATEGORY_LABELS,
  type CombineAttempt,
  type CombineCategory,
  type ShotScoreInput,
  type ScoredShot,
  type StrikeQuality,
  type Direction,
  type DistanceControl,
} from "@/lib/combine";

export const Route = createFileRoute("/combine")({
  component: CombinePage,
});

type Screen = "lobby" | "shot" | "results";

function CombinePage() {
  return (
    <ProGate feature="Combine">
      <CombinePageInner />
    </ProGate>
  );
}

function CombinePageInner() {
  const [screen, setScreen] = useState<Screen>("lobby");
  const [scored, setScored] = useState<ScoredShot[]>([]);
  const [attempt, setAttempt] = useState<CombineAttempt | null>(null);

  const startCombine = () => {
    setScored([]);
    setAttempt(null);
    setScreen("shot");
  };

  const handleShotScored = (ss: ScoredShot) => {
    const next = [...scored, ss];
    if (next.length === COMBINE_SHOTS.length) {
      const scores = calcAttemptScores(next);
      const record: CombineAttempt = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        completedAt: new Date().toISOString(),
        shots: next,
        categoryScores: {
          wedge:    scores.wedge,
          midIron:  scores.midIron,
          longGame: scores.longGame,
          driver:   scores.driver,
        },
        overallScore: scores.overall,
      };
      saveCombineAttempt(record);
      setAttempt(record);
      setScreen("results");
    } else {
      setScored(next);
    }
  };

  const handleBack = (idx: number) => {
    setScored((prev) => prev.slice(0, idx - 1));
  };

  if (screen === "shot") {
    return (
      <ShotFlow
        scored={scored}
        onScored={handleShotScored}
        onBack={handleBack}
        onQuit={() => setScreen("lobby")}
      />
    );
  }

  if (screen === "results" && attempt) {
    return (
      <ResultsView
        attempt={attempt}
        onDone={() => setScreen("lobby")}
      />
    );
  }

  return <CombineLobby onStart={startCombine} />;
}

// ─── Lobby ────────────────────────────────────────────────────────────────────

function CombineLobby({ onStart }: { onStart: () => void }) {
  const navigate = useNavigate();
  const attempts = loadCombineAttempts();
  const last     = attempts[attempts.length - 1];
  const pb       = attempts.length > 0
    ? Math.max(...attempts.map(a => a.overallScore))
    : null;

  return (
    <AppShell showBack>
      <div className="pb-28">
        <p className="pt-2 text-[13px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Benchmark</p>
        <h1 className="mt-2 font-display text-[42px] leading-[0.98] tracking-[-0.01em]">
          Range Rat<br />Combine.
        </h1>
        <p className="mt-3 text-[15px] text-muted-foreground">
          33 standardized shots: wedges, irons, long game, driver. Same test every time.
        </p>

        {/* Est. time */}
        <div className="mt-5 flex items-center gap-3">
          <span className="rounded-full border border-border bg-muted px-3 py-1.5 text-[13px] font-bold text-muted-foreground">
            33 shots
          </span>
          <span className="rounded-full border border-border bg-muted px-3 py-1.5 text-[13px] font-bold text-muted-foreground">
            4 categories
          </span>
        </div>

        {/* Stats strip */}
        {attempts.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground">Personal Best</p>
              <p className="mt-2 font-stats text-[40px] leading-none tabular-nums text-primary">{pb}</p>
              <p className="mt-1 text-[13px] font-semibold text-muted-foreground">{skillLabel(pb!)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground">Last Score</p>
              <p className="mt-2 font-stats text-[40px] leading-none tabular-nums text-primary">{last.overallScore}</p>
              <p className="mt-1 text-[13px] font-semibold text-muted-foreground">{skillLabel(last.overallScore)}</p>
            </div>
          </div>
        )}

        {/* Category breakdown from last attempt */}
        {last && (
          <div className="mt-4 rounded-2xl border border-border bg-card p-4">
            <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">Last Breakdown</p>
            <div className="space-y-2.5">
              {(["wedge", "mid-iron", "long-game", "driver"] as CombineCategory[]).map((cat) => {
                const score = cat === "mid-iron" ? last.categoryScores.midIron
                  : cat === "long-game" ? last.categoryScores.longGame
                  : last.categoryScores[cat as "wedge" | "driver"];
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="w-24 text-[13px] font-semibold text-muted-foreground shrink-0">
                      {CATEGORY_LABELS[cat]}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-[13px] font-bold tabular-nums">{score}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 10-session trend */}
        {attempts.length > 1 && (
          <div className="mt-4 rounded-2xl border border-border bg-card p-4">
            <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">Trend</p>
            <div className="h-[60px] flex items-end gap-1.5">
              {attempts.slice(-10).map((a, i) => {
                const pct = a.overallScore;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-[4px] bg-primary/80 min-h-[4px]"
                      style={{ height: `${Math.max(pct * 0.6, 4)}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="fixed inset-x-0 z-40 bg-gradient-to-t from-background via-background/95 to-transparent"
           style={{ bottom: "calc(68px + env(safe-area-inset-bottom))" }}>
        <div className="mx-auto w-full max-w-[430px] px-4 pt-6 pb-4">
          <button
            type="button"
            onClick={onStart}
            className="h-14 w-full rounded-[14px] bg-primary text-primary-foreground font-bold text-[15px] uppercase tracking-[0.06em] active:opacity-90"
          >
            {attempts.length === 0 ? "Start Combine" : "New Attempt"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}

// ─── Shot Flow ────────────────────────────────────────────────────────────────

interface ShotFlowProps {
  scored: ScoredShot[];
  onScored: (ss: ScoredShot) => void;
  onBack: (idx: number) => void;
  onQuit: () => void;
}

function ShotFlow({ scored, onScored, onBack, onQuit }: ShotFlowProps) {
  const idx  = scored.length;       // 0-based index of current shot
  const shot = COMBINE_SHOTS[idx];
  const total = COMBINE_SHOTS.length;
  const isDriver = shot.category === "driver";

  const [strike,   setStrike]   = useState<StrikeQuality | null>(null);
  const [dir,      setDir]      = useState<Direction | null>(null);
  const [dc,       setDc]       = useState<DistanceControl | null>(null);
  const [fairway,  setFairway]  = useState<boolean | null>(null);

  const canSubmit = strike !== null && dir !== null && (isDriver ? fairway !== null : dc !== null);

  const submit = () => {
    if (!canSubmit) return;
    const input: ShotScoreInput = {
      strikeQuality: strike!,
      direction: dir!,
      ...(isDriver ? { fairwayHit: fairway! } : { distanceControl: dc! }),
    };
    const shotScore = calcShotScore(shot, input);
    onScored({ shot, input, shotScore });
    // Reset fields for next shot
    setStrike(null);
    setDir(null);
    setDc(null);
    setFairway(null);
  };

  const progressPct = (idx / total) * 100;

  // Category transition banner
  const prevShot = idx > 0 ? COMBINE_SHOTS[idx - 1] : null;
  const newCategory = prevShot && prevShot.category !== shot.category;

  return (
    <AppShell showBack>
      {/* Progress bar */}
      <div className="-mx-4 h-1 overflow-hidden bg-muted" style={{ width: "calc(100% + 2rem)" }}>
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="pt-5 pb-28">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Shot {idx + 1} of {total}
          </p>
          <span className="rounded-full border border-border bg-muted px-3 py-1 text-[12px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            {CATEGORY_LABELS[shot.category]}
          </span>
        </div>

        {/* Category transition notice */}
        {newCategory && (
          <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
            <p className="text-[13px] font-bold text-primary">
              Now: {CATEGORY_LABELS[shot.category]}
            </p>
          </div>
        )}

        {/* Shot assignment card */}
        <div className="mt-4 rounded-2xl border border-border bg-card px-5 py-4">
          <div className="flex items-baseline gap-3">
            {shot.yardage ? (
              <>
                <span className="font-stats text-[52px] leading-none tabular-nums text-primary">{shot.yardage}</span>
                <span className="text-[15px] font-bold uppercase tracking-[0.1em] text-muted-foreground">yards</span>
              </>
            ) : (
              <span className="font-stats text-[36px] leading-none text-primary">Driver</span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip>{shot.swing} Swing</Chip>
            <Chip>{shot.shape}</Chip>
            <Chip>{shot.traj} Traj.</Chip>
          </div>
        </div>

        {/* ── Scoring inputs ── */}
        <div className="mt-6 space-y-5">

          {/* Strike Quality */}
          <ScoringGroup label="Strike Quality">
            {(["Pure", "Solid", "Average", "Thin", "Fat", "Toe", "Heel"] as StrikeQuality[]).map((v) => (
              <PillBtn key={v} active={strike === v} onClick={() => setStrike(v)}>{v}</PillBtn>
            ))}
          </ScoringGroup>

          {/* Direction */}
          <ScoringGroup label="Direction">
            {(["On Line", "Slight Left", "Slight Right", "Moderate Left", "Moderate Right", "Severe Left", "Severe Right"] as Direction[]).map((v) => (
              <PillBtn key={v} active={dir === v} onClick={() => setDir(v)}>{v}</PillBtn>
            ))}
          </ScoringGroup>

          {/* Distance Control or Fairway */}
          {isDriver ? (
            <ScoringGroup label="Fairway Hit?">
              <PillBtn active={fairway === true}  onClick={() => setFairway(true)}>Yes</PillBtn>
              <PillBtn active={fairway === false} onClick={() => setFairway(false)}>Miss</PillBtn>
            </ScoringGroup>
          ) : (
            <ScoringGroup label="Distance Control">
              {(["Perfect", "Close", "Off"] as DistanceControl[]).map((v) => (
                <PillBtn key={v} active={dc === v} onClick={() => setDc(v)}>{v}</PillBtn>
              ))}
            </ScoringGroup>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="fixed inset-x-0 z-40 bg-gradient-to-t from-background via-background/95 to-transparent"
           style={{ bottom: "calc(68px + env(safe-area-inset-bottom))" }}>
        <div className="mx-auto w-full max-w-[430px] px-4 pt-4 pb-4 space-y-2">
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="h-14 w-full rounded-[14px] bg-primary text-primary-foreground font-bold text-[15px] uppercase tracking-[0.06em] disabled:opacity-40 active:opacity-90 transition-opacity"
          >
            {idx === total - 1 ? "Complete Combine" : "Next Shot →"}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={idx === 0}
              onClick={() => onBack(idx)}
              className="flex flex-1 items-center justify-center gap-1 rounded-[14px] border border-border bg-card py-3.5 text-[13px] font-bold uppercase tracking-[0.06em] text-muted-foreground disabled:opacity-30 active:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button
              type="button"
              onClick={onQuit}
              className="flex flex-1 items-center justify-center rounded-[14px] border border-border bg-card py-3.5 text-[13px] font-bold uppercase tracking-[0.06em] text-muted-foreground active:bg-muted"
            >
              Quit
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ─── Results ──────────────────────────────────────────────────────────────────

function ResultsView({ attempt, onDone }: { attempt: CombineAttempt; onDone: () => void }) {
  const all     = loadCombineAttempts();
  const pb      = Math.max(...all.map(a => a.overallScore));
  const isNewPb = attempt.overallScore === pb && all.length > 1;
  const prev    = all.length >= 2 ? all[all.length - 2] : null;
  const diff    = prev ? attempt.overallScore - prev.overallScore : null;

  const cats: { cat: CombineCategory; label: string; score: number }[] = [
    { cat: "wedge",     label: "Wedges",    score: attempt.categoryScores.wedge },
    { cat: "mid-iron",  label: "Mid Irons", score: attempt.categoryScores.midIron },
    { cat: "long-game", label: "Long Game", score: attempt.categoryScores.longGame },
    { cat: "driver",    label: "Driver",    score: attempt.categoryScores.driver },
  ];

  return (
    <AppShell showBack>
      <div className="pb-28">
        <p className="pt-2 text-[13px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Results</p>

        {/* Overall score */}
        <div className="mt-3 flex items-end gap-4">
          <div>
            <span className="font-stats text-[80px] leading-none tabular-nums text-primary">
              {attempt.overallScore}
            </span>
            {isNewPb && (
              <span className="ml-2 text-[13px] font-bold uppercase tracking-[0.1em] text-primary inline-flex items-center gap-1">New PB <Trophy className="h-4 w-4" /></span>
            )}
          </div>
        </div>
        <p className="mt-1 font-display text-[28px] leading-none text-foreground">
          {skillLabel(attempt.overallScore)}
        </p>

        {/* vs last */}
        {diff !== null && (
          <p className={cn(
            "mt-2 text-[15px] font-semibold",
            diff > 0 ? "text-primary" : diff < 0 ? "text-destructive" : "text-muted-foreground"
          )}>
            {diff > 0 ? `+${diff}` : diff} vs last attempt
          </p>
        )}

        {/* Category breakdown */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 space-y-4">
          <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Category Scores</p>
          {cats.map(({ label, score }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-24 text-[14px] font-semibold shrink-0">{label}</span>
              <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className="w-10 text-right font-stats text-[18px] tabular-nums text-primary">{score}</span>
            </div>
          ))}
        </div>

        {/* PB comparison */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground">This Attempt</p>
            <p className="mt-2 font-stats text-[36px] leading-none tabular-nums text-primary">{attempt.overallScore}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground">Personal Best</p>
            <p className="mt-2 font-stats text-[36px] leading-none tabular-nums text-primary">{pb}</p>
          </div>
        </div>

        {/* Skill levels guide */}
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">Skill Levels</p>
          <div className="space-y-1.5">
            {[["90+", "Elite"], ["80–89", "Tournament"], ["70–79", "Competitive"], ["55–69", "Developing"], ["0–54", "Building"]].map(([range, label]) => (
              <div key={label} className="flex justify-between">
                <span className={cn(
                  "text-[14px] font-semibold",
                  skillLabel(attempt.overallScore) === label ? "text-primary font-bold" : "text-muted-foreground"
                )}>{label}</span>
                <span className="text-[13px] text-muted-foreground tabular-nums">{range}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="fixed inset-x-0 z-40 bg-gradient-to-t from-background via-background/95 to-transparent"
           style={{ bottom: "calc(68px + env(safe-area-inset-bottom))" }}>
        <div className="mx-auto w-full max-w-[430px] px-4 pt-6 pb-4">
          <button
            type="button"
            onClick={onDone}
            className="h-14 w-full rounded-[14px] bg-primary text-primary-foreground font-bold text-[15px] uppercase tracking-[0.06em] active:opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    </AppShell>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-muted px-3 py-1 text-[13px] font-semibold text-muted-foreground">
      {children}
    </span>
  );
}

function ScoringGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function PillBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-[14px] font-semibold transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-muted text-foreground active:opacity-80",
      )}
    >
      {children}
    </button>
  );
}
