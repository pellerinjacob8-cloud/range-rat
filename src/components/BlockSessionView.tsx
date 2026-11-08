import { useEffect, useState } from "react";
import { ChevronLeft, Lightbulb, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { PracticeBlock } from "@/lib/practicePlan";

const HINT_KEY = "range-rat:seen-block-hint";

interface BlockSessionViewProps {
  blocks: PracticeBlock[];
  index: number;
  onIndexChange: (i: number) => void;
  onFinish: (blocksDone: number) => void;
  onDiscard: () => void;
}

// Keeps the phone screen on while the golfer is hitting balls. Silently does
// nothing where the Wake Lock API isn't available.
function useWakeLock() {
  useEffect(() => {
    type Sentinel = { release: () => Promise<void> };
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<Sentinel> } };
    if (!nav.wakeLock) return;
    let sentinel: Sentinel | null = null;
    let cancelled = false;
    const request = () => {
      nav.wakeLock!.request("screen").then((s) => {
        if (cancelled) s.release().catch(() => {});
        else sentinel = s;
      }).catch(() => {});
    };
    const onVisible = () => { if (document.visibilityState === "visible") request(); };
    request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      sentinel?.release().catch(() => {});
    };
  }, []);
}

export function BlockSessionView({ blocks, index, onIndexChange, onFinish, onDiscard }: BlockSessionViewProps) {
  useWakeLock();
  const [tipOpen, setTipOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [showHint, setShowHint] = useState(() => {
    try { return !localStorage.getItem(HINT_KEY); } catch { return false; }
  });

  const safeIndex = Math.min(Math.max(index, 0), blocks.length - 1);
  const block = blocks[safeIndex];
  const total = blocks.length;
  const isLast = safeIndex === total - 1;
  const ballsHit = blocks
    .slice(0, safeIndex)
    .filter((b) => b.unit === "balls")
    .reduce((s, b) => s + b.balls, 0);
  const progressPct = (safeIndex / total) * 100;

  const next = () => {
    if (showHint) {
      setShowHint(false);
      try { localStorage.setItem(HINT_KEY, "1"); } catch {}
    }
    setTipOpen(false);
    if (isLast) onFinish(total);
    else onIndexChange(safeIndex + 1);
  };

  const back = () => {
    setTipOpen(false);
    if (safeIndex > 0) onIndexChange(safeIndex - 1);
  };

  if (!block) return null;

  return (
    <AppShell showBack onBack={() => setEndOpen(true)} hideTabBar>
      <div className="flex min-h-[calc(100dvh-5.5rem-env(safe-area-inset-top))] flex-col">
        {/* Progress */}
        <div className="flex items-center justify-between text-[13px] font-bold tabular-nums text-muted-foreground">
          <span>{safeIndex + 1} of {total}</span>
          <span>{ballsHit} balls</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progressPct}%` }} />
        </div>

        {/* Block: club, balls, one line */}
        <div key={block.id} className="flex flex-1 flex-col items-center justify-center px-2 py-8 text-center animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-gold">{block.section}</p>
            {block.forYou && (
              <span className="inline-flex items-center gap-1 rounded-full border border-gold-border bg-gold-bg px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-gold">
                <Sparkles className="h-3 w-3" /> For you
              </span>
            )}
          </div>

          <h1 className="mt-3 font-display text-[40px] leading-[1.02] tracking-[-0.01em] text-primary">{block.club}</h1>

          <p className="mt-6 font-stats text-[104px] leading-none tabular-nums text-foreground">
            {block.balls > 0 ? block.balls : "–"}
          </p>
          <p className="mt-1 text-[14px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {block.unit === "balls" ? (block.balls === 1 ? "ball" : "balls") : block.unit}
          </p>

          <p className="mt-7 max-w-[320px] text-[19px] font-semibold leading-snug text-foreground">{block.cue}</p>

          {block.detail && (
            <button
              type="button"
              onClick={() => setTipOpen(true)}
              className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-[13px] font-bold text-primary active:bg-muted"
            >
              <Lightbulb className="h-3.5 w-3.5" /> Tip
            </button>
          )}

          {showHint && safeIndex === 0 && (
            <p className="mt-5 text-[13px] text-muted-foreground">Hit your balls, then tap Next.</p>
          )}
        </div>

        {/* Controls, in thumb reach */}
        <div className="space-y-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={next}
            className="h-16 w-full rounded-[16px] bg-primary text-[16px] font-bold uppercase tracking-[0.08em] text-primary-foreground transition-opacity active:opacity-90"
          >
            {isLast ? "Finish" : "Next"}
          </button>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={back}
              disabled={safeIndex === 0}
              className={cn(
                "inline-flex h-12 items-center gap-1 px-3 text-[14px] font-bold text-muted-foreground",
                safeIndex === 0 ? "opacity-30" : "active:text-foreground",
              )}
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <button
              type="button"
              onClick={() => setEndOpen(true)}
              className="inline-flex h-12 items-center px-3 text-[14px] font-bold text-muted-foreground active:text-foreground"
            >
              End
            </button>
          </div>
        </div>
      </div>

      {/* Tip sheet */}
      <Sheet open={tipOpen} onOpenChange={setTipOpen}>
        <SheetContent side="bottom" className="mx-auto max-w-[430px] rounded-t-[24px] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <SheetHeader className="text-left">
            <SheetTitle className="font-display text-[26px] font-normal leading-tight">{block.cue}</SheetTitle>
            <SheetDescription className="text-[15px] leading-relaxed text-foreground/80">{block.detail}</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>

      {/* End session */}
      <AlertDialog open={endOpen} onOpenChange={setEndOpen}>
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>End session?</AlertDialogTitle>
            <AlertDialogDescription>
              {ballsHit > 0
                ? `You've hit ${ballsHit} balls. Save what you've done, or throw it out.`
                : "Nothing has been hit yet."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            {ballsHit > 0 && (
              <button
                type="button"
                onClick={() => { setEndOpen(false); onFinish(safeIndex); }}
                className="h-11 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground active:opacity-90"
              >
                Save and finish
              </button>
            )}
            <button
              type="button"
              onClick={() => { setEndOpen(false); onDiscard(); }}
              className="h-11 rounded-xl border border-border px-4 text-sm font-bold text-muted-foreground active:bg-muted"
            >
              Discard
            </button>
            <AlertDialogCancel className="mt-0 h-11 rounded-xl">Keep going</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
