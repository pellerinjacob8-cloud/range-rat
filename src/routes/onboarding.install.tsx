import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Share, SquarePlus, EllipsisVertical } from "lucide-react";
import { useForceLightMode } from "@/hooks/useForceLightMode";
import { takeLandingPath } from "@/lib/combineShare";
import { isAndroidDevice, markHomeScreenInstalled } from "@/lib/pwa";

export const Route = createFileRoute("/onboarding/install")({
  component: OnboardingInstall,
});

function StepNum({ n }: { n: number }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[13px] font-bold text-primary">
      {n}
    </span>
  );
}

// Last onboarding step on phones: most new users sign up away from the range,
// so a home screen icon is what gets them back when they're actually there.
function OnboardingInstall() {
  useForceLightMode();
  const [android] = useState(() => isAndroidDevice());

  const finish = (installed: boolean) => {
    if (installed) markHomeScreenInstalled();
    try {
      localStorage.setItem("rangeRat_onboarding_complete", "true");
    } catch {}
    // New users from a shared link go straight to the Combine or that session
    window.location.href = takeLandingPath();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-6">
      <div className="h-11" />

      <div className="mt-[52px]">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">One more thing</p>
        <h1 className="mt-2 font-display text-[38px] leading-[1.0] tracking-[-0.01em]">
          Put Range Rat<br />on your home screen
        </h1>
        <p className="mt-3 text-[15px] text-muted-foreground leading-[1.45]">
          So it's one tap away next time you're at the range.
        </p>
      </div>

      <ol className="mt-8 space-y-4">
        {android ? (
          <>
            <li className="flex items-center gap-3 text-[15px]">
              <StepNum n={1} />
              <span className="flex items-center gap-1.5">
                Tap the <EllipsisVertical className="h-4 w-4 text-primary" /> menu in your browser.
              </span>
            </li>
            <li className="flex items-center gap-3 text-[15px]">
              <StepNum n={2} />
              <span>Choose <span className="font-semibold">Add to Home screen</span>.</span>
            </li>
            <li className="flex items-center gap-3 text-[15px]">
              <StepNum n={3} />
              <span>Tap <span className="font-semibold">Add</span> or <span className="font-semibold">Install</span>.</span>
            </li>
          </>
        ) : (
          <>
            <li className="flex items-center gap-3 text-[15px]">
              <StepNum n={1} />
              <span className="flex items-center gap-1.5">
                Tap the <Share className="h-4 w-4 text-primary" /> Share icon in your browser.
              </span>
            </li>
            <li className="flex items-center gap-3 text-[15px]">
              <StepNum n={2} />
              <span className="flex items-center gap-1.5">
                Choose <span className="font-semibold">Add to Home Screen</span> <SquarePlus className="h-4 w-4 text-primary" />.
              </span>
            </li>
            <li className="flex items-center gap-3 text-[15px]">
              <StepNum n={3} />
              <span>Tap <span className="font-semibold">Add</span>.</span>
            </li>
          </>
        )}
      </ol>

      <div className="flex-1" />

      <div className="pb-10 pt-6">
        <button
          onClick={() => finish(true)}
          className="h-14 w-full rounded-[14px] bg-primary text-white font-bold text-[14px] uppercase tracking-[0.06em] active:opacity-90 transition-opacity"
        >
          I've added it
        </button>
        <button
          onClick={() => finish(false)}
          className="mt-3 w-full py-2 text-[13px] text-muted-foreground font-medium"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
