import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, Flag, RotateCcw, Target, Trophy, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { QuitGameButton } from "@/components/QuitGameButton";
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
          <h1 className="mt-2 font-display text-4xl font-bold">
            {name ? `Nice work, ${name}.` : "Nice work."}
          </h1>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Attempted" value={total} />
          <Stat label="Made" value={made} />
          <Stat label="Success" value={`${pct}%`} />
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
                    <p className="truncate font-display text-base font-bold">
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
            onClick={() => navigate({ to: "/" })}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold uppercase tracking-wide text-muted-foreground transition active:scale-[0.99]"
          >
            <Flag className="h-4 w-4" /> Done
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell showBack>
      <div className="pt-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Your Shot
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold">Commit to it.</h1>
      </div>

      <ShotCard shot={shot} />

      <div className="mt-6 grid grid-cols-2 gap-3">
        <YesNoButton
          label="Yes"
          tone="yes"
          disabled={resolved}
          onClick={() => record(true)}
        />
        <YesNoButton
          label="No"
          tone="no"
          disabled={resolved}
          onClick={() => record(false)}
        />
      </div>


      <div className="mt-8 grid grid-cols-3 gap-3">
        <Stat label="Attempted" value={total} />
        <Stat label="Made" value={made} />
        <Stat label="Success" value={`${pct}%`} />
      </div>

      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={() => setSummary(true)}
          disabled={total === 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold uppercase tracking-wide text-muted-foreground transition active:scale-[0.99] disabled:opacity-50"
        >
          <Trophy className="h-4 w-4" /> End Session
        </button>
        <QuitGameButton />
      </div>
    </AppShell>
  );
}

export function ShotCard({ shot }: { shot: Shot }) {
  return (
    <div
      key={shot.id}
      className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-sm animate-[fade-in_0.25s_ease-out]"
    >
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        <Target className="h-3.5 w-3.5" /> Random Shot
      </div>
      <p className="mt-3 font-display text-5xl font-extrabold leading-none">{shot.club}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted p-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            SHAPE + HEIGHT
          </p>
          <p className="mt-1 font-display text-xl font-bold">{shot.shape}</p>
        </div>
        <div className="rounded-xl bg-muted p-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Distance
          </p>
          <p className="mt-1 font-display text-xl font-bold tabular-nums">{shot.distance} yds</p>
        </div>
      </div>
    </div>
  );
}

function YesNoButton({
  label,
  tone,
  onClick,
  disabled,
}: {
  label: string;
  tone: "yes" | "no";
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-16 items-center justify-center gap-2 rounded-2xl border text-lg font-bold uppercase tracking-wide transition active:scale-[0.99] disabled:opacity-40 disabled:active:scale-100",
        tone === "yes"
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground",
      )}
    >
      {tone === "yes" ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
      {label}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
