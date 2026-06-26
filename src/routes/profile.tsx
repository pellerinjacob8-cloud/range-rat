import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ProModal } from "@/components/ProModal";
import { useMemo, useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { BarChart2, Briefcase, Check, ChevronDown, ChevronLeft, ChevronRight, Crown, Flag, LogOut, Moon, Pencil, Plus, Ruler, Settings, Sun, Target, Trash2, X, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { openCustomerPortal } from "@/lib/stripe";
import { deleteAccount } from "@/lib/account";
import { InstallSheet } from "@/components/InstallSheet";
import { isHomeScreenDone, markHomeScreenInstalled } from "@/lib/pwa";
import {
  fetchProfile, saveProfile as dbSaveProfile,
  fetchSessions, fetchBag, saveBag as dbSaveBag,
  fetchYardages, saveYardage as dbSaveYardage,
  saveHandicapSnapshot, fetchHandicapHistory, deleteHandicapSnapshot,
  type SavedSession, type Club as DbClub, type YardageMap as DbYardageMap,
  type HandicapSnapshot,
} from "@/lib/db";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Range Rat: Profile" },
      { name: "description", content: "Your golfer profile, bag setup, and all-time stats." },
    ],
  }),
  component: ProfilePage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  firstName: string;
  lastName: string;
  createdDate: number;
  handedness?: "lefty" | "righty";
  handicap?: number;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "stats" | "bag" | "yardage";
type SubView = null | "bag" | "yardage" | "history";

type StatKey = "gir" | "fairways" | "putts" | "upAndDowns";

/** Per-stat display + behaviour. `betterDown`: improvement means the number gets smaller. */
const STAT_CONFIG: Record<StatKey, { label: string; short: string; fmt: (v: number) => string; betterDown: boolean }> = {
  gir:        { label: "Greens in Regulation", short: "GIR",      fmt: v => `${v}%`,    betterDown: false },
  fairways:   { label: "Fairways Hit",         short: "Fairways", fmt: v => `${v}%`,    betterDown: false },
  putts:      { label: "Putts per Round",      short: "Putts",    fmt: v => String(v),  betterDown: true  },
  upAndDowns: { label: "Up & Downs",           short: "Up & Dn",  fmt: v => String(v),  betterDown: false },
};

/** Golf convention: a handicap better than scratch is shown as "+2.1", not "-2.1". */
const fmtHdx = (h: number) => (h < 0 ? `+${Math.abs(h)}` : String(h));

/** Accepts "+2.1" (plus handicap → stored negative) or plain numbers. */
const parseHdx = (raw: string): number => {
  const t = raw.trim();
  return t.startsWith("+") ? -parseFloat(t.slice(1)) : parseFloat(t);
};

/**
 * Parse a percentage stat entry. Accepts a direct percent ("39") OR a count
 * like "11/18", "11 of 18", "7/9" → the computed percentage, so golfers never
 * have to do the math. Returns null for empty/invalid/incomplete input.
 */
const parsePercentEntry = (raw: string): number | null => {
  const t = raw.trim();
  if (!t) return null;
  const frac = t.match(/^(\d+(?:\.\d+)?)\s*(?:\/|of|out of)\s*(\d+(?:\.\d+)?)$/i);
  if (frac) {
    const made = parseFloat(frac[1]);
    const total = parseFloat(frac[2]);
    if (total > 0 && made >= 0 && made <= total) return Math.round((made / total) * 100);
    return null;
  }
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
};

function loadLocalProfile(): Profile {
  try {
    const raw = localStorage.getItem("rangeRat_profile");
    if (raw) {
      const p = JSON.parse(raw) as Profile & { name?: string };
      return {
        firstName: p.firstName ?? p.name ?? "",
        lastName: p.lastName ?? "",
        handedness: p.handedness,
        createdDate: p.createdDate ?? Date.now(),
      };
    }
  } catch {}
  return { firstName: "", lastName: "", createdDate: Date.now() };
}

function ProfilePage() {
  const { user, signOut, isPro } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile>(loadLocalProfile);
  const [editing, setEditing] = useState(false);
  const [firstInput, setFirstInput] = useState(() => loadLocalProfile().firstName);
  const [lastInput, setLastInput] = useState(() => loadLocalProfile().lastName);
  const [subView, setSubView] = useState<SubView>(null);
  const [proOpen, setProOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();
  const [allTimeSessions, setAllTimeSessions] = useState<SavedSession[]>([]);
  const [roundHistory, setRoundHistory] = useState<HandicapSnapshot[]>([]);
  const [trendOpen, setTrendOpen] = useState(true);
  const [statDetail, setStatDetail] = useState<StatKey | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [removingRound, setRemovingRound] = useState<string | null>(null);
  const [roundInputs, setRoundInputs] = useState({ handicap: "", gir: "", fairways: "", putts: "", upAndDowns: "", date: new Date().toISOString().slice(0, 10) });
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [hasBag, setHasBag] = useState(false);
  const [hasYardages, setHasYardages] = useState(false);
  const [checklistDismissed, setChecklistDismissed] = useState(() => {
    try { return localStorage.getItem("rr-checklist-dismissed") === "true"; } catch { return false; }
  });
  const [homeScreenDone, setHomeScreenDone] = useState(() => isHomeScreenDone());
  const [installOpen, setInstallOpen] = useState(false);

  useEffect(() => {
    fetchProfile().then((p) => {
      if (!p) return;
      setProfile(p);
      setFirstInput(p.firstName);
      setLastInput(p.lastName);
      if (p.handicap !== undefined) setRoundInputs(prev => ({ ...prev, handicap: String(p.handicap) }));
      try { localStorage.setItem("rangeRat_profile", JSON.stringify(p)); } catch {}
    });
    fetchSessions().then(setAllTimeSessions).catch(() => {});
    fetchHandicapHistory().then(setRoundHistory);
    fetchBag().then((b) => setHasBag(b.length > 0));
    fetchYardages().then((y) => setHasYardages(Object.keys(y).length > 0));
  }, []);

  const handleSignOut = async () => { await signOut(); navigate({ to: "/login" }); };

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      await signOut();
      navigate({ to: "/onboarding/welcome" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not delete account.";
      toast.error(msg);
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const portalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleManageSubscription = async () => {
    setPortalError(null);
    setPortalLoading(true);

    // Safety net: if the redirect never fires, reset loading after 8s
    if (portalTimeoutRef.current) clearTimeout(portalTimeoutRef.current);
    portalTimeoutRef.current = setTimeout(() => {
      setPortalLoading(false);
      toast.error("Could not open billing portal. Please try again.");
    }, 8000);

    try {
      // Server creates a Stripe billing-portal session for the logged-in Pro
      // user's customer and we redirect straight into it -- no email re-entry.
      await openCustomerPortal();
      // If openCustomerPortal resolves without redirecting, clear the timeout
      if (portalTimeoutRef.current) clearTimeout(portalTimeoutRef.current);
    } catch (err: any) {
      if (portalTimeoutRef.current) clearTimeout(portalTimeoutRef.current);
      setPortalError(err.message);
      setPortalLoading(false);
    }
  };

  const startEdit = () => { setFirstInput(profile.firstName); setLastInput(profile.lastName); setEditing(true); };
  const saveName = () => {
    const updated: Profile = { ...profile, firstName: firstInput.trim(), lastName: lastInput.trim() };
    setProfile(updated);
    dbSaveProfile(updated);
    setEditing(false);
  };
  const cancelEdit = () => { setFirstInput(profile.firstName); setLastInput(profile.lastName); setEditing(false); };

  const openLogRound = () => {
    const latest = roundHistory[roundHistory.length - 1];
    setRoundInputs({
      handicap: profile.handicap !== undefined ? fmtHdx(profile.handicap) : "",
      gir: latest?.gir !== undefined ? String(latest.gir) : "",
      fairways: latest?.fairways !== undefined ? String(latest.fairways) : "",
      putts: latest?.putts !== undefined ? String(latest.putts) : "",
      upAndDowns: latest?.upAndDowns !== undefined ? String(latest.upAndDowns) : "",
      date: new Date().toISOString().slice(0, 10),
    });
    setLogOpen(true);
  };

  const inRange = (raw: string, min: number, max: number) => {
    if (!raw) return true;
    const n = parseFloat(raw);
    return !isNaN(n) && n >= min && n <= max;
  };
  // Percentage stats accept "11/18"-style counts; valid if empty or resolves to 0–100.
  const percentValid = (raw: string) => {
    if (!raw.trim()) return true;
    const v = parsePercentEntry(raw);
    return v !== null && v >= 0 && v <= 100;
  };
  const hdxValue = parseHdx(roundInputs.handicap);
  const roundValid =
    roundInputs.handicap !== "" && !isNaN(hdxValue) && hdxValue >= -10 && hdxValue <= 54 &&
    percentValid(roundInputs.gir) && percentValid(roundInputs.fairways) &&
    inRange(roundInputs.putts, 0, 72) && inRange(roundInputs.upAndDowns, 0, 18);

  const saveRound = async () => {
    if (!roundValid) return;
    const hdx = hdxValue;
    const stats = {
      gir: roundInputs.gir ? parsePercentEntry(roundInputs.gir) ?? undefined : undefined,
      fairways: roundInputs.fairways ? parsePercentEntry(roundInputs.fairways) ?? undefined : undefined,
      putts: roundInputs.putts ? parseFloat(roundInputs.putts) : undefined,
      upAndDowns: roundInputs.upAndDowns ? parseFloat(roundInputs.upAndDowns) : undefined,
    };
    const recordedAt = roundInputs.date
      ? new Date(roundInputs.date + "T12:00:00").toISOString()
      : new Date().toISOString();
    // Optimistic update, UI reflects the save immediately
    const tempId = `temp-${Date.now()}`;
    const optimistic: HandicapSnapshot = { id: tempId, handicap: hdx, ...stats, recordedAt };
    setProfile(prev => ({ ...prev, handicap: hdx }));
    setRoundHistory(prev => [...prev, optimistic].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()));
    setLogOpen(false);
    dbSaveProfile({ ...profile, handicap: hdx });
    const snapshot = await saveHandicapSnapshot(hdx, stats, recordedAt);
    if (snapshot) setRoundHistory(prev => prev.map(h => h.id === tempId ? snapshot : h));
  };

  const removeSnapshot = async (id: string) => {
    setRemovingRound(null);
    await deleteHandicapSnapshot(id);
    const next = roundHistory.filter(h => h.id !== id);
    setRoundHistory(next);
    const latest = next[next.length - 1];
    const updated = { ...profile, handicap: latest?.handicap };
    setProfile(updated);
    await dbSaveProfile(updated);
  };

  const totalBalls = allTimeSessions.reduce((s, x) => s + x.totalBalls, 0);

  // Best streak
  const bestStreak = useMemo(() => {
    if (!allTimeSessions.length) return 0;
    const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dates = [...new Set(allTimeSessions.map(s => dayKey(new Date(s.completedAt))))].sort();
    let best = 1, cur = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      cur = diff === 1 ? cur + 1 : 1;
      if (cur > best) best = cur;
    }
    return best;
  }, [allTimeSessions]);

  // Sub-view: Bag or Yardage
  if (subView === "bag") {
    return (
      <AppShell>
        <div className="pb-8">
          <button type="button" onClick={() => setSubView(null)} className="flex items-center gap-1 text-primary text-[14px] font-semibold mb-4 -ml-1">
            <ChevronLeft className="h-5 w-5" /> Profile
          </button>
          <h1 className="font-display text-[32px] mb-1">Your Bag</h1>
          <p className="text-[13.5px] text-muted-foreground mb-6">These are the clubs you picked. Tap the pencil on any club to add its brand and model.</p>
          <BagSection />
        </div>
      </AppShell>
    );
  }

  if (subView === "yardage") {
    return (
      <AppShell>
        <div className="pb-8">
          <button type="button" onClick={() => setSubView(null)} className="flex items-center gap-1 text-primary text-[14px] font-semibold mb-4 -ml-1">
            <ChevronLeft className="h-5 w-5" /> Profile
          </button>
          <h1 className="font-display text-[32px] mb-6">Club Yardages</h1>
          <YardageSection />
        </div>
      </AppShell>
    );
  }

  if (subView === "history") {
    const sorted = [...roundHistory].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
    const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return (
      <AppShell>
        <div className="pb-8">
          <button type="button" onClick={() => setSubView(null)} className="flex items-center gap-1 text-primary text-[14px] font-semibold mb-4 -ml-1">
            <ChevronLeft className="h-5 w-5" /> Profile
          </button>
          <h1 className="font-display text-[32px] mb-[3px]">Round History</h1>
          <p className="text-[13px] text-muted-foreground mb-[18px]">{sorted.length} round{sorted.length === 1 ? "" : "s"} logged</p>
          <div className="flex flex-col gap-[10px]">
            {sorted.map((entry, i) => (
              <div key={entry.id} className="rounded-[22px] border border-border bg-card p-[14px_16px]">
                <div className="flex items-start justify-between mb-[11px]">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{fmtDate(entry.recordedAt)}</p>
                    <p className="font-stats text-[32px] font-bold text-primary leading-none mt-[2px]">{fmtHdx(entry.handicap)}</p>
                    <p className="text-[10px] text-muted-foreground">Handicap Index</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {i === 0 && (
                      <span className="bg-gold-bg border border-gold-border text-gold rounded-full px-[9px] py-[3px] text-[9.5px] font-bold uppercase tracking-[0.1em]">
                        Latest
                      </span>
                    )}
                    {removingRound === entry.id ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold text-muted-foreground">Remove?</span>
                        <button type="button" onClick={() => removeSnapshot(entry.id)} className="rounded-full bg-destructive px-3 py-1 text-xs font-bold text-white transition active:opacity-80">Yes</button>
                        <button type="button" onClick={() => setRemovingRound(null)} className="rounded-full border border-border px-3 py-1 text-xs font-bold text-muted-foreground transition active:bg-muted">No</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setRemovingRound(entry.id)} aria-label="Delete round" className="text-muted-foreground p-1 -m-1">
                        <Trash2 className="h-[15px] w-[15px]" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1 border-t border-border pt-[10px]">
                  {[
                    { label: "GIR", value: entry.gir !== undefined ? `${entry.gir}%` : "–" },
                    { label: "FWY", value: entry.fairways !== undefined ? `${entry.fairways}%` : "–" },
                    { label: "PUTTS", value: entry.putts !== undefined ? String(entry.putts) : "–" },
                    { label: "U & D", value: entry.upAndDowns !== undefined ? String(entry.upAndDowns) : "–" },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center">
                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
                      <p className="mt-[3px] font-stats text-[20px] font-bold text-foreground leading-none">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  const initial = profile.firstName ? profile.firstName[0].toUpperCase() : "?";

  return (
    <AppShell>
      <div className="pb-24 pt-2">

        {/* ── Hero ── */}
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 rounded-[20px] bg-primary text-primary-foreground flex items-center justify-center font-display text-[30px] leading-none">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-1.5">
                <input autoFocus value={firstInput} onChange={e => setFirstInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") cancelEdit(); }}
                  placeholder="First name"
                  className="w-full bg-transparent font-display text-[28px] outline-none border-b-2 border-primary pb-0.5" />
                <input value={lastInput} onChange={e => setLastInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") cancelEdit(); }}
                  placeholder="Last name"
                  className="w-full bg-transparent font-display text-[22px] outline-none border-b border-border pb-0.5 text-muted-foreground" />
                <div className="flex gap-2 pt-1">
                  <button type="button" onMouseDown={e => { e.preventDefault(); saveName(); }} disabled={!firstInput.trim()}
                    className="flex-1 h-10 rounded-[12px] bg-primary text-primary-foreground text-[13px] font-bold uppercase tracking-[0.06em] disabled:opacity-40">Save</button>
                  <button type="button" onMouseDown={e => { e.preventDefault(); cancelEdit(); }}
                    className="h-10 px-4 rounded-[12px] border border-border text-[13px] font-bold text-muted-foreground">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <p className="font-display text-[28px] leading-none tracking-[-0.01em] truncate">
                  {[profile.firstName, profile.lastName].filter(Boolean).join(" ") || <span className="text-muted-foreground">Add name</span>}
                </p>
                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                  {isPro && (
                    <span className="inline-flex items-center gap-1 bg-gold-bg border border-gold-border text-gold rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]">
                      <Crown className="h-2.5 w-2.5" /> Pro
                    </span>
                  )}
                  {user?.email && (
                    <p className="text-[13px] text-muted-foreground truncate">{user.email}</p>
                  )}
                </div>
              </>
            )}
          </div>
          {!editing && (
            <button type="button" onClick={startEdit} aria-label="Edit"
              className="h-9 w-9 shrink-0 rounded-full border border-border flex items-center justify-center text-muted-foreground active:bg-muted">
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ── Setup checklist ── */}
        {!checklistDismissed && (() => {
          const steps: { label: string; done: boolean; action: () => void; info?: () => void }[] = [
            { label: "Set up your bag", done: hasBag, action: () => setSubView("bag") },
            { label: "Complete a practice session", done: allTimeSessions.length > 0, action: () => navigate({ to: "/practice" }) },
            { label: "Log your handicap", done: roundHistory.length > 0, action: () => openLogRound() },
            { label: "Set your yardages", done: hasYardages, action: () => setSubView("yardage") },
            { label: "Add to Home Screen", done: homeScreenDone, action: () => setInstallOpen(true), info: () => setInstallOpen(true) },
          ];
          const completed = steps.filter(s => s.done).length;
          if (completed === steps.length) return null;
          return (
            <div className="mt-5 rounded-[22px] border border-border bg-card p-4 relative">
              <button
                type="button"
                onClick={() => { setChecklistDismissed(true); try { localStorage.setItem("rr-checklist-dismissed", "true"); } catch {} }}
                aria-label="Dismiss"
                className="absolute top-3 right-3 text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Get started</p>
              <p className="mt-1 text-[14px] font-semibold">{completed} of {steps.length} complete</p>
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${(completed / steps.length) * 100}%` }} />
              </div>
              <div className="mt-3 space-y-1">
                {steps.map((step) => (
                  <div
                    key={step.label}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-[12px] px-3 py-2.5 transition-colors",
                      step.done ? "opacity-60" : ""
                    )}
                  >
                    <button
                      type="button"
                      onClick={step.done ? undefined : step.action}
                      disabled={step.done}
                      className="flex flex-1 items-center gap-3 text-left min-w-0"
                    >
                      <div className={cn(
                        "h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center",
                        step.done ? "border-primary bg-primary" : "border-border"
                      )}>
                        {step.done && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <span className={cn("text-[14px] font-medium", step.done && "line-through text-muted-foreground")}>{step.label}</span>
                    </button>
                    {step.info ? (
                      <button
                        type="button"
                        onClick={step.info}
                        className="shrink-0 rounded-full border border-border px-3 py-1 text-[12px] font-bold text-primary active:bg-muted transition-colors"
                      >
                        How?
                      </button>
                    ) : (
                      !step.done && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── All-time stats ── */}
        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">All-time</p>
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {[
            { eyebrow: "Sessions", value: String(allTimeSessions.length), sub: "logged" },
            { eyebrow: "Balls", value: totalBalls.toLocaleString(), sub: "hit" },
            { eyebrow: "Best", value: String(bestStreak), sub: "day run" },
          ].map(({ eyebrow, value, sub }) => (
            <div key={eyebrow} className="rounded-[18px] border border-border bg-card p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
              <p className="mt-1 font-stats text-[32px] leading-none text-primary">{value}</p>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── On-Course Stats ── */}
        <p className="mt-6 mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">On-Course Stats</p>
        <div className="rounded-[22px] border border-border bg-card p-[18px]">
          {/* Top row: handicap + Update/Log Round */}
          <div className="flex items-start justify-between mb-[14px]">
            <div>
              <p className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Handicap Index</p>
              <p className="mt-[3px] font-stats text-[44px] font-bold leading-none text-primary">
                {profile.handicap !== undefined
                  ? fmtHdx(profile.handicap)
                  : <span className="text-[18px] text-muted-foreground font-sans font-medium">Not set</span>}
              </p>
              {roundHistory.length > 0 && (() => {
                const latest = roundHistory[roundHistory.length - 1];
                const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                const now = new Date();
                const thisMonthRounds = roundHistory.filter((r) => {
                  const d = new Date(r.recordedAt);
                  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                });
                const monthFirst = thisMonthRounds.length > 1 ? thisMonthRounds[0] : null;
                const monthLatest = thisMonthRounds.length > 1 ? thisMonthRounds[thisMonthRounds.length - 1] : null;
                const delta = monthFirst && monthLatest ? +(monthFirst.handicap - monthLatest.handicap).toFixed(1) : null;
                return (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {fmt(latest.recordedAt)}
                    {delta !== null && delta !== 0 && (
                      <>
                        {" · "}
                        <span className={delta > 0 ? "text-[var(--ok)]" : "text-destructive"}>
                          {delta > 0 ? `▼ ${delta}` : `▲ ${Math.abs(delta)}`} this month
                        </span>
                      </>
                    )}
                  </p>
                );
              })()}
            </div>
            <button type="button" onClick={openLogRound}
              className="shrink-0 flex items-center gap-1.5 border border-border rounded-[10px] bg-muted px-3 py-[7px] text-[12px] font-bold text-primary">
              <Plus className="h-3 w-3" /> {isPro ? "Log Round" : "Update"}
            </button>
          </div>

          {/* Handicap trend chart (free for all users) */}
          <div className="mb-4">
            <button type="button" onClick={() => setTrendOpen(o => !o)}
              className="w-full flex items-center justify-between mb-2">
              <span className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Trend</span>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", trendOpen ? "rotate-0" : "-rotate-90")} />
            </button>
            {trendOpen && (
              <div>
                {roundHistory.length > 1 ? (
                  <HandicapChart history={roundHistory} />
                ) : (
                  <p className="text-[12px] text-muted-foreground">{isPro ? "Log more rounds to see your trend." : "Update your handicap after each round to track your progress."}</p>
                )}
              </div>
            )}
          </div>

          {/* 2×2 stat grid (Pro only) */}
          <div className="relative mb-4">
            <div className={!isPro ? "blur-[6px] pointer-events-none select-none" : undefined} aria-hidden={!isPro}>
              {(() => {
                const latest = roundHistory[roundHistory.length - 1];
                const prev = roundHistory[roundHistory.length - 2];
                return (
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(STAT_CONFIG) as StatKey[]).map((key) => {
                      const cfg = STAT_CONFIG[key];
                      const cur = latest?.[key];
                      const last = prev?.[key];
                      const delta = cur !== undefined && last !== undefined ? +(cur - last).toFixed(1) : null;
                      const improved = delta !== null && (cfg.betterDown ? delta < 0 : delta > 0);
                      return (
                        <button key={key} type="button"
                          onClick={() => isPro ? setStatDetail(key) : setProOpen(true)}
                          className="rounded-[13px] border border-border bg-muted p-[10px_12px] text-left active:bg-border/60 transition-colors">
                          <div className="flex items-center justify-between">
                            <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{cfg.short}</p>
                            <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
                          </div>
                          <p className="mt-1 font-stats text-[28px] font-bold text-primary leading-none">
                            {cur !== undefined ? cfg.fmt(cur) : "–"}
                          </p>
                          <p className="mt-1 text-[9.5px] font-semibold h-[12px]">
                            {delta !== null && delta !== 0 ? (
                              <span className={improved ? "text-[var(--ok)]" : "text-destructive"}>
                                {delta > 0 ? "▲" : "▼"} {Math.abs(delta)} vs last
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50">{delta === 0 ? "even vs last" : ""}</span>
                            )}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            {!isPro && (
              <button type="button" onClick={() => setProOpen(true)}
                className="absolute inset-0 flex items-center justify-center">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-border bg-gold-bg px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-gold">
                  <Zap className="h-3 w-3" fill="currentColor" /> Upgrade for Round Stats
                </span>
              </button>
            )}
          </div>

          {/* History link */}
          {roundHistory.length > 0 && (
            <button type="button" onClick={() => setSubView("history")}
              className="mt-3 w-full text-center text-[12px] font-semibold text-muted-foreground border-t border-border pt-3">
              View all {roundHistory.length} round{roundHistory.length === 1 ? "" : "s"} →
            </button>
          )}
        </div>

        {/* ── Stat Detail Sheet ── */}
        {statDetail && (
          <StatDetailSheet statKey={statDetail} history={roundHistory} onClose={() => setStatDetail(null)} />
        )}

        {/* ── Log Round Sheet ── */}
        {logOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setLogOpen(false)}>
            <div className="absolute inset-0 bg-black/[0.44]" />
            <div className="relative w-full max-w-[430px] max-h-[90dvh] overflow-y-auto overflow-x-hidden rounded-[28px] bg-background p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-[18px]">
                <div>
                  <h2 className="font-display text-[26px] leading-none">{isPro ? "Log Round Stats" : "Update Handicap"}</h2>
                  <input
                    type="date"
                    value={roundInputs.date}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={e => setRoundInputs(p => ({ ...p, date: e.target.value }))}
                    className="mt-1 text-[12px] text-muted-foreground bg-transparent outline-none"
                  />
                </div>
                <button type="button" onClick={() => setLogOpen(false)} aria-label="Close" className="text-muted-foreground mt-0.5">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Handicap, large focal input */}
              <div className="mb-3">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-[6px]">Handicap Index</p>
                <div className="flex items-center h-[62px] rounded-[16px] border-2 border-primary px-[18px] gap-2.5 bg-primary/[0.04]">
                  <input
                    type="text" inputMode="decimal" autoFocus
                    value={roundInputs.handicap}
                    onChange={e => setRoundInputs(p => ({ ...p, handicap: e.target.value }))}
                    placeholder="22.8"
                    className="flex-1 min-w-0 bg-transparent outline-none font-stats text-[40px] font-bold leading-none text-primary placeholder:text-muted-foreground/30"
                  />
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mt-1">HDX</span>
                </div>
              </div>

              {/* 2×2 stat inputs. GIR/Fairways accept a percent or a count like "11/18". */}
              {isPro ? (
                <div className="grid grid-cols-2 gap-[9px] mb-[18px]">
                  {[
                    { key: "gir" as const, label: "GIR", placeholder: "48 or 11/18", percent: true },
                    { key: "fairways" as const, label: "Fairways", placeholder: "40 or 8/14", percent: true },
                    { key: "putts" as const, label: "Putts / Round", placeholder: "31", percent: false },
                    { key: "upAndDowns" as const, label: "Up & Downs", placeholder: "2", percent: false },
                  ].map(({ key, label, placeholder, percent }) => {
                    const raw = roundInputs[key];
                    const computed = percent && /[/]|of/i.test(raw) ? parsePercentEntry(raw) : null;
                    return (
                      <div key={key}>
                        <p className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-[6px]">{label}</p>
                        <div className="h-[50px] rounded-[13px] border-[1.5px] border-border bg-card flex items-center px-3 transition-colors focus-within:border-2 focus-within:border-primary focus-within:bg-[rgba(13,45,90,.04)]">
                          <input
                            type="text" inputMode={percent ? "text" : "decimal"}
                            value={raw}
                            onChange={e => setRoundInputs(p => ({ ...p, [key]: e.target.value }))}
                            placeholder={placeholder}
                            className="w-full min-w-0 bg-transparent outline-none font-stats text-[22px] font-semibold leading-none placeholder:text-muted-foreground/30"
                          />
                          {computed !== null && (
                            <span className="shrink-0 text-[13px] font-bold text-primary tabular-nums">= {computed}%</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <button type="button" onClick={() => { setLogOpen(false); setProOpen(true); }}
                  className="w-full mb-[18px] rounded-[16px] border border-gold-border bg-gold-bg p-4 text-center">
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.08em] text-gold">
                    <Zap className="h-3.5 w-3.5" fill="currentColor" /> Upgrade to log GIR, Fairways, Putts & more
                  </span>
                </button>
              )}

              <div className="flex gap-[9px]">
                <button type="button" onClick={() => setLogOpen(false)}
                  className="flex-1 h-[50px] rounded-[14px] border border-border text-[13px] font-bold uppercase tracking-[0.06em] text-muted-foreground bg-transparent">
                  Cancel
                </button>
                <button type="button" onMouseDown={e => { e.preventDefault(); saveRound(); }}
                  disabled={!roundValid}
                  className="flex-[2] h-[50px] rounded-[14px] bg-primary text-primary-foreground text-[13px] font-bold uppercase tracking-[0.06em] disabled:opacity-40">
                  Save Round
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Pro card / upgrade nudge ── */}
        {isPro ? (
          <>
            <button type="button" onClick={handleManageSubscription} disabled={portalLoading}
              className="mt-4 w-full flex items-center gap-3.5 rounded-[22px] border border-gold-border bg-gold-bg px-4 py-3.5 text-left active:opacity-90 transition-opacity disabled:opacity-60">
              <div className="h-11 w-11 shrink-0 rounded-[13px] bg-gold-bg border border-gold-border flex items-center justify-center">
                <Crown className="h-5 w-5 text-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-foreground">Range Rat Pro</p>
                <p className="text-[12.5px] text-muted-foreground mt-0.5">
                  {portalLoading ? "Opening..." : "Manage subscription"}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
            {portalError && (
              <p className="mt-2 text-[12.5px] font-semibold text-destructive px-1">{portalError}</p>
            )}
          </>
        ) : (
          <button type="button" onClick={() => setProOpen(true)}
            className="mt-4 w-full flex items-center gap-3.5 rounded-[22px] border border-border bg-card px-4 py-3.5 text-left active:bg-muted transition-colors">
            <div className="h-11 w-11 shrink-0 rounded-[13px] bg-gold-bg border border-gold-border flex items-center justify-center">
              <Zap className="h-5 w-5 text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold">Upgrade to Pro</p>
              <p className="text-[12.5px] text-muted-foreground mt-0.5">Unlock Combine, Grid Game, custom sessions & more.</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        )}

        {/* ── Your setup ── */}
        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Your setup</p>
        <div className="mt-3 rounded-[22px] border border-border bg-card overflow-hidden">
          <SetupRow icon={Flag} label="Your bag" detail={undefined} onPress={() => setSubView("bag")} />
          <div className="h-px bg-border mx-4" />
          <SetupRow
            icon={Target}
            label="Club yardages"
            onPress={() => setSubView("yardage")}
          />
          <div className="h-px bg-border mx-4" />
          {/* chevron=false: this row toggles in place, it doesn't navigate */}
          <SetupRow icon={theme === "dark" ? Moon : Sun} label="Appearance" detail={theme === "dark" ? "Dark" : "Light"} onPress={toggleTheme} chevron={false} />
        </div>

        {/* ── Sign out ── */}
        <button type="button" onClick={handleSignOut}
          className="mt-4 h-14 w-full rounded-[22px] border border-border bg-card text-[14px] font-bold uppercase tracking-[0.06em] text-foreground active:bg-muted transition-colors">
          Sign Out
        </button>

        {/* ── Delete account ── */}
        <button type="button" onClick={() => setDeleteOpen(true)}
          className="mt-3 w-full text-center text-[13px] font-semibold text-destructive py-2 active:opacity-70 transition-opacity">
          Delete account
        </button>

        {/* ── Legal ── */}
        <div className="mt-3 flex items-center justify-center gap-4 text-[12px] text-muted-foreground">
          <Link to="/privacy" className="active:opacity-70">Privacy</Link>
          <span aria-hidden>·</span>
          <Link to="/terms" className="active:opacity-70">Terms</Link>
        </div>

      </div>

      {/* Delete account confirmation */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4" onClick={() => !deleting && setDeleteOpen(false)}>
          <div className="w-full max-w-sm rounded-[22px] bg-background border border-border p-6 mb-4 sm:mb-0" onClick={e => e.stopPropagation()}>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="font-display text-[24px] leading-tight mb-2">Delete your account?</h2>
            <p className="text-[14px] text-muted-foreground leading-relaxed mb-6">
              This permanently removes your profile, bag, stats, and session history. This cannot be undone.
            </p>
            <button type="button" onClick={handleDeleteAccount} disabled={deleting}
              className="h-13 w-full rounded-[14px] bg-destructive text-white font-bold text-[14px] uppercase tracking-[0.06em] py-3.5 disabled:opacity-50 active:opacity-90 transition-opacity">
              {deleting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Deleting…
                </span>
              ) : "Delete forever"}
            </button>
            <button type="button" onClick={() => setDeleteOpen(false)} disabled={deleting}
              className="mt-2 h-13 w-full rounded-[14px] text-[14px] font-bold uppercase tracking-[0.06em] text-foreground py-3.5 disabled:opacity-50 active:opacity-70 transition-opacity">
              Cancel
            </button>
          </div>
        </div>
      )}

      <InstallSheet
        open={installOpen}
        onClose={() => setInstallOpen(false)}
        onMarkInstalled={() => { markHomeScreenInstalled(); setHomeScreenDone(true); setInstallOpen(false); }}
      />

      <ProModal open={proOpen} onClose={() => setProOpen(false)} />
    </AppShell>
  );
}

function SetupRow({ icon: Icon, label, detail, onPress, proLocked, chevron = true }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  detail?: string;
  onPress: () => void;
  proLocked?: boolean;
  chevron?: boolean;
}) {
  return (
    <button type="button" onClick={onPress} className="w-full flex items-center gap-3.5 px-4 py-4 text-left active:bg-muted transition-colors">
      <Icon className="h-[19px] w-[19px] text-primary shrink-0" />
      <span className="flex-1 text-[15.5px] font-medium text-foreground">{label}</span>
      {proLocked && <Zap className="h-3.5 w-3.5 text-gold shrink-0" />}
      {detail && <span className="text-[14px] text-muted-foreground">{detail}</span>}
      {chevron && <ChevronRight className="h-[17px] w-[17px] text-muted-foreground shrink-0" />}
    </button>
  );
}

// ─── Golf Bag Icon ────────────────────────────────────────────────────────────

function GolfBagIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Bag body, elongated */}
      <path d="M7 12 L7 22 Q7 23.5 9 23.5 L15 23.5 Q17 23.5 17 22 L17 12 Z" />
      {/* Top collar */}
      <path d="M7 12 Q7 10 12 10 Q17 10 17 12" />
      {/* Carry handle */}
      <path d="M10 10 Q10 8.5 12 8.5 Q14 8.5 14 10" />
      {/* Single club shaft */}
      <line x1="12" y1="10" x2="11" y2="4" />
      {/* Club head (hooked iron) */}
      <path d="M11 4 L9.5 3.5" />
      {/* Front pocket */}
      <path d="M8.5 17 Q12 18.5 15.5 17" />
    </svg>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function SegTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-[9px] py-2.5 text-[12.5px] font-semibold transition-all",
        active
          ? "bg-card text-primary shadow-sm"
          : "text-muted-foreground active:opacity-70",
      )}
    >
      {children}
    </button>
  );
}

// ─── What's in the Bag ────────────────────────────────────────────────────────

const BAG_KEY = "rangeRat_bag";

type ClubType = "driver" | "wood" | "hybrid" | "iron-set" | "iron" | "wedge" | "putter";

interface Club {
  id: string;
  name: string;
  type: ClubType;
  brand?: string;
  model?: string;
  parentSetId?: string; // child irons belong to an iron-set
  ironNumber?: number;  // 2–9 for numbered irons, 10 = PW
}

const TYPE_LABELS: Record<ClubType, string> = {
  driver: "Driver", wood: "Wood", hybrid: "Hybrid",
  "iron-set": "Iron Set", iron: "Iron", wedge: "Wedge", putter: "Putter",
};

const ADD_TYPES: { value: ClubType; label: string }[] = [
  { value: "driver",   label: "Driver" },
  { value: "wood",     label: "Wood" },
  { value: "hybrid",   label: "Hybrid" },
  { value: "iron-set", label: "Iron Set" },
  { value: "iron",     label: "Iron" },
  { value: "wedge",    label: "Wedge" },
  { value: "putter",   label: "Putter" },
];

// 2–9 = numbered irons, 10 = Pitching Wedge
const IRON_NUMBERS = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const ironLabel     = (n: number) => (n === 10 ? "PW" : String(n));
const ironClubName  = (n: number) => (n === 10 ? "Pitching Wedge" : `${n} Iron`);

function loadBag(): Club[] {
  try { return JSON.parse(localStorage.getItem(BAG_KEY) ?? "[]") as Club[]; }
  catch { return []; }
}

/** Return clubs in golf-bag display order. Iron-set children follow their parent immediately. */
function sortedForDisplay(clubs: Club[]): Club[] {
  const byType = (t: ClubType) => clubs.filter((c) => c.type === t && !c.parentSetId);
  const result: Club[] = [
    ...byType("driver"),
    ...byType("wood"),
    ...byType("hybrid"),
  ];
  for (const set of byType("iron-set")) {
    result.push(set);
    result.push(
      ...clubs
        .filter((c) => c.parentSetId === set.id)
        .sort((a, b) => (a.ironNumber ?? 99) - (b.ironNumber ?? 99)),
    );
  }
  result.push(...clubs.filter((c) => c.type === "iron" && !c.parentSetId));
  result.push(...byType("wedge"), ...byType("putter"));
  return result;
}

function generateIronSet(
  setId: string,
  brand: string | undefined,
  model: string | undefined,
  from: number,
  to: number,
): Club[] {
  return Array.from({ length: to - from + 1 }, (_, i) => {
    const n = from + i;
    return {
      id: `${setId}-i${n}-${Math.random().toString(36).slice(2, 5)}`,
      name: ironClubName(n),
      type: "iron" as ClubType,
      brand,
      model,
      parentSetId: setId,
      ironNumber: n,
    };
  });
}

type ClubDraft = {
  type: ClubType;
  name: string;
  brand: string;
  model: string;
  ironFrom: number;
  ironTo: number;
};
type EditDraft = { type: ClubType; name: string; brand: string; model: string };

const EMPTY_DRAFT: ClubDraft = { type: "driver", name: "", brand: "", model: "", ironFrom: 4, ironTo: 10 };
const EMPTY_EDIT: EditDraft  = { type: "driver", name: "", brand: "", model: "" };

function BagSection() {
  const [clubs, setClubs]         = useState<Club[]>(loadBag);
  const [showForm, setShowForm]   = useState(false);
  const [addDraft, setAddDraft]   = useState<ClubDraft>(EMPTY_DRAFT);
  const [removing, setRemoving]   = useState<string | null>(null);
  const [removingSet, setRemovingSet] = useState<string | null>(null);
  const [editing, setEditing]     = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft>(EMPTY_EDIT);

  // Load from Supabase on mount; fall back to localStorage for instant render
  useEffect(() => {
    fetchBag().then((dbClubs) => {
      if (dbClubs.length > 0) setClubs(dbClubs as Club[]);
    });
  }, []);

  const update = (next: Club[]) => {
    setClubs(next);
    // Persist to localStorage for offline/instant reads
    try { localStorage.setItem(BAG_KEY, JSON.stringify(next)); } catch {}
    // Persist to Supabase
    dbSaveBag(next as DbClub[]);
  };

  // ── Add ──
  const addClub = () => {
    if (addDraft.type === "iron-set") {
      if (addDraft.ironFrom >= addDraft.ironTo) return;
      const setId   = `set-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const brand   = addDraft.brand.trim() || undefined;
      const model   = addDraft.model.trim() || undefined;
      const setName = [addDraft.brand.trim(), addDraft.model.trim()].filter(Boolean).join(" ") || "Iron Set";
      const header: Club = { id: setId, name: setName, type: "iron-set", brand, model };
      update([...clubs, header, ...generateIronSet(setId, brand, model, addDraft.ironFrom, addDraft.ironTo)]);
      setCollapsedSets((prev) => new Set([...prev, setId]));
    } else {
      if (!addDraft.name.trim()) return;
      update([...clubs, {
        id:    `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name:  addDraft.name.trim(),
        brand: addDraft.brand.trim() || undefined,
        model: addDraft.model.trim() || undefined,
        type:  addDraft.type,
      }]);
    }
    setAddDraft(EMPTY_DRAFT);
    setShowForm(false);
  };

  const canAdd = addDraft.type === "iron-set"
    ? addDraft.ironFrom < addDraft.ironTo
    : !!addDraft.name.trim();

  // ── Edit ──
  const startEdit = (club: Club) => {
    setRemoving(null);
    setEditing(club.id);
    setEditDraft({ type: club.type, name: club.name, brand: club.brand ?? "", model: club.model ?? "" });
  };

  const saveEdit = () => {
    if (!editing) return;
    const club = clubs.find((c) => c.id === editing);
    if (!club) return;
    if (club.type !== "iron-set" && !editDraft.name.trim()) return;
    const updatedName = club.type === "iron-set"
      ? ([editDraft.brand.trim(), editDraft.model.trim()].filter(Boolean).join(" ") || "Iron Set")
      : editDraft.name.trim();
    update(clubs.map((c) => {
      if (c.id === editing) return { ...c, name: updatedName, brand: editDraft.brand.trim() || undefined, model: editDraft.model.trim() || undefined };
      // Propagate brand/model to all children of the set
      if (club.type === "iron-set" && c.parentSetId === editing) return { ...c, brand: editDraft.brand.trim() || undefined, model: editDraft.model.trim() || undefined };
      return c;
    }));
    setEditing(null);
  };

  const cancelEdit = () => setEditing(null);

  // ── Remove ──
  const removeClub = (id: string) => {
    const club = clubs.find((c) => c.id === id);
    if (!club) return;

    if (removing !== id) { setRemoving(id); return; }

    // Confirmed, perform removal
    setRemoving(null);
    let next = clubs.filter((c) => c.id !== id);

    if (club.type === "iron-set") {
      // Remove header + all children
      next = next.filter((c) => c.parentSetId !== id);
    } else if (club.parentSetId) {
      // Check if this was the last child iron
      const remaining = next.filter((c) => c.parentSetId === club.parentSetId);
      if (remaining.length === 0) setRemovingSet(club.parentSetId);
    }

    update(next);
  };

  const confirmRemoveSet = (setId: string) => {
    update(clubs.filter((c) => c.id !== setId));
    setRemovingSet(null);
  };

  // ── Collapse, default all existing iron sets to collapsed ──
  const [collapsedSets, setCollapsedSets] = useState<Set<string>>(
    () => new Set(loadBag().filter((c) => c.type === "iron-set").map((c) => c.id)),
  );
  const toggleSet = (id: string) =>
    setCollapsedSets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  // Build display groups: iron sets cluster with their children
  type DisplayGroup =
    | { kind: "standalone"; club: Club }
    | { kind: "set"; header: Club; children: Club[] };

  const childIds = new Set(clubs.filter((c) => !!c.parentSetId).map((c) => c.id));
  const groups: DisplayGroup[] = [];
  for (const club of sortedForDisplay(clubs)) {
    if (childIds.has(club.id)) continue;
    if (club.type === "iron-set") {
      groups.push({
        kind: "set",
        header: club,
        children: clubs
          .filter((c) => c.parentSetId === club.id)
          .sort((a, b) => (a.ironNumber ?? 99) - (b.ironNumber ?? 99)),
      });
    } else {
      groups.push({ kind: "standalone", club });
    }
  }

  return (
    <div className="space-y-3">

      {/* Banner: all irons in a set were deleted */}
      {removingSet && (() => {
        const set = clubs.find((c) => c.id === removingSet);
        return (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">All irons removed from set.</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Remove the "{set?.name ?? "Iron Set"}" header too?
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => confirmRemoveSet(removingSet)}
                className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-bold text-white transition active:opacity-80">
                Remove Header
              </button>
              <button type="button" onClick={() => setRemovingSet(null)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-bold text-muted-foreground transition active:bg-muted">
                Keep It
              </button>
            </div>
          </div>
        );
      })()}

      {/* Club list */}
      {clubs.length === 0 && !showForm ? (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Briefcase className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="mt-4 font-display text-xl">Bag is empty</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-[240px]">
            Add your clubs to track your full set-up.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => {
            if (group.kind === "standalone") {
              const club       = group.club;
              const isEditing  = editing === club.id;
              const isRemoving = removing === club.id;
              return (
                <div key={club.id} className="rounded-2xl border border-border bg-card px-4 py-3">
                  {isEditing ? (
                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Edit Club</p>
                      <input autoFocus value={editDraft.name}
                        onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                        placeholder="Club name"
                        className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold outline-none focus:border-primary"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input value={editDraft.brand} onChange={(e) => setEditDraft({ ...editDraft, brand: e.target.value })}
                          placeholder="Brand" className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold outline-none focus:border-primary" />
                        <input value={editDraft.model} onChange={(e) => setEditDraft({ ...editDraft, model: e.target.value })}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); }}
                          placeholder="Model" className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold outline-none focus:border-primary" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {ADD_TYPES.filter((t) => t.value !== "iron-set").map((ct) => (
                          <button key={ct.value} type="button" onClick={() => setEditDraft({ ...editDraft, type: ct.value })}
                            className={cn("rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
                              editDraft.type === ct.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted text-foreground active:opacity-80")}>
                            {ct.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button type="button" onClick={cancelEdit} className="flex-1 rounded-xl border border-border py-3 text-sm font-bold text-muted-foreground transition active:bg-muted">Cancel</button>
                        <button type="button" onClick={saveEdit} disabled={!editDraft.name.trim()} className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition active:opacity-90 disabled:opacity-40">Save</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold leading-none">{club.name}</p>
                        {(club.brand || club.model) && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{[club.brand, club.model].filter(Boolean).join(" · ")}</p>
                        )}
                        <span className="mt-1.5 inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          {TYPE_LABELS[club.type]}
                        </span>
                      </div>
                      {isRemoving ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-semibold text-muted-foreground">Remove?</span>
                          <button type="button" onClick={() => removeClub(club.id)} className="rounded-full bg-destructive px-3 py-1 text-xs font-bold text-white transition active:opacity-80">Yes</button>
                          <button type="button" onClick={() => setRemoving(null)} className="rounded-full border border-border px-3 py-1 text-xs font-bold text-muted-foreground transition active:bg-muted">No</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button type="button" onClick={() => startEdit(club)} aria-label={`Edit ${club.name}`} className="rounded-full p-2 text-muted-foreground transition active:text-primary"><Pencil className="h-4 w-4" /></button>
                          <button type="button" onClick={() => { setEditing(null); removeClub(club.id); }} aria-label={`Remove ${club.name}`} className="rounded-full p-2 text-muted-foreground transition active:text-destructive"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            /* ── Iron Set group ── */
            const { header, children } = group;
            const isCollapsed  = collapsedSets.has(header.id);
            const isHdrEditing = editing === header.id;
            const isHdrRemoving = removing === header.id;

            return (
              <div key={header.id}>
                {/* Set header card */}
                <div className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3">
                  {isHdrEditing ? (
                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Edit Iron Set</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input autoFocus value={editDraft.brand} onChange={(e) => setEditDraft({ ...editDraft, brand: e.target.value })}
                          placeholder="Brand" className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold outline-none focus:border-primary" />
                        <input value={editDraft.model} onChange={(e) => setEditDraft({ ...editDraft, model: e.target.value })}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); }}
                          placeholder="Model" className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold outline-none focus:border-primary" />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button type="button" onClick={cancelEdit} className="flex-1 rounded-xl border border-border py-3 text-sm font-bold text-muted-foreground transition active:bg-muted">Cancel</button>
                        <button type="button" onClick={saveEdit} className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition active:opacity-90">Save</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {/* Toggle area, tapping this collapses/expands children */}
                      <button
                        type="button"
                        onClick={() => toggleSet(header.id)}
                        className="flex flex-1 min-w-0 items-center gap-2 text-left active:opacity-70"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-bold uppercase tracking-[0.15em] text-primary mb-0.5">Iron Set</p>
                          <p className="font-semibold leading-none">{header.name}</p>
                          {(header.brand || header.model) && (
                            <p className="mt-0.5 text-xs text-muted-foreground">{[header.brand, header.model].filter(Boolean).join(" · ")}</p>
                          )}
                        </div>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 text-primary transition-transform duration-200",
                            isCollapsed ? "-rotate-90" : "rotate-0",
                          )}
                        />
                      </button>

                      {/* Edit / Delete buttons, independent of toggle */}
                      {isHdrRemoving ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-semibold text-muted-foreground">Remove set?</span>
                          <button type="button" onClick={() => removeClub(header.id)} className="rounded-full bg-destructive px-3 py-1 text-xs font-bold text-white transition active:opacity-80">Yes</button>
                          <button type="button" onClick={() => setRemoving(null)} className="rounded-full border border-border px-3 py-1 text-xs font-bold text-muted-foreground transition active:bg-muted">No</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button type="button" onClick={() => startEdit(header)} aria-label="Edit iron set" className="rounded-full p-2 text-muted-foreground transition active:text-primary"><Pencil className="h-4 w-4" /></button>
                          <button type="button" onClick={() => { setEditing(null); removeClub(header.id); }} aria-label="Remove iron set" className="rounded-full p-2 text-muted-foreground transition active:text-destructive"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Children, animated collapse */}
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-200 ease-in-out",
                    isCollapsed ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100",
                  )}
                >
                  <div className="mt-2 ml-5 space-y-2">
                    {children.map((child) => {
                      const isChildEditing  = editing === child.id;
                      const isChildRemoving = removing === child.id;
                      return (
                        <div key={child.id} className="rounded-2xl border border-border bg-card px-4 py-3">
                          {isChildEditing ? (
                            <div className="space-y-3">
                              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Edit Iron</p>
                              <input autoFocus value={editDraft.name}
                                onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                                onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                                placeholder="Iron name"
                                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold outline-none focus:border-primary"
                              />
                              <div className="flex gap-2 pt-1">
                                <button type="button" onClick={cancelEdit} className="flex-1 rounded-xl border border-border py-3 text-sm font-bold text-muted-foreground transition active:bg-muted">Cancel</button>
                                <button type="button" onClick={saveEdit} disabled={!editDraft.name.trim()} className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition active:opacity-90 disabled:opacity-40">Save</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <p className="flex-1 min-w-0 font-semibold leading-none">{child.name}</p>
                              {isChildRemoving ? (
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-xs font-semibold text-muted-foreground">Remove?</span>
                                  <button type="button" onClick={() => removeClub(child.id)} className="rounded-full bg-destructive px-3 py-1 text-xs font-bold text-white transition active:opacity-80">Yes</button>
                                  <button type="button" onClick={() => setRemoving(null)} className="rounded-full border border-border px-3 py-1 text-xs font-bold text-muted-foreground transition active:bg-muted">No</button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button type="button" onClick={() => startEdit(child)} aria-label={`Edit ${child.name}`} className="rounded-full p-2 text-muted-foreground transition active:text-primary"><Pencil className="h-4 w-4" /></button>
                                  <button type="button" onClick={() => { setEditing(null); removeClub(child.id); }} aria-label={`Remove ${child.name}`} className="rounded-full p-2 text-muted-foreground transition active:text-destructive"><Trash2 className="h-4 w-4" /></button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inline add form */}
      {showForm ? (
        <div className="rounded-2xl border border-primary/40 bg-card p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Add a club</p>

          {/* Type selector */}
          <div className="flex flex-wrap gap-2">
            {ADD_TYPES.map((ct) => (
              <button key={ct.value} type="button"
                onClick={() => setAddDraft({ ...addDraft, type: ct.value })}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
                  addDraft.type === ct.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted text-foreground active:opacity-80",
                )}
              >
                {ct.label}
              </button>
            ))}
          </div>

          {/* Iron Set fields */}
          {addDraft.type === "iron-set" ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <input
                  autoFocus
                  value={addDraft.brand}
                  onChange={(e) => setAddDraft({ ...addDraft, brand: e.target.value })}
                  placeholder="Brand (optional)"
                  className="rounded-xl border border-border bg-background px-3 py-3 text-sm font-semibold outline-none focus:border-primary"
                />
                <input
                  value={addDraft.model}
                  onChange={(e) => setAddDraft({ ...addDraft, model: e.target.value })}
                  placeholder="Model (optional)"
                  className="rounded-xl border border-border bg-background px-3 py-3 text-sm font-semibold outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">From</p>
                <div className="flex gap-1.5 flex-wrap">
                  {IRON_NUMBERS.filter((n) => n <= 9).map((n) => (
                    <button key={n} type="button"
                      onClick={() => setAddDraft({ ...addDraft, ironFrom: n, ironTo: Math.max(n + 1, addDraft.ironTo) })}
                      className={cn(
                        "h-9 min-w-[2.5rem] rounded-full border px-3 text-xs font-bold transition-colors",
                        addDraft.ironFrom === n
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-muted text-foreground active:opacity-80",
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">To</p>
                <div className="flex gap-1.5 flex-wrap">
                  {IRON_NUMBERS.filter((n) => n > addDraft.ironFrom).map((n) => (
                    <button key={n} type="button"
                      onClick={() => setAddDraft({ ...addDraft, ironTo: n })}
                      className={cn(
                        "h-9 min-w-[2.5rem] rounded-full border px-3 text-xs font-bold transition-colors",
                        addDraft.ironTo === n
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-muted text-foreground active:opacity-80",
                      )}
                    >
                      {ironLabel(n)}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Creates {addDraft.ironTo - addDraft.ironFrom + 1} irons ({ironLabel(addDraft.ironFrom)}–{ironLabel(addDraft.ironTo)}).
              </p>
            </>
          ) : (
            /* Standard club fields */
            <>
              <input
                autoFocus
                value={addDraft.name}
                onChange={(e) => setAddDraft({ ...addDraft, name: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") addClub(); if (e.key === "Escape") { setShowForm(false); setAddDraft(EMPTY_DRAFT); } }}
                placeholder="Club name (e.g. 3 Wood)"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold outline-none focus:border-primary"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={addDraft.brand}
                  onChange={(e) => setAddDraft({ ...addDraft, brand: e.target.value })}
                  placeholder="Brand (optional)"
                  className="rounded-xl border border-border bg-background px-3 py-3 text-sm font-semibold outline-none focus:border-primary"
                />
                <input
                  value={addDraft.model}
                  onChange={(e) => setAddDraft({ ...addDraft, model: e.target.value })}
                  placeholder="Model (optional)"
                  className="rounded-xl border border-border bg-background px-3 py-3 text-sm font-semibold outline-none focus:border-primary"
                />
              </div>
            </>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button"
              onClick={() => { setShowForm(false); setAddDraft(EMPTY_DRAFT); }}
              className="flex-1 rounded-xl border border-border py-3.5 text-sm font-bold text-muted-foreground transition active:bg-muted">
              Cancel
            </button>
            <button type="button" onClick={addClub} disabled={!canAdd}
              className="flex-1 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition active:opacity-90 disabled:opacity-40">
              Save Club
            </button>
          </div>
        </div>
      ) : (
        <button type="button"
          onClick={() => { setShowForm(true); setRemoving(null); setEditing(null); }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-4 text-sm font-semibold text-muted-foreground transition-colors active:bg-muted">
          <Plus className="h-4 w-4" />
          Add a club
        </button>
      )}
    </div>
  );
}

// ─── Yardage Tracker ──────────────────────────────────────────────────────────

const YARDAGE_KEY = "rangeRat_yardages";

type SwingYardages = {
  halfSwing: number | null;
  threeQuarterSwing: number | null;
  fullSwing: number | null;
};

type YardageMap = Record<string, SwingYardages>;

function loadYardages(): YardageMap {
  try { return JSON.parse(localStorage.getItem(YARDAGE_KEY) ?? "{}") as YardageMap; }
  catch { return {}; }
}

const SWING_COLS: { key: keyof SwingYardages; label: string }[] = [
  { key: "halfSwing",         label: "½ Swing" },
  { key: "threeQuarterSwing", label: "¾ Swing" },
  { key: "fullSwing",         label: "Full" },
];

function YardageSection() {
  const [clubs, setClubs] = useState<Club[]>(() =>
    sortedForDisplay(loadBag()).filter((c) => c.type !== "iron-set" && c.type !== "putter")
  );
  const [yardages, setYardages] = useState<YardageMap>(loadYardages);

  useEffect(() => {
    fetchBag().then((dbClubs) => {
      if (dbClubs.length > 0)
        setClubs(sortedForDisplay(dbClubs as Club[]).filter((c) => c.type !== "iron-set" && c.type !== "putter"));
    });
    fetchYardages().then((y) => { if (Object.keys(y).length > 0) setYardages(y); });
  }, []);

  const updateYardage = (clubId: string, col: keyof SwingYardages, val: number | null) => {
    const current: SwingYardages = yardages[clubId] ?? { halfSwing: null, threeQuarterSwing: null, fullSwing: null };
    const next: SwingYardages = { ...current, [col]: val };
    setYardages((prev) => ({ ...prev, [clubId]: next }));
    // Persist to localStorage for fast reads
    try {
      const all = { ...loadYardages(), [clubId]: next };
      localStorage.setItem(YARDAGE_KEY, JSON.stringify(all));
    } catch {}
    // Persist to Supabase
    dbSaveYardage(clubId, next);
  };

  if (clubs.length === 0) {
    return (
      <EmptyState
        Icon={Ruler}
        title="No clubs in bag"
        body='Add clubs in the "Bag" tab first, then track your distances here.'
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Tap any cell to enter carry distance in yards. Auto-saves on blur.
      </p>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[320px]">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="sticky left-0 z-10 bg-card px-4 py-3 text-left text-[13px] font-bold uppercase tracking-widest text-muted-foreground">
                Club
              </th>
              {SWING_COLS.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-3 text-center text-[13px] font-bold uppercase tracking-widest text-muted-foreground"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clubs.map((club, i) => (
              <tr
                key={club.id}
                className={cn(
                  "border-b border-border last:border-0",
                  i % 2 !== 0 && "bg-muted/10",
                )}
              >
                <td className="sticky left-0 z-10 bg-card px-4 py-2">
                  <p className="font-semibold leading-none">{club.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{TYPE_LABELS[club.type]}</p>
                </td>
                {SWING_COLS.map((col) => (
                  <td key={col.key} className="px-2 py-1.5">
                    <YardageCell
                      key={`${club.id}-${col.key}`}
                      value={yardages[club.id]?.[col.key] ?? null}
                      onCommit={(val) => updateYardage(club.id, col.key, val)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function YardageCell({
  value,
  onCommit,
}: {
  value: number | null;
  onCommit: (v: number | null) => void;
}) {
  const [draft, setDraft] = useState(value !== null ? String(value) : "");
  const [error, setError] = useState(false);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === "") {
      setError(false);
      onCommit(null);
      return;
    }
    const n = parseInt(trimmed, 10);
    if (!isNaN(n) && n >= 0 && n <= 400) {
      setError(false);
      setDraft(String(n));
      onCommit(n);
    } else {
      setError(true);
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={draft}
      onChange={(e) => { setDraft(e.target.value); setError(false); }}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      placeholder="–"
      className={cn(
        "h-11 w-full min-w-[68px] rounded-xl border text-center text-sm font-bold outline-none transition",
        error
          ? "border-destructive bg-destructive/10 text-destructive placeholder:text-destructive/40"
          : "border-border bg-background text-foreground placeholder:text-muted-foreground/40 focus:border-primary",
      )}
    />
  );
}

// ─── All-Time Stats ───────────────────────────────────────────────────────────

const GOAL_LABELS: Record<string, string> = {
  accuracy: "Accuracy",
  consistency: "Consistency",
  distance: "Distance",
  "shot-shaping": "Shot Shaping",
};

function formatSessionDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).replace(",", " ·");
}

function StatsSection() {
  const [sessions, setSessions] = useState<SavedSession[]>(() => {
    try { return JSON.parse(localStorage.getItem("range-rat:sessions") ?? "[]") as SavedSession[]; }
    catch { return []; }
  });

  useEffect(() => {
    fetchSessions().then((s) => { if (s.length > 0) setSessions(s); }).catch(() => {});
  }, []);

  // Weekly bar chart data
  const weekData = useMemo(() => {
    const today = new Date();
    // 0=Mon ... 6=Sun
    const todayDow = (today.getDay() + 6) % 7;
    const counts = Array(7).fill(0) as number[];
    sessions.forEach((s) => {
      const d = new Date(s.completedAt);
      const diffMs = today.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 7) {
        const dow = (d.getDay() + 6) % 7;
        counts[dow] += s.totalBalls;
      }
    });
    const maxVal = Math.max(...counts, 1);

    const thisWeekTotal = counts.reduce((a, b) => a + b, 0);
    const prevCounts = Array(7).fill(0) as number[];
    sessions.forEach((s) => {
      const d = new Date(s.completedAt);
      const diffMs = today.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays >= 7 && diffDays < 14) {
        const dow = (d.getDay() + 6) % 7;
        prevCounts[dow] += s.totalBalls;
      }
    });
    const prevWeekTotal = prevCounts.reduce((a, b) => a + b, 0);
    let wowPct: number | null = null;
    if (prevWeekTotal > 0) wowPct = Math.round(((thisWeekTotal - prevWeekTotal) / prevWeekTotal) * 100);

    return { bars: counts.map((c) => Math.round((c / maxVal) * 100)), todayIndex: todayDow, wowPct };
  }, [sessions]);

  const recentSessions = useMemo(() => {
    return [...sessions].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()).slice(0, 3);
  }, [sessions]);

  if (sessions.length === 0) {
    return (
      <EmptyState
        Icon={BarChart2}
        title="No sessions yet"
        body="Complete a Practice session and your all-time stats will appear here."
      />
    );
  }

  const totalBalls  = sessions.reduce((s, x) => s + x.totalBalls,  0);
  const totalDrills = sessions.reduce((s, x) => s + x.drillCount,  0);

  const goalCounts: Record<string, number> = {};
  sessions.forEach((s) => {
    goalCounts[s.filters.goal] = (goalCounts[s.filters.goal] ?? 0) + 1;
  });
  const topGoalKey = Object.entries(goalCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

  return (
    <div className="space-y-3">
      {/* Stat tiles, first */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Sessions"   value={String(sessions.length)} />
        <StatCard label="Balls Hit"  value={totalBalls.toLocaleString()} />
        <StatCard label="Drills Done" value={String(totalDrills)} />
        <StatCard label="Top Goal"   value={GOAL_LABELS[topGoalKey] ?? topGoalKey} />
      </div>

      {/* Weekly bar chart */}
      <div className="rounded-[22px] border border-border bg-card p-4">
        <div className="flex justify-between items-baseline">
          <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Last 7 days</p>
          {weekData.wowPct !== null && (
            <span className={cn("text-[13px] font-semibold tracking-[0.08em]", weekData.wowPct >= 0 ? "text-primary" : "text-muted-foreground")}>
              {weekData.wowPct >= 0 ? "+" : ""}{weekData.wowPct}% vs last week
            </span>
          )}
        </div>
        <div className="mt-3 h-[100px] flex gap-2 items-end">
          {weekData.bars.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className={cn("w-full rounded-[6px] min-h-[4px]", i === weekData.todayIndex ? "bg-primary" : "bg-primary/18")}
                style={{ height: `${Math.max(h, 4)}%` }}
              />
              <span className="text-[12px] font-semibold tracking-[0.06em] text-muted-foreground">
                {["M","T","W","T","F","S","S"][i]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent sessions */}
      <div className="mt-4">
        <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2.5">Recent sessions</p>
        {recentSessions.map((s) => (
          <div key={s.id} className="rounded-[22px] border border-border bg-card px-3.5 py-3 flex items-center gap-3 mb-1.5">
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-semibold">{formatSessionDate(s.completedAt)}</p>
              <p className="text-[13px] font-bold uppercase tracking-[0.1em] text-muted-foreground mt-0.5">{s.filters.goal}</p>
            </div>
            <span className="font-stats text-[22px] text-primary tabular-nums">
              {s.totalBalls}<span className="text-[12px] font-bold tracking-[0.14em] ml-0.5">BALLS</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 font-stats text-[36px] leading-none tabular-nums text-primary">{value}</p>
    </div>
  );
}

function EmptyState({
  Icon,
  title,
  body,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center pt-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="mt-4 font-display text-xl">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-[260px]">{body}</p>
    </div>
  );
}

// ─── Handicap history chart (Pro) ─────────────────────────────────────────────

function HandicapChart({ history }: { history: HandicapSnapshot[] }) {
  const W = 300, H = 68, P = 8;
  const values = history.map(h => h.handicap);
  const labels = history.map(h => new Date(h.recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }));

  // Higher handicap = worse golfer = higher on the chart, so improvement falls toward 0
  const lo = Math.min(...values), hi = Math.max(...values), rng = hi - lo || 1;
  const pts = values.map((v, i) => {
    const x = P + (i / (values.length - 1)) * (W - P * 2);
    const pct = (v - lo) / rng;
    const y = (H - P) - pct * (H - P * 2);
    return [x, y] as [number, number];
  });
  const line = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const areaPath = `M${pts[0][0]},${H} ` + pts.map(([x, y]) => `L${x},${y}`).join(" ") + ` L${pts[pts.length - 1][0]},${H}Z`;

  return (
    <>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id="hdx-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#hdx-grad)" />
        <polyline points={line} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y}
            r={i === pts.length - 1 ? 4 : 2.5}
            fill={i === pts.length - 1 ? "var(--primary)" : "var(--background)"}
            stroke="var(--primary)" strokeWidth="1.5" />
        ))}
      </svg>
      <div className="flex justify-between mt-1.5">
        {labels.map((l, i) => (
          <span key={i} className="text-[9.5px] font-semibold text-muted-foreground" style={{ letterSpacing: ".04em" }}>{l}</span>
        ))}
      </div>
    </>
  );
}

// ─── Stat detail sheet (Pro) ──────────────────────────────────────────────────

function StatDetailSheet({ statKey, history, onClose }: {
  statKey: StatKey;
  history: HandicapSnapshot[];
  onClose: () => void;
}) {
  const cfg = STAT_CONFIG[statKey];
  // Last 8 rounds with this stat logged, oldest → newest
  const points = history
    .filter(h => h[statKey] !== undefined)
    .map(h => ({ value: h[statKey] as number, date: h.recordedAt }))
    .slice(-8);

  const values = points.map(p => p.value);
  const latest = values[values.length - 1];
  const avg = values.length ? +(values.reduce((s, v) => s + v, 0) / values.length).toFixed(1) : undefined;
  const best = values.length ? (cfg.betterDown ? Math.min(...values) : Math.max(...values)) : undefined;

  const W = 320, H = 110, PX = 18, PT = 22, PB = 10;
  const lo = Math.min(...values), hi = Math.max(...values), rng = hi - lo || 1;
  const pts = values.map((v, i) => {
    const x = values.length === 1 ? W / 2 : PX + (i / (values.length - 1)) * (W - PX * 2);
    const y = (H - PB) - ((v - lo) / rng) * (H - PT - PB);
    return [x, y] as [number, number];
  });
  const line = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const areaPath = pts.length > 1
    ? `M${pts[0][0]},${H} ` + pts.map(([x, y]) => `L${x},${y}`).join(" ") + ` L${pts[pts.length - 1][0]},${H}Z`
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/[0.44]" />
      <div className="relative w-full max-w-[430px] max-h-[90dvh] overflow-y-auto overflow-x-hidden rounded-[28px] bg-background p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-[18px]">
          <div>
            <h2 className="font-display text-[26px] leading-none">{cfg.label}</h2>
            <p className="text-[12px] text-muted-foreground mt-1">
              {points.length ? `Last ${points.length} round${points.length === 1 ? "" : "s"}` : "No rounds logged"}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted-foreground mt-0.5">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Latest / Average / Best */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Latest", value: latest },
            { label: "Average", value: avg },
            { label: "Best", value: best },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-[13px] border border-border bg-muted p-[10px_12px] text-center">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
              <p className="mt-1 font-stats text-[26px] font-bold text-primary leading-none">
                {value !== undefined ? cfg.fmt(value) : "–"}
              </p>
            </div>
          ))}
        </div>

        {/* Chart with actual values on each point, same style as the handicap trend chart */}
        {points.length > 1 ? (
          <>
            <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "visible" }}>
              <defs>
                <linearGradient id="stat-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.01" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#stat-grad)" />
              <polyline points={line} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {pts.map(([x, y], i) => (
                <g key={i}>
                  <circle cx={x} cy={y}
                    r={i === pts.length - 1 ? 4 : 2.5}
                    fill={i === pts.length - 1 ? "var(--primary)" : "var(--background)"}
                    stroke="var(--primary)" strokeWidth="1.5" />
                  <text x={x} y={y - 9} textAnchor="middle"
                    fill="var(--primary)" fontSize="11" fontWeight="700"
                    fontFamily="'Barlow Condensed', sans-serif">
                    {cfg.fmt(values[i])}
                  </text>
                </g>
              ))}
            </svg>
            <div className="flex justify-between mt-1.5">
              {points.map((p, i) => (
                <span key={i} className="text-[9.5px] font-semibold text-muted-foreground" style={{ letterSpacing: ".04em" }}>
                  {new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="text-[12px] text-muted-foreground text-center py-6">
            Log at least two rounds with {cfg.label.toLowerCase()} to see your trend.
          </p>
        )}
      </div>
    </div>
  );
}
