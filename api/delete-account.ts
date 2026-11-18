import type { IncomingMessage, ServerResponse } from "http";
import { ensureSentry, Sentry } from "./_sentry.js";
import type Stripe from "stripe";
import { getStripe, getSupabaseAdmin, missingEnv } from "./_config.js";

// Tables keyed by user_id that hold this user's data. profiles is keyed by id
// and handled separately. Deleting rows explicitly (rather than relying on a
// cascade) keeps cleanup correct regardless of the FK setup.
const USER_TABLES = ["sessions", "bag", "favorites", "handicap_history", "yardages", "combine_attempts"] as const;

// Subscription statuses that are already over and need no cancel call.
const ENDED_STATUSES: Stripe.Subscription.Status[] = ["canceled", "incomplete_expired"];

// Cancel every live Stripe subscription for this email, immediately. Checkout
// passes customer_email, so Stripe can create a new customer per checkout and
// one email may map to several customers: check all of them. Throws on any
// Stripe failure so the caller keeps the account and the user can retry.
async function cancelStripeSubscriptions(stripe: Stripe, email: string): Promise<void> {
  for await (const customer of stripe.customers.list({ email, limit: 100 })) {
    for await (const sub of stripe.subscriptions.list({ customer: customer.id, status: "all", limit: 100 })) {
      if (ENDED_STATUSES.includes(sub.status)) continue;
      await stripe.subscriptions.cancel(sub.id);
    }
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  ensureSentry();
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.writeHead(405);
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const missing = missingEnv();
  if (missing.length) {
    console.error("Delete account misconfigured, missing env:", missing.join(", "));
    res.writeHead(503);
    res.end(JSON.stringify({ error: "Server configuration error" }));
    return;
  }

  try {
    const supabase = getSupabaseAdmin();

    // Identity comes only from the verified JWT, never the request body.
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: "Not authenticated" }));
      return;
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: "Invalid session" }));
      return;
    }

    const userId = user.id;

    // 1. Stop billing first. If this fails, nothing is deleted yet and the
    //    user can retry. Accounts with no Stripe customer skip straight through.
    if (user.email) {
      await cancelStripeSubscriptions(getStripe(), user.email);
    }

    // 2. Remove the user's data rows.
    for (const table of USER_TABLES) {
      const { error } = await supabase.from(table).delete().eq("user_id", userId);
      // Tolerate tables whose migration hasn't run yet (undefined_table);
      // any other failure must still block the auth-user deletion below.
      if (error && error.code !== "42P01" && !/does not exist/i.test(error.message)) {
        throw new Error(`Failed to clear ${table}: ${error.message}`);
      }
    }
    const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId);
    if (profileError) throw new Error(`Failed to clear profile: ${profileError.message}`);

    // 3. Delete the auth user last, so a failure above leaves the account intact.
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) throw new Error(deleteError.message);

    res.writeHead(200);
    res.end(JSON.stringify({ deleted: true }));
  } catch (err: any) {
    Sentry.captureException(err);
    console.error("Delete account error:", err);
    res.writeHead(500);
    res.end(JSON.stringify({ error: "Could not delete account. Please try again." }));
  }
}
