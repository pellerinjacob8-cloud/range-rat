import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { ProModal } from "@/components/ProModal";
import { useMemo, useState, useEffect } from "react";
import { GuidedSessionView } from "@/components/GuidedSessionView";
import { Bookmark, BookmarkCheck, CheckCircle2, ChevronRight, Flame, Plus, RotateCcw, Sparkles, Star, Target, Trash2, Trophy, X, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { QuitGameButton } from "@/components/QuitGameButton";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  loadFavoritesAsync,
  saveFavorite,
  deleteFavorite,
  isAtFreeLimit,
  defaultFavoriteName,
  FREE_LIMIT,
  type Favorite,
} from "@/lib/favorites";
import {
  BASE_CLUB_GROUPS,
  BUCKET_SIZES,
  FULL_BAG_GROUP,
  GOALS,
  PLAYER_LEVELS,
  STYLE_PROFILES,
  TIMES,
  WARM_UP_PRESETS,
  buildWarmUp,
  deriveStyle,
  generateSession,
  recommendGoal,
  type BucketSize,
  type ClubGroup,
  type GenerateInput,
  type Goal,
  type PlayerLevel,
  type SessionDrill,
  type SessionPhase,
  type TimeAvailable,
  type WarmUpPreset,
} from "@/lib/drills";
import { fetchProfile, fetchHandicapHistory } from "@/lib/db";
import { loadProfileName } from "@/lib/profile";
import { cn } from "@/lib/utils";

// Golf convention: a handicap better than scratch reads "+2.1", not "-2.1".
const fmtHandicap = (h: number) => (h < 0 ? `+${Math.abs(h)}` : String(h));

// Per-phase presentation for the session checklist.
const PHASE_META: Record<SessionPhase, { icon: typeof Flame; blurb: string }> = {
  "Warm Up":   { icon: Flame,    blurb: "Loosen up — no scoring." },
  "Skill":     { icon: Target,   blurb: "Drills and focus blocks." },
  "Transfer":  { icon: RotateCcw, blurb: "Practice like you play." },
  "Challenge": { icon: Zap,      blurb: "Add some pressure." },
  "Test":      { icon: Trophy,   blurb: "End with a score." },
};
const PHASE_ORDER: SessionPhase[] = ["Warm Up", "Skill", "Transfer", "Challenge", "Test"];

export const Route = createFileRoute("/practice")({
  validateSearch: (search: Record<string, unknown>) => ({
    upgraded: search.upgraded === "true" ? true : undefined,
  }),
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
  // Save to Supabase (fire and forget)
  import("@/lib/db").then(({ saveSession: dbSave }) => {
    dbSave({
      id: record.id,
      completedAt: record.completedAt,
      filters: {
        goal: (input as { goal?: string }).goal ?? "",
        bucket: String((input as { bucket?: unknown }).bucket ?? ""),
        time: Number((input as { time?: unknown }).time ?? 0),
      },
      totalBalls: record.totalBalls,
      drillCount: record.drillCount,
    });
  });
  return record;
}

// ─── Page ────────────────────────────────────────────────────────────────────

function PracticePage() {
  const { upgraded } = Route.useSearch();
  const { isPro } = useAuth();
  const navigate = useNavigate();
  const [showUpgradedModal, setShowUpgradedModal] = useState(!!upgraded);
  const [proOpen, setProOpen] = useState(false);
  const [warmUp, setWarmUp] = useState<WarmUpPreset | null>(null);
  const [clubGroups, setClubGroups] = useState<ClubGroup[]>([]);
  const [bucket, setBucket] = useState<BucketSize | null>(null);
  const [time, setTime] = useState<TimeAvailable | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);

  // Practice style inputs: handicap drives it; level is the fallback when none.
  const [handicap, setHandicap] = useState<number | undefined>(undefined);
  const [level, setLevel] = useState<PlayerLevel | null>(() => {
    try { return (localStorage.getItem("rangeRat_level") as PlayerLevel) || null; } catch { return null; }
  });
  const [latestStats, setLatestStats] = useState<{ gir?: number; fairways?: number; putts?: number; upAndDowns?: number } | undefined>(undefined);

  const style = useMemo(() => deriveStyle(handicap, level ?? undefined), [handicap, level]);
  const recommendation = useMemo(() => recommendGoal(latestStats), [latestStats]);

  const chooseLevel = (l: PlayerLevel) => {
    setLevel(l);
    try { localStorage.setItem("rangeRat_level", l); } catch {}
  };

  useEffect(() => {
    fetchProfile().then((p) => { if (p?.handicap !== undefined) setHandicap(p.handicap); });
    fetchHandicapHistory().then((h) => {
      const latest = h[h.length - 1];
      if (latest) setLatestStats({ gir: latest.gir, fairways: latest.fairways, putts: latest.putts, upAndDowns: latest.upAndDowns });
    });
  }, []);

  const [session, setSession] = useState<SessionDrill[] | null>(() => loadActiveSession()?.session ?? null);
  const [sessionInput, setSessionInput] = useState<GenerateInput | null>(() => loadActiveSession()?.sessionInput ?? null);
  const [done, setDone] = useState<Set<string>>(() => new Set(loadActiveSession()?.done ?? []));
  const [completedRecord, setCompletedRecord] = useState<SavedSession | null>(null);
  const [sessionMode, setSessionMode] = useState<"pick" | "list" | "guided" | null>(null);
  const [practiceTab, setPracticeTab] = useState<"build" | "saved" | "mine">("build");
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  const reloadFavorites = () => loadFavoritesAsync().then(setFavorites);

  useEffect(() => {
    reloadFavorites();
    window.addEventListener("focus", reloadFavorites);
    return () => window.removeEventListener("focus", reloadFavorites);
  }, []);

  const autoFavorites = favorites.filter((f) => f.sessionInput !== null);
  const customSessions = favorites.filter((f) => f.sessionInput === null);

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
  const canGenerate = clubGroups.length >= 1 && hasValidBucket && hasValidTime && goals.length >= 1;

  // Tells the user why Generate is still disabled instead of a silent grey button
  const missingSteps = [
    clubGroups.length < 1 && "clubs",
    !hasValidBucket && "bucket size",
    !hasValidTime && "time",
    goals.length < 1 && "a goal",
  ].filter(Boolean) as string[];
  const missingHint = missingSteps.length > 0
    ? `Pick ${missingSteps.length === 1 ? missingSteps[0] : `${missingSteps.slice(0, -1).join(", ")} and ${missingSteps[missingSteps.length - 1]}`} to continue`
    : null;

  const generate = () => {
    if (!canGenerate) return;
    const input: GenerateInput = {
      clubGroups,
      bucket: bucket ?? "medium",  // placeholder when custom overrides
      time:   time   ?? 30,        // placeholder when custom overrides
      goal: goals[0],
      goals,
      handicap,
      level: level ?? undefined,
      style,
      ...(showCustomBucket && customBalls !== null ? { customBalls }          : {}),
      ...(showCustomTime   && customMins  !== null ? { customMinutes: customMins } : {}),
    };
    const drills = generateSession(input);
    const warmUpItems = warmUp ? buildWarmUp(warmUp) : [];
    setSessionInput(input);
    setSession([...warmUpItems, ...drills]);
    setDone(new Set());
    setCompletedRecord(null);
    setSessionMode("pick");
  };

  const reset = () => {
    clearActiveSession();
    setSession(null);
    setDone(new Set());
    setSessionInput(null);
    setCompletedRecord(null);
    setSessionMode(null);
  };

  const handleComplete = () => {
    if (!session) return;
    clearActiveSession();
    if (!sessionInput) {
      // Custom session — no stats to save, just reset
      reset();
      return;
    }
    const record = saveSession(session, sessionInput);
    setCompletedRecord(record);
  };

  // ── Completion screen
  if (completedRecord && session && sessionInput) {
    return (
      <CompletionView
        record={completedRecord}
        session={session}
        sessionInput={sessionInput}
        onNewSession={reset}
        onFavoriteSaved={() => loadFavoritesAsync().then(setFavorites)}
      />
    );
  }

  // ── Mode picker
  if (session && sessionMode === "pick") {
    return (
      <AppShell showBack>
        <div className="flex flex-col items-center pt-10 text-center px-2">
          <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Session Ready</p>
          <h1 className="mt-2 font-display text-[42px] leading-[0.98] tracking-[-0.01em]">
            Choose your<br />view.
          </h1>
          <p className="mt-3 text-[15px] text-muted-foreground max-w-[280px]">
            {session.length} drill{session.length !== 1 ? "s" : ""} · How do you want to work through them?
          </p>

          <div className="mt-10 w-full space-y-3">
            {/* Guided */}
            <button
              type="button"
              onClick={() => setSessionMode("guided")}
              className="w-full rounded-2xl border-2 border-primary bg-primary/5 px-5 py-5 text-left transition active:scale-[0.99]"
            >
              <p className="font-bold text-[16px] text-primary uppercase tracking-[0.06em]">Guided Mode</p>
              <p className="mt-1 text-[14px] text-muted-foreground">One drill at a time. No distractions.</p>
            </button>

            {/* List */}
            <button
              type="button"
              onClick={() => setSessionMode("list")}
              className="w-full rounded-2xl border border-border bg-card px-5 py-5 text-left transition active:scale-[0.99]"
            >
              <p className="font-bold text-[16px] uppercase tracking-[0.06em]">List View</p>
              <p className="mt-1 text-[14px] text-muted-foreground">See all drills, check them off as you go.</p>
            </button>
          </div>

          <button
            type="button"
            onClick={reset}
            className="mt-6 text-sm font-semibold text-muted-foreground active:opacity-70"
          >
            Cancel
          </button>
        </div>
      </AppShell>
    );
  }

  // ── Guided mode
  if (session && sessionMode === "guided") {
    return (
      <GuidedSessionView
        session={session}
        onComplete={handleComplete}
        onReset={reset}
      />
    );
  }

  // ── Active session checklist (list view)
  if (session && sessionMode === "list") {
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
      {/* ── Upgraded success modal ── */}
      {showUpgradedModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-8">
          <div className="w-full max-w-[430px] rounded-[28px] bg-background p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold-bg border border-gold-border">
              <Zap className="h-8 w-8 text-gold" />
            </div>
            <h2 className="font-display text-[32px] leading-tight">Welcome to Pro.</h2>
            <p className="mt-2 text-[15px] text-muted-foreground">
              Combine, Grid Game, yardages, and unlimited saves are now unlocked.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowUpgradedModal(false);
                navigate({ to: "/practice", replace: true });
              }}
              className="mt-6 h-14 w-full rounded-[14px] bg-primary text-primary-foreground font-bold text-[14px] uppercase tracking-[0.06em] active:opacity-90 transition-opacity"
            >
              Let's go
            </button>
          </div>
        </div>
      )}

      <div className="pb-32 space-y-7">
        {/* Build / Saved / My Sessions tab switcher */}
        <div className="pt-2 grid grid-cols-3 gap-2">
          {(["build", "saved", "mine"] as const).map((tab) => {
            const labels: Record<typeof tab, string> = { build: "Build", saved: "Saved", mine: "My Sessions" };
            const active = practiceTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setPracticeTab(tab)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl border py-3 text-[13px] font-semibold transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground active:bg-muted",
                )}
              >
                {tab === "saved" && <Star className="h-3.5 w-3.5" />}
                {labels[tab]}
                {tab === "saved" && (
                  <span className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground",
                  )}>
                    {autoFavorites.length}/{FREE_LIMIT}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Saved tab content */}
        {practiceTab === "saved" && (
          <SavedTab
            favorites={autoFavorites}
            onDelete={(id) => { deleteFavorite(id); reloadFavorites(); }}
            onRun={(fav) => {
              setSessionInput(fav.sessionInput);
              setSession(fav.session);
              setDone(new Set());
              setCompletedRecord(null);
              setSessionMode("pick");
            }}
          />
        )}

        {/* My Sessions tab content */}
        {practiceTab === "mine" && (
          <CustomSessionsTab
            sessions={customSessions}
            onDelete={(id) => { deleteFavorite(id); reloadFavorites(); }}
            onRun={(fav) => {
              setSessionInput(null);
              setSession(fav.session);
              setDone(new Set());
              setCompletedRecord(null);
              setSessionMode("pick");
            }}
          />
        )}

        {/* Builder — hidden when on Saved tab */}
        {practiceTab === "build" && (
        <div className="space-y-7">
        {/* Heading block */}
        <div className="pb-2">
          {/* "Step 1 of 1" was noise — there's only one step */}
          <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Practice</p>
          <h1 className="mt-1.5 font-display text-[38px] leading-[0.98] tracking-[-0.01em]">Build your session.</h1>
          <p className="mt-2.5 text-[15px] text-muted-foreground">
            {clubGroups.length || 0} group{clubGroups.length === 1 ? "" : "s"} · {
              bucket === "unlimited" ? "Unlimited" :
              showCustomBucket && customBalls ? `${customBalls} balls` :
              bucket === "small" ? "30 balls" : bucket === "medium" ? "60 balls" : bucket === "large" ? "100 balls" : "— balls"
            } · {
              showCustomTime && customMins ? `${customMins} min` : time ? `${time} min` : "— min"
            }
          </p>
        </div>

        {/* Today's plan — practice style, level, and Pro recommendation */}
        <div className="rounded-[20px] border border-border bg-card p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Practice style</p>
              <p className="mt-1 font-display text-[24px] leading-none">{STYLE_PROFILES[style].label}</p>
              <p className="mt-1.5 text-[13px] text-muted-foreground">{STYLE_PROFILES[style].blurb}</p>
              <p className="mt-1.5 text-[11px] text-muted-foreground/80">
                {handicap !== undefined
                  ? `Based on your ${fmtHandicap(handicap)} handicap`
                  : level
                  ? "Based on your selected level"
                  : "Pick your level to personalize your plan"}
              </p>
            </div>
          </div>

          {/* Level chips — only when no handicap is logged */}
          {handicap === undefined && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {PLAYER_LEVELS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => chooseLevel(l.value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    level === l.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted/60 text-foreground active:bg-muted",
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}

          {/* Pro recommendation from logged stats */}
          {recommendation && (
            isPro ? (
              <button
                type="button"
                onClick={() => setGoals([recommendation.goal])}
                className="w-full flex items-center gap-2.5 rounded-[14px] border border-gold-border bg-gold-bg p-3 text-left active:opacity-90 transition-opacity"
              >
                <Sparkles className="h-4 w-4 text-gold shrink-0" />
                <span className="flex-1 min-w-0 text-[12.5px] leading-snug text-foreground">
                  <span className="font-bold">Recommended: {GOALS.find((g) => g.value === recommendation.goal)?.label}</span>
                  {" "}— {recommendation.reason}. Tap to focus here.
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setProOpen(true)}
                className="w-full flex items-center gap-2.5 rounded-[14px] border border-border bg-muted/60 p-3 text-left active:bg-muted transition-colors"
              >
                <Zap className="h-4 w-4 text-gold shrink-0" />
                <span className="flex-1 min-w-0 text-[12.5px] leading-snug text-muted-foreground">
                  <span className="font-bold text-foreground">Pro:</span> a personalized focus picked from your round stats.
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            )
          )}
        </div>

        {/* Warm Up */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-primary" />
            <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-primary">
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
          <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
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
          <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Bucket Size</p>
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(4, 1fr) auto" }}>
            {BUCKET_SIZES.map((b) => {
              const active = !showCustomBucket && bucket === b.value;
              const isUnlimited = b.value === "unlimited";
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
                      : "bg-card text-foreground border-border active:bg-muted"
                  )}
                >
                  <span className="font-display text-[28px] leading-none tracking-[-0.01em]">
                    {isUnlimited ? "∞" : b.label.charAt(0)}
                  </span>
                  <span className={cn("text-[11px] font-bold uppercase tracking-[0.1em]", active ? "opacity-80" : "opacity-60")}>
                    {isUnlimited ? "NO LIMIT" : `${b.balls} BALLS`}
                  </span>
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
                className="h-[76px] w-[76px] rounded-[14px] border border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground text-[14px] font-semibold tracking-[0.06em] transition-colors active:bg-muted"
              >
                <Plus className="h-4 w-4" />
                Custom
              </button>
            )}
          </div>
        </div>

        {/* Time available */}
        <div className="space-y-2">
          <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
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
        <SegmentedControl
          label="Goal · Pick 1–2"
          multiple
          options={GOALS}
          value={goals}
          onChange={(next) => setGoals(next.slice(-2))}
          helper={
            goals.length === 2
              ? "Two goals — your session alternates between them."
              : "Pick one focus, or add a second to blend."
          }
        />

        </div>
        )}

      </div>

      {practiceTab === "build" && (
        <div className="fixed inset-x-0 z-40 bg-gradient-to-t from-background via-background/95 to-transparent"
             style={{ bottom: "calc(68px + env(safe-area-inset-bottom))", backdropFilter: "blur(8px)" }}>
          <div className="mx-auto w-full max-w-[430px] px-4 pt-6 pb-4">
            {!canGenerate && missingHint && (
              <p className="mb-2 text-center text-[12px] font-medium text-muted-foreground">{missingHint}</p>
            )}
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
      )}

      <ProModal
        open={proOpen}
        onClose={() => setProOpen(false)}
        reason="Pro reads your logged round stats and recommends what to practice — plus trends, history, and more."
      />
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

  // Group by session phase (Warm Up → Skill → Transfer → Challenge → Test).
  // Falls back to the block's club for any legacy session without a phase.
  const byPhase = useMemo(() => {
    const map = new Map<SessionPhase, SessionDrill[]>();
    session.forEach((d) => {
      const phase: SessionPhase = d.phase ?? (d.club === "Warm Up" ? "Warm Up" : "Skill");
      const arr = map.get(phase) ?? [];
      arr.push(d);
      map.set(phase, arr);
    });
    return PHASE_ORDER.filter((p) => map.has(p)).map((p) => [p, map.get(p)!] as const);
  }, [session]);

  return (
    <AppShell showBack>
      <div className="pb-12">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Your Session</p>
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
          {byPhase.map(([phase, drills]) => {
            const meta = PHASE_META[phase];
            const PhaseIcon = meta.icon;
            const isWarmUp = phase === "Warm Up";
            // A block's club is only meaningful in Skill/Warm Up; the back-half
            // phases use pseudo-clubs ("Transfer", "Challenge", "Performance Test").
            const showClub = (d: SessionDrill) =>
              !!d.club && !["Transfer", "Challenge", "Performance Test", "Warm Up"].includes(d.club);
            return (
              <section key={phase}>
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <PhaseIcon className={cn("h-4 w-4", isWarmUp ? "text-primary" : "text-muted-foreground")} />
                  <h2 className={cn("font-ui text-[14px] font-bold uppercase tracking-[0.2em]", isWarmUp && "text-primary")}>
                    {phase}
                  </h2>
                  <span className="ml-auto font-stats text-[18px] text-muted-foreground tabular-nums">
                    {drills.filter(d => done.has(d.id)).length}/{drills.length}
                  </span>
                </div>
                <p className="mt-1.5 text-[12px] text-muted-foreground">{meta.blurb}</p>
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
                                <div className="min-w-0">
                                  {showClub(d) && (
                                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/80">{d.club}</p>
                                  )}
                                  <p className={cn("font-semibold", isDone && "line-through text-muted-foreground")}>
                                    {d.drillName}
                                  </p>
                                </div>
                                <span className={cn("font-stats text-[22px] leading-none tabular-nums shrink-0", isDone ? "text-muted-foreground" : "text-foreground")}>
                                  {d.balls > 0 ? d.balls : d.unit ?? "—"}
                                  {d.balls > 0 && (
                                    <span className="text-[13px] font-bold tracking-[0.14em] ml-0.5">
                                      {d.isTarget ? "TARGET" : "BALLS"}
                                    </span>
                                  )}
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
  sessionInput,
  onNewSession,
  onFavoriteSaved,
}: {
  record: SavedSession;
  session: SessionDrill[];
  sessionInput: GenerateInput;
  onNewSession: () => void;
  onFavoriteSaved: () => void;
}) {
  const navigate = useNavigate();
  const name = loadProfileName();
  const drillBalls = session
    .filter((d) => d.club !== "Warm Up")
    .reduce((sum, d) => sum + d.balls, 0);
  const goalLabel = GOALS.find((g) => g.value === record.filters.goal)?.label ?? "";
  const bucketLabel = BUCKET_SIZES.find((b) => b.value === record.filters.bucket)?.label ?? "";

  const [saveOpen, setSaveOpen] = useState(false);
  const [proOpen, setProOpen] = useState(false);
  const [favName, setFavName] = useState(() => defaultFavoriteName(sessionInput));
  const [saved, setSaved] = useState(false);
  const [existingFavs, setExistingFavs] = useState<Favorite[]>([]);
  useEffect(() => { loadFavoritesAsync().then(setExistingFavs); }, []);

  const handleSaveClick = () => {
    if (isAtFreeLimit(existingFavs)) { setProOpen(true); return; }
    setSaveOpen(true);
  };

  const confirmSave = () => {
    saveFavorite(favName, sessionInput, session);
    setSaveOpen(false);
    setSaved(true);
    onFavoriteSaved();
  };

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

          {/* Save favorite */}
          {saved ? (
            <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-4 text-sm font-bold uppercase tracking-wide text-primary">
              <BookmarkCheck className="h-4 w-4" />
              Saved to Favorites
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSaveClick}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-4 text-sm font-bold uppercase tracking-wide text-muted-foreground transition active:scale-[0.99]"
            >
              <Bookmark className="h-4 w-4" />
              Save Session
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="h-12 w-full rounded-xl border border-border bg-muted px-4 text-sm font-bold uppercase tracking-wide text-muted-foreground transition active:bg-muted/80"
          >
            Back to Home
          </button>
        </div>
      </div>

      {/* Save dialog */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Save this session?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-1">Give it a nickname so you can run it again anytime.</p>
          <input
            autoFocus
            value={favName}
            onChange={(e) => setFavName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && favName.trim()) confirmSave(); }}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold outline-none focus:border-primary"
          />
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setSaveOpen(false)}
              className="flex-1 rounded-xl border border-border py-3 text-sm font-bold text-muted-foreground active:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmSave}
              disabled={!favName.trim()}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40 active:opacity-90"
            >
              Save
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <ProModal
        open={proOpen}
        onClose={() => setProOpen(false)}
        reason={`Free accounts can save up to ${FREE_LIMIT} session${FREE_LIMIT !== 1 ? "s" : ""}. Go Pro for unlimited saves and every feature.`}
      />
    </AppShell>
  );
}

// ─── Custom Sessions Tab ──────────────────────────────────────────────────────

function CustomSessionsTab({
  sessions,
  onDelete,
  onRun,
}: {
  sessions: Favorite[];
  onDelete: (id: string) => void;
  onRun: (fav: Favorite) => void;
}) {
  const navigate = useNavigate();
  const { isPro } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [proOpen, setProOpen] = useState(false);

  if (!isPro) {
    return (
      <>
        <div className="flex flex-col items-center py-12 text-center px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-bg border border-gold-border mb-4">
            <Zap className="h-8 w-8 text-gold" />
          </div>
          <h2 className="font-display text-[26px] leading-tight">My Sessions</h2>
          <p className="mt-2 text-[14px] text-muted-foreground max-w-[260px]">
            Build and save your own custom practice sessions. Pro feature.
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 bg-gold-bg border border-gold-border text-gold rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]">
            <Zap className="h-3 w-3" />
            Range Rat Pro
          </div>
          <button
            type="button"
            onClick={() => setProOpen(true)}
            className="mt-6 h-12 px-6 rounded-[14px] bg-primary text-primary-foreground font-bold text-[13px] uppercase tracking-[0.06em] active:opacity-90"
          >
            Upgrade to Pro
          </button>
        </div>
        <ProModal
          open={proOpen}
          onClose={() => setProOpen(false)}
          reason="Build and save your own custom practice sessions with any drills you want."
        />
      </>
    );
  }

  return (
    <div className="space-y-3">
      {/* New session button */}
      <button
        type="button"
        onClick={() => navigate({ to: "/custom-session" })}
        className="w-full h-14 rounded-[14px] border-2 border-dashed border-border flex items-center justify-center gap-2 text-[14px] font-semibold text-muted-foreground active:bg-muted transition-colors"
      >
        <Plus className="h-4 w-4" />
        New Session
      </button>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center">
          <p className="text-[15px] font-semibold text-foreground">No sessions yet</p>
          <p className="mt-1 text-[13px] text-muted-foreground max-w-[220px]">
            Tap "New Session" to build your first custom practice.
          </p>
        </div>
      ) : (
        sessions.map((fav) => {
          const totalBalls = fav.session.reduce((s, d) => s + d.balls, 0);
          return (
            <div key={fav.id} className="rounded-2xl border border-border bg-card px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold leading-none truncate">{fav.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(fav.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {fav.session.length} drill{fav.session.length !== 1 ? "s" : ""}
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {totalBalls} balls
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {confirmDelete === fav.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => { onDelete(fav.id); setConfirmDelete(null); }}
                        className="rounded-full bg-destructive px-3 py-1 text-xs font-bold text-white active:opacity-80"
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(null)}
                        className="rounded-full border border-border px-3 py-1 text-xs font-bold text-muted-foreground active:bg-muted"
                      >
                        Keep
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(fav.id)}
                      className="rounded-full p-2 text-muted-foreground active:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRun(fav)}
                className="mt-3 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground active:opacity-90"
              >
                Run Session
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Saved Tab ────────────────────────────────────────────────────────────────

function SavedTab({
  favorites,
  onDelete,
  onRun,
}: {
  favorites: Favorite[];
  onDelete: (id: string) => void;
  onRun: (fav: Favorite) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Star className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="mt-4 font-display text-xl">No saved sessions</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-[240px]">
          Complete a session and tap "Save Session" to bookmark it here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {favorites.map((fav) => (
        <div key={fav.id} className="rounded-2xl border border-border bg-card px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold leading-none truncate">{fav.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(fav.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {fav.sessionInput?.clubGroups.map((g) => (
                  <span key={g} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {g === "full-bag" ? "Full Bag" : g.replace(/-/g, " ")}
                  </span>
                ))}
                {fav.sessionInput && (
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {fav.sessionInput.goal}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {confirmDelete === fav.id ? (
                <>
                  <button
                    type="button"
                    onClick={() => { onDelete(fav.id); setConfirmDelete(null); }}
                    className="rounded-full bg-destructive px-3 py-1 text-xs font-bold text-white active:opacity-80"
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(null)}
                    className="rounded-full border border-border px-3 py-1 text-xs font-bold text-muted-foreground active:bg-muted"
                  >
                    Keep
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(fav.id)}
                  className="rounded-full p-2 text-muted-foreground active:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onRun(fav)}
            className="mt-3 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground active:opacity-90"
          >
            Run Session
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Stat ─────────────────────────────────────────────────────────────────────

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
