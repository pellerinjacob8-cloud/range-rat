import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useForceLightMode } from "@/hooks/useForceLightMode";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: (search.mode === "signup" ? "signup" : "signin") as "signin" | "signup",
  }),
  component: LoginPage,
});

function PasswordInput({
  value,
  onChange,
  onKeyDown,
  autoComplete,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  autoComplete: string;
  placeholder: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="h-[52px] w-full rounded-[14px] border border-border bg-card px-4 pr-12 text-[15px] outline-none focus:border-primary transition-colors"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ── Forgot password screen ────────────────────────────────────────────────────
function ForgotPasswordScreen({ onBack }: { onBack: () => void }) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const { error } = await resetPassword(email.trim());
    setLoading(false);
    if (error) { setError(error); return; }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
          <span className="text-3xl">🔑</span>
        </div>
        <h1 className="font-display text-[34px] leading-tight mb-3">Check your email</h1>
        <p className="text-[15px] text-muted-foreground leading-relaxed max-w-xs mb-8">
          We sent a password reset link to <strong>{email}</strong>.
        </p>
        <button
          onClick={onBack}
          className="h-14 w-full max-w-xs rounded-[14px] bg-primary text-white font-bold text-[14px] uppercase tracking-[0.06em]"
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col px-6">
      <div className="h-14" />
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <button onClick={onBack} className="self-start text-[13px] text-muted-foreground mb-8 flex items-center gap-1">
          ← Back to sign in
        </button>

        <h1 className="font-display text-[38px] leading-[0.95] tracking-[-0.015em] mb-2">
          Reset password
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Enter your email and we'll send you a reset link.
        </p>

        <input
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") submit(); }}
          className="h-[52px] w-full rounded-[14px] border border-border bg-card px-4 text-[15px] outline-none focus:border-primary transition-colors"
        />

        {error && (
          <div className="mt-3 rounded-[12px] bg-destructive/10 border border-destructive/20 px-4 py-3">
            <p className="text-[13px] font-semibold text-destructive">{error}</p>
          </div>
        )}

        <button
          onClick={submit}
          disabled={loading || !email.trim()}
          className="mt-5 h-14 w-full rounded-[14px] bg-primary text-white font-bold text-[14px] uppercase tracking-[0.06em] disabled:opacity-40 active:opacity-90 transition-opacity"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Sending…
            </span>
          ) : "Send Reset Link"}
        </button>
      </div>
    </div>
  );
}

// ── Email sent screen (after signup) ─────────────────────────────────────────
function EmailSentScreen({ email, onBack }: { email: string; onBack: () => void }) {
  const { resendVerification } = useAuth();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const handleResend = async () => {
    setResending(true);
    setResendError(null);
    const { error } = await resendVerification(email);
    setResending(false);
    if (error) { setResendError(error); return; }
    setResent(true);
    setTimeout(() => setResent(false), 4000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
        <span className="text-3xl">📬</span>
      </div>
      <h1 className="font-display text-[34px] leading-tight mb-3">Verify your email</h1>
      <p className="text-[15px] text-muted-foreground leading-relaxed max-w-xs mb-2">
        We sent a confirmation link to
      </p>
      <p className="text-[15px] font-semibold text-foreground mb-6 max-w-xs break-all">{email}</p>
      <p className="text-[13px] text-muted-foreground max-w-xs leading-relaxed mb-8">
        Click the link to activate your account, then come back and sign in.
      </p>
      {resendError && <p className="text-sm font-semibold text-destructive mb-4">{resendError}</p>}
      {resent && <p className="text-sm font-semibold text-emerald-600 mb-4">Email resent ✓</p>}
      <button
        onClick={onBack}
        className="h-14 w-full max-w-xs rounded-[14px] bg-primary text-white font-bold text-[14px] uppercase tracking-[0.06em] mb-4"
      >
        Back to Sign In
      </button>
      <button
        onClick={handleResend}
        disabled={resending}
        className="text-[13px] text-muted-foreground disabled:opacity-50"
      >
        {resending ? "Sending…" : "Didn't get it? Resend email"}
      </button>
    </div>
  );
}

// ── Main login page ───────────────────────────────────────────────────────────
function LoginPage() {
  const { mode } = useSearch({ from: "/login" });
  const [view, setView] = useState<"signin" | "signup" | "forgot">(mode === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { signIn, signUp } = useAuth();
  useForceLightMode();

  const resetForm = () => { setEmail(""); setPassword(""); setError(null); };

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);

    const { error } = view === "signup"
      ? await signUp(email.trim(), password)
      : await signIn(email.trim(), password);

    setLoading(false);

    if (error) { setError(error); return; }

    if (view === "signup") {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { setEmailSent(true); return; }
      // Session exists — AuthGate redirects to /onboarding/name
    }
    // Signin: AuthGate handles redirect
  };

  if (view === "forgot") {
    return <ForgotPasswordScreen onBack={() => { setView("signin"); resetForm(); }} />;
  }

  if (emailSent) {
    return <EmailSentScreen email={email} onBack={() => { setEmailSent(false); setView("signin"); setPassword(""); setError(null); }} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col px-6">
      <div className="h-14" />

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <img
          src="/brand/monogram-rr-navy.png"
          alt="Range Rat"
          className="h-16 w-auto self-start mb-8"
        />

        <h1 className="font-display text-[38px] leading-[0.95] tracking-[-0.015em] mb-1">
          {view === "signup" ? "Create account" : "Welcome back"}
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          {view === "signup" ? "Start tracking your range sessions." : "Sign in to continue."}
        </p>

        <div className="space-y-3">
          <input
            type="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") submit(); }}
            className="h-[52px] w-full rounded-[14px] border border-border bg-card px-4 text-[15px] outline-none focus:border-primary transition-colors"
          />
          <PasswordInput
            value={password}
            onChange={setPassword}
            onKeyDown={e => { if (e.key === "Enter") submit(); }}
            autoComplete={view === "signup" ? "new-password" : "current-password"}
            placeholder="Password"
          />
        </div>

        {/* Forgot password — sign in only */}
        {view === "signin" && (
          <div className="mt-2 text-right">
            <button
              type="button"
              onClick={() => { setView("forgot"); resetForm(); }}
              className="text-[12.5px] text-primary font-semibold"
            >
              Forgot password?
            </button>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-[12px] bg-destructive/10 border border-destructive/20 px-4 py-3">
            <p className="text-[13px] font-semibold text-destructive">{error}</p>
          </div>
        )}

        <button
          onClick={submit}
          disabled={loading || !email.trim() || !password}
          className="mt-5 h-14 w-full rounded-[14px] bg-primary text-white font-bold text-[14px] uppercase tracking-[0.06em] disabled:opacity-40 active:opacity-90 transition-opacity"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              {view === "signup" ? "Creating account…" : "Signing in…"}
            </span>
          ) : view === "signup" ? "Create Account" : "Sign In"}
        </button>

        <button
          type="button"
          onClick={() => { setView(view === "signup" ? "signin" : "signup"); resetForm(); }}
          className="mt-4 text-center text-[13px] text-muted-foreground"
        >
          {view === "signup" ? "Already have an account? " : "Don't have an account? "}
          <span className="text-primary font-semibold">
            {view === "signup" ? "Sign in" : "Sign up"}
          </span>
        </button>
      </div>
    </div>
  );
}
