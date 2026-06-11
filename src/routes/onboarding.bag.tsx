import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, Check } from "lucide-react";
import { useForceLightMode } from "@/hooks/useForceLightMode";
import { saveBag } from "@/lib/db";
import type { Club } from "@/lib/db";

export const Route = createFileRoute("/onboarding/bag")({
  component: OnboardingBag,
});

const CLUBS: { id: string; name: string; type: string }[] = [
  { id: "driver", name: "Driver", type: "wood" },
  { id: "3w", name: "3 Wood", type: "wood" },
  { id: "5w", name: "5 Wood", type: "wood" },
  { id: "3h", name: "3 Hybrid", type: "hybrid" },
  { id: "4h", name: "4 Hybrid", type: "hybrid" },
  { id: "5h", name: "5 Hybrid", type: "hybrid" },
  { id: "4i", name: "4 Iron", type: "iron" },
  { id: "5i", name: "5 Iron", type: "iron" },
  { id: "6i", name: "6 Iron", type: "iron" },
  { id: "7i", name: "7 Iron", type: "iron" },
  { id: "8i", name: "8 Iron", type: "iron" },
  { id: "9i", name: "9 Iron", type: "iron" },
  { id: "pw", name: "Pitching Wedge", type: "wedge" },
  { id: "gw", name: "Gap Wedge", type: "wedge" },
  { id: "sw", name: "Sand Wedge", type: "wedge" },
  { id: "lw", name: "Lob Wedge", type: "wedge" },
];

function OnboardingBag() {
  const navigate = useNavigate();
  useForceLightMode();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const finish = async (skip = false) => {
    setSaving(true);
    if (!skip && selected.size > 0) {
      const clubs: Club[] = CLUBS
        .filter(c => selected.has(c.id))
        .map((c, i) => ({ id: c.id, name: c.name, type: c.type, sortOrder: i }));
      await saveBag(clubs);
    }
    navigate({ to: "/practice" });
  };

  const groups = [
    { label: "Woods", ids: ["driver", "3w", "5w"] },
    { label: "Hybrids", ids: ["3h", "4h", "5h"] },
    { label: "Irons", ids: ["4i", "5i", "6i", "7i", "8i", "9i"] },
    { label: "Wedges", ids: ["pw", "gw", "sw", "lw"] },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col px-6">
      <div className="h-11" />

      <div className="flex items-center justify-between pt-6">
        <button onClick={() => navigate({ to: "/onboarding/name" })} aria-label="Back" className="text-muted-foreground -ml-1 p-1">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Step 3 of 3</p>
        <button
          onClick={() => finish(true)}
          className="text-[13px] text-muted-foreground font-medium p-2 -m-2"
        >
          Skip
        </button>
      </div>

      <div className="mt-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Almost done</p>
        <h1 className="mt-2 font-display text-[38px] leading-[1.0] tracking-[-0.01em]">
          What's in<br />your bag?
        </h1>
        <p className="mt-3 text-[13.5px] text-muted-foreground">Select the clubs you carry. You can update this anytime.</p>
      </div>

      <div className="mt-6 space-y-5 overflow-y-auto pb-4">
        {groups.map(group => (
          <div key={group.label}>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">{group.label}</p>
            <div className="grid grid-cols-2 gap-2">
              {group.ids.map(id => {
                const club = CLUBS.find(c => c.id === id)!;
                const on = selected.has(id);
                return (
                  <button
                    key={id}
                    onClick={() => toggle(id)}
                    aria-pressed={on}
                    className={`h-12 rounded-[12px] flex items-center justify-between px-4 border text-[14px] font-semibold transition-colors ${
                      on
                        ? "bg-primary text-white border-primary"
                        : "bg-card border-border text-foreground active:bg-muted"
                    }`}
                  >
                    <span>{club.name}</span>
                    {on && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1" />

      <div className="pb-10 pt-4">
        <button
          onClick={() => finish(false)}
          disabled={saving}
          className="h-14 w-full rounded-[14px] bg-primary text-white font-bold text-[14px] uppercase tracking-[0.06em] disabled:opacity-40 active:opacity-90 transition-opacity"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Saving…
            </span>
          ) : (
            // Selected-club count confirms the taps registered before committing
            selected.size > 0 ? `Finish · ${selected.size} club${selected.size === 1 ? "" : "s"}` : "Finish"
          )}
        </button>
      </div>
    </div>
  );
}
