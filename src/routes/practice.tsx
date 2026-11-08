import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { ProModal } from "@/components/ProModal";
import { useMemo, useState, useEffect } from "react";
import { BlockSessionView } from "@/components/BlockSessionView";
import { Bookmark, BookmarkCheck, Check, ChevronRight, CircleDot, Flag, Lock, Plus, Sparkles, Star, Target, Trash2, Trophy, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
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
  FREE_LIMIT,
  type Favorite,
} from "@/lib/favorites";
import { TIMES, type GenerateInput, type TimeAvailable } from "@/lib/drills";
import {
  PLANS,
  areasOf,
  buildPlan,
  blocksToDrills,
  drillsToBlocks,
  estimateMinutes,
  levelFrom,
  pickFocus,
  pickNeglected,
  totalBalls,
  type AddOn,
  type PlanKind,
  type TrackedSession,
  type PlanFocus,
  type PlanLength,
  type PlanLevel,
  type PracticeBlock,
  type RoundStats,
  type SwingYards,
} from "@/lib/practicePlan";
import { fetchProfile, fetchHandicapHistory, fetchPlayableBag, fetchSessions, fetchYardages } from "@/lib/db";
import type { Club } from "@/lib/db";
import {
  PUTTING_MODES,
  planStations,
  categoryLabel,
  summarizeSession,
  summarizeStation,
  SETS_PER_STATION,
  type PuttStation,
  type PuttingMode,
  type PuttingSessionConfig,
  type SetResult,
  type StationResult,
} from "@/lib/putting";
import { PuttingSessionView } from "@/components/PuttingSessionView";
import { loadProfileName } from "@/lib/profile";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/practice")({
  validateSearch: (search: Record<string, unknown>) => ({
    upgraded: search.upgraded === "true" ? true : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Range Rat: Practice" },
      {
        name: "description",
        content:
          "A simple range session built from your bag: one club, a ball count, and one thing to focus on at a time.",
      },
    ],
  }),
  component: PracticePage,
});

// ─── LocalStorage ────────────────────────────────────────────────────────────

const ACTIVE_KEY = "range-rat:active-session";
const PREFS_KEY  = "range-rat:plan-prefs";

type RunSource = "plan" | "saved" | "custom";

interface RunState {
  blocks: PracticeBlock[];
  index: number;
  label: string;
  source: RunSource;
  focus?: PlanFocus | null;
}

interface DoneState {
  blocks: PracticeBlock[];
  blocksDone: number;
  balls: number;
  label: string;
  source: RunSource;
  focus?: PlanFocus | null;
}

interface PlanPrefs {
  plan: PlanKind;
  length: PlanLength;
  addOns: AddOn[];
  forYou: boolean;
  level?: PlanLevel;
}

function loadPrefs(): PlanPrefs {
  const fallback: PlanPrefs = { plan: "standard", length: "quick", addOns: [], forYou: true };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<PlanPrefs>) } : fallback;
  } catch { return fallback; }
}

function savePrefs(p: PlanPrefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch {}
}

function loadActiveRun(): RunState | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.run?.blocks?.length) return parsed.run as RunState;
    // Session started before the block redesign: resume it in the block view.
    if (Array.isArray(parsed?.session) && parsed.session.length > 0) {
      const done = new Set<string>(parsed.done ?? []);
      const blocks = drillsToBlocks(parsed.session);
      const firstOpen = blocks.findIndex((b) => !done.has(b.id));
      return { blocks, index: firstOpen === -1 ? blocks.length - 1 : firstOpen, label: "Practice", source: "saved" };
    }
    return null;
  } catch { return null; }
}

function persistActiveRun(run: RunState) {
  try {
    localStorage.setItem(ACTIVE_KEY, JSON.stringify({
      type: "practice",
      route: "/practice",
      label: run.label,
      subtitle: `Block ${run.index + 1} of ${run.blocks.length}`,
      run,
    }));
  } catch {}
}

function clearActiveSession() {
  try { localStorage.removeItem(ACTIVE_KEY); } catch {}
}

// Putting active-session snapshot, kept separate from the range's since the
// two flows share nothing (no block list, no clubs).
interface ActivePuttingData {
  config: PuttingSessionConfig;
  stations: PuttStation[];
  results: StationResult[];
  currentSets: SetResult[];
}

function loadActivePutting(): ActivePuttingData | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.puttingRunner ?? null;
  } catch { return null; }
}

function persistActivePutting(runner: ActivePuttingData) {
  try {
    const totalStations = runner.stations.length;
    const stationsDone = runner.results.length;
    localStorage.setItem(ACTIVE_KEY, JSON.stringify({
      type: "putting",
      route: "/practice",
      label: "Putting Green",
      subtitle: `Station ${Math.min(stationsDone + 1, totalStations)} of ${totalStations}`,
      puttingRunner: runner,
    }));
  } catch {}
}

interface SavedSession {
  id: string;
  completedAt: string;
  filters: { goal: string; bucket: string; time: number };
  totalBalls: number;
  drillCount: number;
  practiceAreas?: string[];
}

// Records balls hit and blocks done so Home's weekly count keeps working.
// This is activity only: no scores or results are tracked in practice.
function saveRangeSession(blocksDone: PracticeBlock[], label: string): SavedSession {
  const record: SavedSession = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    completedAt: new Date().toISOString(),
    filters: { goal: label, bucket: "plan", time: estimateMinutes(blocksDone) },
    totalBalls: totalBalls(blocksDone),
    drillCount: blocksDone.length,
    practiceAreas: areasOf(blocksDone),
  };
  import("@/lib/db")
    .then(({ saveSession: dbSave }) => dbSave(record).catch(() => dbSave(record)))
    .catch(() => {
      toast.error("Session finished, but it couldn't sync to your stats. Check your connection.");
    });
  return record;
}

// Putting session record. totalBalls/makes are the sum across every scored
// set actually completed (a quit-early session still saves what was done).
function savePuttingSession(results: StationResult[], config: PuttingSessionConfig): SavedSession {
  const { attempts, makes } = summarizeSession(results);
  const timeMinutes = config.time === "unlimited" ? 0 : config.time;
  const record: SavedSession = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    completedAt: new Date().toISOString(),
    filters: { goal: `putting-${config.mode}`, bucket: String(config.ballCount), time: timeMinutes },
    totalBalls: attempts,
    drillCount: results.reduce((s, r) => s + r.sets.length, 0),
  };
  import("@/lib/db")
    .then(({ saveSession: dbSave }) => {
      const payload = {
        id: record.id,
        completedAt: record.completedAt,
        filters: record.filters,
        totalBalls: record.totalBalls,
        drillCount: record.drillCount,
        area: "putting" as const,
        makes,
        attempts,
      };
      return dbSave(payload).catch(() => dbSave(payload));
    })
    .catch(() => {
      toast.error("Session finished, but it couldn't sync to your stats. Check your connection.");
    });
  return record;
}

// Favorites need a GenerateInput to count as a saved generated session (vs a
// Pro custom session). Plan sessions store this neutral placeholder.
const PLAN_INPUT: GenerateInput = { clubGroups: ["full-bag"], bucket: "medium", time: 30, goal: "consistency" };

const FOCUS_LABEL: Record<PlanFocus, string> = {
  "tee-shots": "tee shots",
  "approach": "approach shots",
  "short-game": "wedge work",
  "putting": "putting",
};

// ─── Page ────────────────────────────────────────────────────────────────────

function PracticePage() {
  const { upgraded } = Route.useSearch();
  const { isPro } = useAuth();
  const navigate = useNavigate();
  const [showUpgradedModal, setShowUpgradedModal] = useState(!!upgraded);
  const [proOpen, setProOpen] = useState(false);
  const [proText, setProText] = useState("");
  const openPro = (text: string) => { setProText(text); setProOpen(true); };

  // Builder choices, remembered between visits
  const [prefs] = useState(loadPrefs);
  const [planKind, setPlanKind] = useState<PlanKind>(prefs.plan);
  const [length, setLength] = useState<PlanLength>(prefs.length);
  const [addOns, setAddOns] = useState<AddOn[]>(prefs.addOns);
  const [forYouOn, setForYouOn] = useState(prefs.forYou);
  const [levelOverride, setLevelOverride] = useState<PlanLevel | null>(prefs.level ?? null);

  useEffect(() => {
    savePrefs({ plan: planKind, length, addOns, forYou: forYouOn, level: levelOverride ?? undefined });
  }, [planKind, length, addOns, forYouOn, levelOverride]);

  // Level comes from handicap (cached so it doesn't flash), then the old
  // self-rated level, unless the golfer picked one here.
  const [handicap, setHandicap] = useState<number | undefined>(() => {
    try {
      const cached = localStorage.getItem("rangeRat_handicap");
      return cached !== null ? Number(cached) : undefined;
    } catch { return undefined; }
  });
  const [selfLevel] = useState<string | null>(() => {
    try { return localStorage.getItem("rangeRat_level"); } catch { return null; }
  });
  const level: PlanLevel = levelOverride ?? levelFrom(handicap, selfLevel);

  const [latestStats, setLatestStats] = useState<RoundStats | undefined>(undefined);
  const [userBag, setUserBag] = useState<Club[]>([]);
  const [bagLoaded, setBagLoaded] = useState(false);
  const [yardages, setYardages] = useState<Record<string, SwingYards>>({});
  const [history, setHistory] = useState<TrackedSession[]>([]);

  useEffect(() => {
    fetchProfile().then((p) => {
      if (!p) return;
      setHandicap(p.handicap);
      try {
        if (p.handicap !== undefined) localStorage.setItem("rangeRat_handicap", String(p.handicap));
        else localStorage.removeItem("rangeRat_handicap");
      } catch {}
    });
    fetchHandicapHistory().then((h) => {
      const latest = h[h.length - 1];
      if (latest) setLatestStats({ gir: latest.gir, fairways: latest.fairways, putts: latest.putts, upAndDowns: latest.upAndDowns });
    });
    fetchPlayableBag().then((b) => { setUserBag(b); setBagLoaded(true); }).catch(() => setBagLoaded(true));
    fetchYardages().then(setYardages).catch(() => {});
    fetchSessions()
      .then((all) => setHistory(all.filter((x) => (x.area ?? "range") === "range")))
      .catch(() => {});
  }, []);

  // Free accounts can only run the Standard plan, even if a Pro plan was
  // remembered from before a subscription ended.
  const plan_: PlanKind = isPro ? planKind : "standard";
  const isStandard = plan_ === "standard";

  const focusPick = useMemo(() => pickFocus(latestStats), [latestStats]);
  const neglected = useMemo(() => pickNeglected(history), [history]);
  const activeFocus: PlanFocus | null = isPro && isStandard && forYouOn && focusPick ? focusPick.focus : null;
  // Practice balance only adds something on a Quick session that doesn't already include it.
  const activeBalance: AddOn | null =
    isPro && isStandard && forYouOn && length === "quick" && neglected && !addOns.includes(neglected.addOn)
      ? neglected.addOn
      : null;
  const hasForYou = !!(focusPick && focusPick.focus !== "putting") || !!neglected;

  const plan = useMemo(
    () => buildPlan({ plan: plan_, length, addOns, level, focus: activeFocus, balance: activeBalance }, userBag, yardages),
    [plan_, length, addOns, level, activeFocus, activeBalance, userBag, yardages],
  );
  const quickMinutes = useMemo(
    () => estimateMinutes(buildPlan({ length: "quick", addOns, level, focus: activeFocus, balance: activeBalance }, userBag, yardages)),
    [addOns, level, activeFocus, activeBalance, userBag, yardages],
  );
  const fullMinutes = useMemo(
    () => estimateMinutes(buildPlan({ length: "full", addOns: [], level, focus: activeFocus }, userBag, yardages)),
    [level, activeFocus, userBag, yardages],
  );

  const [run, setRun] = useState<RunState | null>(() => loadActiveRun());
  const [done, setDone] = useState<DoneState | null>(null);

  // Putting: a separate state track (no block list, no clubs).
  const [puttingConfig, setPuttingConfig] = useState<PuttingSessionConfig | null>(() => loadActivePutting()?.config ?? null);
  const [puttingStations, setPuttingStations] = useState<PuttStation[]>(() => loadActivePutting()?.stations ?? []);
  const [puttingResults, setPuttingResults] = useState<StationResult[]>(() => loadActivePutting()?.results ?? []);
  const [puttingCurrentSets, setPuttingCurrentSets] = useState<SetResult[]>(() => loadActivePutting()?.currentSets ?? []);
  const [puttingFinalResults, setPuttingFinalResults] = useState<StationResult[] | null>(null);
  const [puttingCompletedRecord, setPuttingCompletedRecord] = useState<SavedSession | null>(null);

  // Which practice area the builder is showing. A resumed session skips the
  // picker and lands back in its own area.
  const [areaView, setAreaView] = useState<"picker" | "range" | "putting">(() => {
    if (loadActivePutting()) return "putting";
    if (loadActiveRun()) return "range";
    return "picker";
  });
  const [practiceTab, setPracticeTab] = useState<"build" | "saved" | "mine">("build");
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  const resetAll = () => {
    clearActiveSession();
    setRun(null);
    setDone(null);
    setPuttingConfig(null);
    setPuttingStations([]);
    setPuttingResults([]);
    setPuttingCurrentSets([]);
    setPuttingFinalResults(null);
    setPuttingCompletedRecord(null);
    setAreaView("picker");
  };

  const reloadFavorites = () => loadFavoritesAsync().then(setFavorites);

  useEffect(() => {
    reloadFavorites();
    window.addEventListener("focus", reloadFavorites);
    return () => window.removeEventListener("focus", reloadFavorites);
  }, []);

  const autoFavorites = favorites.filter((f) => f.sessionInput !== null);
  const customSessions = favorites.filter((f) => f.sessionInput === null);

  // Persist the active range run whenever it moves
  useEffect(() => {
    if (run) persistActiveRun(run);
  }, [run]);

  // Persist the putting runner whenever its progress changes
  useEffect(() => {
    if (puttingConfig && puttingStations.length > 0) {
      persistActivePutting({ config: puttingConfig, stations: puttingStations, results: puttingResults, currentSets: puttingCurrentSets });
    }
  }, [puttingConfig, puttingStations, puttingResults, puttingCurrentSets]);

  const startPlan = () => {
    if (plan.length === 0) return;
    setDone(null);
    setRun({
      blocks: plan,
      index: 0,
      label: isStandard
        ? (length === "quick" ? "Quick session" : "Full session")
        : PLANS.find((p) => p.value === plan_)?.label ?? "Practice",
      source: "plan",
      focus: activeFocus,
    });
  };

  const startFavorite = (fav: Favorite, source: RunSource) => {
    setDone(null);
    setRun({ blocks: drillsToBlocks(fav.session), index: 0, label: fav.name, source });
  };

  const finishRun = (blocksDone: number) => {
    if (!run) return;
    clearActiveSession();
    const finished = run.blocks.slice(0, blocksDone);
    const balls = totalBalls(finished);
    if (finished.length > 0) {
      const record = saveRangeSession(finished, run.label);
      setHistory((h) => [{ completedAt: record.completedAt, practiceAreas: record.practiceAreas }, ...h]);
    }
    setDone({ blocks: run.blocks, blocksDone: finished.length, balls, label: run.label, source: run.source, focus: run.focus });
    setRun(null);
  };

  const discardRun = () => {
    clearActiveSession();
    setRun(null);
  };

  // Called by PuttingSessionView when the user finishes (whether all planned
  // stations were completed, or they ended early with something scored).
  const handlePuttingFinish = (results: StationResult[]) => {
    clearActiveSession();
    const config = puttingConfig!;
    const record = savePuttingSession(results, config);
    setPuttingFinalResults(results);
    setPuttingCompletedRecord(record);
  };

  // ── Completion screen (putting)
  if (puttingCompletedRecord && puttingFinalResults && puttingConfig) {
    return (
      <PuttingCompletionView
        record={puttingCompletedRecord}
        results={puttingFinalResults}
        config={puttingConfig}
        onNewSession={resetAll}
      />
    );
  }

  // ── Active putting session (not yet finished)
  if (puttingConfig && puttingStations.length > 0) {
    return (
      <PuttingSessionView
        config={puttingConfig}
        stations={puttingStations}
        results={puttingResults}
        currentSets={puttingCurrentSets}
        onProgress={(stations, results, currentSets) => {
          setPuttingStations(stations);
          setPuttingResults(results);
          setPuttingCurrentSets(currentSets);
        }}
        onFinish={handlePuttingFinish}
        onQuit={resetAll}
      />
    );
  }

  // ── Completion screen (range)
  if (done) {
    return (
      <RangeCompletionView
        done={done}
        onNewSession={() => { setDone(null); setAreaView("range"); setPracticeTab("build"); }}
        onFavoriteSaved={reloadFavorites}
      />
    );
  }

  // ── Active range session
  if (run) {
    return (
      <BlockSessionView
        blocks={run.blocks}
        index={run.index}
        onIndexChange={(i) => setRun((r) => (r ? { ...r, index: i } : r))}
        onFinish={finishRun}
        onDiscard={discardRun}
      />
    );
  }

  // ── Practice area picker
  if (areaView === "picker") {
    return (
      <AreaPickerView
        onPick={(area) => setAreaView(area)}
      />
    );
  }

  // ── Putting green builder
  if (areaView === "putting") {
    return (
      <PuttingBuilder
        onBack={() => setAreaView("picker")}
        onGenerate={(config) => {
          setPuttingConfig(config);
          setPuttingStations(planStations(config));
          setPuttingResults([]);
          setPuttingCurrentSets([]);
          setPuttingFinalResults(null);
          setPuttingCompletedRecord(null);
        }}
      />
    );
  }

  const planBalls = totalBalls(plan);
  const planMinutes = estimateMinutes(plan);
  const toggleAddOn = (a: AddOn) =>
    setAddOns((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  // Preview rows grouped by section, in session order
  const sections: { name: string; blocks: PracticeBlock[] }[] = [];
  for (const b of plan) {
    const last = sections[sections.length - 1];
    if (last && last.name === b.section) last.blocks.push(b);
    else sections.push({ name: b.section, blocks: [b] });
  }

  const ADD_ONS: { value: AddOn; label: string; sub: string }[] = [
    { value: "control",   label: "Control",   sub: level === "learning" ? "Aim at new targets" : "Shape and height" },
    { value: "tee-shots", label: "Tee shots", sub: level === "learning" ? "Hybrid and driver" : "Driving iron and driver" },
  ];

  // ── Builder screen (driving range)
  return (
    <AppShell showBack onBack={() => setAreaView("picker")}>
      {/* ── Upgraded success modal ── */}
      {showUpgradedModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-8">
          <div className="w-full max-w-[430px] rounded-[28px] bg-background p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold-bg border border-gold-border">
              <Zap className="h-8 w-8 text-gold" />
            </div>
            <h2 className="font-display text-[32px] leading-tight">Welcome to Pro.</h2>
            <p className="mt-2 text-[15px] text-muted-foreground">
              Combine, Grid Game, custom sessions, and unlimited saves are now unlocked.
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

      <div className="pb-32 space-y-6">
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
                    {isPro ? autoFavorites.length : `${autoFavorites.length}/${FREE_LIMIT}`}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {practiceTab === "saved" && (
          <SavedTab
            favorites={autoFavorites}
            onDelete={(id) => { deleteFavorite(id); reloadFavorites(); }}
            onRun={(fav) => startFavorite(fav, "saved")}
          />
        )}

        {practiceTab === "mine" && (
          <CustomSessionsTab
            sessions={customSessions}
            onDelete={(id) => { deleteFavorite(id); reloadFavorites(); }}
            onRun={(fav) => startFavorite(fav, "custom")}
          />
        )}

        {practiceTab === "build" && (
          <div className="space-y-6">
            {/* Heading */}
            <div>
              <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Driving Range</p>
              <h1 className="mt-1.5 font-display text-[38px] leading-[0.98] tracking-[-0.01em]">Today's session.</h1>
              <p className="mt-2 text-[15px] text-muted-foreground tabular-nums">
                {plan.length} blocks · {planBalls} balls · about {planMinutes} min
              </p>
            </div>

            {/* Plan picker: Standard is free, the rest are Pro */}
            <div className="space-y-2">
              <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex w-max gap-2">
                  {PLANS.map((p) => {
                    const locked = p.pro && !isPro;
                    const active = plan_ === p.value;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => {
                          if (locked) {
                            openPro(`${p.label} is a Pro plan. Pro adds Scoring day, Ball striking, Pre-round, and Play holes, plus sessions built from your rounds.`);
                          } else {
                            setPlanKind(p.value);
                          }
                        }}
                        aria-pressed={active}
                        className={cn(
                          "inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-[13px] font-bold transition-colors",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : locked
                            ? "border-border bg-card text-muted-foreground active:bg-muted"
                            : "border-border bg-card text-foreground active:bg-muted",
                        )}
                      >
                        {locked && <Lock className="h-3 w-3 text-gold" />}
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {!isStandard && (
                <p className="text-[13px] text-muted-foreground">{PLANS.find((p) => p.value === plan_)?.blurb}</p>
              )}
            </div>

            {/* Built for you (Pro), or the one Pro prompt for free users */}
            {isStandard && (isPro ? (
              focusPick || neglected ? (
                <div
                  className={cn(
                    "rounded-[18px] border p-4 transition-colors",
                    forYouOn || focusPick?.focus === "putting" ? "border-gold-border bg-gold-bg" : "border-border bg-card",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.16em] text-gold">
                        <Sparkles className="h-3.5 w-3.5" /> Built for you
                      </p>
                      {focusPick && (
                        <p className="mt-1.5 text-[14px] leading-snug text-foreground">{focusPick.reason}</p>
                      )}
                      {neglected && (
                        <p className="mt-1.5 text-[14px] leading-snug text-foreground">
                          {neglected.line}
                          {length === "full" || addOns.includes(neglected.addOn)
                            ? ", and it's in today's session."
                            : forYouOn ? ". Added today." : "."}
                        </p>
                      )}
                    </div>
                    {hasForYou && (
                      <button
                        type="button"
                        onClick={() => setForYouOn((v) => !v)}
                        aria-pressed={forYouOn}
                        aria-label={forYouOn ? "Turn off Built for you" : "Turn on Built for you"}
                        className={cn(
                          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                          forYouOn ? "border-gold bg-gold text-white" : "border-muted-foreground/40",
                        )}
                      >
                        {forYouOn && <Check className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                  {focusPick?.focus === "putting" && (
                    <button
                      type="button"
                      onClick={() => setAreaView("putting")}
                      className="mt-3 inline-flex h-10 items-center gap-1 rounded-full bg-primary px-4 text-[13px] font-bold text-primary-foreground active:opacity-90"
                    >
                      Go to Putting Green <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate({ to: "/profile" })}
                  className="flex w-full items-center gap-2.5 rounded-[18px] border border-border bg-card p-4 text-left active:bg-muted"
                >
                  <Sparkles className="h-4 w-4 shrink-0 text-gold" />
                  <span className="flex-1 text-[13.5px] leading-snug text-muted-foreground">
                    Log a round on Profile and today's session gets built around it.
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => openPro("Pro reads your last round and builds today's practice around it, plus Pro plans, Combine, and more.")}
                className="flex w-full items-center gap-2.5 rounded-[18px] border border-gold-border bg-gold-bg p-4 text-left active:opacity-90"
              >
                <Sparkles className="h-4 w-4 shrink-0 text-gold" />
                <span className="flex-1 text-[13.5px] leading-snug text-foreground">
                  {focusPick
                    ? <>{focusPick.stat}. <span className="font-bold">Pro</span> turns that into today's practice plan.</>
                    : neglected
                    ? <>{neglected.line}. <span className="font-bold">Pro</span> plans your sessions around what you've been skipping.</>
                    : <><span className="font-bold">Pro</span> builds today's session around your last round.</>}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-gold" />
              </button>
            ))}

            {/* Length (Standard only; Pro plans are fixed) */}
            {isStandard && (
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: "quick" as const, label: "Quick", sub: `About ${quickMinutes} min` },
                { value: "full" as const,  label: "Full session", sub: `About ${fullMinutes} min` },
              ]).map((opt) => {
                const active = length === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLength(opt.value)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-[16px] border px-4 py-4 text-left transition-colors",
                      active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card active:bg-muted",
                    )}
                  >
                    <p className="text-[15px] font-bold">{opt.label}</p>
                    <p className={cn("mt-0.5 text-[12.5px]", active ? "text-primary-foreground/75" : "text-muted-foreground")}>{opt.sub}</p>
                  </button>
                );
              })}
            </div>

            )}

            {/* Add-ons (Full already includes both) */}
            {isStandard && length === "quick" && (
              <div className="space-y-2">
                <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Add on</p>
                <div className="grid grid-cols-2 gap-2">
                  {ADD_ONS.map((a) => {
                    const active = addOns.includes(a.value);
                    return (
                      <button
                        key={a.value}
                        type="button"
                        onClick={() => toggleAddOn(a.value)}
                        aria-pressed={active}
                        className={cn(
                          "flex items-start gap-2 rounded-[16px] border px-3.5 py-3 text-left transition-colors",
                          active ? "border-primary bg-primary/5" : "border-border bg-card active:bg-muted",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2",
                            active ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                          )}
                          aria-hidden
                        >
                          {active ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3 text-muted-foreground" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[14px] font-bold leading-tight">{a.label}</span>
                          <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">{a.sub}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Level: changes the cues and tips, not the screen */}
            <div className="space-y-2">
              <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Your level</p>
              <div className="inline-flex rounded-full border border-border bg-card p-0.5">
                {(["learning", "experienced"] as const).map((l) => {
                  const active = level === l;
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLevelOverride(l)}
                      aria-pressed={active}
                      className={cn(
                        "h-10 rounded-full px-5 text-[13px] font-bold transition-colors",
                        active ? "bg-primary text-primary-foreground" : "text-muted-foreground active:bg-muted",
                      )}
                    >
                      {l === "learning" ? "Learning" : "Experienced"}
                    </button>
                  );
                })}
              </div>
              <p className="text-[12px] text-muted-foreground">
                {level === "learning" ? "Simple cues in plain words." : "Targets and shot work for a steady swing."}
              </p>
            </div>

            {/* Preview */}
            <div className="rounded-[18px] border border-border bg-card px-4 py-3">
              {bagLoaded && userBag.length === 0 && (
                <button
                  type="button"
                  onClick={() => navigate({ to: "/profile" })}
                  className="mb-2 w-full rounded-xl bg-muted px-3 py-2 text-left text-[12.5px] text-muted-foreground active:opacity-80"
                >
                  Add your clubs in Profile so sessions use your bag.
                </button>
              )}
              {sections.map((s, si) => (
                <div key={`${s.name}-${si}`} className={cn(si > 0 && "mt-3")}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold">{s.name}</p>
                  <ul className="mt-1">
                    {s.blocks.map((b) => (
                      <li key={b.id} className="flex items-center justify-between gap-3 py-1.5">
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 text-[14px] font-semibold">
                            <span className="truncate">{b.club}</span>
                            {b.forYou && <Sparkles className="h-3 w-3 shrink-0 text-gold" aria-label="Built for you" />}
                          </span>
                          <span className="block truncate text-[12.5px] text-muted-foreground">{b.cue}</span>
                        </span>
                        <span className="shrink-0 font-stats text-[18px] tabular-nums text-muted-foreground">{b.balls}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {practiceTab === "build" && (
        <div className="fixed inset-x-0 z-40 bg-gradient-to-t from-background via-background/95 to-transparent"
             style={{ bottom: "calc(68px + env(safe-area-inset-bottom))", backdropFilter: "blur(8px)" }}>
          <div className="mx-auto w-full max-w-[430px] px-4 pt-6 pb-4">
            <Button
              size="lg"
              disabled={plan.length === 0}
              onClick={startPlan}
              className="h-14 w-full rounded-[14px] text-[14px] font-bold uppercase tracking-[0.06em]"
            >
              Start · {planBalls} balls
            </Button>
          </div>
        </div>
      )}

      <ProModal
        open={proOpen}
        onClose={() => setProOpen(false)}
        reason={proText || undefined}
      />
    </AppShell>
  );
}

// ─── Completion screen (range) ───────────────────────────────────────────────

function RangeCompletionView({
  done,
  onNewSession,
  onFavoriteSaved,
}: {
  done: DoneState;
  onNewSession: () => void;
  onFavoriteSaved: () => void;
}) {
  const navigate = useNavigate();
  const { isPro } = useAuth();
  const name = loadProfileName();
  const finishedAll = done.blocksDone === done.blocks.length;

  const [saveOpen, setSaveOpen] = useState(false);
  const [proReason, setProReason] = useState<string | null>(null);
  const [favName, setFavName] = useState(() => {
    const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" });
    return `${done.label} · ${date}`;
  });
  const [saved, setSaved] = useState(false);
  const [existingFavs, setExistingFavs] = useState<Favorite[]>([]);
  useEffect(() => { loadFavoritesAsync().then(setExistingFavs); }, []);

  const handleSaveClick = () => {
    if (!isPro && isAtFreeLimit(existingFavs)) {
      setProReason(`Free accounts can save up to ${FREE_LIMIT} session${FREE_LIMIT !== 1 ? "s" : ""}. Go Pro for unlimited saves and sessions built from your rounds.`);
      return;
    }
    setSaveOpen(true);
  };

  const confirmSave = () => {
    saveFavorite(favName, PLAN_INPUT, blocksToDrills(done.blocks));
    setSaveOpen(false);
    setSaved(true);
    onFavoriteSaved();
  };

  return (
    <AppShell>
      <div className="flex flex-col items-center pt-10 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
          <Trophy className="h-10 w-10" />
        </div>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
          {finishedAll ? "Session complete" : "Session saved"}
        </p>
        <h1 className="mt-2 font-display text-[48px] leading-[0.95] tracking-[-0.015em]">
          Nice work,<br /><em className="italic">{name ? `${name}.` : "champ."}</em>
        </h1>

        <p className="mt-8 font-stats text-[88px] leading-none tabular-nums text-primary">{done.balls}</p>
        <p className="mt-1 text-[14px] font-bold uppercase tracking-[0.16em] text-muted-foreground">balls hit</p>
        <p className="mt-3 text-[14px] text-muted-foreground tabular-nums">
          {done.blocksDone} of {done.blocks.length} blocks
        </p>

        {isPro && done.focus && done.blocks.slice(0, done.blocksDone).some((b) => b.forYou) && (
          <p className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-gold-border bg-gold-bg px-3 py-1.5 text-[12.5px] font-semibold text-gold">
            <Sparkles className="h-3.5 w-3.5" /> Built for you: extra {FOCUS_LABEL[done.focus]}
          </p>
        )}

        <div className="mt-8 w-full space-y-3">
          <Button
            onClick={onNewSession}
            className="h-14 w-full rounded-xl text-base font-bold uppercase tracking-wide"
          >
            New Session
          </Button>

          {done.source === "plan" && (saved ? (
            <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-4 text-sm font-bold uppercase tracking-wide text-primary">
              <BookmarkCheck className="h-4 w-4" />
              Saved
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
          ))}

          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="h-12 w-full rounded-xl border border-border bg-muted px-4 text-sm font-bold uppercase tracking-wide text-muted-foreground transition active:bg-muted/80"
          >
            Back to Home
          </button>
        </div>

        {!isPro && (
          <button
            type="button"
            onClick={() => setProReason("Pro reads your last round and builds your next practice session around it.")}
            className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-gold active:opacity-80"
          >
            <Sparkles className="h-3.5 w-3.5" /> Pro builds your next session from your last round
          </button>
        )}
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
        open={proReason !== null}
        onClose={() => setProReason(null)}
        reason={proReason ?? undefined}
      />
    </AppShell>
  );
}

// ─── Practice area picker ────────────────────────────────────────────────────

function AreaPickerView({ onPick }: { onPick: (area: "range" | "putting") => void }) {
  const areas = [
    { key: "range" as const, icon: Target, label: "Driving Range", sub: "Full-swing session builder", soon: false },
    { key: "putting" as const, icon: CircleDot, label: "Putting Green", sub: "Stations, sets, and scoring", soon: false },
    { key: "chipping" as const, icon: Flag, label: "Chipping", sub: "Around the green", soon: true },
  ];
  return (
    <AppShell showBack>
      <div className="pb-8">
        <div className="pt-2 pb-2">
          <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Practice</p>
          <h1 className="mt-1.5 font-display text-[38px] leading-[0.98] tracking-[-0.01em]">Where are you<br />practicing?</h1>
        </div>
        <div className="mt-5 space-y-3">
          {areas.map(({ key, icon: Icon, label, sub, soon }) => (
            <button
              key={key}
              type="button"
              disabled={soon}
              aria-disabled={soon}
              onClick={soon ? undefined : () => onPick(key as "range" | "putting")}
              className={cn(
                "w-full flex items-center gap-4 rounded-[20px] border px-5 py-5 text-left transition",
                soon
                  ? "border-border bg-muted/40 opacity-60"
                  : "border-border bg-card active:scale-[0.99] active:bg-muted",
              )}
            >
              <div className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                soon ? "bg-muted" : "bg-primary/10",
              )}>
                <Icon className={cn("h-6 w-6", soon ? "text-muted-foreground" : "text-primary")} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[16px] uppercase tracking-[0.05em]">{label}</p>
                <p className="mt-0.5 text-[13.5px] text-muted-foreground">{sub}</p>
              </div>
              {soon ? (
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  Coming Soon
                </span>
              ) : (
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              )}
            </button>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

// ─── Putting builder: mode, balls per set, time ──────────────────────────────

const PUTT_BALL_PRESETS = [3, 6, 9];

function PuttingBuilder({
  onBack,
  onGenerate,
}: {
  onBack: () => void;
  onGenerate: (config: PuttingSessionConfig) => void;
}) {
  const [mode, setMode] = useState<PuttingMode | null>(null);
  const [ballsStr, setBallsStr] = useState("6");
  const [time, setTime] = useState<TimeAvailable | "unlimited" | null>(null);

  const ballCount = (() => { const n = parseInt(ballsStr); return n > 0 ? n : null; })();
  const canGenerate = mode !== null && ballCount !== null && time !== null;

  const missingSteps = [
    mode === null && "a practice mode",
    ballCount === null && "balls per set",
    time === null && "time",
  ].filter(Boolean) as string[];
  const missingHint = missingSteps.length > 0
    ? `Pick ${missingSteps.length === 1 ? missingSteps[0] : `${missingSteps.slice(0, -1).join(", ")} and ${missingSteps[missingSteps.length - 1]}`} to continue`
    : null;

  const generate = () => {
    if (!canGenerate || !mode || ballCount === null || time === null) return;
    onGenerate({ mode, ballCount, time });
  };

  return (
    <AppShell showBack onBack={onBack}>
      <div className="pb-32 space-y-7">
        <div className="pt-2 pb-2">
          <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Putting Green</p>
          <h1 className="mt-1.5 font-display text-[38px] leading-[0.98] tracking-[-0.01em]">Build your practice.</h1>
          <p className="mt-2.5 text-[15px] text-muted-foreground">
            {mode ? PUTTING_MODES.find((m) => m.value === mode)?.label : "– mode"} · {ballCount ? `${ballCount} balls/set` : "– balls"} · {time === "unlimited" ? "No limit" : time ? `${time} min` : "– min"}
          </p>
        </div>

        {/* Mode picker: isolated focus modes vs full structured workouts */}
        <div className="space-y-2">
          <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Focus on One Range</p>
          <div className="space-y-2">
            {PUTTING_MODES.filter((m) => ["short", "medium", "long"].includes(m.value)).map((m) => {
              const active = mode === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMode(m.value)}
                  className={cn(
                    "w-full rounded-[14px] border px-4 py-3.5 text-left transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card active:bg-muted",
                  )}
                >
                  <p className="text-[14px] font-bold">{m.label}</p>
                  <p className={cn("mt-0.5 text-[12.5px]", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                    {m.blurb}
                  </p>
                </button>
              );
            })}
          </div>

          <p className="pt-3 text-[13px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Full Workout</p>
          <div className="space-y-2">
            {PUTTING_MODES.filter((m) => ["mixed", "complete"].includes(m.value)).map((m) => {
              const active = mode === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMode(m.value)}
                  className={cn(
                    "w-full rounded-[14px] border-2 px-4 py-3.5 text-left transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-primary/25 bg-primary/5 active:bg-primary/10",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Trophy className={cn("h-4 w-4 shrink-0", active ? "text-primary-foreground" : "text-primary")} />
                    <p className="text-[14px] font-bold">{m.label}</p>
                  </div>
                  <p className={cn("mt-0.5 text-[12.5px]", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                    {m.blurb}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Balls per set */}
        <div className="space-y-2">
          <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Balls per set</p>
          <div className="flex flex-wrap gap-2">
            {PUTT_BALL_PRESETS.map((n) => {
              const active = ballsStr === String(n);
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setBallsStr(String(n))}
                  className={cn(
                    "min-h-[52px] rounded-full border px-5 text-sm font-semibold transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted/60 text-foreground active:bg-muted",
                  )}
                >
                  {n} balls
                </button>
              );
            })}
            <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-2">
              <input
                type="number"
                inputMode="numeric"
                value={PUTT_BALL_PRESETS.includes(parseInt(ballsStr)) ? "" : ballsStr}
                onChange={(e) => setBallsStr(e.target.value)}
                placeholder="Custom"
                min={1}
                max={30}
                className="w-16 bg-transparent text-sm font-bold outline-none placeholder:font-semibold placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Every set at a station uses this many balls. {SETS_PER_STATION} sets per station, each one scored.
          </p>
        </div>

        {/* Time available */}
        <div className="space-y-2">
          <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Time available</p>
          <div className="flex flex-wrap gap-2">
            {TIMES.map((t) => {
              const active = time === t;
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTime(t)}
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
            <button
              type="button"
              aria-pressed={time === "unlimited"}
              onClick={() => setTime("unlimited")}
              className={cn(
                "min-h-[52px] rounded-full border px-4 text-sm font-semibold transition-colors",
                time === "unlimited"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted/60 text-foreground active:bg-muted",
              )}
            >
              ∞ No limit
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {time === "unlimited"
              ? "Cycles through every station. Finish whenever you want, and everything scored counts."
              : "Time sets how many stations you'll get through, about 6 minutes each."}
          </p>
        </div>
      </div>

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
            className="h-14 w-full rounded-[14px] text-[14px] font-bold uppercase tracking-[0.06em] active:opacity-90 transition-opacity"
          >
            Start Putting Practice
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

// ─── Putting completion: per-station breakdown + overall ────────────────────

function PuttingCompletionView({
  record,
  results,
  config,
  onNewSession,
}: {
  record: SavedSession;
  results: StationResult[];
  config: PuttingSessionConfig;
  onNewSession: () => void;
}) {
  const navigate = useNavigate();
  const name = loadProfileName();
  const overall = summarizeSession(results);
  const modeLabel = PUTTING_MODES.find((m) => m.value === config.mode)?.label ?? "Putting";

  return (
    <AppShell>
      <div className="flex flex-col items-center pt-10 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
          <Trophy className="h-12 w-12" />
        </div>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
          {modeLabel} Complete
        </p>
        <h1 className="mt-2 font-display text-[54px] leading-[0.95] tracking-[-0.015em]">
          Rolled It,<br /><em className="italic">{name ? `${name}.` : "champ."}</em>
        </h1>

        {/* Per-station breakdown */}
        <div className="mt-8 w-full space-y-2">
          {results.map((r, i) => {
            const s = summarizeStation(r.sets);
            return (
              <div key={i} className="rounded-[16px] border border-border bg-card px-4 py-3 flex items-center gap-3">
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    {categoryLabel(r.category)}
                  </p>
                  <p className="font-display text-[22px] leading-tight">{r.minFt}-{r.maxFt} ft</p>
                </div>
                <div className="text-right">
                  <p className="font-stats text-[22px] tabular-nums text-primary">{s.makes}/{s.attempts}</p>
                  <p className="text-[12px] font-bold text-muted-foreground">{s.pct}%</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Overall */}
        <div className="mt-4 w-full rounded-2xl border border-border bg-card p-5 text-left">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Overall</p>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
            <Stat label="Made" value={`${overall.makes}/${overall.attempts}`} />
            <Stat label="Percentage" value={`${overall.pct}%`} />
            <Stat label="Stations" value={String(results.length)} serif />
            <Stat label="Balls Hit" value={String(record.totalBalls)} serif />
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
            className="h-12 w-full rounded-xl border border-border bg-muted px-4 text-sm font-bold uppercase tracking-wide text-muted-foreground transition active:bg-muted/80"
          >
            Back to Home
          </button>
        </div>
      </div>
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
                      {fav.session.length} block{fav.session.length !== 1 ? "s" : ""}
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
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {fav.session.length} block{fav.session.length !== 1 ? "s" : ""}
                </span>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {fav.session.filter((d) => (d.unit ?? "balls") === "balls").reduce((n, d) => n + d.balls, 0)} balls
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
