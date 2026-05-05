import { useNavigate } from "@tanstack/react-router";
import { Flag } from "lucide-react";

interface QuitGameButtonProps {
  onBeforeQuit?: () => void;
  label?: string;
}

export function QuitGameButton({ onBeforeQuit, label = "Quit Game" }: QuitGameButtonProps) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => {
        onBeforeQuit?.();
        navigate({ to: "/" });
      }}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold uppercase tracking-wide text-muted-foreground transition active:scale-[0.99] active:text-destructive"
    >
      <Flag className="h-4 w-4" /> {label}
    </button>
  );
}
