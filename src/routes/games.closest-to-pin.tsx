import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Minus, Plus, Sparkles, Star, Trophy, Undo2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { QuitGameButton } from "@/components/QuitGameButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadProfileName } from "@/lib/profile";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/games/closest-to-pin")({
  head: () => ({
    meta: [
      { title: "Closest to Pin — Range Rat" },
      {
        name: "description",
        content: "Two-player Closest to Pin scorekeeper. Set a target score and play.",
      },
      { property: "og:title", content: "Closest to Pin — Range Rat" },
      {
        property: "og:description",
        content: "Tap who won each round. First to the target score wins.",
      },
    ],
  }),
  component: ClosestToPin,
});

interface MatchConfig {
  p1: string;
  p2: string;
  target: number;
}

function ClosestToPin() {
  const [config, setConfig] = useState<MatchConfig | null>(null);
  // history[i] is the winner index (0 or 1) for round i+1.
  const [history, setHistory] = useState<(0 | 1)[]>([]);
  // Briefly flash the player who just won a point before advancing.
  const [celebrating, setCelebrating] = useState<0 | 1 | null>(null);
  const celebrateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
    };
  }, []);

  if (!config) {
    return <SetupView onStart={(c) => setConfig(c)} />;
  }

  const score = [0, 0];
  history.forEach((w) => {
    score[w] += 1;
  });

  const winnerIdx = score[0] >= config.target ? 0 : score[1] >= config.target ? 1 : null;

  if (winnerIdx !== null) {
    return (
      <WinnerView
        config={config}
        score={score as [number, number]}
        winnerIdx={winnerIdx}
        onPlayAgain={() => setHistory([])}
        onNewMatch={() => {
          setConfig(null);
          setHistory([]);
        }}
      />
    );
  }

  const round = history.length + 1;

  const awardPoint = (player: 0 | 1) => {
    if (celebrating !== null) return;
    setCelebrating(player);
    if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
    celebrateTimer.current = setTimeout(() => {
      setHistory((h) => [...h, player]);
      setCelebrating(null);
    }, 700);
  };


  return (
    <AppShell showBack>
      <div className="pt-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Pin #
        </p>
        <p className="font-display text-5xl font-bold leading-none">{round}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          First to {config.target} wins
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <ScorePanel
          name={config.p1}
          score={score[0]}
          leading={score[0] > score[1]}
          celebrating={celebrating === 0}
        />
        <ScorePanel
          name={config.p2}
          score={score[1]}
          leading={score[1] > score[0]}
          celebrating={celebrating === 1}
        />
      </div>

      <div className="mt-8 space-y-3">
        <RoundButton
          label={`${config.p1} won`}
          onClick={() => awardPoint(0)}
          disabled={celebrating !== null}
        />
        <RoundButton
          label={`${config.p2} won`}
          onClick={() => awardPoint(1)}
          disabled={celebrating !== null}
        />
      </div>

      {history.length > 0 && celebrating === null ? (
        <button
          onClick={() => setHistory((h) => h.slice(0, -1))}
          className="mx-auto mt-6 flex items-center gap-2 text-sm font-semibold text-muted-foreground active:text-foreground"
        >
          <Undo2 className="h-4 w-4" /> Undo last round
        </button>
      ) : null}

      <div className="mt-10">
        <QuitGameButton
          onBeforeQuit={() => {
            if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
            setConfig(null);
            setHistory([]);
          }}
        />
      </div>
    </AppShell>
  );
}

function ScorePanel({
  name,
  score,
  leading,
  celebrating,
}: {
  name: string;
  score: number;
  leading: boolean;
  celebrating: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4 transition-all duration-200",
        leading ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
        celebrating && "scale-[1.04] ring-4 ring-primary/40 shadow-lg",
      )}
    >
      {celebrating ? (
        <Sparkles
          className="absolute right-2 top-2 h-5 w-5 text-primary-foreground animate-[scale-in_0.2s_ease-out]"
          aria-hidden
        />
      ) : null}
      <p
        className={cn(
          "truncate text-xs font-bold uppercase tracking-wider",
          leading ? "text-primary-foreground/80" : "text-muted-foreground",
        )}
      >
        {name}
      </p>
      <p
        className={cn(
          "mt-1 font-display text-5xl font-bold leading-none tabular-nums transition-transform",
          celebrating && "scale-110",
        )}
      >
        {score}
      </p>
      {celebrating ? (
        <p className="mt-1 text-[11px] font-bold uppercase tracking-widest animate-[fade-in_0.2s_ease-out]">
          +1 Point!
        </p>
      ) : null}
    </div>
  );
}

function RoundButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-2xl border border-border bg-card px-5 py-5 text-left text-lg font-bold transition active:scale-[0.99] active:bg-muted disabled:opacity-50 disabled:active:scale-100"
    >
      <span className="block truncate">{label}</span>
    </button>
  );
}

function SetupView({ onStart }: { onStart: (c: MatchConfig) => void }) {
  const [p1, setP1] = useState(() => loadProfileName() || "Player 1");
  const [p2, setP2] = useState("Player 2");
  const [target, setTarget] = useState(5);

  const valid = p1.trim().length > 0 && p2.trim().length > 0 && target >= 1;

  return (
    <AppShell showBack>
      <div className="pt-2">
        <h1 className="font-display text-3xl font-bold">Closest to Pin</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter names and pick a target score to start.
        </p>
      </div>

      <div className="mt-6 space-y-5">
        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Player 1
          </label>
          <Input
            value={p1}
            onChange={(e) => setP1(e.target.value)}
            className="mt-2 h-12 text-base"
            placeholder="Player 1"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Player 2
          </label>
          <Input
            value={p2}
            onChange={(e) => setP2(e.target.value)}
            className="mt-2 h-12 text-base"
            placeholder="Player 2"
          />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Winning score
          </p>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTarget((t) => Math.max(1, t - 1))}
              className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-card active:bg-muted"
              aria-label="Decrease"
            >
              <Minus className="h-5 w-5" />
            </button>
            <div className="flex-1 rounded-xl border border-border bg-card py-3 text-center">
              <p className="font-display text-4xl font-bold leading-none tabular-nums">
                {target}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTarget((t) => Math.min(21, t + 1))}
              className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-card active:bg-muted"
              aria-label="Increase"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        <Button
          size="lg"
          disabled={!valid}
          onClick={() =>
            onStart({ p1: p1.trim(), p2: p2.trim(), target })
          }
          className="h-14 w-full rounded-xl text-base font-bold uppercase tracking-wide"
        >
          Start Game
        </Button>

        <QuitGameButton />
      </div>
    </AppShell>
  );
}

function WinnerView({
  config,
  score,
  winnerIdx,
  onPlayAgain,
  onNewMatch,
}: {
  config: MatchConfig;
  score: [number, number];
  winnerIdx: 0 | 1;
  onPlayAgain: () => void;
  onNewMatch: () => void;
}) {
  const winnerName = winnerIdx === 0 ? config.p1 : config.p2;
  const loserName = winnerIdx === 0 ? config.p2 : config.p1;
  const winnerScore = score[winnerIdx];
  const loserScore = score[winnerIdx === 0 ? 1 : 0];

  return (
    <AppShell showBack>
      <div className="flex flex-col items-center pt-8 text-center animate-[fade-in_0.4s_ease-out]">
        <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg animate-[scale-in_0.35s_ease-out]">
          <Trophy className="h-14 w-14" />
          <Star
            className="absolute -right-2 -top-2 h-7 w-7 fill-primary text-primary animate-[scale-in_0.5s_ease-out]"
            aria-hidden
          />
          <Star
            className="absolute -left-3 top-2 h-5 w-5 fill-primary text-primary animate-[scale-in_0.6s_ease-out]"
            aria-hidden
          />
          <Sparkles
            className="absolute -bottom-2 right-0 h-6 w-6 text-primary animate-[scale-in_0.55s_ease-out]"
            aria-hidden
          />
        </div>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">
          Winner
        </p>
        <h1 className="mt-3 font-display text-6xl font-extrabold leading-[0.95] break-words">
          {winnerName}
        </h1>

        <div className="mt-8 w-full rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Final Score
          </p>
          <div className="mt-3 grid grid-cols-2 gap-4 text-left">
            <div>
              <p className="truncate text-xs font-semibold uppercase tracking-wider text-primary">
                {winnerName}
              </p>
              <p className="mt-1 font-display text-4xl font-bold tabular-nums">
                {winnerScore}
              </p>
            </div>
            <div>
              <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {loserName}
              </p>
              <p className="mt-1 font-display text-4xl font-bold tabular-nums text-muted-foreground">
                {loserScore}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 w-full space-y-3">
          <Button
            onClick={onPlayAgain}
            className="h-14 w-full rounded-xl text-base font-bold uppercase tracking-wide"
          >
            Play Again
          </Button>
          <Button
            variant="outline"
            onClick={onNewMatch}
            className="h-14 w-full rounded-xl text-base font-bold uppercase tracking-wide"
          >
            New match
          </Button>
          <QuitGameButton />
        </div>
      </div>
    </AppShell>
  );
}
