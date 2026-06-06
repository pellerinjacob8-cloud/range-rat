import Stripe from "stripe";
import type { IncomingMessage, ServerResponse } from "http";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-05-27.dahlia" as any,
});

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
    const raw = await readBody(req);
    const { priceId, userId, userEmail } = JSON.parse(raw);

    if (!priceId || !userId) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "Missing priceId or userId" }));
      return;
    }

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
