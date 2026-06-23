// No-op telemetry shim for the serverless API routes.
//
// The real @sentry/node SDK (v10) runs OpenTelemetry auto-instrumentation at
// import time and pulls a large native-ish dependency graph. Including it in
// the bundled Vercel functions broke ALL of them at once
// (FUNCTION_INVOCATION_FAILED on every /api/* route). Even a dynamic
// import("@sentry/node") is statically bundled, so it had to be removed
// entirely -- there is now no reference to @sentry/node anywhere in this file.
//
// API errors fall back to console logging (visible in Vercel runtime logs).
// The frontend still uses @sentry/react separately, which is unaffected.

export function ensureSentry(): void {
  // Intentionally empty: no server-side Sentry SDK.
}

export const Sentry = {
  captureException: (err: unknown) => {
    console.error("[api] captured exception:", err);
  },
};
