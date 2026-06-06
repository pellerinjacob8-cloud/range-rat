import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { saveActiveMarker, clearActiveSession } from "@/lib/active-session";
import { Check, Flag, RotateCcw, Trophy, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { generateShot, type Shot } from "@/lib/shots";
import { loadProfileName } from "@/lib/profile";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/play/solo")({
  head: () => ({
    meta: [
      { title: "Solo — Practice Like You Play" },
      {
        name: "description",
        content: "Random clubs, shapes, and distances. Track your make percentage.",
      },
    ],
  }),
  component: SoloPage,
});

interface Attempt {
  shot: Shot;
  made: boolean;
}

function SoloPage() {
  const navigate = useNavigate();
  const [shot, setShot] = useState<Shot>(() => generateShot());
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [resolved, setResolved] = useState(false);
  const [summary, setSummary] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const made = attempts.filter((a) => a.made).length;
  const total = attempts.length;
  const pct = total === 0 ? 0 : Math.round((made / total) * 100);

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  useEffect(() => {
    saveActiveMarker({
      type: "play-solo",
      route: "/play",
      label: "Practice Like You Play",
      subtitle: "Session in progress",
    });
  }, []);

  const record = (didMake: boolean) => {
    if (resolved) return;
    setAttempts((a) => [...a, { shot, made: didMake }]);
    setResolved(true);
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      setShot(generateShot());
      setResolved(false);
    }, 700);
  };

  if (summary) {
    const name = loadProfileName();
    return (
      <AppShell showBack>
        <div className="pt-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Session Summary
          </p>
          <h1 className="mt-2 font-display text-4xl">
            {name ? `Nice work, ${name}.` : "Nice work."}
          </h1>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <SummaryStat label="Attempted" value={total} />
          <SummaryStat label="Made" value={made} />
          <SummaryStat label="Success" value={`${pct}%`} />
        </div>

        <div className="mt-6 space-y-2">
          {attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No shots yet.</p>
          ) : (
            attempts
              .slice()
              .reverse()
              .map((a, i) => (
                <div
                  key={`${a.shot.id}-${i}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-display text-base">
                      {a.shot.club} · {a.shot.distance}y
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{a.shot.shape}</p>
                  </div>
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      a.made
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {a.made ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                  </span>
                </div>
              ))
          )}
        </div>

        <div className="mt-8 space-y-3">
          <Button
            onClick={() => setSummary(false)}
            className="h-14 w-full rounded-xl text-base font-bold uppercase tracking-wide"
          >
            Keep Going
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setAttempts([]);
              setShot(generateShot());
              setResolved(false);
              setSummary(false);
            }}
            className="h-14 w-full rounded-xl text-base font-bold uppercase tracking-wide"
          >
            <RotateCcw className="mr-2 h-4 w-4" /> New Session
          </Button>
          <button
            type="button"
            onClick={() => { clearActiveSession(); navigate({ to: "/" }); }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold uppercase tracking-wide text-muted-foreground transition active:scale-[0.99]"
          >
            <Flag className="h-4 w-4" /> Done
          </button>
        </div>
      </AppShell>
    );
  }

  // Parse club string into number part and type part
  const clubParts = shot.club.match(/^(\d[\d-]*)[\s-]+(.+)$/);
  const clubNumber = clubParts ? clubParts[1] : "";
  const clubType = clubParts ? clubParts[2] : shot.club;

  return (
    <div className="min-h-screen bg-[#0A1530] text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-4 border-b border-white/[0.08] bg-[#0A1530]/88 backdrop-blur">
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          className="text-white/70 text-sm font-bold uppercase tracking-[0.1em] flex items-center gap-1.5"
        >
          ← Back
        </button>
        <span className="text-white font-bold text-[13px] uppercase tracking-[0.18em]">Range Rat</span>
        <div className="w-16" />
      </header>

      <main className="flex-1 px-4 pb-24 pt-4 max-w-[430px] w-full mx-auto">
        {/* Header area */}
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/50">Shot {total + 1}</p>
        <h1 className="mt-1.5 font-display text-[32px] leading-[1.0] tracking-[-0.01em] text-white italic">Commit to it.</h1>

        {/* Shot card */}
        <div className="mt-6 rounded-[26px] bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/10 p-6 text-center">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.25em] text-white/50">Random Shot</p>
          <div className="mt-5 mb-1">
            {clubNumber ? (
              <span className="font-stats text-[104px] leading-none tabular-nums text-white">{clubNumber}</span>
            ) : null}
            <p className={cn("font-display text-[32px] leading-tight tracking-[-0.01em] text-white", clubNumber && "mt-1")}>{clubType}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-5">
            <ShotBox label="Shape" value={shot.shape} />
            <ShotBox label="Distance" value={shot.distance} unit="YD" />
          </div>
        </div>

        {/* Yes / No buttons */}
        <div className="grid grid-cols-2 gap-2.5 mt-7">
          <button
            type="button"
            disabled={resolved}
            onClick={() => record(false)}
            className="h-16 rounded-[16px] bg-white/[0.06] border border-white/[0.12] text-white font-bold text-[14px] uppercase tracking-[0.1em] flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <X className="h-[18px] w-[18px]" /> No
          </button>
          <button
            type="button"
            disabled={resolved}
            onClick={() => record(true)}
            className="h-16 rounded-[16px] bg-white border-none text-[#0D2D5A] font-bold text-[14px] uppercase tracking-[0.1em] flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Check className="h-[18px] w-[18px]" /> Yes
          </button>
        </div>

        {/* Stats strip */}
        <div className="mt-5 rounded-[16px] bg-white/5 border border-white/[0.08] grid grid-cols-3 divide-x divide-white/[0.08] px-4 py-3.5">
          {[
            { label: "Attempts", value: total },
            { label: "Made", value: made },
            { label: "Make %", value: `${pct}%` },
          ].map(s => (
            <div key={s.label} className="text-center px-2">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-white/55">{s.label}</p>
              <p className="mt-1"><span className="font-stats text-[26px] text-white tabular-nums">{s.value}</span></p>
            </div>
          ))}
        </div>

        {/* End session / quit */}
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => setSummary(true)}
            disabled={total === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-bold uppercase tracking-wide text-white/70 transition active:scale-[0.99] disabled:opacity-50"
          >
            <Trophy className="h-4 w-4" /> End Session
          </button>
          <button
            type="button"
            onClick={() => { clearActiveSession(); navigate({ to: "/" }); }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-transparent px-4 py-3 text-sm font-bold uppercase tracking-wide text-white/40 transition active:scale-[0.99]"
          >
            Quit
          </button>
        </div>
      </main>
    </div>
  );
}

function ShotBox({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="rounded-[14px] bg-white/[0.06] border border-white/[0.08] py-3.5 px-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">{label}</p>
      <p className="mt-2 leading-none">
        <span className="font-stats text-[32px] text-white tabular-nums">{value}</span>
        {unit && <span className="text-[11px] font-bold tracking-[0.12em] ml-1 text-white/55">{unit}</span>}
      </p>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl tabular-nums">{value}</p>
    </div>
  );
}

export { ShotBox };

// Kept for play.game.tsx compatibility
import { Target } from "lucide-react";
export function ShotCard({ shot }: { shot: Shot }) {
  return (
    <div
      key={shot.id}
      className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-sm animate-[fade-in_0.25s_ease-out]"
    >
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        <Target className="h-3.5 w-3.5" /> Random Shot
      </div>
      <p className="mt-3 font-display text-5xl leading-none">{shot.club}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted p-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            SHAPE + HEIGHT
          </p>
          <p className="mt-1 font-display text-xl">{shot.shape}</p>
        </div>
        <div className="rounded-xl bg-muted p-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Distance
          </p>
          <p className="mt-1 font-display text-xl tabular-nums">{shot.distance} yds</p>
        </div>
      </div>
    </div>
  );
}
