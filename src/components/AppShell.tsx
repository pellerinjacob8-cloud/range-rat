import { Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft, Moon, Sun, Target } from "lucide-react";
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
        <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2 min-w-12">
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

          <Link to="/" className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <span className="font-display text-lg font-bold tracking-tight uppercase">
              Range Rat
            </span>
          </Link>

          <div className="flex items-center justify-end min-w-12">
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
