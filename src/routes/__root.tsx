import { Component, useEffect, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Outlet, Link, createRootRoute, useNavigate, useLocation } from "@tanstack/react-router";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { fetchProfile } from "@/lib/db";
import { supabase } from "@/lib/supabase";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function AuthGate() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinTimeElapsed(true), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!session) { setHasProfile(null); return; }
    const uid = session.user.id;
    try {
      const cachedUid = localStorage.getItem("rangeRat_profile_uid");
      if (cachedUid && cachedUid !== uid) {
        localStorage.removeItem("rangeRat_profile");
        localStorage.removeItem("rangeRat_onboarding_complete");
        localStorage.removeItem("rangeRat_profile_uid");
      }
      const cached = localStorage.getItem("rangeRat_profile");
      if (cached) {
        const p = JSON.parse(cached);
        if (p?.firstName?.trim()) {
          try { localStorage.setItem("rangeRat_onboarding_complete", "true"); } catch {}
          setHasProfile(true);
          return;
        }
      }
    } catch {}
    fetchProfile().then((p) => {
      const has = !!(p?.firstName?.trim());
      if (has) {
        try {
          localStorage.setItem("rangeRat_profile", JSON.stringify(p));
          localStorage.setItem("rangeRat_profile_uid", uid);
          localStorage.setItem("rangeRat_onboarding_complete", "true");
        } catch {}
      } else {
        try {
          localStorage.removeItem("rangeRat_profile");
          localStorage.removeItem("rangeRat_onboarding_complete");
          localStorage.setItem("rangeRat_profile_uid", uid);
        } catch {}
      }
      setHasProfile(has);
    });
  }, [session]);

  useEffect(() => {
    if (loading) return;

    const isAuthRoute = pathname === "/login" || pathname === "/reset-password" || pathname === "/pro-welcome" || pathname === "/custom-session" || pathname.startsWith("/auth/");
    const isOnboarding = pathname.startsWith("/onboarding");

    if (!session) {
      if (!isAuthRoute && !isOnboarding) navigate({ to: "/onboarding/welcome" });
      return;
    }

    if (hasProfile === null) return;

    // Force unverified users to /auth/confirm (even from onboarding routes)
    if (session && !session.user.email_confirmed_at) {
      // Session token may be stale: refresh to check if email was verified elsewhere
      supabase.auth.refreshSession().then(({ data }) => {
        if (data.session?.user?.email_confirmed_at) return; // re-render will handle it
        if (!pathname.startsWith("/auth/confirm")) {
          navigate({ to: "/auth/confirm" });
        }
      });
      return;
    }

    const onboardingComplete = (() => { try { return localStorage.getItem("rangeRat_onboarding_complete") === "true"; } catch { return false; } })();

    if (!isAuthRoute && !hasProfile && !onboardingComplete) {
      navigate({ to: "/onboarding/name" });
    }

    // Verified session but no profile, welcome page is only for guests, push them forward
    if (session && !hasProfile && pathname === "/onboarding/welcome") {
      navigate({ to: "/onboarding/name" });
    }

    // Logged-in + fully set up → bounce off onboarding/login (not reset-password)
    // Only bounce once onboarding is explicitly complete, prevents kicking users
    // mid-flow when a Supabase token refresh re-runs this effect after name is saved
    if (hasProfile && onboardingComplete && (pathname === "/login" || pathname.startsWith("/onboarding"))) {
      navigate({ to: "/" });
    }
  }, [session, loading, pathname, navigate, hasProfile]);

  if (loading || (session && hasProfile === null) || !minTimeElapsed) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-8 relative">
        <img src="/brand/logo-navy-trim.png" alt="Range Rat" className="h-24 w-auto dark:hidden" />
        <img src="/brand/logo-white-solid.png" alt="Range Rat" className="h-24 w-auto hidden dark:block" />
        <div className="absolute bottom-12 left-0 right-0 flex justify-center">
          <div className="h-6 w-6 rounded-full border-[2.5px] border-border border-t-primary animate-spin" />
        </div>
      </div>
    );
  }

  return <Outlet />;
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App crash:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-6">
          <div className="max-w-sm text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <span className="text-2xl">!</span>
            </div>
            <h1 className="font-display text-[28px] leading-tight">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              An unexpected error occurred. Tap below to reload.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 h-12 w-full rounded-[14px] bg-primary text-primary-foreground font-bold text-[14px] uppercase tracking-[0.06em] active:opacity-90 transition-opacity"
            >
              Reload app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function RootComponent() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </ErrorBoundary>
  );
}
