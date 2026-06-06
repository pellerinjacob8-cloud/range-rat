import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ProModal } from "@/components/ProModal";
import { useMemo, useState, useEffect } from "react";
import { BarChart2, Briefcase, Check, ChevronDown, ChevronLeft, ChevronRight, Crown, Flag, LogOut, Moon, Pencil, Plus, Ruler, Settings, Sun, Target, Trash2, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import {
  fetchProfile, saveProfile as dbSaveProfile,
  fetchSessions, fetchBag, saveBag as dbSaveBag,
  fetchYardages, saveYardage as dbSaveYardage,
  type SavedSession, type Club as DbClub, type YardageMap as DbYardageMap,
} from "@/lib/db";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Range Rat" },
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
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "stats" | "bag" | "yardage";
type SubView = null | "bag" | "yardage";

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

  useEffect(() => {
    fetchProfile().then((p) => {
      if (!p) return;
      setProfile(p);
      setFirstInput(p.firstName);
      setLastInput(p.lastName);
      try { localStorage.setItem("rangeRat_profile", JSON.stringify(p)); } catch {}
    });
    fetchSessions().then(setAllTimeSessions);
  }, []);

  const handleSignOut = async () => { await signOut(); navigate({ to: "/login" }); };

  const startEdit = () => { setFirstInput(profile.firstName); setLastInput(profile.lastName); setEditing(true); };
  const saveName = () => {
    const updated: Profile = { ...profile, firstName: firstInput.trim(), lastName: lastInput.trim() };
    setProfile(updated);
    dbSaveProfile(updated);
    setEditing(false);
  };
  const cancelEdit = () => { setFirstInput(profile.firstName); setLastInput(profile.lastName); setEditing(false); };

  const totalBalls = allTimeSessions.reduce((s, x) => s + x.totalBalls, 0);
  const formatBalls = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  // Best streak
  const bestStreak = useMemo(() => {
    if (!allTimeSessions.length) return 0;
    const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
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
          <h1 className="font-display text-[32px] mb-6">Your Bag</h1>
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

  const initial = profile.firstName ? profile.firstName[0].toUpperCase() : "?";

  return (
    <AppShell>
      <div className="pb-24 pt-2">

        {/* ── Hero ── */}
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 rounded-[20px] bg-primary text-white flex items-center justify-center font-display text-[30px] leading-none">
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
                    className="flex-1 h-10 rounded-[12px] bg-primary text-white text-[13px] font-bold uppercase tracking-[0.06em] disabled:opacity-40">Save</button>
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

        {/* ── All-time stats ── */}
        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">All-time</p>
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {[
            { eyebrow: "Sessions", value: String(allTimeSessions.length), sub: "logged" },
            { eyebrow: "Balls", value: formatBalls(totalBalls), sub: "hit" },
            { eyebrow: "Best", value: String(bestStreak), sub: "day run" },
          ].map(({ eyebrow, value, sub }) => (
            <div key={eyebrow} className="rounded-[18px] border border-border bg-card p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
              <p className="mt-1 font-stats text-[32px] leading-none text-primary">{value}</p>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Pro card / upgrade nudge ── */}
        {isPro ? (
          <div className="mt-4 flex items-center gap-3.5 rounded-[22px] border border-gold-border bg-gold-bg px-4 py-3.5">
            <div className="h-11 w-11 shrink-0 rounded-[13px] bg-gold-bg border border-gold-border flex items-center justify-center">
              <Crown className="h-5 w-5 text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-foreground">Range Rat Pro</p>
              <p className="text-[12.5px] text-muted-foreground mt-0.5">All features unlocked.</p>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setProOpen(true)}
            className="mt-4 w-full flex items-center gap-3.5 rounded-[22px] border border-border bg-card px-4 py-3.5 text-left active:bg-muted transition-colors">
            <div className="h-11 w-11 shrink-0 rounded-[13px] bg-gold-bg border border-gold-border flex items-center justify-center">
              <Zap className="h-5 w-5 text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold">Upgrade to Pro</p>
              <p className="text-[12.5px] text-muted-foreground mt-0.5">Unlock Combine, Grid Game, yardages & more.</p>
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
            onPress={() => isPro ? setSubView("yardage") : setProOpen(true)}
            proLocked={!isPro}
          />
          <div className="h-px bg-border mx-4" />
          <SetupRow icon={theme === "dark" ? Moon : Sun} label="Appearance" detail={theme === "dark" ? "Dark" : "Light"} onPress={toggleTheme} />
        </div>

        {/* ── Sign out ── */}
        <button type="button" onClick={handleSignOut}
          className="mt-4 h-14 w-full rounded-[22px] border border-border bg-card text-[14px] font-bold uppercase tracking-[0.06em] text-foreground active:bg-muted transition-colors">
          Sign Out
        </button>

      </div>

      <ProModal open={proOpen} onClose={() => setProOpen(false)} reason="Yardage tracking is a Pro feature. Log your carry distances for every club." />
    </AppShell>
  );
}

function SetupRow({ icon: Icon, label, detail, onPress, proLocked }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  detail?: string;
  onPress: () => void;
  proLocked?: boolean;
}) {
  return (
    <button type="button" onClick={onPress} className="w-full flex items-center gap-3.5 px-4 py-4 text-left active:bg-muted transition-colors">
      <Icon className="h-[19px] w-[19px] text-primary shrink-0" />
      <span className="flex-1 text-[15.5px] font-medium text-foreground">{label}</span>
      {proLocked && <Zap className="h-3.5 w-3.5 text-gold shrink-0" />}
      {detail && <span className="text-[14px] text-muted-foreground">{detail}</span>}
      <ChevronRight className="h-[17px] w-[17px] text-muted-foreground shrink-0" />
    </button>
  );
}

// ─── Pro Banner ───────────────────────────────────────────────────────────────

function ProBanner() {
  const { isPro } = useAuth();
  const [proOpen, setProOpen] = useState(false);

  if (isPro) {
    return (
      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-gold-border bg-gold-bg px-4 py-3.5">
        <Zap className="h-5 w-5 text-gold shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gold">Range Rat Pro</p>
          <p className="text-xs text-muted-foreground mt-0.5">All features unlocked.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setProOpen(true)}
        className="mt-3 w-full flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left active:bg-muted transition-colors"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-bg border border-gold-border">
          <Zap className="h-4 w-4 text-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Upgrade to Pro</p>
          <p className="text-xs text-muted-foreground mt-0.5">Unlock Combine, Grid Game, yardages & more.</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>
      <ProModal
        open={proOpen}
        onClose={() => setProOpen(false)}
        reason="Upgrade to Pro for unlimited saves, Combine, Grid Game, custom sessions, and more."
      />
    </>
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
      {/* Bag body — elongated */}
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

    // Confirmed — perform removal
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

  // ── Collapse — default all existing iron sets to collapsed ──
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
                      {/* Toggle area — tapping this collapses/expands children */}
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

                      {/* Edit / Delete buttons — independent of toggle */}
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

                {/* Children — animated collapse */}
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
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Add Club</p>

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
          Add Club
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
      placeholder="—"
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
    fetchSessions().then((s) => { if (s.length > 0) setSessions(s); });
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
    return { bars: counts.map((c) => Math.round((c / maxVal) * 100)), todayIndex: todayDow };
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
      {/* Stat tiles — first */}
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
          <span className="text-[13px] font-semibold text-primary tracking-[0.08em]">+18% vs last week</span>
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
