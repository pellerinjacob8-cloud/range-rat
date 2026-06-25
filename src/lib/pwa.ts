// Shared helpers for the "Add to Home Screen" (PWA install) flow, used by both
// the home install banner and the profile setup checklist.

const INSTALLED_KEY = "rr-pwa-installed";

// True when the app is already running as an installed PWA.
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

// iOS Safari has no beforeinstallprompt; installing is a manual share-menu step.
export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) && !(navigator as any).standalone;
}

// "Done" when actually installed (standalone) or the user marked it added.
export function isHomeScreenDone(): boolean {
  if (isStandalone()) return true;
  try {
    return localStorage.getItem(INSTALLED_KEY) === "true";
  } catch {
    return false;
  }
}

// User confirmed they added it (or auto-detected). Permanently suppresses the
// install banner and checks the checklist item.
export function markHomeScreenInstalled(): void {
  try {
    localStorage.setItem(INSTALLED_KEY, "true");
  } catch {}
}
