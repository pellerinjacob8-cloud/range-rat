import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { loadProfileName } from "@/lib/profile";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: (search.mode === "signup" ? "signup" : "signin") as "signin" | "signup",
  }),
  component: LoginPage,
});

function LoginPage() {
  const { mode } = useSearch({ from: "/login" });
  const [isSignUp, setIsSignUp] = useState(mode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) return;
    setLoading(true);

    const { error } = isSignUp
      ? await signUp(email.trim(), password)
      : await signIn(email.trim(), password);

    setLoading(false);

    if (error) {
      setError(error);
      return;
    }

    if (isSignUp) {
      // New user — go through onboarding to set name/bag
      navigate({ to: "/onboarding/welcome" });
    } else {
      // Returning user — skip onboarding if they already have a name
      navigate({ to: loadProfileName() ? "/" : "/onboarding/welcome" });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-6">
      <div className="h-14" />

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        {/* Logo */}
        <img
          src={theme === "dark" ? "/brand/monogram-rr-white.png" : "/brand/monogram-rr-navy.png"}
          alt="Range Rat"
          className="h-24 w-auto -ml-3 mb-8"
        />

        <h1 className="font-display text-[38px] leading-[0.95] tracking-[-0.015em] mb-1">
          {isSignUp ? "Create account" : "Welcome back"}
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          {isSignUp ? "Start tracking your range sessions." : "Sign in to continue."}
        </p>

        <div className="space-y-3">
          <input
            type="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            className="h-[52px] w-full rounded-[14px] border border-border bg-card px-4 text-[15px] outline-none focus:border-primary transition-colors"
          />
          <input
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            className="h-[52px] w-full rounded-[14px] border border-border bg-card px-4 text-[15px] outline-none focus:border-primary transition-colors"
          />
        </div>

        {error && (
          <p className="mt-3 text-sm font-semibold text-destructive">{error}</p>
        )}

        <button
          onClick={submit}
          disabled={loading || !email.trim() || !password}
          className="mt-5 h-14 w-full rounded-[14px] bg-primary text-white font-bold text-[14px] uppercase tracking-[0.06em] disabled:opacity-40 active:opacity-90 transition-opacity"
        >
          {loading ? "…" : isSignUp ? "Create Account" : "Sign In"}
        </button>

        <button
          type="button"
          onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
          className="mt-4 text-center text-[13px] text-muted-foreground"
        >
          {isSignUp ? "Already have an account? " : "Don't have an account? "}
          <span className="text-primary font-semibold">
            {isSignUp ? "Sign in" : "Sign up"}
          </span>
        </button>
      </div>
    </div>
  );
}
