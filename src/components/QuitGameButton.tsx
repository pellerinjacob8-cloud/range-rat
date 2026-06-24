import { useNavigate } from "@tanstack/react-router";
import { Flag } from "lucide-react";
import { clearActiveSession } from "@/lib/active-session";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface QuitGameButtonProps {
  onBeforeQuit?: () => void;
  label?: string;
}

export function QuitGameButton({ onBeforeQuit, label = "Quit Game" }: QuitGameButtonProps) {
  const navigate = useNavigate();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold uppercase tracking-wide text-muted-foreground transition active:scale-[0.99] active:text-destructive"
        >
          <Flag className="h-4 w-4" /> {label}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Quit session?</AlertDialogTitle>
          <AlertDialogDescription>Your progress will be lost.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              clearActiveSession();
              onBeforeQuit?.();
              navigate({ to: "/" });
            }}
          >
            Quit
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
