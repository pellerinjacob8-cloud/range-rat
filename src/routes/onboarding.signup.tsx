import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useForceLightMode } from "@/hooks/useForceLightMode";

export const Route = createFileRoute("/onboarding/signup")({
  component: OnboardingSignup,
});

function OnboardingSignup() {
  const navigate = useNavigate();
  useForceLightMode();
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.trim() || password.length < 6) {
      setError("Enter a valid email and a password of at least 6 characters.");
      return;
    }
    setLoading(true);
    const { error } = await signUp(email.trim(), password);
    setLoading(false);
    if (error) { setError(error); return; }

    // If Supabase requires email confirmation, session won't exist yet
    const { supabase } = await import("@/lib/supabase");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setEmailSent(true);
    } else {
      navigate({ to: "/onboarding/name" });
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <p className="text-5xl mb-5">📬</p>
        <h1 className="font-display text-[36px] leading-tight mb-3">Check your email</h1>
        <p className="text-[15px] text-muted-foreground leading-relaxed max-w-xs">
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back and sign in.
        </p>
        <button
          onClick={() => navigate({ to: "/login" })}
          className="mt-8 h-14 w-full max-w-xs rounded-[14px] bg-primary text-white font-bold text-[14px] uppercase tracking-[0.06em]"
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col px-6">
      <div className="h-11" />

      <div className="flex items-center justify-between pt-6">
        <button onClick={() => navigate({ to: "/onboarding/welcome" })} className="text-muted-foreground text-sm">
          ← Back
        </button>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Step 1 of 3</p>
        <div className="w-12" />
      </div>

      <div className="mt-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Create account</p>
        <h1 className="mt-2 font-display text-[38px] leading-[1.0] tracking-[-0.01em]">
          Let's get<br />you set up.
        </h1>
      </div>

      <div className="mt-10 space-y-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">Email</p>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") submit(); }}
            className="h-[52px] w-full rounded-[14px] border border-border bg-card px-4 text-[15px] outline-none focus:border-primary transition-colors"
          />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">Password</p>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Min. 6 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") submit(); }}
            className="h-[52px] w-full rounded-[14px] border border-border bg-card px-4 text-[15px] outline-none focus:border-primary transition-colors"
          />
        </div>
        {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
      </div>

      <div className="flex-1" />

      <div className="pb-10">
        <div className="flex gap-1.5 justify-center mb-5">
          <span className="h-1.5 w-4 rounded-full bg-primary" />
          <span className="h-1.5 w-1.5 rounded-full bg-border" />
          <span className="h-1.5 w-1.5 rounded-full bg-border" />
        </div>
        <button
          onClick={submit}
          disabled={loading || !email.trim() || !password}
          className="h-14 w-full rounded-[14px] bg-primary text-white font-bold text-[14px] uppercase tracking-[0.06em] disabled:opacity-40"
        >
          {loading ? "…" : "Continue"}
        </button>
        <div className="mt-3 flex items-center justify-center gap-1 text-[12.5px] text-muted-foreground">
          <span>Already have an account ·</span>
          <button onClick={() => navigate({ to: "/login" })} className="text-primary font-semibold">Sign in</button>
        </div>
      </div>
    </div>
  );
}
