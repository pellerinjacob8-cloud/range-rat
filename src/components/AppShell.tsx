import { Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

interface AppShellProps {
  children: React.ReactNode;
  showBack?: boolean;
}

export function AppShell({ children, showBack = false }: AppShellProps) {
  const { theme, toggle } = useTheme();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 h-16">
          {/* Left — back button or spacer */}
          <div className="flex items-center min-w-11">
            {showBack ? (
              <button
                onClick={() => router.history.back()}
                aria-label="Back"
                className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground active:bg-muted"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            ) : null}
          </div>

          {/* Center — RR monogram + wordmark */}
          <Link
            to="/"
            className="flex flex-col items-center gap-0.5"
            aria-label="Range Rat home"
          >
            {/* Light mode logo */}
            <img src="/brand/monogram-rr-navy.png" alt="Range Rat"
              className="block dark:hidden h-9 w-auto" draggable={false} />
            {/* Dark mode logo */}
            <img src="/brand/monogram-rr-white.png" alt="Range Rat"
              className="hidden dark:block h-9 w-auto" draggable={false} />
            <span className="block font-sans text-[9px] font-bold tracking-[0.25em] uppercase text-foreground/40 leading-none">
              Range Rat
            </span>
          </Link>

          {/* Right — theme toggle */}
          <div className="flex items-center justify-end min-w-11">
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground active:bg-muted"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-24 pt-4">{children}</main>
    </div>
  );
}
