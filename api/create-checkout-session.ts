import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import type { IncomingMessage, ServerResponse } from "http";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-05-27.dahlia" as any,
});

// Server-side Supabase client used only to verify the caller's access token.
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Only these prices may ever be purchased. A caller cannot pass an arbitrary
// price ID from your Stripe account.
const ALLOWED_PRICE_IDS = [
  process.env.VITE_STRIPE_MONTHLY_PRICE_ID,
  process.env.VITE_STRIPE_YEARLY_PRICE_ID,
].filter(Boolean) as string[];

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk.toString(); });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.writeHead(405);
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  try {
    // 1. Authenticate the caller from their Supabase JWT. We never trust a
    //    userId sent in the request body.
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

    // 2. Validate the requested price against the allowlist.
    const raw = await readBody(req);
    const { priceId } = JSON.parse(raw || "{}");

    if (!priceId || !ALLOWED_PRICE_IDS.includes(priceId)) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "Invalid plan" }));
      return;
    }

    // 3. Identity comes from the verified token, not the client.
    const userId = user.id;
    const userEmail = user.email;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: { userId },
      },
      metadata: { userId },
      customer_email: userEmail,
      success_url: `${process.env.VITE_APP_URL || "https://range-rat.vercel.app"}/pro-welcome`,
      cancel_url: `${process.env.VITE_APP_URL || "https://range-rat.vercel.app"}/upgrade`,
    });

    res.writeHead(200);
    res.end(JSON.stringify({ url: session.url }));
  } catch (err: any) {
    console.error("Checkout error:", err);
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message ?? "Internal server error" }));
  }
}
