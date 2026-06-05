import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-05-27.dahlia" as any,
});

// Use service role key for admin writes — set this in Vercel env vars
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret!);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
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
    case "invoice.payment_failed": {
      // Don't immediately revoke — give them grace period
      console.log("Payment failed — grace period active");
      break;
    }
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
}

export const config = {
  api: { bodyParser: false },
};
