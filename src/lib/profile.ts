const PROFILE_KEY = "rangeRat_profile";

/**
 * Returns the saved golfer profile name (trimmed), or an empty string if none
 * has been set. Use this to pre-fill "Player 1" slots across games and modes.
 */
export function loadProfileName(): string {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { name?: string };
      return parsed?.name?.trim() ?? "";
    }
  } catch {}
  return "";
}
