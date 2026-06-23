import type { IncomingMessage, ServerResponse } from "http";
import { ensureSentry, Sentry } from "./_sentry.js";

// Server-only. NEVER prefix this with VITE_ — that would inline the key into
// the public browser bundle.
const RESEND_API_KEY = process.env.RESEND_API_KEY;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk.toString(); });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  ensureSentry();
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.writeHead(405);
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    res.writeHead(500);
    res.end(JSON.stringify({ error: "Email service not configured" }));
    return;
  }

  try {
    const { email, confirmationLink, userName } = JSON.parse((await readBody(req)) || "{}");

    if (!email || !confirmationLink) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "Missing email or confirmationLink" }));
      return;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Range Rat <onboarding@range-rat.resend.dev>",
        to: email,
        subject: "Verify your Range Rat account",
        html: confirmationEmailHtml(confirmationLink, userName),
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error("Resend error:", error);
      res.writeHead(502);
      res.end(JSON.stringify({ error: "Failed to send confirmation email" }));
      return;
    }

    res.writeHead(200);
    res.end(JSON.stringify({ success: true }));
  } catch (err: any) {
    Sentry.captureException(err);
    console.error("Email send error:", err);
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message ?? "Internal server error" }));
  }
}

function confirmationEmailHtml(confirmationLink: string, userName?: string) {
  const name = userName ? `Hi ${userName}` : "Welcome to Range Rat";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #1e3a8a; }
    .content { background: #f9fafb; padding: 30px; border-radius: 8px; }
    .button { display: inline-block; background: #1e3a8a; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .footer { text-align: center; font-size: 12px; color: #666; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">RR</div>
    </div>

    <div class="content">
      <h1 style="margin-top: 0;">${name}</h1>
      <p>Thanks for signing up for Range Rat. Tap the button below to verify your email and get started.</p>

      <a href="${confirmationLink}" class="button">Verify Email</a>

      <p style="color: #666; font-size: 14px;">If you didn't create this account, you can ignore this email.</p>
      <p style="color: #999; font-size: 12px;">This link expires in 24 hours.</p>
    </div>

    <div class="footer">
      <p>Range Rat • Grind. Practice. Improve.</p>
    </div>
  </div>
</body>
</html>
  `;
}
