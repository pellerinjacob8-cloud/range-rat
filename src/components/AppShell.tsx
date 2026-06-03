import { Link, useRouter, useLocation } from "@tanstack/react-router";
import { ChevronLeft, Flag, Home, Settings, Target, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";

interface AppShellProps {
  children: React.ReactNode;
  showBack?: boolean;
  hideTabBar?: boolean;
}

const tabs = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/practice", label: "Practice", Icon: Target },
  { href: "/games", label: "Games", Icon: Flag },
  { href: "/profile", label: "Profile", Icon: User },
] as const;

export function AppShell({ children, showBack = false, hideTabBar = false }: AppShellProps) {
  const router = useRouter();
  const location = useLocation();
  const { theme } = useTheme();

  function isActive(href: string) {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pt-[env(safe-area-inset-top)]">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex w-full max-w-[430px] items-center justify-between px-4 h-14">
          {/* Left */}
          <div className="flex items-center gap-2 min-w-12">
            {showBack && (
              <button
                onClick={() => router.history.back()}
                aria-label="Back"
                className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground active:bg-muted"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Center — logo */}
          <img
            src={theme === "dark" ? "/brand/monogram-rr-white.png" : "/brand/monogram-rr-navy.png"}
            alt="Range Rat"
            className="h-8 w-auto"
          />

          {/* Right */}
          <div className="flex items-center justify-end min-w-12">
            <Link
              to="/profile"
              aria-label="Settings"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground active:bg-muted"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      <main
        className={cn(
          "mx-auto w-full max-w-[430px] flex-1 px-4 pt-4",
          hideTabBar
            ? "pb-8"
            : "pb-[calc(6.5rem+env(safe-area-inset-bottom))]"
        )}
      >
        {children}
      </main>

      {!hideTabBar && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/94 backdrop-blur-md border-t border-border">
          <div className="mx-auto flex w-full max-w-[430px] items-end justify-around pt-2 pb-[calc(18px+env(safe-area-inset-bottom))]">
            {tabs.map(({ href, label, Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  to={href}
                  className="flex flex-col items-center gap-0.5"
                >
                  <Icon
                    size={22}
                    strokeWidth={active ? 2 : 1.6}
                    className={active ? "text-primary" : "text-muted-foreground"}
                  />
                  <span
                    className={cn(
                      "text-[12px] uppercase tracking-[0.06em]",
                      active ? "font-bold text-primary" : "font-semibold text-muted-foreground"
                    )}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
