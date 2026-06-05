import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import type { IncomingMessage, ServerResponse } from "http";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-05-27.dahlia" as any,
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getRawBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    res.writeHead(405);
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  const rawBody = await getRawBody(req);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    res.writeHead(400);
    res.end(JSON.stringify({ error: `Webhook Error: ${err.message}` }));
    return;
  }

  const setProStatus = async (userId: string, isPro: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_pro: isPro })
      .eq("id", userId);
    if (error) console.error("Supabase update error:", error);
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.CheckoutSession;
      const userId = session.metadata?.userId;
      if (userId) await setProStatus(userId, true);
      break;
    }
    case "customer.subscription.deleted":
    case "customer.subscription.paused": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      if (userId) await setProStatus(userId, false);
      break;
    }
    case "customer.subscription.resumed":
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as any;
      const userId = invoice.subscription_details?.metadata?.userId
        || invoice.metadata?.userId;
      if (userId) await setProStatus(userId, true);
      break;
    }
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.writeHead(200);
  res.end(JSON.stringify({ received: true }));
}
