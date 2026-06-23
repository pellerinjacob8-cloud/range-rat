import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MailCheck, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/auth/confirm")({
  component: AuthConfirm,
});

function AuthConfirm() {
  const navigate = useNavigate();
  const { resendVerification, signOut } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "waiting">("loading");
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    const hasHash = window.location.hash.includes("access_token");
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    // PKCE flow: ?code= param
    if (code) {
      handled.current = true;
      supabase.auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
        if (exchangeError) {
          setStatus("error");
          setError(exchangeError.message);
          return;
        }
        setStatus("success");
        setTimeout(() => navigate({ to: "/onboarding/name" }), 1500);
      });
      return;
    }

    // Hash-fragment flow: #access_token= (Supabase processes this automatically)
    // Give the Supabase client a moment to detect and process the hash
    if (hasHash) {
      handled.current = true;
      // Supabase auto-detects hash tokens via onAuthStateChange
      // The listener below will catch it
      return;
    }

    // No code or hash -- show waiting screen after a short delay
    // (gives onAuthStateChange time to fire if session exists)
    const timeout = setTimeout(() => {
      if (!handled.current) {
        setStatus("waiting");
      }
    }, 1500);

    return () => clearTimeout(timeout);
  }, [navigate]);

  // Listen for auth state changes (handles hash-fragment flow + already-verified)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.email_confirmed_at) {
        handled.current = true;
        setStatus("success");
        setTimeout(() => navigate({ to: "/onboarding/name" }), 1500);
      }
    });

    // Also check if there's already a valid confirmed session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email_confirmed_at) {
        handled.current = true;
        setStatus("success");
        setTimeout(() => navigate({ to: "/onboarding/name" }), 1500);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleResend = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return;
    setResending(true);
    const { error } = await resendVerification(user.email);
    setResending(false);
    if (error) { setError(error); return; }
    setResent(true);
    setTimeout(() => setResent(false), 4000);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/onboarding/welcome" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      {status === "loading" && (
        <>
          <div className="h-12 w-12 rounded-full border-2 border-border border-t-primary animate-spin mb-4" />
          <h1 className="font-display text-[32px] leading-tight">Verifying...</h1>
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
          <p className="text-muted-foreground mt-2">Welcome to Range Rat. Taking you to the app...</p>
        </>
      )}

      {status === "waiting" && (
        <>
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
            <MailCheck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-display text-[34px] leading-tight mb-3">Verify your email</h1>
          <p className="text-[15px] text-muted-foreground leading-relaxed max-w-xs mb-2">
            Check your inbox for a confirmation link to continue.
          </p>
          <p className="text-[13px] text-muted-foreground max-w-xs leading-relaxed mb-8">
            Tap the link in the email, we'll bring you straight in.
          </p>

          {resent && (
            <p className="text-sm font-semibold text-[var(--ok)] mb-4 flex items-center justify-center gap-1.5"><Check className="h-4 w-4" /> Email resent</p>
          )}
          {error && (
            <p className="text-sm font-semibold text-destructive mb-4">{error}</p>
          )}

          <button
            onClick={handleResend}
            disabled={resending}
            className="text-[13px] text-muted-foreground disabled:opacity-50 p-2 -m-2 mb-6"
          >
            {resending ? "Sending..." : "Didn't get it? Resend email"}
          </button>
          <button
            onClick={handleSignOut}
            className="text-[13px] text-muted-foreground p-2 -m-2"
          >
            Use a different email
          </button>
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
          <p className="text-muted-foreground mt-4 text-[14px]">
            This link may have expired. Check your email for a fresh verification link, or try signing in if you've already verified.
          </p>
          <div className="mt-6 flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={() => navigate({ to: "/login" })}
              className="h-12 px-6 rounded-[14px] bg-primary text-primary-foreground font-bold text-[13px] uppercase tracking-[0.06em]"
            >
              Go to Sign In
            </button>
          </div>
        </>
      )}
    </div>
  );
}
