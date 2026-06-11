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

    if (error) {
      console.error(`[Webhook] Supabase update failed for user ${userId}: ${error.message}`);
      return false;
    }

    console.log(`[Webhook] User ${userId} Pro status set to ${isPro}`);
    return true;
  };

  const isSubscriptionActive = (status: string) => {
    return status === "active" || status === "trialing";
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.CheckoutSession;
      const userId = session.metadata?.userId;

      if (!userId) {
        console.error("[Webhook] checkout.session.completed: no userId in metadata");
        break;
      }

      // Verify subscription was created before marking Pro
      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        if (isSubscriptionActive(subscription.status)) {
          await setProStatus(userId, true);
        } else {
          console.warn(`[Webhook] Subscription ${session.subscription} status is ${subscription.status}, not marking Pro`);
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      if (userId) await setProStatus(userId, false);
      break;
    }

    case "customer.subscription.paused": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      if (userId) await setProStatus(userId, false);
      break;
    }

    case "customer.subscription.resumed":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;

      if (!userId) {
        console.error(`[Webhook] subscription event: no userId in metadata`);
        break;
      }

      // Mark Pro if active or trialing, otherwise not Pro
      const shouldBePro = isSubscriptionActive(subscription.status);
      await setProStatus(userId, shouldBePro);
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as any;
      const userId = invoice.subscription_details?.metadata?.userId || invoice.metadata?.userId;

      if (!userId) {
        console.warn("[Webhook] invoice.payment_succeeded: no userId found");
        break;
      }

      // Verify subscription is active before marking Pro
      if (invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        if (isSubscriptionActive(subscription.status)) {
          await setProStatus(userId, true);
        } else {
          console.warn(`[Webhook] Invoice subscription ${invoice.subscription} status is ${subscription.status}`);
        }
      }
      break;
    }

    default:
      console.log(`[Webhook] Unhandled event type: ${event.type}`);
  }

  res.writeHead(200);
  res.end(JSON.stringify({ received: true }));
}
