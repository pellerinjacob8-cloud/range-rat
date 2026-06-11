import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/confirm")({
  component: AuthConfirm,
});

function AuthConfirm() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { type?: string; code?: string };
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        if (search.type === "recovery" && search.code) {
          // Password reset recovery
          await supabase.auth.verifyOtp({ token: search.code, type: "recovery" });
          setStatus("success");
          setTimeout(() => navigate({ to: "/reset-password" }), 1500);
        } else if (search.code) {
          // Email confirmation (signup)
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token: search.code,
            type: "email",
          });

          if (verifyError) {
            setStatus("error");
            setError(verifyError.message);
            return;
          }

          setStatus("success");
          setTimeout(() => navigate({ to: "/onboarding/name" }), 1500);
        } else {
          setStatus("error");
          setError("No confirmation code found");
        }
      } catch (err: any) {
        setStatus("error");
        setError(err.message || "Confirmation failed");
      }
    };

    confirmEmail();
  }, [search, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      {status === "loading" && (
        <>
          <div className="h-12 w-12 rounded-full border-2 border-border border-t-primary animate-spin mb-4" />
          <h1 className="font-display text-[32px] leading-tight">Verifying…</h1>
          <p className="text-muted-foreground mt-2">Please wait while we confirm your email.</p>
        </>
      )}

      {status === "success" && (
        <>
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="font-display text-[32px] leading-tight">Email verified!</h1>
          <p className="text-muted-foreground mt-2">Welcome to Range Rat. Taking you to the app…</p>
        </>
      )}

      {status === "error" && (
        <>
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="font-display text-[32px] leading-tight">Verification failed</h1>
          <p className="text-destructive mt-2">{error || "Something went wrong"}</p>
          <button
            onClick={() => navigate({ to: "/onboarding/welcome" })}
            className="mt-6 h-12 px-6 rounded-[14px] bg-primary text-white font-bold text-[13px] uppercase tracking-[0.06em]"
          >
            Back to Sign Up
          </button>
        </>
      )}
    </div>
  );
}
