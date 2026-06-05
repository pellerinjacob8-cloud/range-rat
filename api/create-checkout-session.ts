import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { priceId, userId, userEmail } = req.body;

  if (!priceId || !userId) {
    return res.status(400).json({ error: "Missing priceId or userId" });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: { userId },
      },
      metadata: { userId },
      customer_email: userEmail,
      success_url: `${process.env.VITE_APP_URL || "https://range-rat-zjt9.vercel.app"}/practice?upgraded=true`,
      cancel_url: `${process.env.VITE_APP_URL || "https://range-rat-zjt9.vercel.app"}/upgrade`,
    });

    res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    res.status(500).json({ error: err.message });
  }
}
