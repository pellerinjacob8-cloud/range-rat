import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { ChevronRight, User, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Practice Like You Play — Range Rat" },
      {
        name: "description",
        content:
          "Random clubs, shapes, and distances. Practice every shot like it counts — solo or head to head.",
      },
      { property: "og:title", content: "Practice Like You Play — Range Rat" },
      {
        property: "og:description",
        content: "Random shot generator for solo practice or two-player games.",
      },
    ],
  }),
  component: PlayPage,
});

function PlayPage() {
  const { pathname } = useLocation();
  if (pathname !== "/play") return <Outlet />;

  return (
    <AppShell showBack>
      <div className="pt-2">
        <h1 className="font-display text-3xl font-bold">Practice Like You Play</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Random shots, real commitment. Pick a mode.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <ModeCard
          to="/play/solo"
          title="Solo"
          subtitle="Random shot every time. Track your make percentage."
          Icon={User}
        />
        <ModeCard
          to="/play/game"
          title="Game Mode"
          subtitle="Two players, same shot. First to the target score wins."
          Icon={Users}
        />
      </div>
    </AppShell>
  );
}

interface ModeCardProps {
  to: "/play/solo" | "/play/game";
  title: string;
  subtitle: string;
  Icon: React.ComponentType<{ className?: string }>;
}

function ModeCard({ to, title, subtitle, Icon }: ModeCardProps) {
  return (
    <Link
      to={to}
      className="group block rounded-2xl border border-border bg-card p-5 shadow-sm transition active:scale-[0.99]"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Icon className="h-7 w-7" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-2xl font-bold leading-none">{title}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{subtitle}</p>
        </div>
        <ChevronRight className="h-6 w-6 text-muted-foreground" />
      </div>
    </Link>
  );
}
