import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, Flame, RotateCcw, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { QuitGameButton } from "@/components/QuitGameButton";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Button } from "@/components/ui/button";
import {
  BASE_CLUB_GROUPS,
  BUCKET_SIZES,
  FULL_BAG_GROUP,
  GOALS,
  TIMES,
  WARM_UP_PRESETS,
  buildWarmUp,
  generateSession,
  type BucketSize,
  type ClubGroup,
  type GenerateInput,
  type Goal,
  type SessionDrill,
  type TimeAvailable,
  type WarmUpPreset,
} from "@/lib/drills";
import { loadProfileName } from "@/lib/profile";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/practice")({
  head: () => ({
    meta: [
      { title: "Practice — Range Rat" },
      {
        name: "description",
        content:
          "Pick your club groups, bucket size, time, and goal. Range Rat builds a focused drill checklist with an optional warm-up.",
      },
    ],
  }),
  component: PracticePage,
});

// ─── LocalStorage ────────────────────────────────────────────────────────────

const SESSIONS_KEY = "range-rat:sessions";

interface SavedSession {
  id: string;
  completedAt: string;
  filters: GenerateInput;
  totalBalls: number;
  drillCount: number;
}

function saveSession(session: SessionDrill[], input: GenerateInput): SavedSession {
  const record: SavedSession = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    completedAt: new Date().toISOString(),
    filters: input,
    totalBalls: session
      .filter((d) => d.club !== "Warm Up")
      .reduce((sum, d) => sum + d.balls, 0),
    drillCount: session.length,
  };
  try {
    const existing = JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? "[]") as SavedSession[];
    existing.push(record);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(existing));
  } catch {
    // localStorage unavailable (private/quota)
  }
  return record;
}

// ─── Page ────────────────────────────────────────────────────────────────────

function PracticePage() {
  const [warmUp, setWarmUp] = useState<WarmUpPreset | null>(null);
  const [clubGroups, setClubGroups] = useState<ClubGroup[]>([]);
  const [bucket, setBucket] = useState<BucketSize | null>(null);
  const [time, setTime] = useState<TimeAvailable | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);

  const [session, setSession] = useState<SessionDrill[] | null>(null);
  const [sessionInput, setSessionInput] = useState<GenerateInput | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [completedRecord, setCompletedRecord] = useState<SavedSession | null>(null);

  // Custom input state — optional overrides for bucket and time
  const [showCustomBucket, setShowCustomBucket] = useState(false);
  const [customBallsStr, setCustomBallsStr] = useState("");
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [customMinsStr, setCustomMinsStr] = useState("");

  const customBalls = (() => { const n = parseInt(customBallsStr); return n > 0 ? n : null; })();
  const customMins  = (() => { const n = parseInt(customMinsStr);  return n > 0 ? n : null; })();

  const isFullBag = clubGroups.length === 1 && clubGroups[0] === "full-bag";

  const handleClubGroupsChange = (next: ClubGroup[]) => {
    if (isFullBag && next.length === 0) { setClubGroups([]); return; }
    const base = next.filter((g) => g !== "full-bag");
    setClubGroups(base.length === BASE_CLUB_GROUPS.length ? ["full-bag"] : base);
  };

  const hasValidBucket = bucket !== null || (showCustomBucket && customBalls !== null);
  const hasValidTime   = time !== null   || (showCustomTime  && customMins  !== null);
  const canGenerate = clubGroups.length >= 1 && hasValidBucket && hasValidTime && goal !== null;

  const generate = () => {
    if (!canGenerate) return;
    const input: GenerateInput = {
      clubGroups,
      bucket: bucket ?? "medium",  // placeholder when custom overrides
      time:   time   ?? 30,        // placeholder when custom overrides
      goal: goal!,
      ...(showCustomBucket && customBalls !== null ? { customBalls }          : {}),
      ...(showCustomTime   && customMins  !== null ? { customMinutes: customMins } : {}),
    };
    const drills = generateSession(input);
    const warmUpItems = warmUp ? buildWarmUp(warmUp) : [];
    setSessionInput(input);
    setSession([...warmUpItems, ...drills]);
    setDone(new Set());
    setCompletedRecord(null);
  };

  const reset = () => {
    setSession(null);
    setDone(new Set());
    setSessionInput(null);
    setCompletedRecord(null);
  };

  const handleComplete = () => {
    if (!session || !sessionInput) return;
    const record = saveSession(session, sessionInput);
    setCompletedRecord(record);
  };

  // ── Completion screen
  if (completedRecord && session) {
    return (
      <CompletionView
        record={completedRecord}
        session={session}
        onNewSession={reset}
      />
    );
  }

  // ── Active session checklist
  if (session) {
    return (
      <SessionView
        session={session}
        done={done}
        onToggle={(id) => {
          setDone((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
          });
        }}
        onReset={reset}
        onComplete={handleComplete}
      />
    );
  }

  // ── Filter / builder screen
  return (
    <AppShell showBack>
      <div className="pb-32 space-y-7">
        <div className="pt-2">
          <h1 className="font-display text-3xl font-bold">Build your session</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Optional warm-up, then pick your filters and generate.
          </p>
        </div>

        {/* Warm Up */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Warm Up · Optional
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {WARM_UP_PRESETS.map((p) => {
              const active = warmUp === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setWarmUp((curr) => (curr === p.value ? null : p.value))}
                  aria-pressed={active}
                  className={cn(
                    "min-h-12 rounded-full px-4 text-sm font-semibold transition-colors border",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border active:bg-muted",
                  )}
                >
                  {p.label} · {p.minutes} min
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {warmUp
              ? "A warm-up checklist will be added to the top of your session."
              : "Tap a preset to add a warm-up, or skip it."}
          </p>
        </div>

        {/* Club group picker — custom layout so Full Bag can be wider */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {isFullBag ? "Club group" : "Club group · Pick 1–5"}
          </p>

          <div className="flex flex-wrap gap-2">
            {isFullBag ? (
              // Full Bag active — single full-width pill, tap to clear
              <button
                type="button"
                onClick={() => setClubGroups([])}
                aria-pressed
                className="w-full min-h-12 rounded-full border border-primary bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors active:opacity-90"
              >
                Full Bag
              </button>
            ) : (
              <>
                {BASE_CLUB_GROUPS.map((opt) => {
                  const active = clubGroups.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        handleClubGroupsChange(
                          active
                            ? clubGroups.filter((g) => g !== opt.value)
                            : [...clubGroups, opt.value],
                        )
                      }
                      aria-pressed={active}
                      className={cn(
                        "min-h-12 rounded-full border px-4 text-sm font-semibold transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground active:bg-muted",
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}

                {/* Full Bag shortcut — flex-1 makes it fill remaining row space next to Driver */}
                <button
                  type="button"
                  onClick={() => setClubGroups(["full-bag"])}
                  aria-pressed={false}
                  className="flex-1 min-w-[8rem] min-h-12 rounded-full border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors active:bg-muted"
                >
                  Full Bag
                </button>
              </>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {isFullBag
              ? "All five groups selected → Full Bag. Tap to clear."
              : "Select individual groups or tap Full Bag directly."}
          </p>
        </div>

        {/* Bucket size */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Bucket size
          </p>
          <div className="flex flex-wrap gap-2">
            {BUCKET_SIZES.map((b) => {
              const active = !showCustomBucket && bucket === b.value;
              return (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => { setBucket(b.value); setShowCustomBucket(false); setCustomBallsStr(""); }}
                  aria-pressed={active}
                  className={cn(
                    "min-h-12 rounded-full border px-4 text-sm font-semibold transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground active:bg-muted",
                  )}
                >
                  {b.label} · {b.balls}
                </button>
              );
            })}

            {showCustomBucket ? (
              <div className="flex items-center gap-1.5 rounded-full border border-primary/50 bg-primary/5 px-3 py-2">
                <input
                  type="number"
                  value={customBallsStr}
                  onChange={(e) => setCustomBallsStr(e.target.value)}
                  placeholder="0"
                  min={1}
                  max={500}
                  autoFocus
                  className="w-14 bg-transparent text-sm font-bold text-primary outline-none"
                />
                <span className="shrink-0 text-xs text-muted-foreground">balls</span>
                <button
                  type="button"
                  onClick={() => { setShowCustomBucket(false); setCustomBallsStr(""); setBucket(null); }}
                  className="ml-0.5 text-muted-foreground transition active:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setShowCustomBucket(true); setBucket(null); }}
                className="min-h-12 rounded-full border border-dashed border-border px-4 text-sm font-semibold text-muted-foreground transition-colors active:bg-muted"
              >
                Custom
              </button>
            )}
          </div>
        </div>

        {/* Time available */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Time available
          </p>
          <div className="flex flex-wrap gap-2">
            {TIMES.map((t) => {
              const active = !showCustomTime && time === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTime(t); setShowCustomTime(false); setCustomMinsStr(""); }}
                  aria-pressed={active}
                  className={cn(
                    "min-h-12 rounded-full border px-4 text-sm font-semibold transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground active:bg-muted",
                  )}
                >
                  {t} min
                </button>
              );
            })}

            {showCustomTime ? (
              <div className="flex items-center gap-1.5 rounded-full border border-primary/50 bg-primary/5 px-3 py-2">
                <input
                  type="number"
                  value={customMinsStr}
                  onChange={(e) => setCustomMinsStr(e.target.value)}
                  placeholder="0"
                  min={1}
                  max={180}
                  autoFocus
                  className="w-12 bg-transparent text-sm font-bold text-primary outline-none"
                />
                <span className="shrink-0 text-xs text-muted-foreground">min</span>
                <button
                  type="button"
                  onClick={() => { setShowCustomTime(false); setCustomMinsStr(""); setTime(null); }}
                  className="ml-0.5 text-muted-foreground transition active:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setShowCustomTime(true); setTime(null); }}
                className="min-h-12 rounded-full border border-dashed border-border px-4 text-sm font-semibold text-muted-foreground transition-colors active:bg-muted"
              >
                Custom
              </button>
            )}
          </div>
        </div>
        <SegmentedControl label="Goal" options={GOALS} value={goal} onChange={setGoal} />

        <QuitGameButton />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto w-full max-w-md px-4 py-3">
          <Button
            size="lg"
            disabled={!canGenerate}
            onClick={generate}
            className="h-14 w-full rounded-xl text-base font-bold uppercase tracking-wide"
          >
            Generate Session
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

// ─── Session checklist ────────────────────────────────────────────────────────

interface SessionViewProps {
  session: SessionDrill[];
  done: Set<string>;
  onToggle: (id: string) => void;
  onReset: () => void;
  onComplete: () => void;
}

function SessionView({ session, done, onToggle, onReset, onComplete }: SessionViewProps) {
  const completedCount = done.size;
  const progress = session.length > 0 ? (completedCount / session.length) * 100 : 0;
  const allDone = completedCount === session.length && session.length > 0;

  const byClub = useMemo(() => {
    const map = new Map<string, SessionDrill[]>();
    session.forEach((d) => {
      const arr = map.get(d.club) ?? [];
      arr.push(d);
      map.set(d.club, arr);
    });
    return Array.from(map.entries());
  }, [session]);

  return (
    <AppShell showBack>
      <div className="pb-12">
        <div className="flex items-baseline justify-between">
          <h1 className="font-display text-3xl font-bold">Your session</h1>
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground active:text-foreground"
          >
            <RotateCcw className="h-4 w-4" /> New
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {completedCount} of {session.length} items complete
        </p>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-6 space-y-6">
          {byClub.map(([club, drills]) => {
            const isWarmUp = club === "Warm Up";
            return (
              <section key={club}>
                <h2
                  className={cn(
                    "font-display text-xl font-bold uppercase tracking-tight flex items-center gap-2",
                    isWarmUp && "text-primary",
                  )}
                >
                  {isWarmUp ? <Flame className="h-5 w-5" /> : null}
                  {club}
                </h2>
                <ul className="mt-3 space-y-2">
                  {drills.map((d) => {
                    const isDone = done.has(d.id);
                    return (
                      <li key={d.id}>
                        <button
                          type="button"
                          onClick={() => onToggle(d.id)}
                          className={cn(
                            "w-full rounded-2xl border p-4 text-left transition active:scale-[0.99]",
                            isDone ? "border-border bg-muted" : "border-border bg-card",
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={cn(
                                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2",
                                isDone
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-muted-foreground/40",
                              )}
                              aria-hidden
                            >
                              {isDone ? (
                                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                                  <path
                                    fillRule="evenodd"
                                    d="M16.7 5.3a1 1 0 010 1.4l-7.4 7.4a1 1 0 01-1.4 0L3.3 9.5a1 1 0 011.4-1.4l3.9 3.9 6.7-6.7a1 1 0 011.4 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              ) : null}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between gap-2">
                                <p className={cn("font-semibold", isDone && "line-through text-muted-foreground")}>
                                  {d.drillName}
                                </p>
                                <span
                                  className={cn(
                                    "shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-primary",
                                    isDone && "opacity-50",
                                  )}
                                >
                                  {d.balls} {d.unit ?? "balls"}
                                </span>
                              </div>
                              <p className={cn("mt-1 text-sm text-muted-foreground", isDone && "line-through")}>
                                {d.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <div className="mt-10 space-y-3">
          {allDone ? (
            <Button
              onClick={onComplete}
              className="h-14 w-full rounded-xl text-base font-bold uppercase tracking-wide"
            >
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Complete Session
            </Button>
          ) : (
            <QuitGameButton label="Quit Session" />
          )}
        </div>
      </div>
    </AppShell>
  );
}

// ─── Completion screen ────────────────────────────────────────────────────────

function CompletionView({
  record,
  session,
  onNewSession,
}: {
  record: SavedSession;
  session: SessionDrill[];
  onNewSession: () => void;
}) {
  const navigate = useNavigate();
  const name = loadProfileName();
  const drillBalls = session
    .filter((d) => d.club !== "Warm Up")
    .reduce((sum, d) => sum + d.balls, 0);
  const goalLabel = GOALS.find((g) => g.value === record.filters.goal)?.label ?? "";
  const bucketLabel = BUCKET_SIZES.find((b) => b.value === record.filters.bucket)?.label ?? "";

  return (
    <AppShell>
      <div className="flex flex-col items-center pt-10 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
          <CheckCircle2 className="h-12 w-12" />
        </div>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
          Session Complete
        </p>
        <h1 className="mt-2 font-display text-5xl font-extrabold leading-none">
          {name ? `Locked In, ${name}.` : "Locked In."}
        </h1>

        <div className="mt-8 w-full rounded-2xl border border-border bg-card p-5 text-left">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Summary
          </p>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
            <Stat label="Balls Hit" value={String(drillBalls)} />
            <Stat label="Drills Done" value={String(record.drillCount)} />
            <Stat label="Goal" value={goalLabel} />
            <Stat label="Bucket" value={bucketLabel} />
          </div>
        </div>

        <div className="mt-8 w-full space-y-3">
          <Button
            onClick={onNewSession}
            className="h-14 w-full rounded-xl text-base font-bold uppercase tracking-wide"
          >
            New Session
          </Button>
          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="flex w-full items-center justify-center rounded-xl border border-border bg-card px-4 py-4 text-sm font-bold uppercase tracking-wide text-muted-foreground transition active:scale-[0.99]"
          >
            Back to Home
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}
