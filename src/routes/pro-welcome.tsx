import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BarChart2, Grid3x3, Ruler, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pro-welcome")({
  component: ProWelcomePage,
});

const SLIDES = [
  {
    icon: Zap,
    color: "bg-yellow-400/15",
    iconColor: "text-yellow-500",
    title: "Welcome to\nRange Rat Pro.",
    body: "You've unlocked every feature. Here's what's waiting for you.",
    cta: null,
  },
  {
    icon: Trophy,
    color: "bg-primary/10",
    iconColor: "text-primary",
    title: "Range Rat\nCombine.",
    body: "33 standardized shots across wedges, irons, and driver. Benchmark your game and track your progress over time.",
    cta: "Combine",
  },
  {
    icon: Grid3x3,
    color: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    title: "Grid Game.",
    body: "Call your square on a 3x3 grid. RAT or RANGE. Don't get spelled out. Best played with a friend.",
    cta: "Grid Game",
  },
  {
    icon: Ruler,
    color: "bg-blue-500/10",
    iconColor: "text-blue-500",
    title: "Yardage\nTracking.",
    body: "Log your carry distances for every club — half swing, three-quarter, and full. Know your numbers.",
    cta: "Yardages",
  },
  {
    icon: BarChart2,
    color: "bg-purple-500/10",
    iconColor: "text-purple-500",
    title: "Unlimited\nSaves.",
    body: "Save as many practice sessions and custom drills as you want. Your whole range history, always there.",
    cta: null,
  },
];

const CTA_ROUTES: Record<string, string> = {
  "Combine": "/combine",
  "Grid Game": "/games/grid-game",
  "Yardages": "/profile",
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

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 max-w-sm mx-auto w-full">
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
            onClick={() => navigate({ to: CTA_ROUTES[slide.cta!] as "/" })}
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
        className="h-14 w-full max-w-sm mx-auto rounded-[14px] bg-yellow-400 font-bold text-[14px] uppercase tracking-[0.06em] text-black active:opacity-90 transition-opacity"
      >
        {isLast ? "Start training" : "Next"}
      </button>
    </div>
  );
}
