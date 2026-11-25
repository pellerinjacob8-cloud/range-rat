import type { IncomingMessage, ServerResponse } from "http";
import { ensureSentry } from "./_sentry.js";
import { getStripe } from "./_config.js";
import { getFoundingOffer } from "./_founding.js";

// Public: tells the upgrade screens whether founding spots are open, the
// founding monthly price, how long it lasts, and how many spots are left.
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  ensureSentry();
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "GET") {
    res.writeHead(405);
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    res.writeHead(200);
    res.end(JSON.stringify({ open: false }));
    return;
  }

  const { couponId: _hidden, ...offer } = await getFoundingOffer(getStripe());
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  res.writeHead(200);
  res.end(JSON.stringify(offer));
}
