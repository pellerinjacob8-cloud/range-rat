import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, Minus, Plus, Trophy, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { QuitGameButton } from "@/components/QuitGameButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateShot, type Shot, type GenerateShotOptions } from "@/lib/shots";
import { deriveStyle } from "@/lib/drills";
import { fetchProfile, fetchBag } from "@/lib/db";
import { saveActiveMarker } from "@/lib/active-session";
import { ShotCard } from "./play.solo";
import { loadProfileName } from "@/lib/profile";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/play/game")({
  head: () => ({
    meta: [
      { title: "Range Rat: Random Practice (Game Mode)" },
      {
        name: "description",
        content: "Two players, same random shot. First to the target score wins.",
      },
    ],
  }),
  component: GamePage,
});

interface MatchConfig {
  p1: string;
  p2: string;
  target: number;
}

type Pick = "yes" | "no" | null;

function GamePage() {
  const [config, setConfig] = useState<MatchConfig | null>(null);
  const [shotOpts, setShotOpts] = useState<GenerateShotOptions>({});
  const [shot, setShot] = useState<Shot>(() => generateShot());
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [picks, setPicks] = useState<[Pick, Pick]>([null, null]);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  useEffect(() => {
    const opts: GenerateShotOptions = {};
    Promise.all([fetchProfile(), fetchBag()]).then(([profile, bag]) => {
      if (bag.length > 0) opts.bag = bag;
      if (profile?.handicap !== undefined) opts.style = deriveStyle(profile.handicap);
      setShotOpts(opts);
      setShot(generateShot(opts));
    });
  }, []);

  const winnerIdx: 0 | 1 | null =
    config && score[0] >= config.target
      ? 0
      : config && score[1] >= config.target
        ? 1
        : null;

  // Resolve once both picks are in.
  useEffect(() => {
    if (!config || winnerIdx !== null) return;
    if (picks[0] === null || picks[1] === null) return;

    const p1Made = picks[0] === "yes";
    const p2Made = picks[1] === "yes";

    if (p1Made && !p2Made) {
      setScore((s) => [s[0] + 1, s[1]]);
    } else if (!p1Made && p2Made) {
      setScore((s) => [s[0], s[1] + 1]);
    }
    // Both made or both missed: no point.

    advanceTimer.current = setTimeout(() => {
      setShot(generateShot(shotOpts));
      setPicks([null, null]);
    }, 900);

    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, [picks, config, winnerIdx]);

  if (!config) {
    return <SetupView onStart={(c) => {
      setConfig(c);
      saveActiveMarker({
        type: "play-game",
        route: "/play",
        label: "Game Mode",
        subtitle: `${c.p1} vs ${c.p2} - First to ${c.target}`,
      });
    }} />;
  }

  if (winnerIdx !== null) {
    return (
      <WinnerView
        config={config}
        score={score}
        winnerIdx={winnerIdx}
        onPlayAgain={() => {
          setScore([0, 0]);
          setPicks([null, null]);
          setShot(generateShot(shotOpts));
        }}
        onNewMatch={() => {
          setConfig(null);
          setScore([0, 0]);
          setPicks([null, null]);
          setShot(generateShot(shotOpts));
        }}
      />
    );
  }

  const setPick = (player: 0 | 1, pick: Pick) => {
    setPicks((cur) => {
      if (cur[player] !== null) return cur;
      const next: [Pick, Pick] = [...cur] as [Pick, Pick];
      next[player] = pick;
      return next;
    });
  };

  return (
    <AppShell showBack>
      <div className="grid grid-cols-2 gap-3 pt-2">
        <ScoreHeader name={config.p1} score={score[0]} leading={score[0] > score[1]} />
        <ScoreHeader name={config.p2} score={score[1]} leading={score[1] > score[0]} />
      </div>
      <p className="mt-2 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        First to {config.target}
      </p>

      <ShotCard shot={shot} />

      <div className="mt-6 space-y-4">
        <PlayerPicker
          name={config.p1}
          pick={picks[0]}
          onYes={() => setPick(0, "yes")}
          onNo={() => setPick(0, "no")}
        />
        <PlayerPicker
          name={config.p2}
          pick={picks[1]}
          onYes={() => setPick(1, "yes")}
          onNo={() => setPick(1, "no")}
        />
      </div>

      <div className="mt-8">
        <QuitGameButton />
      </div>
    </AppShell>
  );
}

function ScoreHeader({
  name,
  score,
  leading,
}: {
  name: string;
  score: number;
  leading: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-3 transition",
        leading ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
      )}
    >
      <p
        className={cn(
          "truncate text-[11px] font-bold uppercase tracking-widest",
          leading ? "text-primary-foreground/80" : "text-muted-foreground",
        )}
      >
        {name}
      </p>
      <p className="mt-1 font-display text-3xl leading-none tabular-nums">{score}</p>
    </div>
  );
}

function PlayerPicker({
  name,
  pick,
  onYes,
  onNo,
}: {
  name: string;
  pick: Pick;
  onYes: () => void;
  onNo: () => void;
}) {
  const locked = pick !== null;
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="truncate px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {name}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          onClick={onYes}
          disabled={locked}
          className={cn(
            "flex h-14 items-center justify-center gap-2 rounded-xl border text-base font-bold uppercase tracking-wide transition active:scale-[0.99] disabled:active:scale-100",
            pick === "yes"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background",
            locked && pick !== "yes" && "opacity-40",
          )}
        >
          <Check className="h-5 w-5" /> Yes
        </button>
        <button
          onClick={onNo}
          disabled={locked}
          className={cn(
            "flex h-14 items-center justify-center gap-2 rounded-xl border text-base font-bold uppercase tracking-wide transition active:scale-[0.99] disabled:active:scale-100",
            pick === "no" ? "border-foreground bg-muted" : "border-border bg-background",
            locked && pick !== "no" && "opacity-40",
          )}
        >
          <X className="h-5 w-5" /> No
        </button>
      </div>
    </div>
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
        <h1 className="font-display text-3xl">Game Mode</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Same shot, both players. First to the target wins.
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
          onClick={() => onStart({ p1: p1.trim(), p2: p2.trim(), target })}
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
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg animate-[scale-in_0.35s_ease-out]">
          <Trophy className="h-14 w-14" />
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
              <p className="mt-1 font-display text-4xl tabular-nums">{winnerScore}</p>
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
            New Match
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
