import { createFileRoute } from "@tanstack/react-router";
import { ProGate } from "@/components/ProGate";
import { useState, useEffect } from "react";
import { saveActiveMarker } from "@/lib/active-session";
import { ArrowRight, Check, Sparkles, Target, Trophy, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { QuitGameButton } from "@/components/QuitGameButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadProfileName } from "@/lib/profile";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/games/fairway-game")({
  head: () => ({
    meta: [
      { title: "Fairway Game — Range Rat" },
      {
        name: "description",
        content:
          "Pick a fairway between two markers and track your hit rate. Solo or two-player.",
      },
      { property: "og:title", content: "Fairway Game — Range Rat" },
      {
        property: "og:description",
        content: "Define your fairway, hit your shots, track your fairway percentage.",
      },
    ],
  }),
  component: () => <ProGate feature="Fairway Game"><FairwayGame /></ProGate>,
});

type Mode = "solo" | "vs";
type ShotOrder = "sequential" | "alternating";

interface MatchConfig {
  mode: Mode;
  shotOrder: ShotOrder; // only applies in vs mode
  p1: string;
  p2: string; // unused in solo
  totalShots: number;
}

const SHOT_PRESETS = [9, 18];

function FairwayGame() {
  const [config, setConfig] = useState<MatchConfig | null>(null);
  // Per-player results. In solo mode only index 0 is used.
  const [results, setResults] = useState<[boolean[], boolean[]]>([[], []]);
  // Transition card shown between Player 1's last shot and Player 2's first shot.
  const [showHandoff, setShowHandoff] = useState(false);

  useEffect(() => {
    if (config) {
      saveActiveMarker({
        type: "fairway",
        route: "/games/fairway-game",
        label: "Fairway Game",
        subtitle: "Game in progress",
      });
    }
  }, [config]);

  if (!config) {
    return (
      <SetupView
        onStart={(c) => {
          setConfig(c);
          setResults([[], []]);
          setShowHandoff(false);
        }}
      />
    );
  }

  const total = config.totalShots;
  const p1Done = results[0].length >= total;
  const p2Done = config.mode === "vs" ? results[1].length >= total : true;
  const isComplete = config.mode === "vs" ? p1Done && p2Done : p1Done;

  const hitsFor = (p: 0 | 1) => results[p].filter(Boolean).length;
  const pctFor = (p: 0 | 1) => {
    const n = results[p].length;
    return n === 0 ? 0 : Math.round((hitsFor(p) / n) * 100);
  };

  if (isComplete) {
    return (
      <ResultsView
        config={config}
        results={results}
        onPlayAgain={() => {
          setResults([[], []]);
          setShowHandoff(false);
        }}
        onNewMatch={() => {
          setConfig(null);
          setResults([[], []]);
          setShowHandoff(false);
        }}
      />
    );
  }

  // Whose shot it is right now.
  let currentPlayer: 0 | 1;
  if (config.mode === "solo") {
    currentPlayer = 0;
  } else if (config.shotOrder === "alternating") {
    // Strict alternation: P1 goes first each round.
    // If P1 has taken more shots than P2, it's P2's turn; otherwise P1's.
    currentPlayer = results[0].length > results[1].length ? 1 : 0;
  } else {
    // Sequential: P1 finishes all shots first, then P2.
    currentPlayer = p1Done ? 1 : 0;
  }
  const currentName = currentPlayer === 0 ? config.p1 : config.p2;
  const currentShotNumber = results[currentPlayer].length + 1;

  // Show handoff card only in sequential mode when P1 just finished.
  if (config.mode === "vs" && config.shotOrder === "sequential" && p1Done && !p2Done && showHandoff) {
    return (
      <HandoffView
        nextName={config.p2}
        totalShots={total}
        p1Name={config.p1}
        p1Hits={hitsFor(0)}
        p1Pct={pctFor(0)}
        onContinue={() => setShowHandoff(false)}
      />
    );
  }

  const record = (didHit: boolean) => {
    setResults((prev) => {
      const next: [boolean[], boolean[]] = [prev[0].slice(), prev[1].slice()];
      next[currentPlayer].push(didHit);
      // Queue handoff only in sequential mode when P1 finishes.
      if (config.mode === "vs" && config.shotOrder === "sequential" && currentPlayer === 0 && next[0].length === total) {
        setShowHandoff(true);
      }
      return next;
    });
  };

  return (
    <AppShell showBack>
      <div className="pt-2">
        {config.mode === "vs" && config.shotOrder === "alternating" ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Shot {results[0].length + results[1].length + 1} of {total * 2}
            </p>
            <p className="mt-1 font-display text-5xl leading-none">{currentName}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Their shot {currentShotNumber} of {total} — hit or miss?
            </p>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {config.mode === "vs" ? `${currentName} · Shot` : "Shot"}
            </p>
            <p className="font-display text-5xl leading-none">
              {currentShotNumber}
              <span className="text-2xl text-muted-foreground"> / {total}</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Hit between your two markers. Count every shot.
            </p>
          </>
        )}
      </div>

      {config.mode === "vs" ? (
        <div className="mt-6 grid grid-cols-2 gap-3">
          <PlayerCard
            name={config.p1}
            hits={hitsFor(0)}
            shots={results[0].length}
            total={total}
            active={currentPlayer === 0}
            done={p1Done}
          />
          <PlayerCard
            name={config.p2}
            hits={hitsFor(1)}
            shots={results[1].length}
            total={total}
            active={currentPlayer === 1}
            done={p2Done}
          />
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Solo session
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <Stat label="Hits" value={String(hitsFor(0))} />
            <Stat label="Shots" value={String(results[0].length)} />
            <Stat label="Fairway %" value={`${pctFor(0)}%`} />
          </div>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <p className="text-center text-sm text-muted-foreground">
          {config.mode === "vs" ? `${currentName}'s shot` : "Hit it?"}
        </p>
        <p className="mt-1 text-center font-display text-2xl">Hit or Miss?</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button onClick={() => record(true)} className="h-16 text-base font-semibold">
            <Check className="h-5 w-5" />
            Hit
          </Button>
          <Button
            onClick={() => record(false)}
            variant="outline"
            className="h-16 border-destructive/40 text-base font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-5 w-5" />
            Miss
          </Button>
        </div>
      </div>

      <div className="mt-8">
        <QuitGameButton
          onBeforeQuit={() => {
            setConfig(null);
            setResults([[], []]);
            setShowHandoff(false);
          }}
        />
      </div>
    </AppShell>
  );
}

function HandoffView({
  nextName,
  totalShots,
  p1Name,
  p1Hits,
  p1Pct,
  onContinue,
}: {
  nextName: string;
  totalShots: number;
  p1Name: string;
  p1Hits: number;
  p1Pct: number;
  onContinue: () => void;
}) {
  return (
    <AppShell showBack>
      <div className="flex flex-col items-center pt-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <ArrowRight className="h-8 w-8" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Switch players
        </p>
        <h1 className="mt-2 font-display text-4xl">{nextName}, you're up</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Hit {totalShots} shots into the fairway.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {p1Name} finished
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <Stat label="Hits" value={String(p1Hits)} />
          <Stat label="Shots" value={String(totalShots)} />
          <Stat label="Fairway %" value={`${p1Pct}%`} />
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <Button onClick={onContinue} className="h-14 w-full text-base font-semibold">
          Start {nextName}'s round
        </Button>
        <QuitGameButton />
      </div>
    </AppShell>
  );
}


function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl leading-none">{value}</p>
    </div>
  );
}

function PlayerCard({
  name,
  hits,
  shots,
  total,
  active,
  done,
}: {
  name: string;
  hits: number;
  shots: number;
  total: number;
  active: boolean;
  done: boolean;
}) {
  const pct = shots === 0 ? 0 : Math.round((hits / shots) * 100);
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition",
        active
          ? "border-primary bg-primary/5 ring-2 ring-primary"
          : done
            ? "border-border bg-muted/40"
            : "border-border bg-card",
      )}
    >
      <p className="truncate text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {name}
        {done ? " · Done" : ""}
      </p>
      <p className="mt-2 font-display text-3xl leading-none">{hits}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {shots}/{total} · {pct}%
      </p>
    </div>
  );
}

function ResultsView({
  config,
  results,
  onPlayAgain,
  onNewMatch,
}: {
  config: MatchConfig;
  results: [boolean[], boolean[]];
  onPlayAgain: () => void;
  onNewMatch: () => void;
}) {
  if (config.mode === "solo") {
    const arr = results[0];
    const hits = arr.filter(Boolean).length;
    const misses = arr.length - hits;
    const pct = arr.length === 0 ? 0 : Math.round((hits / arr.length) * 100);
    return (
      <AppShell showBack>
        <div className="flex flex-col items-center pt-8 text-center">
          <div className="relative">
            <Target className="h-16 w-16 text-primary" />
            <Sparkles className="absolute -right-3 -top-3 h-6 w-6 text-primary" />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Session complete
          </p>
          <h1 className="mt-2 font-display text-4xl">{config.p1}</h1>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat label="Hits" value={String(hits)} />
            <Stat label="Misses" value={String(misses)} />
            <Stat label="Fairway %" value={`${pct}%`} />
          </div>

        </div>

        <div className="mt-8 space-y-3">
          <Button onClick={onPlayAgain} className="h-12 w-full text-base font-semibold">
            Play Again
          </Button>
          <Button
            onClick={onNewMatch}
            variant="outline"
            className="h-12 w-full text-base font-semibold"
          >
            New match
          </Button>
          <QuitGameButton />
        </div>
      </AppShell>
    );
  }

  // vs
  const hits: [number, number] = [
    results[0].filter(Boolean).length,
    results[1].filter(Boolean).length,
  ];
  const shots: [number, number] = [results[0].length, results[1].length];
  const pct = (p: 0 | 1) => (shots[p] === 0 ? 0 : Math.round((hits[p] / shots[p]) * 100));
  const winnerIdx: 0 | 1 | "tie" =
    hits[0] === hits[1] ? "tie" : hits[0] > hits[1] ? 0 : 1;
  const winnerName =
    winnerIdx === "tie" ? "Tie" : winnerIdx === 0 ? config.p1 : config.p2;

  return (
    <AppShell showBack>
      <div className="flex flex-col items-center pt-8 text-center">
        <div className="relative">
          <Trophy className="h-16 w-16 text-primary" />
          <Sparkles className="absolute -right-3 -top-3 h-6 w-6 text-primary" />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          {winnerIdx === "tie" ? "All square" : "Winner"}
        </p>
        <h1 className="mt-2 font-display text-4xl">{winnerName}</h1>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <ResultCard
          name={config.p1}
          hits={hits[0]}
          shots={shots[0]}
          pct={pct(0)}
          highlight={winnerIdx === 0}
        />
        <ResultCard
          name={config.p2}
          hits={hits[1]}
          shots={shots[1]}
          pct={pct(1)}
          highlight={winnerIdx === 1}
        />
      </div>

      <div className="mt-8 space-y-3">
        <Button onClick={onPlayAgain} className="h-12 w-full text-base font-semibold">
          Play Again
        </Button>
        <Button
          onClick={onNewMatch}
          variant="outline"
          className="h-12 w-full text-base font-semibold"
        >
          New match
        </Button>
        <QuitGameButton />
      </div>
    </AppShell>
  );
}

function ResultCard({
  name,
  hits,
  shots,
  pct,
  highlight,
}: {
  name: string;
  hits: number;
  shots: number;
  pct: number;
  highlight: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        highlight ? "border-primary bg-primary/5 ring-2 ring-primary" : "border-border bg-card",
      )}
    >
      <p className="truncate text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {name}
      </p>
      <p className="mt-2 font-display text-3xl leading-none">{hits}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {shots} shots · {pct}%
      </p>
    </div>
  );
}

function SetupView({ onStart }: { onStart: (c: MatchConfig) => void }) {
  const [mode, setMode] = useState<Mode>("vs");
  const [shotOrder, setShotOrder] = useState<ShotOrder>("sequential");
  const [p1, setP1] = useState(() => loadProfileName() || "Player 1");
  const [p2, setP2] = useState("Player 2");
  const [shotsChoice, setShotsChoice] = useState<number | "custom">(9);
  const [customShots, setCustomShots] = useState("12");

  const totalShots =
    shotsChoice === "custom" ? Math.max(1, parseInt(customShots, 10) || 0) : shotsChoice;

  const namesValid = mode === "solo" ? p1.trim().length > 0 : p1.trim().length > 0 && p2.trim().length > 0;
  const shotsValid = totalShots > 0;
  const canStart = namesValid && shotsValid;

  const submit = () => {
    if (!canStart) return;
    onStart({
      mode,
      shotOrder: mode === "vs" ? shotOrder : "sequential",
      p1: p1.trim(),
      p2: mode === "vs" ? p2.trim() : "",
      totalShots,
    });
  };

  return (
    <AppShell showBack>
      <div className="pt-2">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl leading-none">Fairway Game</h1>
            <p className="mt-1 text-sm text-muted-foreground">Pick your fairway. Track your %.</p>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Mode
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ModePill label="Two Players" active={mode === "vs"} onClick={() => setMode("vs")} />
            <ModePill label="Solo" active={mode === "solo"} onClick={() => setMode("solo")} />
          </div>
        </div>

        {mode === "vs" && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Shot order
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <ShotOrderCard
                label="All in a row"
                description="P1 hits all their shots first, then P2 hits all of theirs."
                active={shotOrder === "sequential"}
                onClick={() => setShotOrder("sequential")}
              />
              <ShotOrderCard
                label="Alternating"
                description="Players take turns shot by shot — P1, P2, P1, P2…"
                active={shotOrder === "alternating"}
                onClick={() => setShotOrder("alternating")}
              />
            </div>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {mode === "vs" ? "Players" : "Player"}
          </p>
          <Input value={p1} onChange={(e) => setP1(e.target.value)} placeholder="Player 1" className="h-12" />
          {mode === "vs" ? (
            <Input
              value={p2}
              onChange={(e) => setP2(e.target.value)}
              placeholder="Player 2"
              className="h-12"
            />
          ) : null}
        </div>

        <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3.5 flex gap-3 items-start">
          <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground leading-snug">
            Pick two objects on the range as your left and right fairway edges — a flag, yardage sign, or mat edge. Count every shot between them as a hit.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Number of shots
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {SHOT_PRESETS.map((n) => (
              <ModePill
                key={n}
                label={`${n}`}
                active={shotsChoice === n}
                onClick={() => setShotsChoice(n)}
              />
            ))}
            <ModePill
              label="Custom"
              active={shotsChoice === "custom"}
              onClick={() => setShotsChoice("custom")}
            />
          </div>
          {shotsChoice === "custom" ? (
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              value={customShots}
              onChange={(e) => setCustomShots(e.target.value)}
              className="mt-3 h-12"
              placeholder="Number of shots"
            />
          ) : null}
        </div>

        <Button
          onClick={submit}
          disabled={!canStart}
          className="h-14 w-full text-base font-semibold"
        >
          <Target className="h-5 w-5" />
          Start Game
        </Button>

        <QuitGameButton />
      </div>
    </AppShell>
  );
}

function ShotOrderCard({
  label,
  description,
  active,
  onClick,
}: {
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-2xl border p-3.5 text-left transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground active:bg-muted",
      )}
    >
      <p className={cn("text-sm font-bold", active ? "text-white" : "text-foreground")}>{label}</p>
      <p className={cn("mt-1 text-[11.5px] leading-snug", active ? "text-white/75" : "text-muted-foreground")}>
        {description}
      </p>
    </button>
  );
}

function ModePill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-12 rounded-full border px-4 text-sm font-semibold transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground active:bg-muted",
      )}
    >
      {label}
    </button>
  );
}
