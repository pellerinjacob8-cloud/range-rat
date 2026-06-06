import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useForceLightMode } from "@/hooks/useForceLightMode";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete: string;
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

function ResetPasswordPage() {
  const navigate = useNavigate();
  useForceLightMode();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase fires PASSWORD_RECOVERY when the user lands here via the reset link.
  // We wait for that event before allowing the form to submit.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });

    // Also check if session already exists (e.g. page refresh)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const submit = async () => {
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
  };

  // Success screen
  if (done) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
          <Check className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-display text-[34px] leading-tight mb-3">Password updated</h1>
        <p className="text-[15px] text-muted-foreground leading-relaxed max-w-xs mb-8">
          Your password has been changed. You're now signed in.
        </p>
        <button
          onClick={() => navigate({ to: "/" })}
          className="h-14 w-full max-w-xs rounded-[14px] bg-primary text-white font-bold text-[14px] uppercase tracking-[0.06em]"
        >
          Go to App
        </button>
      </div>
    );
  }

  // Loading — waiting for Supabase recovery session
  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
        <p className="text-[14px] text-muted-foreground">Verifying reset link…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col px-6">
      <div className="h-14" />
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <img
          src="/brand/logo-navy-trim.png"
          alt="Range Rat"
          className="h-16 w-auto self-start mb-8"
        />

        <h1 className="font-display text-[38px] leading-[0.95] tracking-[-0.015em] mb-2">
          New password
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Choose a strong password for your account.
        </p>

        <div className="space-y-3">
          <PasswordInput
            value={password}
            onChange={setPassword}
            placeholder="New password (min. 8 characters)"
            autoComplete="new-password"
          />
          <PasswordInput
            value={confirm}
            onChange={setConfirm}
            placeholder="Confirm new password"
            autoComplete="new-password"
          />
        </div>

        {/* Match indicator */}
        {confirm.length > 0 && (
          <p className={`mt-2 text-[12px] font-medium flex items-center gap-1 ${password === confirm ? "text-[var(--ok)]" : "text-destructive"}`}>
            {password === confirm ? <><Check className="h-3.5 w-3.5" /> Passwords match</> : "Passwords do not match"}
          </p>
        )}

        {error && (
          <div className="mt-3 rounded-[12px] bg-destructive/10 border border-destructive/20 px-4 py-3">
            <p className="text-[13px] font-semibold text-destructive">{error}</p>
          </div>
        )}

        <button
          onClick={submit}
          disabled={loading || password.length < 8 || password !== confirm}
          className="mt-6 h-14 w-full rounded-[14px] bg-primary text-white font-bold text-[14px] uppercase tracking-[0.06em] disabled:opacity-40 active:opacity-90 transition-opacity"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Saving…
            </span>
          ) : "Set New Password"}
        </button>
      </div>
    </div>
  );
}
