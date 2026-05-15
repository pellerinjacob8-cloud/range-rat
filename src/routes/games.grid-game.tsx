import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { saveActiveMarker } from "@/lib/active-session";
import { Check, Sparkles, Star, Trophy, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { QuitGameButton } from "@/components/QuitGameButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadProfileName } from "@/lib/profile";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/games/grid-game")({
  head: () => ({
    meta: [
      { title: "Grid Game — Range Rat" },
      {
        name: "description",
        content:
          "Two-player Grid Game. Call your quadrant on a 3x3. Don't get spelled out — RAT or RANGE.",
      },
      { property: "og:title", content: "Grid Game — Range Rat" },
      {
        property: "og:description",
        content: "Pick RAT or RANGE. Call your square. Last one standing wins.",
      },
    ],
  }),
  component: GridGame,
});

type WordChoice = "RAT" | "RANGE";

interface MatchConfig {
  p1: string;
  p2: string;
  word: WordChoice;
}

type Phase =
  | { kind: "pick" }
  | { kind: "callerPrompt"; square: number }
  | { kind: "secondPrompt"; square: number };

const SQUARES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function GridGame() {
  const [config, setConfig] = useState<MatchConfig | null>(null);
  const [caller, setCaller] = useState<0 | 1>(0);
  const [letters, setLetters] = useState<[number, number]>([0, 0]);
  const [phase, setPhase] = useState<Phase>({ kind: "pick" });

  useEffect(() => {
    if (config) {
      saveActiveMarker({
        type: "grid",
        route: "/games/grid-game",
        label: "Grid Game",
        subtitle: "Game in progress",
      });
    }
  }, [config]);

  if (!config) {
    return (
      <SetupView
        onStart={(c) => {
          setConfig(c);
          setCaller(0);
          setLetters([0, 0]);
          setPhase({ kind: "pick" });
        }}
      />
    );
  }

  const target = config.word.length;
  const winnerIdx: 0 | 1 | null =
    letters[0] >= target ? 1 : letters[1] >= target ? 0 : null;

  if (winnerIdx !== null) {
    return (
      <WinnerView
        config={config}
        letters={letters}
        winnerIdx={winnerIdx}
        onPlayAgain={() => {
          setLetters([0, 0]);
          setCaller(0);
          setPhase({ kind: "pick" });
        }}
        onNewMatch={() => {
          setConfig(null);
          setLetters([0, 0]);
          setCaller(0);
          setPhase({ kind: "pick" });
        }}
      />
    );
  }

  const second: 0 | 1 = caller === 0 ? 1 : 0;
  const callerName = caller === 0 ? config.p1 : config.p2;
  const secondName = second === 0 ? config.p1 : config.p2;

  const swapAndReset = () => {
    setCaller(second);
    setPhase({ kind: "pick" });
  };

  const onPickSquare = (n: number) => {
    if (phase.kind !== "pick") return;
    setPhase({ kind: "callerPrompt", square: n });
  };

  const onCallerAnswer = (hit: boolean) => {
    if (phase.kind !== "callerPrompt") return;
    if (!hit) {
      // Caller missed — turn ends, no letter.
      swapAndReset();
    } else {
      setPhase({ kind: "secondPrompt", square: phase.square });
    }
  };

  const onSecondAnswer = (hit: boolean) => {
    if (phase.kind !== "secondPrompt") return;
    if (hit) {
      // Both made it — no letter, swap caller.
      swapAndReset();
    } else {
      // Second player missed — they get the next letter.
      setLetters((prev) => {
        const next: [number, number] = [...prev] as [number, number];
        next[second] = Math.min(target, next[second] + 1);
        return next;
      });
      swapAndReset();
    }
  };

  const selectedSquare = phase.kind === "pick" ? null : phase.square;


  return (
    <AppShell showBack>
      <div className="pt-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Grid Game · {config.word}
        </p>
        <h1 className="mt-1 font-display text-3xl">
          {phase.kind === "pick" ? `${callerName}'s call` : "Did it land?"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {phase.kind === "pick"
            ? "Tap a square to call your target."
            : `Square ${phase.square} called.`}
        </p>
      </div>

      {/* 3x3 grid */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        {SQUARES.map((n) => {
          const active = selectedSquare === n;
          const interactive = phase.kind === "pick";
          return (
            <button
              key={n}
              type="button"
              onClick={() => onPickSquare(n)}
              disabled={!interactive}
              aria-pressed={active}
              className={cn(
                "aspect-square rounded-2xl border font-display text-5xl transition active:scale-[0.97]",
                active
                  ? "border-primary bg-primary text-primary-foreground ring-4 ring-primary/30 shadow-lg"
                  : "border-border bg-card text-foreground",
                !interactive && !active && "opacity-60",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>

      {/* Player letter rows */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <PlayerLetters
          name={config.p1}
          word={config.word}
          earned={letters[0]}
          isCaller={caller === 0 && phase.kind === "pick"}
        />
        <PlayerLetters
          name={config.p2}
          word={config.word}
          earned={letters[1]}
          isCaller={caller === 1 && phase.kind === "pick"}
        />
      </div>

      {/* Prompt area */}
      {phase.kind === "callerPrompt" ? (
        <PromptCard
          who={callerName}
          onYes={() => onCallerAnswer(true)}
          onNo={() => onCallerAnswer(false)}
        />
      ) : null}
      {phase.kind === "secondPrompt" ? (
        <PromptCard
          who={secondName}
          onYes={() => onSecondAnswer(true)}
          onNo={() => onSecondAnswer(false)}
        />
      ) : null}

      <div className="mt-10">
        <QuitGameButton
          onBeforeQuit={() => {
            setConfig(null);
            setLetters([0, 0]);
            setCaller(0);
            setPhase({ kind: "pick" });
          }}
        />
      </div>
    </AppShell>
  );
}

function PromptCard({
  who,
  onYes,
  onNo,
}: {
  who: string;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-primary/40 bg-card p-4 shadow-sm animate-[fade-in_0.2s_ease-out]">
      <p className="text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {who} — hit it?
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          onClick={onYes}
          className="flex h-14 items-center justify-center gap-2 rounded-xl border border-primary bg-primary text-primary-foreground text-base font-bold uppercase tracking-wide transition active:scale-[0.99]"
        >
          <Check className="h-5 w-5" /> Yes
        </button>
        <button
          onClick={onNo}
          className="flex h-14 items-center justify-center gap-2 rounded-xl border border-border bg-card text-foreground text-base font-bold uppercase tracking-wide transition active:scale-[0.99] active:bg-muted"
        >
          <X className="h-5 w-5" /> No
        </button>
      </div>
    </div>
  );
}

function PlayerLetters({
  name,
  word,
  earned,
  isCaller,
}: {
  name: string;
  word: WordChoice;
  earned: number;
  isCaller: boolean;
}) {
  const chars = word.split("");
  return (
    <div
      className={cn(
        "rounded-2xl border p-3 transition-colors",
        isCaller ? "border-primary bg-primary/5" : "border-border bg-card",
      )}
    >
      <p
        className={cn(
          "truncate text-[11px] font-bold uppercase tracking-widest",
          isCaller ? "text-primary" : "text-muted-foreground",
        )}
      >
        {name}
        {isCaller ? " · calling" : ""}
      </p>
      <div className="mt-2 flex justify-between gap-1">
        {chars.map((c, i) => {
          const filled = i < earned;
          return (
            <span
              key={`${c}-${i}`}
              className={cn(
                "flex h-9 w-7 sm:w-8 items-center justify-center rounded-md border font-display text-lg transition-colors",
                filled
                  ? "border-destructive bg-destructive text-destructive-foreground"
                  : "border-border bg-background text-muted-foreground/50",
              )}
            >
              {filled ? c : "_"}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function SetupView({ onStart }: { onStart: (c: MatchConfig) => void }) {
  const [p1, setP1] = useState(() => loadProfileName() || "Player 1");
  const [p2, setP2] = useState("Player 2");
  const [word, setWord] = useState<WordChoice>("RAT");

  const valid = p1.trim().length > 0 && p2.trim().length > 0;

  return (
    <AppShell showBack>
      <div className="pt-2">
        <h1 className="font-display text-3xl">Grid Game</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Call your square. Don't get spelled out.
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
            Word
          </p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <WordPill
              label="RAT"
              hint="3 letters · quick"
              active={word === "RAT"}
              onClick={() => setWord("RAT")}
            />
            <WordPill
              label="RANGE"
              hint="5 letters · longer"
              active={word === "RANGE"}
              onClick={() => setWord("RANGE")}
            />
          </div>
        </div>

        <Button
          size="lg"
          disabled={!valid}
          onClick={() => onStart({ p1: p1.trim(), p2: p2.trim(), word })}
          className="h-14 w-full rounded-xl text-base font-bold uppercase tracking-wide"
        >
          Start Game
        </Button>

        <QuitGameButton />
      </div>
    </AppShell>
  );
}

function WordPill({
  label,
  hint,
  active,
  onClick,
}: {
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-2xl border p-4 text-left transition active:scale-[0.99]",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground",
      )}
    >
      <p className="font-display text-2xl leading-none">{label}</p>
      <p
        className={cn(
          "mt-1 text-xs font-semibold uppercase tracking-wide",
          active ? "text-primary-foreground/80" : "text-muted-foreground",
        )}
      >
        {hint}
      </p>
    </button>
  );
}

function WinnerView({
  config,
  letters,
  winnerIdx,
  onPlayAgain,
  onNewMatch,
}: {
  config: MatchConfig;
  letters: [number, number];
  winnerIdx: 0 | 1;
  onPlayAgain: () => void;
  onNewMatch: () => void;
}) {
  const winnerName = winnerIdx === 0 ? config.p1 : config.p2;
  const loserName = winnerIdx === 0 ? config.p2 : config.p1;
  const word = config.word;

  const progress = (idx: 0 | 1) =>
    word
      .split("")
      .map((c, i) => (i < letters[idx] ? c : "_"))
      .join(" ");

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
            Final Boards · {word}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-4 text-left">
            <div>
              <p className="truncate text-xs font-semibold uppercase tracking-wider text-primary">
                {winnerName}
              </p>
              <p className="mt-1 font-display text-2xl tracking-widest">
                {progress(winnerIdx)}
              </p>
            </div>
            <div>
              <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {loserName}
              </p>
              <p className="mt-1 font-display text-2xl tracking-widest text-muted-foreground">
                {progress(winnerIdx === 0 ? 1 : 0)}
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
