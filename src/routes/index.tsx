import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Flag, Flame, Shuffle, Target, User } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { loadProfileName } from "@/lib/profile";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Range Rat — Practice & Games" },
      {
        name: "description",
        content:
          "A bold practice companion for the driving range. Generate drill sessions and play simple range games.",
      },
      { property: "og:title", content: "Range Rat — Practice & Games" },
      {
        property: "og:description",
        content: "Generate range drills and play games like Closest to Pin.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const name = loadProfileName();
  return (
    <AppShell>
      <section className="pt-6 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {name ? `Hey, ${name}.` : "Driving range"}
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold leading-tight">
          Make every bucket count.
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Build a focused practice session or play a quick game with a friend.
        </p>
      </section>

      <div className="space-y-4">
        <HomeCard
          to="/round-warmup"
          title="Round Warm Up"
          subtitle="A timed pre-round checklist. Stretches, wedges, irons, driver, putts."
          Icon={Flame}
        />
        <HomeCard
          to="/practice"
          title="Practice"
          subtitle="Generate a drill session tailored to your bucket and goal."
          Icon={Target}
        />
        <HomeCard
          to="/play"
          title="Practice Like You Play"
          subtitle="Random club, shape, and distance. Commit to every shot."
          Icon={Shuffle}
        />
        <HomeCard
          to="/games"
          title="Games"
          subtitle="Friendly range games to keep score with a buddy."
          Icon={Flag}
        />
        <HomeCard
          to="/profile"
          title="My Profile"
          subtitle="Your bag, yardages, and all-time practice stats."
          Icon={User}
        />
      </div>
    </AppShell>
  );
}

interface HomeCardProps {
  to: "/practice" | "/games" | "/play" | "/round-warmup" | "/profile";
  title: string;
  subtitle: string;
  Icon: React.ComponentType<{ className?: string }>;
}

function HomeCard({ to, title, subtitle, Icon }: HomeCardProps) {
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
