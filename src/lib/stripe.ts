import { loadStripe } from "@stripe/stripe-js";
import { supabase } from "./supabase";

export const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!
);

export const PRICES = {
  monthly: import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID,
  yearly: import.meta.env.VITE_STRIPE_YEARLY_PRICE_ID,
};

export async function startCheckout(priceId: string) {
  if (!priceId) throw new Error("Price not configured. Contact support.");

  // The server derives the user from this token, we never send a raw userId.
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) throw new Error("Please sign in again to upgrade.");

  const res = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ priceId }),
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

export async function openCustomerPortal() {
  // The server derives the user from this token, we never send a raw userId.
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) throw new Error("Please sign in again to manage your subscription.");

  const res = await fetch("/api/create-portal-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const text = await res.text();
  if (!text) throw new Error("No response from server. Please try again.");

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    console.error("Portal response (not JSON):", res.status, text.slice(0, 200));
    throw new Error(`Server error (${res.status}). Please try again.`);
  }

  if (!res.ok) {
    throw new Error(data.error || `Server error (${res.status}).`);
  }

  if (data.url) {
    window.location.href = data.url;
  } else {
    throw new Error("Could not open the subscription portal.");
  }
}
