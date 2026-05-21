import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Zap, Briefcase } from "lucide-react";

export const Route = createFileRoute("/onboarding/bag")({
  component: OnboardingBag,
});

function OnboardingBag() {
  const navigate = useNavigate();

  const handleFinish = () => {
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-6">
      <div className="h-11" />

      <div className="flex items-center justify-between pt-6">
        <button onClick={() => navigate({ to: "/onboarding/name" })} className="text-muted-foreground">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Step 3 of 3</p>
        <div className="w-6" />
      </div>

      <div className="mt-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Almost done</p>
        <h1 className="mt-2 font-display text-[38px] leading-[1.0] tracking-[-0.01em]">
          Set up your bag <em className="italic">later?</em>
        </h1>
        <p className="mt-3 text-[13.5px] text-muted-foreground leading-[1.45]">
          Adding clubs and yardages unlocks per-club drills. You can do it now or skip to your first session.
        </p>
      </div>

      {/* Two option cards */}
      <div className="mt-8 flex flex-col gap-3">
        <button
          onClick={() => navigate({ to: "/profile" })}
          className="rounded-[22px] border border-border bg-card p-4 text-left flex items-center gap-4"
        >
          <div className="h-12 w-12 rounded-[14px] bg-primary/[0.08] text-primary flex items-center justify-center flex-shrink-0">
            <Briefcase className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[15px]">Add my bag</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">2 min · 12 clubs</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </button>

        <button
          onClick={() => navigate({ to: "/practice" })}
          className="rounded-[22px] border border-border bg-card p-4 text-left flex items-center gap-4"
        >
          <div className="h-12 w-12 rounded-[14px] bg-primary/[0.08] text-primary flex items-center justify-center flex-shrink-0">
            <Zap className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[15px]">Jump to my first session</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">Build it without your bag</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </button>
      </div>

      <div className="flex-1" />

      <div className="pb-10">
        <button
          onClick={handleFinish}
          className="h-14 w-full rounded-[14px] bg-primary text-white font-bold text-[14px] uppercase tracking-[0.06em]"
        >
          Finish
        </button>
      </div>
    </div>
  );
}
