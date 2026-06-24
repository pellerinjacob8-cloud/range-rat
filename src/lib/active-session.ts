export interface ActiveSessionMarker {
  type: "practice" | "round-warmup" | "play-solo" | "play-game" | "combine" | "ctp" | "grid" | "fairway";
  route: string;
  label: string;     // shown as first line on Home resume card
  subtitle: string;  // shown as second line
}

const KEY = "range-rat:active-session";

export function saveActiveMarker(marker: ActiveSessionMarker): void {
  try {
    const existing = loadActiveMarker();
    // Preserve practice's full session data if it exists alongside the marker fields
    const merged = existing && "session" in existing ? { ...existing, ...marker } : marker;
    localStorage.setItem(KEY, JSON.stringify(merged));
  } catch {}
}

export function loadActiveMarker(): (ActiveSessionMarker & Record<string, unknown>) | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearActiveSession(): void {
  try { localStorage.removeItem(KEY); } catch {}
}
