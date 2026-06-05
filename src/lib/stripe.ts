import { loadStripe } from "@stripe/stripe-js";

export const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!
);

export const PRICES = {
  monthly: import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID,
  yearly: import.meta.env.VITE_STRIPE_YEARLY_PRICE_ID,
};

export async function startCheckout(
  priceId: string,
  userId: string,
  userEmail: string
) {
  const res = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priceId, userId, userEmail }),
  });

  const data = await res.json();
  if (data.url) {
    window.location.href = data.url;
  } else {
    throw new Error(data.error || "Failed to start checkout");
  }
}
