import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronLeft, ChevronUp, Minus, Plus, Search, Trash2, X } from "lucide-react";
import { saveCustomSessionAsync } from "@/lib/favorites";
import { CANONICAL_CLUBS, DRILLS_BY_GOAL, GOALS, type ClubGroup, type SessionDrill } from "@/lib/drills";
import { fetchPlayableBag, type Club } from "@/lib/db";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/custom-session")({
  component: CustomSessionBuilderPage,
});

// ─── Clubs ────────────────────────────────────────────────────────────────────

const ANY_CLUB = "Any club";
const DEFAULT_CLUBS = ["Driver", "3 Wood", "5 Iron", "7 Iron", "9 Iron", "Pitching Wedge", "Sand Wedge"];
const BALL_CHIPS = [1, 3, 5, 10, 15];

interface ClubOption {
  name: string;  // stored on the block and shown in the runner
  short: string; // chip label
  group?: ClubGroup;
  order: number;
}

function canonicalFor(id: string | undefined, name: string) {
  return CANONICAL_CLUBS.find((c) => c.id === id) ?? CANONICAL_CLUBS.find((c) => c.name === name);
}

function shortName(name: string, id?: string): string {
  const canon = canonicalFor(id, name);
  if (!canon) return name;
  if (canon.id === "driver") return "Driver";
  return canon.id.toUpperCase().replace(/I$/, "i");
}

function clubOptions(bag: Club[]): ClubOption[] {
  const source = bag.length > 0
    ? bag.map((c) => ({ id: c.id, name: c.name, sort: c.sortOrder }))
    : DEFAULT_CLUBS.map((name) => ({ id: undefined, name, sort: undefined }));
  const seen = new Set<string>();
  return source
    .filter((c) => c.name && !seen.has(c.name) && seen.add(c.name))
    .map((c) => {
      const canon = canonicalFor(c.id, c.name);
      return { name: c.name, short: shortName(c.name, c.id), group: canon?.group, order: canon?.sortOrder ?? c.sort ?? 50 };
    })
    // Longest club first, the way a bag reads from the top
    .sort((a, b) => b.order - a.order);
}

// Small label over each block, from its club. Order is never changed.
function sectionFor(group: ClubGroup | undefined): string {
  if (group === "wedges") return "Wedges";
  if (group === "short-irons" || group === "long-irons") return "Irons";
  if (group === "woods") return "Woods";
  if (group === "driver") return "Tee shots";
  return "Practice";
}

// ─── Drill library ────────────────────────────────────────────────────────────

interface LibraryDrill {
  name: string;
  tip: string;
  category: string;
  clubTips?: Partial<Record<ClubGroup, string>>;
}

const WARM_UP_DRILLS: LibraryDrill[] = [
  { name: "Easy Half Swings", tip: "Half swings, focus on tempo and clean contact.", category: "Warm up" },
  { name: "Short Chips", tip: "Pick a target 15 ft out.", category: "Warm up" },
  { name: "Stock Shot", tip: "Full but smooth swings. Lock in your stock shot.", category: "Warm up" },
];

const LIBRARY: LibraryDrill[] = [
  ...WARM_UP_DRILLS,
  ...GOALS.flatMap(({ value, label }) =>
    DRILLS_BY_GOAL[value].map((d) => ({ name: d.name, tip: d.description, category: label, clubTips: d.clubDescriptions })),
  ),
];

const LIBRARY_CATEGORIES = ["All", ...Array.from(new Set(LIBRARY.map((d) => d.category)))];

// ─── Builder block ────────────────────────────────────────────────────────────

interface BuilderBlock {
  key: string;
  club: string;
  group?: ClubGroup;
  balls: number;
  focus: string;
  tip: string;
}

function newKey() {
  return `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function clampBalls(n: number) {
  return Math.max(1, Math.min(200, Math.round(n) || 1));
}

function estimateMinutes(balls: number) {
  return Math.max(5, Math.round((balls * 50) / 60 / 5) * 5);
}

function toDrills(blocks: BuilderBlock[]): SessionDrill[] {
  return blocks.map((b) => ({
    id: b.key,
    club: b.club,
    drillName: b.focus.trim() || "Hit to a target",
    description: b.tip.trim(),
    balls: b.balls,
    unit: "balls",
    section: sectionFor(b.group),
  }));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CustomSessionBuilderPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [blocks, setBlocks] = useState<BuilderBlock[]>([]);
  const [bag, setBag] = useState<Club[]>([]);
  const clubs = useMemo(() => clubOptions(bag), [bag]);
  const [pickClub, setPickClub] = useState<string | null>(null);
  const [pickBalls, setPickBalls] = useState(5);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPlayableBag().then(setBag).catch(() => {});
  }, []);

  const totalBalls = blocks.reduce((s, b) => s + b.balls, 0);
  const canPreview = name.trim().length > 0 && blocks.length > 0;

  const groupOf = (club: string) => clubs.find((c) => c.name === club)?.group;

  const addBlock = () => {
    const club = pickClub ?? ANY_CLUB;
    setBlocks((prev) => [...prev, { key: newKey(), club, group: groupOf(club), balls: pickBalls, focus: "", tip: "" }]);
  };

  const update = (key: string, patch: Partial<BuilderBlock>) =>
    setBlocks((prev) => prev.map((b) => (b.key === key ? { ...b, ...patch } : b)));

  const remove = (key: string) => setBlocks((prev) => prev.filter((b) => b.key !== key));

  const move = (index: number, dir: -1 | 1) =>
    setBlocks((prev) => {
      const to = index + dir;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });

  const save = async () => {
    if (!canPreview || saving) return;
    setSaving(true);
    try {
      await saveCustomSessionAsync(name.trim(), toDrills(blocks));
      toast.success("Session saved to My Sessions.");
      navigate({ to: "/practice" });
    } catch {
      toast.error("Couldn't save the session. Your blocks are still here, so try again.");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav bar */}
      <div className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 border-b border-border">
        <button
          type="button"
          onClick={() => navigate({ to: "/practice" })}
          className="flex items-center gap-1 text-muted-foreground -ml-1 p-1"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="text-[14px] font-semibold">Practice</span>
        </button>
        <p className="text-[14px] font-bold uppercase tracking-[0.12em]">New Session</p>
        <div className="w-16" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-40">
        {/* Session name */}
        <div className="mt-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">Session Name</p>
          <input
            id="session-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Wedge Ladder"
            maxLength={80}
            className="w-full bg-transparent border-0 border-b-2 border-primary outline-none font-display text-[32px] leading-none tracking-[-0.01em] pb-1.5 placeholder:text-muted-foreground/30"
          />
        </div>

        {/* Live total */}
        <div className="mt-5 flex items-baseline gap-4 tabular-nums">
          <p className="text-[13px] text-muted-foreground"><span className="font-stats text-[22px] text-primary">{blocks.length}</span> blocks</p>
          <p className="text-[13px] text-muted-foreground"><span className="font-stats text-[22px] text-primary">{totalBalls}</span> balls</p>
          {totalBalls > 0 && (
            <p className="text-[13px] text-muted-foreground">about <span className="font-stats text-[22px] text-primary">{estimateMinutes(totalBalls)}</span> min</p>
          )}
        </div>

        {/* Blocks */}
        <div className="mt-4 space-y-3">
          {blocks.length === 0 && (
            <div className="rounded-[16px] border-2 border-dashed border-border px-4 py-6 text-center">
              <p className="text-[15px] font-semibold">No blocks yet</p>
              <p className="mt-1 text-[13px] text-muted-foreground">Pick a club and a ball count below, then tap Add.</p>
            </div>
          )}
          {blocks.map((b, i) => (
            <BlockCard
              key={b.key}
              block={b}
              index={i}
              count={blocks.length}
              clubs={clubs}
              onChange={(patch) => update(b.key, patch)}
              onRemove={() => remove(b.key)}
              onMove={(dir) => move(i, dir)}
            />
          ))}
        </div>

        {/* Add bar */}
        <div className="mt-4 rounded-[16px] border border-border bg-card px-4 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Add a block</p>

          <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Club</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {[...clubs.map((c) => ({ name: c.name, short: c.short })), { name: ANY_CLUB, short: "Any" }].map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setPickClub(c.name)}
                aria-pressed={(pickClub ?? ANY_CLUB) === c.name}
                className={cn(
                  "h-9 min-w-[44px] rounded-full border px-3 text-[13px] font-bold transition-colors",
                  (pickClub ?? ANY_CLUB) === c.name
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground active:bg-muted",
                )}
              >
                {c.short}
              </button>
            ))}
          </div>

          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Balls</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {BALL_CHIPS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPickBalls(n)}
                aria-pressed={pickBalls === n}
                className={cn(
                  "h-9 w-11 rounded-full border text-[14px] font-bold tabular-nums transition-colors",
                  pickBalls === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground active:bg-muted",
                )}
              >
                {n}
              </button>
            ))}
            <Stepper value={pickBalls} onChange={setPickBalls} label="Balls to add" />
          </div>

          <button
            type="button"
            onClick={addBlock}
            className="mt-4 h-12 w-full rounded-[12px] bg-primary text-primary-foreground text-[14px] font-bold active:opacity-90 flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add {pickBalls} ball{pickBalls !== 1 ? "s" : ""} with {(pickClub ?? ANY_CLUB) === ANY_CLUB ? "any club" : pickClub}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          disabled={!canPreview}
          className="h-14 w-full rounded-[14px] bg-primary text-primary-foreground font-bold text-[14px] uppercase tracking-[0.06em] disabled:opacity-40 active:opacity-90 transition-opacity"
        >
          Preview Session
        </button>
        {!canPreview && (
          <p className="mt-2 text-center text-[12px] text-muted-foreground">
            {name.trim() ? "Add at least one block to preview." : "Name your session and add a block to preview."}
          </p>
        )}
      </div>

      {previewOpen && (
        <PreviewSheet
          name={name.trim()}
          blocks={blocks}
          totalBalls={totalBalls}
          saving={saving}
          onBack={() => setPreviewOpen(false)}
          onSave={save}
        />
      )}
    </div>
  );
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="flex items-center">
      <button
        type="button"
        aria-label={`Fewer ${label.toLowerCase()}`}
        onClick={() => onChange(clampBalls(value - 1))}
        className="h-9 w-9 rounded-l-[10px] border border-border bg-muted flex items-center justify-center active:bg-muted/60"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(clampBalls(parseInt(e.target.value, 10)))}
        className="h-9 w-12 border-y border-border bg-background text-center text-[15px] font-bold outline-none tabular-nums"
      />
      <button
        type="button"
        aria-label={`More ${label.toLowerCase()}`}
        onClick={() => onChange(clampBalls(value + 1))}
        className="h-9 w-9 rounded-r-[10px] border border-border bg-muted flex items-center justify-center active:bg-muted/60"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Block card ───────────────────────────────────────────────────────────────

function BlockCard({
  block,
  index,
  count,
  clubs,
  onChange,
  onRemove,
  onMove,
}: {
  block: BuilderBlock;
  index: number;
  count: number;
  clubs: ClubOption[];
  onChange: (patch: Partial<BuilderBlock>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [tipOpen, setTipOpen] = useState(block.tip.length > 0);
  const [drillsOpen, setDrillsOpen] = useState(false);

  const pickDrill = (d: LibraryDrill) => {
    const tip = (block.group && d.clubTips?.[block.group]) || d.tip;
    onChange({ focus: d.name, tip });
    setTipOpen(true);
    setDrillsOpen(false);
  };

  return (
    <div className="rounded-[16px] border border-border bg-card px-4 py-3.5">
      {/* Top row */}
      <div className="flex items-center gap-1">
        <p className="flex-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {index + 1} · {sectionFor(block.group)}
        </p>
        <button type="button" aria-label="Move block up" disabled={index === 0} onClick={() => onMove(-1)} className="p-1.5 text-muted-foreground disabled:opacity-25">
          <ChevronUp className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Move block down" disabled={index === count - 1} onClick={() => onMove(1)} className="p-1.5 text-muted-foreground disabled:opacity-25">
          <ChevronDown className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Remove block" onClick={onRemove} className="p-1.5 -mr-1.5 text-muted-foreground active:text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Club and balls */}
      <div className="mt-2 flex items-center gap-3">
        <select
          aria-label="Club"
          value={block.club}
          onChange={(e) => onChange({ club: e.target.value, group: clubs.find((c) => c.name === e.target.value)?.group })}
          className="min-w-0 flex-1 h-9 rounded-[10px] border border-border bg-background px-2.5 text-[15px] font-bold outline-none"
        >
          {!clubs.some((c) => c.name === block.club) && block.club !== ANY_CLUB && <option value={block.club}>{block.club}</option>}
          {clubs.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          <option value={ANY_CLUB}>{ANY_CLUB}</option>
        </select>
        <Stepper value={block.balls} onChange={(n) => onChange({ balls: n })} label="Balls" />
      </div>

      {/* Focus */}
      <input
        type="text"
        aria-label="Focus"
        value={block.focus}
        onChange={(e) => onChange({ focus: e.target.value })}
        placeholder="Focus, e.g. Start it at the flag"
        maxLength={200}
        className="mt-3 w-full bg-transparent outline-none text-[15px] font-semibold placeholder:font-normal placeholder:text-muted-foreground/50"
      />

      {/* Tip */}
      {tipOpen ? (
        <textarea
          aria-label="Tip"
          value={block.tip}
          onChange={(e) => onChange({ tip: e.target.value })}
          placeholder="Tip: how to do it, or what to feel"
          rows={4}
          maxLength={600}
          className="mt-2 w-full resize-y rounded-[10px] border border-border bg-background px-3 py-2 text-[14px] leading-snug outline-none focus:border-primary placeholder:text-muted-foreground/50"
        />
      ) : null}

      <div className="mt-2 flex items-center gap-4">
        {!tipOpen && (
          <button type="button" onClick={() => setTipOpen(true)} className="text-[13px] font-semibold text-primary py-1">
            + Add a tip
          </button>
        )}
        <button
          type="button"
          onClick={() => setDrillsOpen((o) => !o)}
          aria-expanded={drillsOpen}
          className="text-[13px] font-semibold text-primary py-1 inline-flex items-center gap-1"
        >
          {drillsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          Browse drills
        </button>
      </div>

      {drillsOpen && <DrillBrowser onPick={pickDrill} onClose={() => setDrillsOpen(false)} />}
    </div>
  );
}

// ─── Drill browser (inside a block) ───────────────────────────────────────────

function DrillBrowser({ onPick, onClose }: { onPick: (d: LibraryDrill) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LIBRARY.filter((d) =>
      (category === "All" || d.category === category) &&
      (!q || d.name.toLowerCase().includes(q) || d.tip.toLowerCase().includes(q)),
    );
  }, [query, category]);

  return (
    <div className="mt-2 rounded-[12px] border border-border bg-background p-3">
      <div className="flex items-center gap-2 rounded-[10px] border border-border px-2.5">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          type="text"
          aria-label="Search drills"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search drills"
          className="h-9 min-w-0 flex-1 bg-transparent text-[14px] outline-none"
        />
        <button type="button" aria-label="Close drills" onClick={onClose} className="p-1 text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {LIBRARY_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={cn(
              "h-8 shrink-0 rounded-full border px-3 text-[12px] font-bold",
              category === c ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-2 max-h-72 overflow-y-auto space-y-1.5">
        {results.length === 0 && <p className="py-4 text-center text-[13px] text-muted-foreground">No drills match "{query}".</p>}
        {results.map((d) => (
          <button
            key={`${d.category}-${d.name}`}
            type="button"
            onClick={() => onPick(d)}
            className="w-full rounded-[10px] border border-border bg-card px-3 py-2.5 text-left active:bg-muted"
          >
            <p className="text-[14px] font-semibold leading-tight">{d.name}</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground leading-snug line-clamp-2">{d.tip}</p>
            <p className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.1em] text-primary">{d.category}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Preview ──────────────────────────────────────────────────────────────────

function PreviewSheet({
  name,
  blocks,
  totalBalls,
  saving,
  onBack,
  onSave,
}: {
  name: string;
  blocks: BuilderBlock[];
  totalBalls: number;
  saving: boolean;
  onBack: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 border-b border-border">
        <button type="button" onClick={onBack} className="flex items-center gap-1 text-muted-foreground -ml-1 p-1">
          <ChevronLeft className="h-5 w-5" />
          <span className="text-[14px] font-semibold">Edit</span>
        </button>
        <p className="text-[14px] font-bold uppercase tracking-[0.12em]">Preview</p>
        <div className="w-16" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-36">
        <h1 className="mt-6 font-display text-[34px] leading-[1.05]">{name}</h1>
        <p className="mt-1 text-[14px] text-muted-foreground tabular-nums">
          {blocks.length} block{blocks.length !== 1 ? "s" : ""} · {totalBalls} balls · about {estimateMinutes(totalBalls)} min
        </p>

        <ol className="mt-5 rounded-2xl border border-border bg-card divide-y divide-border">
          {blocks.map((b, i) => (
            <li key={b.key} className="flex gap-3 px-4 py-3.5">
              <span className="w-5 shrink-0 pt-0.5 font-stats text-[16px] tabular-nums text-muted-foreground">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{sectionFor(b.group)}</p>
                <div className="mt-0.5 flex items-baseline justify-between gap-3">
                  <p className="text-[15px] font-bold truncate">{b.club}</p>
                  <p className="shrink-0 text-[13px] font-semibold text-muted-foreground tabular-nums">
                    {b.balls} {b.balls === 1 ? "ball" : "balls"}
                  </p>
                </div>
                <p className="mt-0.5 text-[14px]">{b.focus.trim() || "Hit to a target"}</p>
                {b.tip.trim() && <p className="mt-1 text-[13px] text-muted-foreground leading-snug">{b.tip.trim()}</p>}
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[12.5px] text-muted-foreground">This is the order the runner will walk you through, one block at a time.</p>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="h-14 w-full rounded-[14px] bg-primary text-primary-foreground font-bold text-[14px] uppercase tracking-[0.06em] disabled:opacity-60 active:opacity-90"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Saving
            </span>
          ) : "Save Session"}
        </button>
      </div>
    </div>
  );
}
