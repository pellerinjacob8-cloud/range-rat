import { useState } from "react";
import { Check, X, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "@tanstack/react-router";

const PERKS = [
  "Practice Like You Play mode",
  "Range Rat Combine benchmark and history",
  "On-course stats and handicap tracking",
  "Grid Game and Fairway Game",
  "Custom sessions and unlimited saves",
];

interface ProModalProps {
  open: boolean;
  onClose: () => void;
  reason?: string;
}

export function ProModal({ open, onClose, reason }: ProModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!open) return null;

  const handleUpgrade = () => {
    if (!user) { navigate({ to: "/login" }); return; }
    navigate({ to: "/upgrade" });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-[430px] rounded-[28px] bg-background p-6 shadow-2xl">
        {/* Top row */}
        <div className="flex items-start justify-between mb-5">
          <div className="w-14 h-14 rounded-[18px] bg-gold-bg border border-gold-border flex items-center justify-center">
            <Zap className="h-7 w-7 text-gold" />
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted-foreground p-2 -mr-2 -mt-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Label */}
        <div className="inline-flex items-center gap-1.5 bg-gold-bg border border-gold-border text-gold rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] mb-3">
          <Zap className="h-3 w-3" />
          Range Rat Pro
        </div>

        {/* Heading */}
        <h2 className="font-display text-[34px] leading-[0.95] tracking-[-0.015em] mb-2">
          Unlock the<br />full game.
        </h2>

        {/* Reason */}
        <p className="text-[14px] text-muted-foreground mb-5 leading-relaxed">
          {reason ?? "Upgrade to Pro for unlimited saves and every feature."}
        </p>

        {/* Perks */}
        <div className="rounded-[16px] border border-border bg-muted/40 px-4 py-3.5 space-y-2.5 mb-5">
          {PERKS.map((perk) => (
            <div key={perk} className="flex items-center gap-2.5">
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Check className="h-3 w-3 text-primary" />
              </div>
              <p className="text-[13px] font-semibold">{perk}</p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleUpgrade}
          className="h-14 w-full rounded-[14px] bg-primary text-primary-foreground font-bold text-[14px] uppercase tracking-[0.06em] active:opacity-90 transition-opacity"
        >
          Upgrade to Pro
        </button>

        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          $49.99/yr <span className="font-semibold text-gold">(save 17%)</span> or $4.99/mo. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
