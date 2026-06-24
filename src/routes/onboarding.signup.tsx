import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, ChevronLeft, MailCheck, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useForceLightMode } from "@/hooks/useForceLightMode";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/onboarding/signup")({
  component: OnboardingSignup,
});

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function passwordStrength(pw: string): { label: string; color: string; bars: number } {
  if (pw.length === 0) return { label: "", color: "", bars: 0 };
  if (pw.length < 8) return { label: "Too short", color: "bg-primary/40", bars: 1 };
  const hasUpper = /[A-Z]/.test(pw);
  const hasNum = /[0-9]/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  const score = [hasUpper, hasNum, hasSpecial].filter(Boolean).length;
  if (score === 0) return { label: "Weak", color: "bg-primary/50", bars: 1 };
  if (score === 1) return { label: "Fair", color: "bg-primary/65", bars: 2 };
  if (score === 2) return { label: "Good", color: "bg-primary/80", bars: 3 };
  return { label: "Strong", color: "bg-primary", bars: 4 };
}

function PasswordInput({
  value,
  onChange,
  onKeyDown,
  placeholder,
  autoComplete,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder: string;
  autoComplete: string;
  hasError?: boolean;
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
        className={`h-[52px] w-full rounded-[14px] border bg-card px-4 pr-12 text-[15px] outline-none transition-colors ${
          hasError ? "border-destructive focus:border-destructive" : "border-border focus:border-primary"
        }`}
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

// ── Email sent screen ─────────────────────────────────────────────────────────
function EmailSentScreen({ email, onBack }: { email: string; onBack: () => void }) {
  const { resendVerification } = useAuth();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    setResendError(null);
    const { error } = await resendVerification(email);
    setResending(false);
    if (error) { setResendError(error); return; }
    setResent(true);
    setCooldown(45);
    setTimeout(() => setResent(false), 4000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
        <MailCheck className="h-8 w-8 text-primary" />
      </div>

      <h1 className="font-display text-[34px] leading-tight mb-3">Verify your email</h1>

      <p className="text-[15px] text-muted-foreground leading-relaxed max-w-xs mb-2">
        We sent a confirmation link to
      </p>
      <p className="text-[15px] font-semibold text-foreground mb-6 max-w-xs break-all">{email}</p>

      <p className="text-[13px] text-muted-foreground max-w-xs leading-relaxed mb-8">
        Tap the link in the email, we'll bring you straight in.
      </p>

      {resendError && (
        <p className="text-sm font-semibold text-destructive mb-4">{resendError}</p>
      )}
      {resent && (
        <p className="text-sm font-semibold text-[var(--ok)] mb-4 flex items-center justify-center gap-1.5"><Check className="h-4 w-4" /> Email resent</p>
      )}

      <button
        onClick={onBack}
        className="h-14 w-full max-w-xs rounded-[14px] bg-primary text-white font-bold text-[14px] uppercase tracking-[0.06em] mb-4 active:opacity-90 transition-opacity"
      >
        Back to Sign In
      </button>

      <button
        onClick={handleResend}
        disabled={resending || cooldown > 0}
        className="text-[13px] text-muted-foreground disabled:opacity-50 p-2 -m-2"
      >
        {resending ? "Sending..." : cooldown > 0 ? `Resend in ${cooldown}s` : "Didn't get it? Resend email"}
      </button>
    </div>
  );
}

// ── Main signup screen ────────────────────────────────────────────────────────
function OnboardingSignup() {
  const navigate = useNavigate();
  useForceLightMode();
  const { signUp } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false, confirm: false });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const strength = passwordStrength(password);
  const emailValid = validateEmail(email);
  const passwordLongEnough = password.length >= 8;
  const passwordsMatch = password === confirm && confirm.length > 0;
  const confirmMismatch = touched.confirm && confirm.length > 0 && password !== confirm;

  const canSubmit = emailValid && passwordLongEnough && passwordsMatch && !loading;

  const submit = async () => {
    setTouched({ email: true, password: true, confirm: true });
    setError(null);

    if (!emailValid) { setError("Please enter a valid email address."); return; }
    if (!passwordLongEnough) { setError("Password must be at least 8 characters."); return; }
    if (!passwordsMatch) { setError("Passwords do not match."); return; }

    setLoading(true);
    const { error: signUpError } = await signUp(email.trim(), password);
    setLoading(false);

    if (signUpError) { setError(signUpError); return; }

    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setEmailSent(true);
    } else {
      navigate({ to: "/onboarding/name" });
    }
  };

  if (emailSent) {
    return <EmailSentScreen email={email} onBack={() => navigate({ to: "/login" })} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col px-6">
      <div className="h-11" />

      {/* Header */}
      <div className="flex items-center justify-between pt-6">
        <button
          onClick={() => navigate({ to: "/onboarding/welcome" })}
          className="text-muted-foreground -ml-1 p-1"
          aria-label="Back"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Step 1 of 3</p>
        <div className="w-8" />
      </div>

      {/* Headline */}
      <div className="mt-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Create account</p>
        <h1 className="mt-2 font-display text-[38px] leading-[1.0] tracking-[-0.01em]">
          Let's get<br />you set up.
        </h1>
      </div>

      {/* Form */}
      <div className="mt-10 space-y-4">

        {/* Email */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">Email</p>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onBlur={() => setTouched(t => ({ ...t, email: true }))}
            onKeyDown={e => { if (e.key === "Enter") submit(); }}
            className={`h-[52px] w-full rounded-[14px] border bg-card px-4 text-[15px] outline-none transition-colors ${
              touched.email && !emailValid
                ? "border-destructive focus:border-destructive"
                : "border-border focus:border-primary"
            }`}
          />
          {touched.email && !emailValid && (
            <p className="mt-1.5 text-[12px] text-destructive font-medium">Enter a valid email address.</p>
          )}
        </div>

        {/* Password */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">Password</p>
          <PasswordInput
            value={password}
            onChange={v => { setPassword(v); setTouched(t => ({ ...t, password: true })); }}
            onKeyDown={e => { if (e.key === "Enter") submit(); }}
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            hasError={touched.password && !passwordLongEnough}
          />
          {/* Strength bars */}
          {password.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex gap-1 flex-1">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all ${
                      i <= strength.bars ? strength.color : "bg-border"
                    }`}
                  />
                ))}
              </div>
              {strength.label && (
                <p className="text-[11px] font-semibold text-muted-foreground w-12 text-right">{strength.label}</p>
              )}
            </div>
          )}
          {touched.password && !passwordLongEnough && password.length > 0 && (
            <p className="mt-1.5 text-[12px] text-destructive font-medium">Must be at least 8 characters.</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">Confirm password</p>
          <PasswordInput
            value={confirm}
            onChange={v => { setConfirm(v); setTouched(t => ({ ...t, confirm: true })); }}
            onKeyDown={e => { if (e.key === "Enter") submit(); }}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            hasError={confirmMismatch}
          />
          {confirmMismatch && (
            <p className="mt-1.5 text-[12px] text-destructive font-medium">Passwords do not match.</p>
          )}
          {touched.confirm && passwordsMatch && (
            <p className="mt-1.5 text-[12px] text-[var(--ok)] font-medium flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Passwords match</p>
          )}
        </div>

        {error && (
          <div className="rounded-[12px] bg-destructive/10 border border-destructive/20 px-4 py-3">
            <p className="text-[13px] font-semibold text-destructive">{error}</p>
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Footer */}
      <div className="pb-10">
        <div className="flex gap-1.5 justify-center mb-5">
          <span className="h-1.5 w-4 rounded-full bg-primary" />
          <span className="h-1.5 w-1.5 rounded-full bg-border" />
          <span className="h-1.5 w-1.5 rounded-full bg-border" />
        </div>
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="h-14 w-full rounded-[14px] bg-primary text-white font-bold text-[14px] uppercase tracking-[0.06em] disabled:opacity-40 active:opacity-90 transition-opacity"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Creating account…
            </span>
          ) : "Continue"}
        </button>
        <p className="mt-3 text-center text-[11.5px] leading-relaxed text-muted-foreground">
          By creating an account you agree to our{" "}
          <Link to="/terms" className="text-primary font-semibold">Terms</Link>{" "}and{" "}
          <Link to="/privacy" className="text-primary font-semibold">Privacy Policy</Link>.
        </p>
        <div className="mt-3 flex items-center justify-center gap-1 text-[12.5px] text-muted-foreground">
          <span>Already have an account ·</span>
          <button onClick={() => navigate({ to: "/login" })} className="text-primary font-semibold">Sign in</button>
        </div>
      </div>
    </div>
  );
}
