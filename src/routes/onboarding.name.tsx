import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForceLightMode } from "@/hooks/useForceLightMode";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/onboarding/name")({
  component: OnboardingName,
});

function OnboardingName() {
  const navigate = useNavigate();
  useForceLightMode();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [hand, setHand] = useState<"right" | "left">("right");

  const handleContinue = async () => {
    if (!firstName.trim()) return;
    const { saveProfile } = await import("@/lib/db");
    await saveProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      handedness: hand === "right" ? "righty" : "lefty",
      createdDate: Date.now(),
    });
    navigate({ to: "/onboarding/bag" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-6">
      <div className="h-11" />

      {/* Step header */}
      <div className="flex items-center justify-between pt-6">
        <button onClick={() => navigate({ to: "/onboarding/welcome" })} className="text-muted-foreground">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Step 2 of 3</p>
        <div className="w-6" />
      </div>

      {/* Content */}
      <div className="mt-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Tell us</p>
        <h1 className="mt-2 font-display text-[38px] leading-[1.0] tracking-[-0.01em]">
          What should<br />we call you?
        </h1>
      </div>

      {/* Name inputs */}
      <div className="mt-8 space-y-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">First name</p>
          <input
            type="text"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            placeholder="First name"
            className="w-full bg-transparent border-0 border-b-2 border-primary outline-none font-display text-[40px] leading-none tracking-[-0.01em] pb-1.5 placeholder:text-muted-foreground/30"
            autoFocus
          />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">Last name</p>
          <input
            type="text"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            placeholder="Last name"
            className="w-full bg-transparent border-0 border-b-2 border-border outline-none font-display text-[40px] leading-none tracking-[-0.01em] pb-1.5 placeholder:text-muted-foreground/30"
          />
        </div>
        <p className="text-[12px] text-muted-foreground">Your first name is used in games. Both appear on your profile.</p>
      </div>

      {/* Handedness */}
      <div className="mt-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2.5">You play</p>
        <div className="grid grid-cols-2 gap-2.5">
          {(["right", "left"] as const).map(h => (
            <button
              key={h}
              onClick={() => setHand(h)}
              className={
                hand === h
                  ? "h-16 rounded-[14px] bg-primary text-white font-bold text-[14.5px] uppercase tracking-[0.06em]"
                  : "h-16 rounded-[14px] bg-card border border-border text-foreground font-bold text-[14.5px] uppercase tracking-[0.06em]"
              }
            >
              {h === "right" ? "Righty" : "Lefty"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      <div className="pb-10">
        <button
          onClick={handleContinue}
          disabled={!firstName.trim()}
          className="h-14 w-full rounded-[14px] bg-primary text-white font-bold text-[14px] uppercase tracking-[0.06em] disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
