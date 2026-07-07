import { useEffect, useMemo, useState } from "react";
import { Check, Flag, MapPin, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildLadder,
  categoryLabel,
  setPrompt,
  stationLabel,
  stationTip,
  summarizeSession,
  summarizeStation,
  LONG_TARGET_FT,
  SETS_PER_STATION,
  type PuttStation,
  type PuttingSessionConfig,
  type SetResult,
  type StationResult,
} from "@/lib/putting";

// Per-ball make/miss row (checks then x's). Purely cosmetic ordering — the
// data model stores a count, not a sequence.
function BallRow({ makes, ballCount, size = "sm" }: { makes: number; ballCount: number; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const icon = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";
  return (
    <div className="flex flex-wrap justify-center gap-1">
      {Array.from({ length: ballCount }, (_, i) => {
        const made = i < makes;
        return (
          <span
            key={i}
            className={cn(
              "flex items-center justify-center rounded-full",
              dim,
              made ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground/60",
            )}
          >
            {made ? <Check className={icon} strokeWidth={3} /> : <X className={icon} strokeWidth={3} />}
          </span>
        );
      })}
    </div>
  );
}

interface PuttingSessionViewProps {
  config: PuttingSessionConfig;
  stations: PuttStation[];
  results: StationResult[];
  currentSets: SetResult[];
  onProgress: (stations: PuttStation[], results: StationResult[], currentSets: SetResult[]) => void;
  onFinish: (results: StationResult[]) => void;
  onQuit: () => void;
}

export function PuttingSessionView({
  config,
  stations,
  results,
  currentSets,
  onProgress,
  onFinish,
  onQuit,
}: PuttingSessionViewProps) {
  // Show the just-finished station's line score before moving on.
  const [showStationSummary, setShowStationSummary] = useState(false);
  const [lastStation, setLastStation] = useState<StationResult | null>(null);
  // Each station opens on a "go find this putt" screen; tapping Start drops
  // into the tap-to-score sets. Resets whenever a new station begins.
  const [stationStarted, setStationStarted] = useState(false);

  const stationIdx = results.length;
  const station = stations[stationIdx];
  const setNumber = currentSets.length + 1;
  const isUnlimited = config.time === "unlimited";
  const isFinalPlannedStation = !isUnlimited && stationIdx === stations.length - 1;

  // Position of this station within its own category, for the tip ramp
  // (first short station is easier than the third, etc).
  const indexInCategory = useMemo(() => {
    if (!station) return 0;
    return stations.slice(0, stationIdx).filter((s) => s.category === station.category).length;
  }, [stations, stationIdx, station]);

  // New station: reset back to the intro screen.
  useEffect(() => {
    setStationStarted(false);
  }, [stationIdx]);

  // Fixed-time sessions end automatically once the planned ladder is done.
  useEffect(() => {
    if (!station && !isUnlimited && !showStationSummary) {
      onFinish(results);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station, isUnlimited, showStationSummary]);

  const recordMakes = (makes: number) => {
    if (!station) return;
    const set: SetResult = {
      minFt: station.minFt,
      maxFt: station.maxFt,
      category: station.category,
      setNumber,
      ballCount: config.ballCount,
      makes,
    };
    const updatedSets = [...currentSets, set];
    if (updatedSets.length >= SETS_PER_STATION) {
      const stationResult: StationResult = { minFt: station.minFt, maxFt: station.maxFt, category: station.category, sets: updatedSets };
      const nextResults = [...results, stationResult];
      setLastStation(stationResult);
      setShowStationSummary(true);
      onProgress(stations, nextResults, []);
    } else {
      onProgress(stations, results, updatedSets);
    }
  };

  const extendLadder = () => {
    onProgress([...stations, ...buildLadder(config.mode)], results, currentSets);
  };

  // ── Station line score, shown after the 3rd set
  if (showStationSummary && lastStation) {
    const summary = summarizeStation(lastStation.sets);
    return (
      <AppShell showBack onBack={onQuit}>
        <div className="flex flex-col items-center pt-10 text-center">
          <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-primary">
            {categoryLabel(lastStation.category)}
          </p>
          <h1 className="mt-2 font-display text-[48px] leading-none">{lastStation.minFt}-{lastStation.maxFt} ft</h1>

          <div className="mt-6 w-full space-y-2">
            {lastStation.sets.map((s, i) => (
              <div key={i} className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground shrink-0 w-12 text-left">Set {i + 1}</p>
                <div className="flex-1 flex justify-center">
                  <BallRow makes={s.makes} ballCount={s.ballCount} />
                </div>
                <p className="font-stats text-[22px] tabular-nums text-primary shrink-0 w-12 text-right">{s.makes}/{s.ballCount}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-card px-8 py-5">
            <p className="font-stats text-[40px] leading-none tabular-nums text-primary">{summary.makes}/{summary.attempts}</p>
            <p className="mt-1 text-[14px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{summary.pct}%</p>
          </div>

          <div className="mt-8 w-full">
            <Button
              onClick={() => { setShowStationSummary(false); setLastStation(null); }}
              className="h-14 w-full rounded-xl text-base font-bold uppercase tracking-wide"
            >
              {isFinalPlannedStation && !isUnlimited ? "See Results" : "Move to Next Station"}
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Unlimited: planned ladder exhausted, ask to keep going or finish
  if (!station && isUnlimited) {
    const summary = summarizeSession(results);
    return (
      <AppShell showBack onBack={onQuit}>
        <div className="flex flex-col items-center pt-10 text-center">
          <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Ladder Complete</p>
          <h1 className="mt-2 font-display text-[38px] leading-tight">Keep going,<br />or call it?</h1>
          <div className="mt-6 rounded-2xl border border-border bg-card px-8 py-5">
            <p className="font-stats text-[40px] leading-none tabular-nums text-primary">{summary.makes}/{summary.attempts}</p>
            <p className="mt-1 text-[14px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{summary.pct}% so far</p>
          </div>
          <div className="mt-8 w-full space-y-3">
            <Button onClick={extendLadder} className="h-14 w-full rounded-xl text-base font-bold uppercase tracking-wide">
              Keep Going
            </Button>
            <button
              type="button"
              onClick={() => onFinish(results)}
              className="h-12 w-full rounded-xl border border-border bg-card text-sm font-bold uppercase tracking-wide text-muted-foreground transition active:bg-muted"
            >
              Finish Session
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Fixed-time, ladder exhausted: the useEffect above calls onFinish; render
  // nothing while that transition happens.
  if (!station) return null;

  // ── Station intro: "go find this putt" before any scoring starts
  if (!stationStarted) {
    return (
      <AppShell showBack onBack={onQuit}>
        <div className="flex flex-col min-h-[calc(100vh-10rem)] pt-6">
          <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Station {stationIdx + 1} of {stations.length}
          </p>

          <div className="flex flex-1 flex-col items-center justify-center text-center px-2">
            <p className="text-[15px] font-bold uppercase tracking-[0.2em] text-primary">
              {categoryLabel(station.category)}
            </p>
            {/* clamp keeps "48-52 ft" from wrapping on 375px screens */}
            <h1 className="mt-3 font-display leading-none tracking-[-0.01em] text-[clamp(56px,19vw,80px)]">
              {stationLabel(station)}
            </h1>

            <div className="mt-8 w-full max-w-[320px] rounded-2xl border border-primary/25 bg-primary/5 px-5 py-4">
              <div className="flex items-start gap-3 text-left">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <MapPin className="h-4 w-4 text-primary" />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Find your putt</p>
                  <p className="mt-1 text-[15px] leading-relaxed text-foreground">
                    {stationTip(station, indexInCategory, stationIdx)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 text-[14px] font-semibold text-muted-foreground">
              <Flag className="h-4 w-4 text-primary" />
              {SETS_PER_STATION} sets · {config.ballCount} balls each
              {station.category === "long" && <span>· inside {LONG_TARGET_FT} ft counts</span>}
            </div>
          </div>

          <div className="pb-10">
            <Button
              onClick={() => setStationStarted(true)}
              className="h-16 w-full rounded-[14px] text-[15px] font-bold uppercase tracking-[0.06em] active:opacity-90 transition-opacity"
            >
              I'm at My Putt · Start
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Active set: distance + instruction + tap-a-number score entry
  const isLong = station.category === "long";
  return (
    <AppShell showBack onBack={onQuit}>
      <div className="flex flex-col min-h-[calc(100vh-10rem)] pt-6">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Station {stationIdx + 1} of {stations.length}
          </p>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center px-2 py-8">
          <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-primary">
            {categoryLabel(station.category)}
          </p>
          <h1 className="mt-2 font-display text-[64px] leading-none">{stationLabel(station)}</h1>

          {/* Set progress: big, unmissable, with a segment tracker underneath. */}
          <div className="mt-5 flex flex-col items-center gap-2.5">
            <p className="font-stats text-[32px] leading-none tabular-nums text-primary">
              Set {setNumber} <span className="text-muted-foreground">of {SETS_PER_STATION}</span>
            </p>
            <div className="flex gap-1.5">
              {Array.from({ length: SETS_PER_STATION }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-2 w-8 rounded-full",
                    i < currentSets.length ? "bg-primary" : i === currentSets.length ? "bg-primary/50" : "bg-muted",
                  )}
                />
              ))}
            </div>
            {setPrompt(setNumber, setNumber === SETS_PER_STATION) && (
              <p className={cn(
                "text-[13px] font-bold uppercase tracking-[0.12em]",
                setNumber === SETS_PER_STATION ? "text-gold" : "text-muted-foreground",
              )}>
                {setPrompt(setNumber, setNumber === SETS_PER_STATION)}
              </p>
            )}
          </div>

          <p className="mt-6 text-[15px] text-muted-foreground max-w-[300px] leading-relaxed">
            {isLong
              ? `Putt all ${config.ballCount} balls. How many finished inside ${LONG_TARGET_FT} ft?`
              : `Putt all ${config.ballCount} balls. How many did you make?`}
          </p>

          {/* Score entry: high-contrast, oversized targets (used outdoors in
              sunlight). Zero sits apart — "none dropped" is its own outcome. */}
          <div className="mt-8 w-full max-w-[340px] space-y-2.5">
            <div className="grid grid-cols-4 gap-2.5">
              {Array.from({ length: config.ballCount }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => recordMakes(n)}
                  className="h-16 rounded-xl border-2 border-border bg-card font-stats text-[24px] tabular-nums text-foreground transition-colors active:border-primary active:bg-primary active:text-primary-foreground"
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => recordMakes(0)}
              className="h-12 w-full rounded-xl border-2 border-dashed border-border bg-transparent text-[13px] font-bold uppercase tracking-[0.1em] text-muted-foreground transition-colors active:bg-muted"
            >
              {isLong ? "None inside" : "Missed 'em all"} · 0
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
