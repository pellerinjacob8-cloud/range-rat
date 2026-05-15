const PROFILE_KEY = "rangeRat_profile";

type StoredProfile = { firstName?: string; lastName?: string; name?: string };

/** First name only — used to pre-fill Player 1 in games. */
export function loadProfileName(): string {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as StoredProfile;
      // Prefer new firstName field, fall back to legacy name field
      return p.firstName?.trim() ?? p.name?.trim() ?? "";
    }
  } catch {}
  return "";
}

/** Full display name (First + Last) for profile screens and completion screens. */
export function loadProfileFullName(): string {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as StoredProfile;
      const first = p.firstName?.trim() ?? p.name?.trim() ?? "";
      const last = p.lastName?.trim() ?? "";
      return last ? `${first} ${last}` : first;
    }
  } catch {}
  return "";
}
