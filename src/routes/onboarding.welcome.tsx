import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForceLightMode } from "@/hooks/useForceLightMode";

export const Route = createFileRoute("/onboarding/welcome")({
  component: OnboardingWelcome,
});

function OnboardingWelcome() {
  const navigate = useNavigate();
  useForceLightMode();
  return (
    <div className="min-h-screen bg-background flex flex-col px-6 pt-[env(safe-area-inset-top)]">
      <div className="h-14" />

      <div className="flex-1 flex flex-col justify-center">
        <img
          src="/brand/logo-navy-trim.png"
          alt="Range Rat"
          className="h-14 w-auto self-start mb-8"
        />

        <h1 className="font-display text-[56px] leading-[0.95] tracking-[-0.015em]">
          Grind.<br />Practice.<br /><em className="italic">Improve.</em>
        </h1>

        <p className="mt-5 text-[15px] text-muted-foreground leading-[1.45] max-w-[300px]">
          Range Rat builds focused practice sessions, runs games with your buddies, and tracks every bucket you hit.
        </p>
      </div>

      <div className="pb-10">
        <div className="flex gap-1.5 justify-center mb-5">
          <span className="h-1.5 w-4 rounded-full bg-primary" />
          <span className="h-1.5 w-1.5 rounded-full bg-border" />
          <span className="h-1.5 w-1.5 rounded-full bg-border" />
        </div>

        <button
          onClick={() => navigate({ to: "/onboarding/signup" })}
          className="h-14 w-full rounded-[14px] bg-primary text-white font-bold text-[14px] uppercase tracking-[0.06em]"
        >
          Get Started
        </button>

        <p className="mt-3 text-center text-[12.5px] text-muted-foreground">
          I have an account ·{" "}
          <button onClick={() => navigate({ to: "/login" })} className="text-primary font-semibold">Sign in</button>
        </p>
      </div>
    </div>
  );
}
