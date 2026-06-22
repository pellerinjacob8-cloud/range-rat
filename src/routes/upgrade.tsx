import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ChevronLeft, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { startCheckout, PRICES } from "@/lib/stripe";

export const Route = createFileRoute("/upgrade")({
  component: UpgradePage,
});

const PRO_FEATURES = [
  "Practice Like You Play mode",
  "Range Rat Combine benchmark and history",
  "On-course stats and handicap tracking",
  "Grid Game and Fairway Game",
  "Club yardage tracking",
  "Custom sessions and unlimited saves",
  "Full bag management",
  "Priority support",
];

function UpgradePage() {
  const navigate = useNavigate();
  const { user, isPro } = useAuth();
  const [plan, setPlan] = useState<"monthly" | "yearly">("yearly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    if (!user) { navigate({ to: "/login" }); return; }
    setLoading(true);
    setError(null);
    try {
      await startCheckout(plan === "monthly" ? PRICES.monthly : PRICES.yearly);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (isPro) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-gold-bg border border-gold-border flex items-center justify-center mb-5">
          <Zap className="h-8 w-8 text-gold" />
        </div>
        <h1 className="font-display text-[34px] leading-tight mb-3">You're Pro!</h1>
        <p className="text-[15px] text-muted-foreground max-w-xs mb-8">
          You have full access to all Range Rat Pro features.
        </p>
        <button
          onClick={() => navigate({ to: "/" })}
          className="h-14 w-full max-w-xs rounded-[14px] bg-primary text-white font-bold text-[14px] uppercase tracking-[0.06em]"
        >
          Go to App
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col px-6">
      <div className="h-11" />

      {/* Header */}
      <div className="pt-6 flex items-center">
        <button
          onClick={() => navigate({ to: "/" })}
          className="text-muted-foreground -ml-1 p-1"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      </div>

      {/* Hero */}
      <div className="mt-6 text-center">
        <div className="inline-flex items-center gap-1.5 bg-gold-bg border border-gold-border text-gold rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] mb-4">
          <Zap className="h-3 w-3" />
          Range Rat Pro
        </div>
        <h1 className="font-display text-[42px] leading-[0.95] tracking-[-0.015em]">
          Take your game<br />to the next level.
        </h1>
        <div className="mx-auto mt-4 h-[2px] w-11 rounded-full bg-gold-line opacity-80" />
        <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed max-w-xs mx-auto">
          Unlock every feature, track your progress, and train like a serious golfer.
        </p>
      </div>

      {/* Plan toggle */}
      <div className="mt-8 grid grid-cols-2 gap-2.5">
        <button
          onClick={() => setPlan("monthly")}
          className={`rounded-[16px] border p-4 text-left transition-all ${
            plan === "monthly"
              ? "border-primary bg-primary/5"
              : "border-border bg-card"
          }`}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-1">Monthly</p>
          <p className="font-display text-[28px] leading-none">$4.99</p>
          <p className="text-[12px] text-muted-foreground mt-1">per month</p>
        </button>

        <button
          onClick={() => setPlan("yearly")}
          className={`rounded-[16px] border p-4 text-left transition-all relative ${
            plan === "yearly"
              ? "border-primary bg-primary/5"
              : "border-border bg-card"
          }`}
        >
          <div className="absolute -top-2.5 right-3 bg-gold text-white text-[10px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full">
            Save 17%
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-1">Yearly</p>
          <p className="font-display text-[28px] leading-none">$49.99</p>
          <p className="text-[12px] text-muted-foreground mt-1">per year</p>
        </button>
      </div>

      {/* Features */}
      <div className="mt-6 space-y-3">
        {PRO_FEATURES.map(f => (
          <div key={f} className="flex items-center gap-3">
            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Check className="h-3 w-3 text-primary" />
            </div>
            <p className="text-[14px] text-foreground">{f}</p>
          </div>
        ))}
      </div>

      <div className="flex-1" />

      {/* CTA */}
      <div className="pb-10 pt-6">
        {error && (
          <div className="mb-4 rounded-[12px] bg-destructive/10 border border-destructive/20 px-4 py-3">
            <p className="text-[13px] font-semibold text-destructive">{error}</p>
          </div>
        )}

        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="h-14 w-full rounded-[14px] bg-primary text-white font-bold text-[14px] uppercase tracking-[0.06em] disabled:opacity-40 active:opacity-90 transition-opacity"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Loading…
            </span>
          ) : `Start 7-Day Free Trial`}
        </button>

        <p className="mt-3 text-center text-[12px] text-muted-foreground">
          7 days free, then {plan === "monthly" ? "$4.99/mo" : "$49.99/yr"}. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
