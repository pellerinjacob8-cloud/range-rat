import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, Flag, Grid3x3, Lock, Target, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { ProModal } from "@/components/ProModal";

export const Route = createFileRoute("/games")({
  head: () => ({
    meta: [
      { title: "Games — Range Rat" },
      {
        name: "description",
        content: "Quick range games to play with a friend. Keep score, settle bets.",
      },
      { property: "og:title", content: "Games — Range Rat" },
      { property: "og:description", content: "Range games with built-in scoreboards." },
    ],
  }),
  component: GamesPage,
});

function GamesPage() {
  const { pathname } = useLocation();
  const { isPro } = useAuth();
  const [proOpen, setProOpen] = useState(false);

  if (pathname !== "/games") {
    return <Outlet />;
  }

  return (
    <AppShell showBack>
      <div className="pt-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Compete</p>
        <h1 className="mt-1 font-display text-[38px] leading-[0.98] tracking-[-0.01em]">Games</h1>
        <p className="mt-2.5 text-[13.5px] text-muted-foreground">Friendly bets and bragging rights.</p>
      </div>

      <div className="mt-6 space-y-4">
        {/* Closest to Pin — free */}
        <Link
          to="/games/closest-to-pin"
          className="group block rounded-2xl border border-border bg-card p-5 shadow-sm transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Flag className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9.5px] font-bold tracking-[0.18em] uppercase text-primary">2 PLAYERS · QUICK</p>
              <h2 className="font-display text-[22px] leading-none tracking-[-0.005em]">Closest to Pin</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Two players. First to the target score wins.
              </p>
            </div>
            <ChevronRight className="h-6 w-6 text-muted-foreground" />
          </div>
        </Link>

        {/* Grid Game — Pro */}
        <Link
          to="/games/grid-game"
          className="group block rounded-2xl border border-border bg-card p-5 shadow-sm transition active:scale-[0.99] relative overflow-hidden"
        >
          {!isPro && (
            <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-gold-bg border border-gold-border px-2 py-0.5">
              <Lock className="h-3 w-3 text-gold" />
              <span className="text-[10px] font-bold text-gold uppercase tracking-wide">Pro</span>
            </div>
          )}
          <div className="flex items-center gap-4">
            <div className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl ${isPro ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              <Grid3x3 className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9.5px] font-bold tracking-[0.18em] uppercase text-primary">2 PLAYERS · RAT/RANGE</p>
              <h2 className="font-display text-[22px] leading-none tracking-[-0.005em]">Grid Game</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                RAT or RANGE. Call your square, don't get spelled out.
              </p>
            </div>
            <ChevronRight className="h-6 w-6 text-muted-foreground" />
          </div>
        </Link>

        {/* Fairway Game — Pro */}
        {isPro ? (
          <Link
            to="/games/fairway-game"
            className="group block rounded-2xl border border-border bg-card p-5 shadow-sm transition active:scale-[0.99]"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Target className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9.5px] font-bold tracking-[0.18em] uppercase text-primary">SOLO · TRACKING</p>
                <h2 className="font-display text-[22px] leading-none tracking-[-0.005em]">Fairway Game</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Pick two markers. Hit your fairway. Track your %.
                </p>
              </div>
              <ChevronRight className="h-6 w-6 text-muted-foreground" />
            </div>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setProOpen(true)}
            className="w-full rounded-2xl border border-border bg-card p-5 shadow-sm text-left active:scale-[0.99] transition relative overflow-hidden"
          >
            <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-gold-bg border border-gold-border px-2 py-0.5">
              <Zap className="h-3 w-3 text-gold" />
              <span className="text-[10px] font-bold text-gold uppercase tracking-wide">Pro</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Target className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9.5px] font-bold tracking-[0.18em] uppercase text-muted-foreground">SOLO · TRACKING</p>
                <h2 className="font-display text-[22px] leading-none tracking-[-0.005em]">Fairway Game</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Pick two markers. Hit your fairway. Track your %.
                </p>
              </div>
              <ChevronRight className="h-6 w-6 text-muted-foreground" />
            </div>
          </button>
        )}
      </div>

      <p className="mt-6 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">More coming soon</p>

      <ProModal
        open={proOpen}
        onClose={() => setProOpen(false)}
        reason="Fairway Game is a Pro feature. Upgrade to unlock it and the full Range Rat experience."
      />
    </AppShell>
  );
}
