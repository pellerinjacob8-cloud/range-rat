import * as Sentry from "@sentry/node";

let initialized = false;

export function ensureSentry() {
  if (initialized) return;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || "development",
    tracesSampleRate: 0.2,
  });
  initialized = true;
}

export { Sentry };
