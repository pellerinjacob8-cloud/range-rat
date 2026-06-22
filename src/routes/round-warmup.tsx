import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { ChevronDown, Clock, Flame, RotateCcw, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  ROUND_DURATIONS,
  buildRoundWarmUp,
  type RoundDuration,
  type RoundWarmUpItem,
} from "@/lib/roundWarmUp";
import { fetchBag } from "@/lib/db";
import type { Club } from "@/lib/db";
import { cn } from "@/lib/utils";
import { saveActiveMarker, clearActiveSession } from "@/lib/active-session";

export const Route = createFileRoute("/round-warmup")({
  head: () => ({
    meta: [
      { title: "Range Rat: Round Warm Up" },
      {
        name: "description",
        content:
          "A timed pre-round warm-up checklist. Stretches, wedges, irons, driver, and putting, tailored to the time you have.",
      },
    ],
  }),
  component: RoundWarmUpPage,
});

// ─── Time helpers ─────────────────────────────────────────────────────────────

const GRACE_BUFFER = 10; // minutes between end-of-warmup and tee time

function toMinutes(hhmm: string): number | null {
  const [h, m] = hhmm.split(":").map(Number);
  return isNaN(h) || isNaN(m) ? null : h * 60 + m;
}

function fromMinutes(total: number): string {
  const safe = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
}

function calcArrival(teeTime: string, duration: number): string | null {
  const mins = toMinutes(teeTime);
  if (mins === null) return null;
  return fromMinutes(mins - duration - GRACE_BUFFER);
}

function displayTeeTime(hhmm: string): string {
  const mins = toMinutes(hhmm);
  return mins !== null ? fromMinutes(mins) : hhmm;
}

function snapToPreset(mins: number): RoundDuration {
  return ([15, 30, 45, 60] as RoundDuration[]).reduce((best, d) =>
    Math.abs(d - mins) < Math.abs(best - mins) ? d : best,
  );
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// ─── Duration card helpers ────────────────────────────────────────────────────

function durationName(d: RoundDuration): string {
  switch (d) {
    case 15: return "Quick Warm Up";
    case 30: return "Standard";
    case 45: return "Full Routine";
    case 60: return "Pro Session";
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const HOURS = ["1","2","3","4","5","6","7","8","9","10","11","12"];
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

function RoundWarmUpPage() {
  const [userBag, setUserBag] = useState<Club[]>([]);
  const [duration, setDuration] = useState<number | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [teeTime, setTeeTime] = useState("");

  useEffect(() => { fetchBag().then(setUserBag); }, []);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerHour, setPickerHour] = useState("7");
  const [pickerMinute, setPickerMinute] = useState("00");
  const [pickerAmPm, setPickerAmPm] = useState<"AM" | "PM">("AM");

  // Custom duration
  const [showCustom, setShowCustom] = useState(false);
  const [customHours, setCustomHours] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(20);
  const customTotal = customHours * 60 + customMinutes;
  const startCustom = () => { if (customTotal > 0) setDuration(customTotal); };

  const commitTime = () => {
    const h = parseInt(pickerHour) % 12 + (pickerAmPm === "PM" ? 12 : 0);
    setTeeTime(`${String(h).padStart(2, "0")}:${pickerMinute}`);
    setShowPicker(false);
  };

  const clearTime = () => {
    setTeeTime("");
    setPickerHour("7");
    setPickerMinute("00");
    setPickerAmPm("AM");
    setShowPicker(false);
  };

  const reset = () => {
    setDuration(null);
    setDone(new Set());
    // teeTime intentionally preserved, user set it for this round
  };

  if (duration !== null) {
    return (
      <ChecklistView
        duration={duration}
        done={done}
        setDone={setDone}
        onReset={reset}
        teeTime={teeTime}
        bag={userBag}
      />
    );
  }

  const hasTeeTime = teeTime.length > 0;

  return (
    <AppShell showBack>
      <div className="pt-2">
        <div className="flex items-center gap-1.5 mt-2">
          <Flame className="h-3.5 w-3.5 text-primary" />
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Round Warm Up</p>
        </div>
        <h1 className="mt-2 font-display text-[36px] leading-[0.98] tracking-[-0.01em]">How long<br/>do you have?</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a time and we'll build a structured pre-round checklist.
        </p>
      </div>

      {/* ── Tee Time card ── */}
      <div className="rounded-[22px] border border-border bg-card p-4 flex items-center justify-between mt-5 mb-3.5">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Tee Time</span>
        </div>
        {hasTeeTime && !showPicker ? (
          <div className="flex items-center gap-2">
            <span className="font-stats text-[24px] text-primary tabular-nums leading-none">
              {displayTeeTime(teeTime).split(" ")[0]}
              <span className="text-[11px] font-bold tracking-[0.1em] ml-1">
                {displayTeeTime(teeTime).split(" ")[1]}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="text-xs font-semibold text-muted-foreground underline-offset-2 active:opacity-70"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={clearTime}
              aria-label="Remove tee time"
              className="rounded-full p-1 text-muted-foreground transition active:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : showPicker ? (
          <button
            type="button"
            onClick={clearTime}
            aria-label="Cancel"
            className="rounded-full p-1 text-muted-foreground transition active:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary active:opacity-70"
          >
            Add
          </button>
        )}
      </div>

      {/* Inline time picker, shown when showPicker */}
      {showPicker && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3 mb-3.5">
          <div className="flex gap-2">
            <select
              value={pickerHour}
              onChange={(e) => setPickerHour(e.target.value)}
              className="flex-1 rounded-xl border border-border bg-muted py-3 text-center text-xl font-bold text-foreground outline-none focus:border-primary"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>{h.padStart(2, "0")}</option>
              ))}
            </select>
            <select
              value={pickerMinute}
              onChange={(e) => setPickerMinute(e.target.value)}
              className="flex-1 rounded-xl border border-border bg-muted py-3 text-center text-xl font-bold text-foreground outline-none focus:border-primary"
            >
              {MINUTES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select
              value={pickerAmPm}
              onChange={(e) => setPickerAmPm(e.target.value as "AM" | "PM")}
              className="w-24 rounded-xl border border-border bg-muted py-3 text-center text-xl font-bold text-foreground outline-none focus:border-primary"
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
          <button
            type="button"
            onClick={commitTime}
            className="h-14 w-full rounded-2xl bg-primary text-base font-bold text-primary-foreground transition active:scale-[0.99] active:opacity-90"
          >
            Enter Time
          </button>
        </div>
      )}

      {/* ── Duration cards ── */}
      <div className="space-y-2.5">
        {ROUND_DURATIONS.map((d) => {
          const arrival = hasTeeTime ? calcArrival(teeTime, d) : null;
          const itemCount = countFor(d);
          const isActive = false; // no selection state on this screen; user taps to start
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              className={cn(
                "flex w-full items-center gap-3.5 rounded-[18px] p-4 border text-left transition active:scale-[0.99]",
                isActive
                  ? "bg-primary text-white border-primary shadow-[0_10px_25px_-16px_rgba(13,45,90,0.5)]"
                  : "bg-card text-foreground border-border"
              )}
            >
              {/* Left: big minute number + name + description + arrival */}
              <div className="flex-1 min-w-0">
                <p className={cn("text-[10.5px] font-bold uppercase tracking-[0.2em]", isActive ? "text-white/65" : "text-muted-foreground")}>
                  {d} MIN · {durationName(d)}
                </p>
                <p className={cn("mt-0.5 font-stats text-[36px] leading-none tabular-nums", isActive ? "text-white" : "text-primary")}>
                  {d}
                </p>
                <p className={cn("mt-1 text-[12px]", isActive ? "text-white/70" : "text-muted-foreground")}>
                  {descriptionFor(d)}
                </p>
                {arrival && (
                  <p className={cn("mt-1.5 text-[11px] font-semibold", isActive ? "text-white/85" : "text-primary")}>
                    Arrive by {arrival}
                  </p>
                )}
              </div>
              {/* Right: items badge */}
              <span className={cn(
                "shrink-0 rounded-full px-2 py-1 text-[11px] font-bold tracking-[0.18em]",
                isActive
                  ? "bg-white/20 text-white"
                  : "bg-primary/8 text-primary"
              )}>
                {itemCount} ITEMS
              </span>
            </button>
          );
        })}

        {/* ── Custom duration card ── */}
        <div className="rounded-[18px] border border-border bg-card">
          {/* Header row, always visible, tapping toggles expanded state */}
          <button
            type="button"
            onClick={() => setShowCustom((v) => !v)}
            className="flex w-full items-center gap-3.5 p-4 text-left active:opacity-70"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Custom · Set Your Own
              </p>
              <p className="mt-0.5 font-stats text-[36px] leading-none tabular-nums text-primary">–</p>
              <p className="mt-1 text-[12px] text-muted-foreground">Set your own warm-up duration.</p>
              {showCustom && customTotal > 0 && hasTeeTime && (
                <p className="mt-1.5 text-[11px] font-semibold text-primary">
                  Arrive by {calcArrival(teeTime, customTotal)}
                </p>
              )}
            </div>
            <ChevronDown
              className={cn(
                "ml-3 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
                showCustom && "rotate-180",
              )}
            />
          </button>

          {/* Expandable picker */}
          <div
            className={cn(
              "overflow-hidden transition-all duration-200 ease-in-out",
              showCustom ? "max-h-[320px] opacity-100" : "max-h-0 opacity-0",
            )}
          >
            <div className="border-t border-border px-4 pb-4 pt-4 space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Hours
                  </p>
                  <select
                    value={customHours}
                    onChange={(e) => setCustomHours(Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-muted py-3 text-center text-xl font-bold text-foreground outline-none focus:border-primary"
                  >
                    {[0, 1, 2, 3, 4].map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Minutes
                  </p>
                  <select
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-muted py-3 text-center text-xl font-bold text-foreground outline-none focus:border-primary"
                  >
                    {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                      <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={startCustom}
                disabled={customTotal === 0}
                className="h-14 w-full rounded-2xl bg-primary text-base font-bold text-primary-foreground transition active:scale-[0.99] active:opacity-90 disabled:opacity-40"
              >
                Start Warm Up
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function descriptionFor(d: RoundDuration): string {
  switch (d) {
    case 15: return "Quick loosen-up. Wedges, mid iron, driver. No putting.";
    case 30: return "Wedges through driver, plus short putting.";
    case 45: return "Full bag build-up with a solid putting set.";
    case 60: return "Pro-style. Every club group + 15 min on the green.";
  }
}

function countFor(d: RoundDuration): number {
  return buildRoundWarmUp(d).length;
}

// ─── Checklist ────────────────────────────────────────────────────────────────

interface ChecklistViewProps {
  duration: number;
  done: Set<string>;
  setDone: React.Dispatch<React.SetStateAction<Set<string>>>;
  onReset: () => void;
  teeTime: string;
  bag?: Club[];
}

function ChecklistView({ duration, done, setDone, onReset, teeTime, bag }: ChecklistViewProps) {
  const navigate = useNavigate();
  const snapped = useMemo(() => snapToPreset(duration), [duration]);
  const items = useMemo(() => buildRoundWarmUp(snapped, bag), [snapped, bag]);
  const total = items.length;
  const completed = done.size;

  useEffect(() => {
    if (total > 0) {
      saveActiveMarker({
        type: "round-warmup",
        route: "/round-warmup",
        label: "Round Warm Up",
        subtitle: `${total - completed} drills left`,
      });
    }
  }, [done, total, completed]);
  const progress = (completed / total) * 100;
  const isComplete = completed === total;

  const bySection = useMemo(() => {
    const map = new Map<string, RoundWarmUpItem[]>();
    items.forEach((it) => {
      const arr = map.get(it.section) ?? [];
      arr.push(it);
      map.set(it.section, arr);
    });
    return Array.from(map.entries());
  }, [items]);

  const toggle = (id: string) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleComplete = () => {
    const session = {
      date: new Date().toISOString().split("T")[0],
      teeTime: teeTime || null,
      duration,
      drills: [...done],
      completedAt: new Date().toISOString(),
    };
    try {
      const existing = JSON.parse(localStorage.getItem("rr-warmup-sessions") ?? "[]");
      existing.push(session);
      localStorage.setItem("rr-warmup-sessions", JSON.stringify(existing));
    } catch { /* private/quota */ }
    clearActiveSession();
    navigate({ to: "/" });
  };

  const arrival = teeTime ? calcArrival(teeTime, duration) : null;

  return (
    <AppShell showBack>
      <div className="pb-12">
        {/* Header */}
        <div className="flex items-baseline justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Round Warm Up · {formatDuration(duration)}
              </p>
            </div>
            <h1 className="mt-1 font-display text-3xl">Get ready.</h1>
          </div>
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground active:text-foreground"
          >
            <RotateCcw className="h-4 w-4" /> Change
          </button>
        </div>

        {/* Schedule strip, sticky floating bar when tee time is set */}
        {arrival && teeTime && (
          <div className="sticky top-14 z-20 -mx-4 px-4 pt-3 pb-3 bg-background/95 backdrop-blur border-b border-border shadow-sm">
            <div className="grid grid-cols-3 divide-x divide-border text-center">
              <div className="pr-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Arrive
                </p>
                <p className="mt-1.5 font-stats text-[22px] leading-none tabular-nums">{arrival}</p>
              </div>
              <div className="px-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Warm-up
                </p>
                <p className="mt-1.5 font-stats text-[22px] leading-none tabular-nums">{formatDuration(duration)}</p>
              </div>
              <div className="pl-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Tee Time
                </p>
                <p className="mt-1.5 font-stats text-[22px] leading-none tabular-nums text-primary">
                  {displayTeeTime(teeTime)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress */}
        <p className="mt-4 text-sm text-muted-foreground">
          {completed} of {total} complete
        </p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Drill sections */}
        <div className="mt-6 space-y-6">
          {bySection.map(([section, sectionItems]) => (
            <section key={section}>
              <h2 className="font-display text-xl uppercase tracking-tight">
                {section}
              </h2>
              <ul className="mt-3 space-y-2">
                {sectionItems.map((it) => {
                  const isDone = done.has(it.id);
                  return (
                    <li key={it.id}>
                      <button
                        type="button"
                        onClick={() => toggle(it.id)}
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
                                {it.activity}
                              </p>
                              <span
                                className={cn(
                                  "shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-primary",
                                  isDone && "opacity-50",
                                )}
                              >
                                {it.amount}
                              </span>
                            </div>
                            <p className={cn("mt-1 text-sm text-muted-foreground", isDone && "line-through")}>
                              {it.tip}
                            </p>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        {/* Footer actions */}
        <div className="mt-8 space-y-3">
          {isComplete && (
            <button
              type="button"
              onClick={handleComplete}
              className="w-full rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground transition active:scale-[0.99] active:opacity-90"
            >
              Complete Warm Up
            </button>
          )}
          <button
            type="button"
            onClick={() => { clearActiveSession(); navigate({ to: "/" }); }}
            className="w-full rounded-2xl border border-border bg-card py-4 text-base font-semibold text-muted-foreground transition active:scale-[0.99]"
          >
            Quit Warm Up
          </button>
        </div>
      </div>
    </AppShell>
  );
}
