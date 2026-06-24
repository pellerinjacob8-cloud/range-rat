import type { IncomingMessage, ServerResponse } from "http";
import { ensureSentry, Sentry } from "./_sentry.js";
import { getStripe, getSupabaseAdmin, missingEnv } from "./_config.js";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  ensureSentry();
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.writeHead(405);
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  // Fail loud and clear if the deployment is missing a required secret, rather
  // than crashing at module load with an opaque FUNCTION_INVOCATION_FAILED.
  const missing = missingEnv();
  if (missing.length) {
    console.error("Portal misconfigured, missing env:", missing.join(", "));
    res.writeHead(503);
    res.end(JSON.stringify({ error: "Server configuration error" }));
    return;
  }

  try {
    const stripe = getStripe();
    const supabase = getSupabaseAdmin();

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
      return_url: `${process.env.VITE_APP_URL || "https://rangeratapp.com"}/profile`,
    });

    res.writeHead(200);
    res.end(JSON.stringify({ url: session.url }));
  } catch (err: any) {
    Sentry.captureException(err);
    console.error("Portal error:", err);
    res.writeHead(500);
    res.end(JSON.stringify({ error: "Something went wrong" }));
  }
}
