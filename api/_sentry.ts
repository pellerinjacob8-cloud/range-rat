// Sentry is optional telemetry. It is loaded defensively: a static
// `import * as Sentry from "@sentry/node"` runs the SDK's auto-instrumentation
// at module load, which can throw in a bundled serverless ESM function and take
// the whole endpoint down with an opaque FUNCTION_INVOCATION_FAILED. Importing
// it lazily inside try/catch means a Sentry failure degrades to a no-op instead
// of crashing the handler.

type SentryLike = { captureException: (e: unknown) => void };

let real: { init: (o: unknown) => void; captureException: (e: unknown) => void } | null = null;
let initialized = false;

export async function ensureSentry(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  try {
    const mod: any = await import("@sentry/node");
    mod.init({
      dsn,
      environment: process.env.VERCEL_ENV || "development",
      tracesSampleRate: 0.2,
    });
    real = mod;
  } catch (err) {
    console.error("Sentry init skipped:", err);
  }
}

// Safe wrapper: forwards to the real SDK once initialized, no-ops otherwise.
export const Sentry: SentryLike = {
  captureException: (e: unknown) => {
    try {
      real?.captureException(e);
    } catch {
      /* never let telemetry throw */
    }
  },
};
