import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { saveActiveMarker } from "@/lib/active-session";
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
      { title: "Range Rat: Closest to Pin" },
      {
        name: "description",
        content: "Two-player Closest to Pin scorekeeper. Set a target score and play.",
      },
      { property: "og:title", content: "Range Rat: Closest to Pin" },
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

  useEffect(() => {
    if (config) {
      saveActiveMarker({
        type: "ctp",
        route: "/games/closest-to-pin",
        label: "Closest to Pin",
        subtitle: "Game in progress",
      });
    }
  }, [config]);

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

  // Players data for the new vertical layout
  const players = [
    { id: 0 as 0 | 1, name: config.p1, score: score[0] },
    { id: 1 as 0 | 1, name: config.p2, score: score[1] },
  ];

  const maxScore = Math.max(score[0], score[1]);

  return (
    <AppShell showBack>
      {/* Header */}
      <div className="py-2 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Pin #</p>
          <span className="font-stats text-[44px] leading-none tabular-nums text-foreground">{round}</span>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Race to</p>
          <span className="font-stats text-[44px] leading-none tabular-nums text-primary">{config.target}</span>
        </div>
      </div>
      <hr className="border-border" />

      {/* Player rows */}
      <div className="mt-4 space-y-3">
        {players.map((player) => {
          const isLeading = player.score > 0 && player.score === maxScore && player.score > (player.id === 0 ? score[1] : score[0]);
          return (
            <div
              key={player.id}
              className={cn(
                "rounded-3xl p-4 border flex items-center gap-3 transition-all",
                isLeading
                  ? "bg-primary text-primary-foreground border-primary shadow-[0_10px_25px_-16px_rgba(13,45,90,0.5)]"
                  : "bg-card text-foreground border-border"
              )}
            >
              {/* Player info */}
              <div className="flex-1 min-w-0">
                <p className={cn("text-[10.5px] font-bold uppercase tracking-[0.2em]", isLeading ? "text-white/65" : "text-muted-foreground")}>
                  {isLeading ? "★ Leading" : "Player"}
                </p>
                <p className={cn("mt-1 font-display text-[26px] leading-none tracking-[-0.005em]", isLeading && "italic")}>
                  {player.name}
                </p>
                {/* Dots progress */}
                <div className="mt-2 flex gap-1.5">
                  {Array.from({ length: config.target }).map((_, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        "inline-block w-2 h-2 rounded-full",
                        idx < player.score
                          ? (isLeading ? "bg-white" : "bg-primary")
                          : (isLeading ? "bg-white/22" : "bg-border")
                      )}
                    />
                  ))}
                </div>
              </div>
              {/* Score */}
              <div className="min-w-[72px] text-right">
                <span className={cn("font-stats text-[68px] leading-none tabular-nums", isLeading ? "text-white" : "text-primary")}>
                  {player.score}
                </span>
              </div>
              {/* Steppers, these are visual only for display; awardPoint is the real action */}
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => awardPoint(player.id)}
                  disabled={celebrating !== null}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-50",
                    isLeading
                      ? "bg-white/18 border border-white/20 text-white"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  <Plus className="h-5 w-5" strokeWidth={2} />
                </button>
                <button
                  onClick={() => {
                    // decrement: remove last point for this player from history
                    const lastIdx = [...history].reverse().findIndex((w) => w === player.id);
                    if (lastIdx === -1) return;
                    const realIdx = history.length - 1 - lastIdx;
                    setHistory((h) => [...h.slice(0, realIdx), ...h.slice(realIdx + 1)]);
                  }}
                  disabled={celebrating !== null || player.score === 0}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-30",
                    isLeading
                      ? "bg-white/8 border border-white/15 text-white/70"
                      : "bg-card border border-border text-muted-foreground"
                  )}
                >
                  <Minus className="h-[18px] w-[18px]" strokeWidth={2} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Award round */}
      <p className="text-center text-[10.5px] font-bold uppercase tracking-[0.22em] text-muted-foreground mt-5 mb-2.5">
        Who won the round?
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {players.map((p) => (
          <button
            key={p.id}
            onClick={() => awardPoint(p.id)}
            disabled={celebrating !== null}
            className="h-14 rounded-2xl border border-border bg-card font-bold text-[13px] uppercase tracking-[0.08em] disabled:opacity-50 active:bg-muted transition"
          >
            {p.name} won
          </button>
        ))}
      </div>

      {/* Undo */}
      {history.length > 0 && celebrating === null ? (
        <button
          onClick={() => setHistory((h) => h.slice(0, -1))}
          className="text-[12.5px] font-semibold text-muted-foreground flex items-center gap-1.5 justify-center mt-4"
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

function SetupView({ onStart }: { onStart: (c: MatchConfig) => void }) {
  const [p1, setP1] = useState(() => loadProfileName() || "Player 1");
  const [p2, setP2] = useState("Player 2");
  const [target, setTarget] = useState(5);

  const valid = p1.trim().length > 0 && p2.trim().length > 0 && target >= 1;

  return (
    <AppShell showBack>
      <div className="pt-2">
        <h1 className="font-display text-3xl">Closest to Pin</h1>
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
              <p className="font-display text-4xl leading-none tabular-nums">
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
        <h1 className="mt-3 font-display text-6xl leading-[0.95] break-words">
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
              <p className="mt-1 font-display text-4xl tabular-nums">
                {winnerScore}
              </p>
            </div>
            <div>
              <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {loserName}
              </p>
              <p className="mt-1 font-display text-4xl tabular-nums text-muted-foreground">
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
