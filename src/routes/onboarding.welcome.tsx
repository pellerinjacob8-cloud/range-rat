import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/onboarding/welcome")({
  component: OnboardingWelcome,
});

function OnboardingWelcome() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex flex-col px-6">
      <div className="h-11" /> {/* status bar spacer */}

      {/* Content fills the middle */}
      <div className="flex-1 flex flex-col justify-center">
        {/* Logo */}
        <img src="/brand/monogram-rr-navy.png" alt="Range Rat" className="h-16 w-16 object-contain dark:hidden" />
        <img src="/brand/monogram-rr-white.png" alt="Range Rat" className="h-16 w-16 object-contain hidden dark:block" />

        {/* Hero heading */}
        <h1 className="mt-8 font-display text-[56px] leading-[0.95] tracking-[-0.015em]">
          Grind.<br />Practice.<br /><em className="italic">Improve.</em>
        </h1>

        {/* Lede */}
        <p className="mt-5 text-[15px] text-muted-foreground leading-[1.45]">
          Range Rat builds focused practice sessions, runs games with your buddies, and tracks every bucket you hit.
        </p>
      </div>

      {/* Bottom actions */}
      <div className="pb-10">
        {/* Pagination dots */}
        <div className="flex gap-1.5 justify-center mb-5">
          <span className="h-1.5 w-4 rounded-full bg-primary" />
          <span className="h-1.5 w-1.5 rounded-full bg-border" />
          <span className="h-1.5 w-1.5 rounded-full bg-border" />
        </div>

        <button
          onClick={() => navigate({ to: "/onboarding/name" })}
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
