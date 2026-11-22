import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { useForceLightMode } from "@/hooks/useForceLightMode";
import { rememberSessionShareVisit } from "@/lib/combineShare";
import { loadSharedSession, type SharedSession } from "@/lib/sessionShare";
import { totalBalls } from "@/lib/practicePlan";

// Public page opened from a shared session link. No sign-in needed (listed
// with the auth routes in __root.tsx). "Run this session" opens it in
// Practice, through signup first for logged-out visitors.
export const Route = createFileRoute("/s/$code")({
  component: SharedSessionPage,
});

function SharedSessionPage() {
  useForceLightMode();
  const navigate = useNavigate();
  const { session } = useAuth();
  const code = Route.useParams().code.toLowerCase();
  const [state, setState] = useState<"loading" | "missing" | "ready">("loading");
  const [shared, setShared] = useState<SharedSession | null>(null);

  useEffect(() => {
    let live = true;
    loadSharedSession(code)
      .then((s) => { if (!live) return; setShared(s); setState(s ? "ready" : "missing"); })
      .catch(() => { if (live) setState("missing"); });
    return () => { live = false; };
  }, [code]);

  const runIt = () => {
    if (session) { navigate({ to: "/practice", search: { shared: code } }); return; }
    rememberSessionShareVisit(code);
    navigate({ to: "/onboarding/signup" });
  };

  const balls = shared ? totalBalls(shared.blocks) : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col px-6">
      <div className="mx-auto w-full max-w-[430px] flex flex-col flex-1">
        <div className="pt-12 flex justify-center">
          <img src="/brand/logo-navy-trim.png" alt="Range Rat" className="h-14 w-auto" />
        </div>

        {state === "loading" && (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-6 w-6 rounded-full border-[2.5px] border-border border-t-primary animate-spin" />
          </div>
        )}

        {state === "missing" && (
          <>
            <h1 className="mt-10 text-center font-display text-[34px] leading-[1.05]">This session isn't available</h1>
            <p className="mt-3 text-center text-[15px] text-muted-foreground">
              The link may be wrong or the session was removed. You can still build your own range session from your bag.
            </p>
            <div className="flex-1" />
            <div className="pt-6 pb-10">
              <button
                type="button"
                onClick={() => navigate({ to: session ? "/practice" : "/onboarding/welcome" })}
                className="h-14 w-full rounded-[14px] bg-primary text-primary-foreground font-bold text-[15px] uppercase tracking-[0.06em] active:opacity-90"
              >
                {session ? "Go to Practice" : "Get started"}
              </button>
            </div>
          </>
        )}

        {state === "ready" && shared && (
          <>
            <p className="mt-8 text-center text-[12px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Range session</p>
            <h1 className="mt-3 text-center font-display text-[34px] leading-[1.05]">
              {shared.senderName ? `${shared.senderName} sent you a session` : "Someone sent you a session"}
            </h1>
            <p className="mt-2 text-center text-[16px] font-semibold">{shared.name}</p>
            <p className="mt-1 text-center text-[14px] text-muted-foreground tabular-nums">
              {shared.blocks.length} block{shared.blocks.length !== 1 ? "s" : ""} · {balls} balls
            </p>

            <ol className="mt-6 rounded-2xl border border-border bg-card divide-y divide-border">
              {shared.blocks.map((b, i) => (
                <li key={b.id} className="flex gap-3 px-4 py-3.5">
                  <span className="w-5 shrink-0 pt-0.5 font-stats text-[16px] tabular-nums text-muted-foreground">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[14px] font-bold truncate">{b.club}</p>
                      <p className="shrink-0 text-[13px] font-semibold text-muted-foreground tabular-nums">
                        {b.balls} {b.unit === "min" ? "min" : b.balls === 1 ? "ball" : "balls"}
                      </p>
                    </div>
                    <p className="mt-0.5 text-[14px] text-muted-foreground">{b.cue}</p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="mt-6 text-center text-[15px] text-muted-foreground">
              Range Rat walks you through it at the range, one club and one cue at a time. Free to run.
            </p>

            <div className="flex-1" />

            <div className="pt-6 pb-10">
              <button
                type="button"
                onClick={runIt}
                className="h-14 w-full rounded-[14px] bg-primary text-primary-foreground font-bold text-[15px] uppercase tracking-[0.06em] active:opacity-90"
              >
                Run this session
              </button>
              {!session && (
                <p className="mt-4 text-center text-[14px] text-muted-foreground">
                  Have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { rememberSessionShareVisit(code, false); navigate({ to: "/login" }); }}
                    className="text-primary font-semibold p-2 -m-2"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
