import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { ChevronRight, Flag, Grid3x3, Target } from "lucide-react";
import { AppShell } from "@/components/AppShell";

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

  // When a child game route is active, just render it.
  if (pathname !== "/games") {
    return <Outlet />;
  }

  return (
    <AppShell showBack>
      <div className="pt-2">
        <h1 className="font-display text-3xl font-bold">Games</h1>
        <p className="mt-2 text-sm text-muted-foreground">Pick a game. More coming soon.</p>
      </div>

      <div className="mt-6 space-y-4">
        <Link
          to="/games/closest-to-pin"
          className="group block rounded-2xl border border-border bg-card p-5 shadow-sm transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Flag className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-xl font-bold leading-none">Closest to Pin</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Two players. First to the target score wins.
              </p>
            </div>
            <ChevronRight className="h-6 w-6 text-muted-foreground" />
          </div>
        </Link>

        <Link
          to="/games/grid-game"
          className="group block rounded-2xl border border-border bg-card p-5 shadow-sm transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Grid3x3 className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-xl font-bold leading-none">Grid Game</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                RAT or RANGE. Call your square, don't get spelled out.
              </p>
            </div>
            <ChevronRight className="h-6 w-6 text-muted-foreground" />
          </div>
        </Link>

        <Link
          to="/games/fairway-game"
          className="group block rounded-2xl border border-border bg-card p-5 shadow-sm transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Target className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-xl font-bold leading-none">Fairway Game</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Pick two markers. Hit your fairway. Track your %.
              </p>
            </div>
            <ChevronRight className="h-6 w-6 text-muted-foreground" />
          </div>
        </Link>
      </div>
    </AppShell>
  );
}
