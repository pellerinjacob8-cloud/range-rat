import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import type { IncomingMessage, ServerResponse } from "http";
import { ensureSentry, Sentry } from "./_sentry";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-05-27.dahlia" as any,
});

// Server-side Supabase client used only to verify the caller's access token.
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  ensureSentry();
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.writeHead(405);
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  try {
    // Authenticate the caller from their Supabase JWT.
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: "Not authenticated" }));
      return;
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user || !user.email) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: "Invalid session" }));
      return;
    }

    // Find the Stripe customer created at checkout for this email.
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customer = customers.data[0];
    if (!customer) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "No subscription found for this account." }));
      return;
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${process.env.VITE_APP_URL || "https://range-rat.vercel.app"}/profile`,
    });

    res.writeHead(200);
    res.end(JSON.stringify({ url: session.url }));
  } catch (err: any) {
    Sentry.captureException(err);
    console.error("Portal error:", err);
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message ?? "Internal server error" }));
  }
}
