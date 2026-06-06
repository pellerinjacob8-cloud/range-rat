import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { ChevronLeft, Plus, Trash2, X, Minus } from "lucide-react";
import { useForceLightMode } from "@/hooks/useForceLightMode";
import { saveCustomSession } from "@/lib/favorites";
import { DRILLS_BY_GOAL, GOALS } from "@/lib/drills";
import { cn } from "@/lib/utils";
import type { SessionDrill } from "@/lib/drills";

export const Route = createFileRoute("/custom-session")({
  component: CustomSessionBuilderPage,
});

// ─── Preset drill list ────────────────────────────────────────────────────────

const WARM_UP_PRESETS = [
  { name: "Light Stretching", description: "Loosen shoulders, hips, and wrists.", club: "Warm Up", balls: 2, unit: "min" },
  { name: "Easy Half Swings", description: "Half swings, focus on tempo and clean contact.", club: "Warm Up", balls: 10, unit: "balls" },
  { name: "Short Putts", description: "Inside 4 ft. Build confidence.", club: "Warm Up", balls: 10, unit: "putts" },
  { name: "Lag Putts", description: "From around 30 ft. Focus on speed.", club: "Warm Up", balls: 5, unit: "putts" },
  { name: "Short Chips", description: "Pick a target 15 ft out.", club: "Warm Up", balls: 10, unit: "balls" },
  { name: "Stock Mid Iron", description: "Full but smooth swings. Lock in your stock shot.", club: "Mid Iron", balls: 8, unit: "balls" },
];

interface PresetDrill {
  name: string;
  description: string;
  club: string;
  balls: number;
  unit: string;
  category: string;
}

const ALL_PRESETS: PresetDrill[] = [
  ...WARM_UP_PRESETS.map((d) => ({ ...d, category: "Warm Up" })),
  ...GOALS.flatMap(({ value, label }) =>
    DRILLS_BY_GOAL[value].map((d) => ({
      name: d.name,
      description: d.description,
      club: "",
      balls: 10,
      unit: "balls",
      category: label,
    }))
  ),
];

// ─── Builder drill type ───────────────────────────────────────────────────────

interface BuilderDrill {
  key: string;
  drillName: string;
  club: string;
  balls: number;
  unit: string;
  description: string;
}

function makeDrill(overrides: Partial<BuilderDrill> = {}): BuilderDrill {
  return {
    key: `d-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    drillName: "",
    club: "",
    balls: 10,
    unit: "balls",
    description: "",
    ...overrides,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CustomSessionBuilderPage() {
  const navigate = useNavigate();
  useForceLightMode();

  const [name, setName] = useState("");
  const [drills, setDrills] = useState<BuilderDrill[]>([makeDrill()]);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalBalls = drills.reduce((sum, d) => sum + d.balls, 0);
  const canSave = name.trim().length > 0 && drills.some((d) => d.drillName.trim().length > 0);

  const updateDrill = (key: string, patch: Partial<BuilderDrill>) => {
    setDrills((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  };

  const removeDrill = (key: string) => {
    setDrills((prev) => prev.filter((d) => d.key !== key));
  };

  const addPreset = (preset: PresetDrill) => {
    setDrills((prev) => [
      ...prev,
      makeDrill({
        drillName: preset.name,
        club: preset.club,
        balls: preset.balls,
        unit: preset.unit,
        description: preset.description,
      }),
    ]);
    setShowPicker(false);
  };

  const addCustom = () => {
    setDrills((prev) => [...prev, makeDrill()]);
    setShowPicker(false);
  };

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    const sessionDrills: SessionDrill[] = drills
      .filter((d) => d.drillName.trim())
      .map((d) => ({
        id: d.key,
        club: d.club.trim() || "—",
        drillName: d.drillName.trim(),
        description: d.description,
        balls: d.balls,
        unit: d.unit,
      }));
    saveCustomSession(name.trim(), sessionDrills);
    setSaving(false);
    navigate({ to: "/practice" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav bar */}
      <div className="flex items-center justify-between px-4 pt-[env(safe-area-inset-top)] pt-4 pb-3 border-b border-border">
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

      <div className="flex-1 overflow-y-auto px-4 pb-36">
        {/* Session name */}
        <div className="mt-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">Session Name</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Pre-round Warm Up"
            autoFocus
            className="w-full bg-transparent border-0 border-b-2 border-primary outline-none font-display text-[32px] leading-none tracking-[-0.01em] pb-1.5 placeholder:text-muted-foreground/30"
          />
        </div>

        {/* Drills */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Drills · {drills.length}
            </p>
            <p className="text-[11px] font-semibold text-muted-foreground">
              {totalBalls} balls total
            </p>
          </div>

          <div className="space-y-3">
            {drills.map((drill, idx) => (
              <DrillCard
                key={drill.key}
                drill={drill}
                index={idx}
                onChange={(patch) => updateDrill(drill.key, patch)}
                onRemove={() => removeDrill(drill.key)}
                canRemove={drills.length > 1}
              />
            ))}
          </div>

          {/* Add drill */}
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="mt-3 w-full h-14 rounded-[14px] border-2 border-dashed border-border flex items-center justify-center gap-2 text-[14px] font-semibold text-muted-foreground active:bg-muted transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Drill
          </button>
        </div>
      </div>

      {/* Save footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={save}
          disabled={!canSave || saving}
          className="h-14 w-full rounded-[14px] bg-primary text-white font-bold text-[14px] uppercase tracking-[0.06em] disabled:opacity-40 active:opacity-90 transition-opacity"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Saving…
            </span>
          ) : "Save Session"}
        </button>
      </div>

      {/* Drill picker sheet */}
      {showPicker && (
        <DrillPicker
          onSelect={addPreset}
          onCustom={addCustom}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

// ─── Drill card ───────────────────────────────────────────────────────────────

function DrillCard({
  drill,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  drill: BuilderDrill;
  index: number;
  onChange: (patch: Partial<BuilderDrill>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const setBalls = (n: number) => onChange({ balls: Math.max(1, Math.min(999, n)) });

  return (
    <div className="rounded-[16px] border border-border bg-card px-4 py-4">
      {/* Top row: drill number + delete */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Drill {index + 1}
        </p>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground active:text-destructive p-1 -mr-1"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Drill name */}
      <input
        type="text"
        value={drill.drillName}
        onChange={(e) => onChange({ drillName: e.target.value })}
        placeholder="Drill name"
        className="w-full bg-transparent outline-none text-[17px] font-bold leading-tight placeholder:text-muted-foreground/40"
      />

      {/* Club */}
      <input
        type="text"
        value={drill.club}
        onChange={(e) => onChange({ club: e.target.value })}
        placeholder="Club (optional)"
        className="mt-1.5 w-full bg-transparent outline-none text-[13px] text-muted-foreground placeholder:text-muted-foreground/30"
      />

      {/* Balls stepper */}
      <div className="mt-4 flex items-center gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex-1">
          {drill.unit === "balls" ? "Balls" : drill.unit === "putts" ? "Putts" : drill.unit === "min" ? "Minutes" : "Reps"}
        </p>
        <div className="flex items-center gap-0">
          <button
            type="button"
            onClick={() => setBalls(drill.balls - 1)}
            className="h-9 w-9 rounded-l-[10px] border border-border bg-muted flex items-center justify-center active:bg-muted/60"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <input
            type="number"
            value={drill.balls}
            onChange={(e) => setBalls(parseInt(e.target.value) || 1)}
            className="h-9 w-14 border-y border-border bg-background text-center text-[15px] font-bold outline-none tabular-nums"
          />
          <button
            type="button"
            onClick={() => setBalls(drill.balls + 1)}
            className="h-9 w-9 rounded-r-[10px] border border-border bg-muted flex items-center justify-center active:bg-muted/60"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Drill picker sheet ───────────────────────────────────────────────────────

function DrillPicker({
  onSelect,
  onCustom,
  onClose,
}: {
  onSelect: (preset: PresetDrill) => void;
  onCustom: () => void;
  onClose: () => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on backdrop tap
  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Group presets by category
  const categories = Array.from(new Set(ALL_PRESETS.map((d) => d.category)));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/40"
      onClick={handleBackdrop}
    >
      <div
        ref={sheetRef}
        className="w-full max-h-[80vh] rounded-t-[28px] bg-background flex flex-col"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <p className="text-[14px] font-bold uppercase tracking-[0.1em]">Add a Drill</p>
          <button type="button" onClick={onClose} className="text-muted-foreground p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Preset list */}
        <div className="overflow-y-auto flex-1 px-4 pb-4">
          {categories.map((cat) => (
            <div key={cat} className="mt-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">
                {cat}
              </p>
              <div className="space-y-2">
                {ALL_PRESETS.filter((d) => d.category === cat).map((preset) => (
                  <button
                    key={`${cat}-${preset.name}`}
                    type="button"
                    onClick={() => onSelect(preset)}
                    className="w-full rounded-[14px] border border-border bg-card px-4 py-3.5 text-left active:bg-muted transition-colors"
                  >
                    <p className="text-[14px] font-semibold leading-tight">{preset.name}</p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground leading-snug">{preset.description}</p>
                    <p className="mt-1.5 text-[11px] font-bold text-primary uppercase tracking-[0.1em]">
                      {preset.balls} {preset.unit}
                      {preset.club ? ` · ${preset.club}` : ""}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Custom option */}
          <div className="mt-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">Custom</p>
            <button
              type="button"
              onClick={onCustom}
              className="w-full rounded-[14px] border-2 border-dashed border-border px-4 py-3.5 text-left active:bg-muted transition-colors flex items-center gap-3"
            >
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Plus className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[14px] font-semibold">Custom drill</p>
                <p className="text-[12px] text-muted-foreground">Type your own name and set balls</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
