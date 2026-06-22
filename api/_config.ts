import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-side env vars the payment endpoints need. A missing one used to crash
// the whole function at module load (opaque FUNCTION_INVOCATION_FAILED); the
// handlers now call missingEnv() first and return a named error instead.
const REQUIRED_ENV = [
  "STRIPE_SECRET_KEY",
  "VITE_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export function missingEnv(): string[] {
  return REQUIRED_ENV.filter((k) => !process.env[k] || process.env[k]!.trim() === "");
}

// Clients are created lazily so importing this module can never throw, even
// when an env var is absent. Cached across warm invocations.
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-05-27.dahlia" as any,
    });
  }
  return _stripe;
}

let _supabase: SupabaseClient | null = null;
export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}
