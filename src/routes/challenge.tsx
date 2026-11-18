import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { useForceLightMode } from "@/hooks/useForceLightMode";
import { skillLabel } from "@/lib/combine";
import { parseShare, rememberChallenge, rememberShareVisit, type ShareSearch } from "@/lib/combineShare";

// Public "beat my score" page opened from a shared Combine link. No sign-in
// needed (listed with the auth routes in __root.tsx). The score comes from
// the link, so it's shown as Range or Monitor, never as verified.
export const Route = createFileRoute("/challenge")({
  validateSearch: (search: Record<string, unknown>): ShareSearch => {
    const out: ShareSearch = {};
    for (const k of ["n", "s", "w", "i", "l", "d", "m"] as const) {
      const v = search[k];
      if (typeof v === "string" || typeof v === "number") out[k] = String(v);
    }
    return out;
  },
  component: ChallengePage,
});

function ChallengePage() {
  useForceLightMode();
  const navigate = useNavigate();
  const { session } = useAuth();
  const shared = parseShare(Route.useSearch());

  const takeIt = () => {
    // Their next finished Combine is compared against this score
    if (shared) rememberChallenge(shared);
    if (session) { navigate({ to: "/combine" }); return; }
    rememberShareVisit();
    navigate({ to: "/onboarding/signup" });
  };

  const rows: [string, number][] = shared
    ? [["Wedges", shared.wedge], ["Mid Irons", shared.midIron], ["Long Game", shared.longGame], ["Driver", shared.driver]]
    : [];

  return (
    <div className="min-h-screen bg-background flex flex-col px-6">
      <div className="mx-auto w-full max-w-[430px] flex flex-col flex-1">
        <div className="pt-12 flex justify-center">
          <img src="/brand/logo-navy-trim.png" alt="Range Rat" className="h-14 w-auto" />
        </div>

        <p className="mt-8 text-center text-[12px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Range Rat Combine</p>

        {shared ? (
          <>
            <h1 className="mt-3 text-center font-display text-[34px] leading-[1.05]">
              {shared.name ? `${shared.name} scored` : "A friend scored"}
            </h1>
            <p className="mt-1 text-center font-stats text-[112px] leading-none tabular-nums text-primary">{shared.overall}</p>
            <p className="text-center font-display text-[26px] leading-none">{skillLabel(shared.overall)}</p>
            <div className="mt-3 flex justify-center">
              <span className="rounded-full border border-border bg-muted px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                {shared.monitor ? "Launch monitor" : "At the range"}
              </span>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-card p-5 space-y-3.5">
              {rows.map(([label, value]) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-24 text-[14px] font-semibold shrink-0">{label}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${value}%` }} />
                  </div>
                  <span className="w-9 text-right font-stats text-[18px] tabular-nums text-primary">{value}</span>
                </div>
              ))}
            </div>

            <h2 className="mt-8 text-center font-display text-[30px] leading-[1.05]">Think you can beat it?</h2>
          </>
        ) : (
          <h1 className="mt-3 text-center font-display text-[34px] leading-[1.05]">How good is your game, really?</h1>
        )}

        <p className="mt-2 text-center text-[15px] text-muted-foreground">
          33 shots across wedges, irons, long game and driver, at the range or on a sim. Your first Combine is free.
        </p>

        <div className="flex-1" />

        <div className="pt-6 pb-10">
          <button
            type="button"
            onClick={takeIt}
            className="h-14 w-full rounded-[14px] bg-primary text-primary-foreground font-bold text-[15px] uppercase tracking-[0.06em] active:opacity-90"
          >
            Take the Combine
          </button>
          {!session && (
            <p className="mt-4 text-center text-[14px] text-muted-foreground">
              Have an account?{" "}
              <button type="button" onClick={() => navigate({ to: "/login" })} className="text-primary font-semibold p-2 -m-2">Sign in</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
