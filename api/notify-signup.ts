import type { IncomingMessage, ServerResponse } from "http";
import { timingSafeEqual } from "crypto";
import { ensureSentry, Sentry } from "./_sentry.js";
import { getSupabaseAdmin } from "./_config.js";

// Called by a Supabase Database Webhook on INSERT into public.profiles, which
// happens once a new user has verified their email and entered their name.
// Emails the founder so each early signup can get a personal welcome.
//
// Env vars (server-only, never prefix with VITE_):
//   SIGNUP_WEBHOOK_SECRET  shared secret, sent by the webhook as x-webhook-secret
//   SIGNUP_NOTIFY_EMAIL    where the notification goes
//   RESEND_API_KEY         already used for transactional email

const MAX_BODY_BYTES = 16384;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    let bytes = 0;
    req.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) { req.destroy(); reject(new Error("Body too large")); return; }
      body += chunk.toString();
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  ensureSentry();
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.writeHead(405);
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const secret = process.env.SIGNUP_WEBHOOK_SECRET;
  const notifyEmail = process.env.SIGNUP_NOTIFY_EMAIL;
  const resendKey = process.env.RESEND_API_KEY;
  if (!secret || !notifyEmail || !resendKey) {
    console.error("notify-signup misconfigured: need SIGNUP_WEBHOOK_SECRET, SIGNUP_NOTIFY_EMAIL, RESEND_API_KEY");
    res.writeHead(503);
    res.end(JSON.stringify({ error: "Server configuration error" }));
    return;
  }

  const provided = req.headers["x-webhook-secret"];
  if (typeof provided !== "string" || !secretMatches(provided, secret)) {
    res.writeHead(401);
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  try {
    const payload = JSON.parse((await readBody(req)) || "{}");
    const record = payload.record ?? {};
    if (payload.type !== "INSERT" || payload.table !== "profiles" || !record.id) {
      // Acknowledge so Supabase doesn't retry events we don't care about.
      res.writeHead(200);
      res.end(JSON.stringify({ ignored: true }));
      return;
    }

    // profiles has no email column; it lives in auth.users.
    const supabase = getSupabaseAdmin();
    const [{ data: userData }, { count }] = await Promise.all([
      supabase.auth.admin.getUserById(record.id),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
    ]);

    const email = userData?.user?.email ?? "unknown email";
    const name = [record.first_name, record.last_name].filter(Boolean).join(" ") || "No name yet";
    const details = [
      record.handedness ? `${record.handedness === "lefty" ? "Left" : "Right"}-handed` : null,
      record.handicap != null ? `${record.handicap} handicap` : null,
    ].filter(Boolean).join(" · ");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "Range Rat <noreply@send.rangeratapp.com>",
        to: notifyEmail,
        subject: `New Range Rat signup: ${name}`,
        html: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333;">
  <h2 style="margin: 0 0 8px;">${escapeHtml(name)}</h2>
  <p style="margin: 0;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
  ${details ? `<p style="margin: 4px 0 0; color: #666;">${escapeHtml(details)}</p>` : ""}
  ${count != null ? `<p style="margin: 16px 0 0; color: #666;">That makes ${count} users.</p>` : ""}
</div>`,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error("Resend error:", error);
      res.writeHead(502);
      res.end(JSON.stringify({ error: "Failed to send notification" }));
      return;
    }

    res.writeHead(200);
    res.end(JSON.stringify({ success: true }));
  } catch (err: any) {
    Sentry.captureException(err);
    console.error("notify-signup error:", err);
    res.writeHead(500);
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}
