import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, Flag, Flame, RotateCcw, Shuffle, Target, Trophy, X, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { loadProfileName } from "@/lib/profile";
import { loadActiveMarker, clearActiveSession } from "@/lib/active-session";
import { useAuth } from "@/context/AuthContext";
import { ProModal } from "@/components/ProModal";

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

interface Session {
  totalBalls?: number;
  completedAt?: string;
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function calcStreak(sessions: Session[]): number {
  const dates = new Set(
    sessions
      .filter(s => s.completedAt)
      .map(s => dayKey(new Date(s.completedAt!)))
  );
  if (dates.size === 0) return 0;

  // Start from today; if no session today, start from yesterday
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (!dates.has(dayKey(start))) start.setDate(start.getDate() - 1);

  let streak = 0;
  const cur = new Date(start);
  while (dates.has(dayKey(cur))) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

function loadStats() {
  try {
    const raw = localStorage.getItem("range-rat:sessions");
    if (!raw) return { sessions: 0, balls: 0, streak: 0 };
    const sessions: Session[] = JSON.parse(raw);
    const balls = sessions.reduce((sum, s) => sum + (s.totalBalls ?? 0), 0);
    const streak = calcStreak(sessions);
    return { sessions: sessions.length, balls, streak };
  } catch {
    return { sessions: 0, balls: 0, streak: 0 };
  }
}

function StatNum({ value, size }: { value: number; size: number }) {
  return (
    <span
      className="font-stats leading-none tabular-nums text-primary"
      style={{ fontSize: size }}
    >
      {value}
    </span>
  );
}

function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[12px] font-bold uppercase tracking-[0.18em] text-muted-foreground ${className ?? ""}`}>
      {children}
    </p>
  );
}

function Home() {
  const navigate = useNavigate();
  const name = loadProfileName();
  const stats = loadStats();
  const [activeSession, setActiveSession] = useState(() => loadActiveMarker());
  const { isPro } = useAuth();
  const [proOpen, setProOpen] = useState(false);

  const dismissResume = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearActiveSession();
    setActiveSession(null);
  };

  return (
    <AppShell>
      {/* Greeting */}
      <section className="pt-6 pb-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {name ? `Hey, ${name}.` : "Hey."}
        </p>
        <h1 className="mt-2 font-display text-[44px] leading-[0.98] tracking-[-0.01em] font-normal">
          Make every bucket count.
        </h1>
      </section>

      {/* Resume card — only shown when there's a saved in-progress session */}
      {activeSession && (
        <div className="mt-4 relative">
          <button
            onClick={() => navigate({ to: activeSession.route as "/" })}
            className="w-full rounded-[22px] bg-primary p-4 shadow-[0_12px_30px_-14px_rgba(13,45,90,0.5)] flex items-center gap-3.5 text-left active:opacity-90 transition-opacity"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/[0.18]">
              <RotateCcw className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-white/70">
                RESUME
              </p>
              <p className="mt-0.5 text-[17px] font-semibold text-white leading-tight truncate">
                {activeSession.label}
              </p>
              <p className="text-[13px] text-white/60 mt-0.5">{activeSession.subtitle}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-white/70 shrink-0" />
          </button>
          {/* Dismiss button */}
          <button
            onClick={dismissResume}
            aria-label="Dismiss session"
            className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-foreground text-background flex items-center justify-center shadow-sm"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Quick stats strip */}
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {[
          { eyebrow: "This week", value: stats.sessions, sub: "sessions" },
          { eyebrow: "Balls", value: stats.balls, sub: "hit" },
          { eyebrow: "Streak", value: stats.streak, sub: "days" },
        ].map(({ eyebrow, value, sub }) => (
          <div
            key={eyebrow}
            className="rounded-[22px] border border-border bg-card p-3 text-center"
          >
            <Eyebrow>{eyebrow}</Eyebrow>
            <div className="mt-1">
              <StatNum value={value} size={32} />
            </div>
            <p className="mt-0.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {sub}
            </p>
          </div>
        ))}
      </div>

      {/* Train section */}
      <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
        Train
      </p>
      <div className="mt-3 space-y-2.5">
        <NavCard to="/round-warmup" title="Round Warm Up" subtitle="A timed pre-round checklist." Icon={Flame} />
        <NavCard to="/practice" title="Practice" subtitle="Generate a drill session tailored to your bucket and goal." Icon={Target} />
        <ProNavCard isPro={isPro} onLock={() => setProOpen(true)} to="/play" title="Practice Like You Play" subtitle="Random club, shape, and distance. Commit to every shot." Icon={Shuffle} />
        <NavCard to="/combine" title="Range Rat Combine" subtitle="33-shot benchmark. Track your progress across wedges, irons, and driver." Icon={Trophy} />
      </div>

      {/* Upgrade nudge — free users only */}
      {!isPro && (
        <button
          type="button"
          onClick={() => setProOpen(true)}
          className="mt-5 w-full flex items-center gap-3 rounded-[22px] border border-yellow-400/40 bg-yellow-400/8 px-4 py-3.5 text-left active:bg-yellow-400/15 transition-colors"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-yellow-400/20">
            <Zap className="h-4 w-4 text-yellow-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">Unlock Pro features</p>
            <p className="text-xs text-muted-foreground mt-0.5">Combine, Grid Game, yardages & more — from $4.99/mo.</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      )}

      {/* Compete section */}
      <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
        Compete
      </p>
      <div className="mt-3 space-y-2.5">
        <NavCard to="/games" title="Games" subtitle="Friendly bets and bragging rights." Icon={Flag} />
      </div>

      <ProModal
        open={proOpen}
        onClose={() => setProOpen(false)}
        reason="Practice Like You Play is a Pro feature. Upgrade to unlock it and the full Range Rat experience."
      />
    </AppShell>
  );
}

interface NavCardProps {
  to: string;
  title: string;
  subtitle: string;
  Icon: React.ComponentType<{ className?: string }>;
}

function NavCard({ to, title, subtitle, Icon }: NavCardProps) {
  return (
    <Link
      to={to as "/practice" | "/games" | "/play" | "/round-warmup" | "/profile"}
      className="group block rounded-[22px] border border-border bg-card p-3.5 flex items-center gap-3.5 transition active:scale-[0.99]"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-primary text-white">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="font-display text-[22px] leading-none">{title}</h2>
        <p className="mt-1 text-[15px] text-muted-foreground line-clamp-2">{subtitle}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
    </Link>
  );
}

function ProNavCard({ to, title, subtitle, Icon, isPro, onLock }: NavCardProps & { isPro: boolean; onLock: () => void }) {
  if (isPro) return <NavCard to={to} title={title} subtitle={subtitle} Icon={Icon} />;
  return (
    <button
      type="button"
      onClick={onLock}
      className="w-full rounded-[22px] border border-border bg-card p-3.5 flex items-center gap-3.5 text-left active:scale-[0.99] transition relative"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="font-display text-[22px] leading-none">{title}</h2>
        <p className="mt-1 text-[15px] text-muted-foreground line-clamp-2">{subtitle}</p>
      </div>
      <div className="flex items-center gap-1 rounded-full bg-yellow-400/15 border border-yellow-400/30 px-2 py-0.5 shrink-0">
        <Zap className="h-3 w-3 text-yellow-600" />
        <span className="text-[10px] font-bold text-yellow-600 uppercase tracking-wide">Pro</span>
      </div>
    </button>
  );
}
