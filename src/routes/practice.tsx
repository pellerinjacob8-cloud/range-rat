import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { CheckCircle2, Flame, Plus, RotateCcw, Trophy, X } from "lucide-react";
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
const ACTIVE_KEY   = "range-rat:active-session";

interface ActiveSessionData {
  session: SessionDrill[];
  sessionInput: GenerateInput;
  done: string[];
}

function loadActiveSession(): ActiveSessionData | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    return raw ? (JSON.parse(raw) as ActiveSessionData) : null;
  } catch { return null; }
}

function persistActiveSession(session: SessionDrill[], sessionInput: GenerateInput, done: Set<string>) {
  try {
    const remaining = session.length - done.size;
    localStorage.setItem(ACTIVE_KEY, JSON.stringify({
      type: "practice",
      route: "/practice",
      label: "Practice",
      subtitle: `${remaining} drill${remaining === 1 ? "" : "s"} left`,
      session,
      sessionInput,
      done: Array.from(done),
    }));
  } catch {}
}

function clearActiveSession() {
  try { localStorage.removeItem(ACTIVE_KEY); } catch {}
}

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

  const [session, setSession] = useState<SessionDrill[] | null>(() => loadActiveSession()?.session ?? null);
  const [sessionInput, setSessionInput] = useState<GenerateInput | null>(() => loadActiveSession()?.sessionInput ?? null);
  const [done, setDone] = useState<Set<string>>(() => new Set(loadActiveSession()?.done ?? []));
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

  // Persist active session whenever session/done changes
  useEffect(() => {
    if (session && sessionInput) persistActiveSession(session, sessionInput, done);
  }, [session, sessionInput, done]);

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
    clearActiveSession();
    setSession(null);
    setDone(new Set());
    setSessionInput(null);
    setCompletedRecord(null);
  };

  const handleComplete = () => {
    if (!session || !sessionInput) return;
    clearActiveSession();
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
        {/* Heading block */}
        <div className="pt-2 pb-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Build · Step 1 of 1</p>
          <h1 className="mt-1.5 font-display text-[38px] leading-[0.98] tracking-[-0.01em]">Build your session.</h1>
          <p className="mt-2.5 text-[13px] text-muted-foreground">
            {clubGroups.length || 0} group{clubGroups.length === 1 ? "" : "s"} · {
              showCustomBucket && customBalls ? `${customBalls} balls` :
              bucket === "small" ? "25 balls" : bucket === "medium" ? "50 balls" : bucket === "large" ? "100 balls" : "— balls"
            } · {
              showCustomTime && customMins ? `${customMins} min` : time ? `${time} min` : "— min"
            }
          </p>
        </div>

        {/* Warm Up */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-primary" />
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
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
                    "min-h-[52px] rounded-full px-4 text-sm font-semibold transition-colors border",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/60 text-foreground border-border active:bg-muted",
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
                className="w-full min-h-[52px] rounded-full border border-primary bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors active:opacity-90"
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
                        "min-h-[52px] rounded-full border px-4 text-sm font-semibold transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-muted/60 text-foreground active:bg-muted",
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
                  className="flex-1 min-w-[8rem] min-h-[52px] rounded-full border border-border bg-muted/60 px-4 text-sm font-semibold text-foreground transition-colors active:bg-muted"
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
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Bucket Size</p>
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(3, 1fr) auto" }}>
            {BUCKET_SIZES.map((b) => {
              const active = !showCustomBucket && bucket === b.value;
              return (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => { setBucket(b.value); setShowCustomBucket(false); setCustomBallsStr(""); }}
                  aria-pressed={active}
                  className={cn(
                    "h-[76px] rounded-[14px] border flex flex-col items-center justify-center gap-0.5 transition-colors",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border"
                  )}
                >
                  <span className="font-display text-[28px] leading-none tracking-[-0.01em]">{b.label.charAt(0)}</span>
                  <span className={cn("text-[11px] font-bold uppercase tracking-[0.12em]", active ? "opacity-80" : "opacity-60")}>{b.balls} BALLS</span>
                </button>
              );
            })}
            {/* Custom tile */}
            {showCustomBucket ? (
              <div className="h-[76px] w-[76px] rounded-[14px] border border-primary/50 bg-primary/5 flex flex-col items-center justify-center gap-1 px-2">
                <input
                  type="number"
                  value={customBallsStr}
                  onChange={(e) => setCustomBallsStr(e.target.value)}
                  placeholder="0"
                  min={1}
                  max={500}
                  autoFocus
                  className="w-full bg-transparent text-sm font-bold text-primary outline-none text-center"
                />
                <button
                  type="button"
                  onClick={() => { setShowCustomBucket(false); setCustomBallsStr(""); setBucket(null); }}
                  className="text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setShowCustomBucket(true); setBucket(null); }}
                className="h-[76px] w-[76px] rounded-[14px] border border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground text-[12px] font-semibold tracking-[0.06em]"
              >
                <Plus className="h-4 w-4" />
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
                    "min-h-[52px] rounded-full border px-4 text-sm font-semibold transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted/60 text-foreground active:bg-muted",
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
                className="min-h-[52px] rounded-full border border-dashed border-border px-4 text-sm font-semibold text-muted-foreground transition-colors active:bg-muted"
              >
                Custom
              </button>
            )}
          </div>
        </div>
        <SegmentedControl label="Goal" options={GOALS} value={goal} onChange={setGoal} />

      </div>

      <div className="fixed inset-x-0 z-40"
           style={{ bottom: "calc(68px + env(safe-area-inset-bottom))", background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.97) 32%)", backdropFilter: "blur(8px)" }}>
        <div className="mx-auto w-full max-w-[430px] px-4 pt-6 pb-4">
          <Button
            size="lg"
            disabled={!canGenerate}
            onClick={generate}
            className="h-14 w-full rounded-[14px] text-[14px] font-bold uppercase tracking-[0.06em]"
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Your Session</p>
            <h1 className="mt-1 font-display text-[36px] leading-[1.0] tracking-[-0.01em]">In progress.</h1>
          </div>
          <div className="text-right leading-none pb-1">
            <span className="font-stats text-[48px] leading-none tabular-nums text-primary">{completedCount}</span>
            <span className="font-stats text-[22px] leading-none tabular-nums text-muted-foreground">/{session.length}</span>
          </div>
        </div>

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
                    "font-ui text-[12px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 pb-2 border-b border-border",
                    isWarmUp && "text-primary",
                  )}
                >
                  {isWarmUp ? <Flame className="h-4 w-4" /> : null}
                  {club}
                  <span className="ml-auto font-stats text-[18px] text-muted-foreground tabular-nums">
                    {drills.filter(d => done.has(d.id)).length}/{drills.length}
                  </span>
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
                              <div className="flex items-center justify-between gap-2">
                                <p className={cn("font-semibold", isDone && "line-through text-muted-foreground")}>
                                  {d.drillName}
                                </p>
                                <span className={cn("font-stats text-[17px] leading-none tabular-nums shrink-0", isDone ? "text-muted-foreground" : "text-primary")}>
                                  {d.balls > 0 ? d.balls : d.unit ?? "—"}
                                  {d.balls > 0 && <span className="text-[10px] font-bold tracking-[0.14em] ml-0.5">BALLS</span>}
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
          <Trophy className="h-12 w-12" />
        </div>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
          Session Complete
        </p>
        <h1 className="mt-2 font-display text-[54px] leading-[0.95] tracking-[-0.015em]">
          Locked In,<br/><em className="italic">{name ? `${name}.` : "champ."}</em>
        </h1>

        <div className="mt-8 w-full rounded-2xl border border-border bg-card p-5 text-left">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Summary
          </p>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
            <Stat label="Balls Hit" value={String(drillBalls)} />
            <Stat label="Drills Done" value={String(record.drillCount)} />
            <Stat label="Goal" value={goalLabel} serif />
            <Stat label="Bucket" value={bucketLabel} serif />
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

function Stat({ label, value, serif = false }: { label: string; value: string; serif?: boolean }) {
  return (
    <div>
      <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      {serif
        ? <p className="mt-1.5 font-display text-[26px] leading-[0.95] tracking-[-0.005em]">{value}</p>
        : <p className="mt-1.5 font-stats text-[32px] leading-none tabular-nums text-primary">{value}</p>
      }
    </div>
  );
}
