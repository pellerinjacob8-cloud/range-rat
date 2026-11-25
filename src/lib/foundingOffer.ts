import { useEffect, useState } from "react";

// Founding member offer, read from /api/founding-offer (which reads the Stripe
// coupon). Closed, missing, or failed all mean: show normal pricing.
export interface FoundingOffer {
  open: boolean;
  priceCents?: number;
  months?: number | null;
  spotsLeft?: number | null;
}

let pending: Promise<FoundingOffer> | null = null;

function loadFoundingOffer(): Promise<FoundingOffer> {
  if (!pending) {
    pending = fetch("/api/founding-offer")
      .then((r) => (r.ok ? r.json() : { open: false }))
      .catch(() => ({ open: false }));
  }
  return pending;
}

export function useFoundingOffer(): FoundingOffer | null {
  const [offer, setOffer] = useState<FoundingOffer | null>(null);
  useEffect(() => {
    let live = true;
    loadFoundingOffer().then((o) => { if (live) setOffer(o.open && o.priceCents ? o : null); });
    return () => { live = false; };
  }, []);
  return offer;
}

export function foundingPrice(o: FoundingOffer): string {
  return `$${((o.priceCents ?? 0) / 100).toFixed(2)}`;
}

// "for your first year", "for your first 6 months", "for as long as you stay"
export function foundingTerm(o: FoundingOffer): string {
  if (o.months == null) return "for as long as you stay";
  if (o.months === 12) return "for your first year";
  if (o.months === 1) return "for your first month";
  return `for your first ${o.months} months`;
}

export function foundingSpots(o: FoundingOffer): string | null {
  if (o.spotsLeft == null) return null;
  return o.spotsLeft === 1 ? "1 spot left" : `${o.spotsLeft} spots left`;
}
