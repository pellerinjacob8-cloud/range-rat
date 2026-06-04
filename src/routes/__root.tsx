import { useEffect, useState } from "react";
import { Outlet, Link, createRootRoute, useNavigate, useLocation } from "@tanstack/react-router";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { fetchProfile } from "@/lib/db";

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
  // null = unknown, true = has name, false = needs onboarding
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session) { setHasProfile(null); return; }
    fetchProfile().then((p) => {
      const has = !!(p?.firstName?.trim());
      // Cache in localStorage so subsequent loads are instant
      if (has) {
        try { localStorage.setItem("rangeRat_profile", JSON.stringify(p)); } catch {}
      }
      setHasProfile(has);
    });
  }, [session]);

  useEffect(() => {
    if (loading) return;

    const isAuthRoute = pathname === "/login" || pathname.startsWith("/onboarding") || pathname === "/onboarding/signup";

    if (!session) {
      if (!isAuthRoute) navigate({ to: "/login" });
      return;
    }

    // Still fetching profile — wait
    if (hasProfile === null) return;

    if (!isAuthRoute && !hasProfile) {
      navigate({ to: "/onboarding/welcome" });
    }

    if (pathname === "/login") {
      navigate({ to: hasProfile ? "/" : "/onboarding/welcome" });
    }
  }, [session, loading, pathname, navigate, hasProfile]);

  if (loading || (session && hasProfile === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return <Outlet />;
}

function RootComponent() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
