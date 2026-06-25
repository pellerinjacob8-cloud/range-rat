import { X, Share, SquarePlus, Check } from "lucide-react";

interface InstallSheetProps {
  open: boolean;
  onClose: () => void;
  // Called when the user confirms they've added the app (or taps "Already added").
  onMarkInstalled: () => void;
  // Android only: a native install prompt is available.
  canInstall?: boolean;
  onInstall?: () => void;
}

function StepNum({ n }: { n: number }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[12px] font-bold text-primary">
      {n}
    </span>
  );
}

export function InstallSheet({ open, onClose, onMarkInstalled, canInstall, onInstall }: InstallSheetProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[22px] bg-background border border-border p-6 mb-4 sm:mb-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display text-[24px] leading-tight">Add to Home Screen</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground -mr-1 p-1">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-5">
          Install Range Rat for full-screen, app-like access right from your home screen.
        </p>

        {canInstall && onInstall ? (
          <button
            onClick={onInstall}
            className="h-14 w-full rounded-[14px] bg-primary text-white font-bold text-[14px] uppercase tracking-[0.06em] mb-3 active:opacity-90 transition-opacity"
          >
            Install
          </button>
        ) : (
          <ol className="space-y-3.5 mb-6">
            <li className="flex items-center gap-3 text-[14px] text-foreground">
              <StepNum n={1} />
              <span className="flex items-center gap-1.5">
                Tap the <Share className="h-4 w-4 text-primary" /> Share icon in your browser.
              </span>
            </li>
            <li className="flex items-center gap-3 text-[14px] text-foreground">
              <StepNum n={2} />
              <span className="flex items-center gap-1.5">
                Choose <span className="font-semibold">Add to Home Screen</span> <SquarePlus className="h-4 w-4 text-primary" />.
              </span>
            </li>
            <li className="flex items-center gap-3 text-[14px] text-foreground">
              <StepNum n={3} />
              <span>Tap <span className="font-semibold">Add</span> to finish.</span>
            </li>
          </ol>
        )}

        <button
          onClick={onMarkInstalled}
          className="h-14 w-full rounded-[14px] border border-border bg-card text-foreground font-bold text-[14px] uppercase tracking-[0.06em] active:bg-muted transition-colors flex items-center justify-center gap-2"
        >
          <Check className="h-4 w-4" /> I've added it
        </button>
      </div>
    </div>
  );
}
