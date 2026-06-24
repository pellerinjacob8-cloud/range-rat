import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Flag, LineChart, Ruler, Shuffle, Sparkles, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pro-welcome")({
  component: ProWelcomePage,
});

const SLIDES = [
  {
    icon: Zap,
    color: "bg-gold-bg border border-gold-border",
    iconColor: "text-gold",
    title: "Welcome to\nRange Rat Pro.",
    body: "You just unlocked the full app. Here is everything that comes with Pro.",
    cta: null,
  },
  {
    icon: Shuffle,
    color: "bg-indigo-500/10",
    iconColor: "text-indigo-500",
    title: "Practice Like\nYou Play.",
    body: "A new club, shape, and distance on every shot, just like a real round. Train the focus that holds up under pressure.",
    cta: "Play",
  },
  {
    icon: Trophy,
    color: "bg-primary/10",
    iconColor: "text-primary",
    title: "The\nCombine.",
    body: "33 standardized shots across wedges, irons, and driver. One score to beat, tracked every time you play it.",
    cta: "Combine",
  },
  {
    icon: LineChart,
    color: "bg-rose-500/10",
    iconColor: "text-rose-500",
    title: "Stats &\nHandicap.",
    body: "Log every round and track GIR, fairways, putts, and up and downs. Watch your handicap trend over time.",
    cta: "Stats",
  },
  {
    icon: Flag,
    color: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    title: "Pro\nGames.",
    body: "Grid Game and Fairway Game turn any bucket of balls into a competition worth winning.",
    cta: "Games",
  },
  {
    icon: Ruler,
    color: "bg-blue-500/10",
    iconColor: "text-blue-500",
    title: "Know Your\nNumbers.",
    body: "Log carry distances for every club at half, three-quarter, and full swing. Stop guessing on approach.",
    cta: "Yardages",
  },
  {
    icon: Sparkles,
    color: "bg-purple-500/10",
    iconColor: "text-purple-500",
    title: "Build\nAnything.",
    body: "Build your own drills, shape any session to your goals, and save as many as you want. Your full history stays with you.",
    cta: null,
  },
];

const CTA_ROUTES: Record<string, { to: string; search?: Record<string, string> }> = {
  "Play": { to: "/play" },
  "Combine": { to: "/combine" },
  "Stats": { to: "/profile", search: { view: "stats" } },
  "Games": { to: "/games" },
  "Yardages": { to: "/profile", search: { view: "yardage" } },
};

function ProWelcomePage() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];
  const Icon = slide.icon;

  const next = () => {
    if (isLast) {
      navigate({ to: "/" });
    } else {
      setIndex(i => i + 1);
    }
  };

  const skip = () => navigate({ to: "/" });

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 pb-10 pt-[env(safe-area-inset-top)]">
      {/* Skip */}
      <div className="flex justify-end pt-4 pb-2">
        {!isLast && (
          <button
            type="button"
            onClick={skip}
            className="text-[13px] font-semibold text-muted-foreground"
          >
            Skip
          </button>
        )}
      </div>

      {/* Slide content, keyed on index so each slide re-animates in */}
      <div
        key={index}
        className="flex-1 flex flex-col items-center justify-center text-center gap-6 max-w-sm mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-300"
      >
        <div className={cn("w-24 h-24 rounded-[28px] flex items-center justify-center", slide.color)}>
          <Icon className={cn("w-12 h-12", slide.iconColor)} />
        </div>

        <div className="space-y-3">
          <h1 className="font-display text-[44px] leading-[0.95] tracking-[-0.015em] whitespace-pre-line">
            {slide.title}
          </h1>
          <p className="text-[16px] text-muted-foreground leading-relaxed">
            {slide.body}
          </p>
        </div>

        {slide.cta && (
          <button
            type="button"
            onClick={() => {
              const route = CTA_ROUTES[slide.cta!];
              navigate({ to: route.to as "/", search: route.search as any });
            }}
            className="text-[13px] font-bold text-primary underline underline-offset-4"
          >
            Try {slide.cta} →
          </button>
        )}
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={cn(
              "rounded-full transition-all duration-200",
              i === index
                ? "w-6 h-2 bg-primary"
                : "w-2 h-2 bg-border"
            )}
          />
        ))}
      </div>

      {/* CTA button */}
      <button
        type="button"
        onClick={next}
        className="h-14 w-full max-w-sm mx-auto rounded-[14px] bg-primary text-primary-foreground font-bold text-[14px] uppercase tracking-[0.06em] active:opacity-90 transition-opacity"
      >
        {isLast ? "Start training" : "Next"}
      </button>
    </div>
  );
}
