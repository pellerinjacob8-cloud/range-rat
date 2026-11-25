import type Stripe from "stripe";

// Founding member offer: a Stripe coupon (STRIPE_FOUNDER_COUPON_ID) applied
// automatically to monthly checkout. Stripe's redemption limit is the spot
// count, so the offer closes by itself once the coupon is used up.

export interface FoundingOffer {
  open: boolean;
  couponId?: string;
  priceCents?: number;   // monthly price after the discount
  months?: number | null; // null means the discount never ends
  spotsLeft?: number | null;
}

export async function getFoundingOffer(stripe: Stripe): Promise<FoundingOffer> {
  const couponId = process.env.STRIPE_FOUNDER_COUPON_ID?.trim();
  const monthlyPriceId = process.env.VITE_STRIPE_MONTHLY_PRICE_ID;
  if (!couponId || !monthlyPriceId) return { open: false };

  try {
    const [coupon, price] = await Promise.all([
      stripe.coupons.retrieve(couponId),
      stripe.prices.retrieve(monthlyPriceId),
    ]);
    const base = price.unit_amount ?? 0;
    if (!coupon.valid || !base) return { open: false };

    const discounted = coupon.amount_off
      ? base - coupon.amount_off
      : coupon.percent_off
        ? Math.round(base * (1 - coupon.percent_off / 100))
        : base;
    if (discounted <= 0 || discounted >= base) return { open: false };

    const months = coupon.duration === "forever"
      ? null
      : coupon.duration === "once" ? 1 : coupon.duration_in_months ?? 1;
    const spotsLeft = coupon.max_redemptions
      ? Math.max(0, coupon.max_redemptions - coupon.times_redeemed)
      : null;
    if (spotsLeft === 0) return { open: false };

    return { open: true, couponId, priceCents: discounted, months, spotsLeft };
  } catch (err) {
    console.error("Founding offer lookup failed:", err);
    return { open: false };
  }
}
