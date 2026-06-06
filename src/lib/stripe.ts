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
  if (!priceId) throw new Error("Price not configured. Contact support.");

  const res = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priceId, userId, userEmail }),
  });

  const text = await res.text();
  if (!text) throw new Error("No response from server. Please try again.");

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Unexpected server error. Please try again.");
  }

  if (data.url) {
    window.location.href = data.url;
  } else {
    throw new Error(data.error || "Failed to start checkout");
  }
}
