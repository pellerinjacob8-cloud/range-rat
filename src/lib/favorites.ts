import type { GenerateInput, SessionDrill } from "./drills";

export const FAVORITES_KEY = "range-rat:favorites";
export const FREE_LIMIT = 1;

export interface Favorite {
  id: string;
  name: string;
  sessionInput: GenerateInput;
  session: SessionDrill[];
  createdAt: number;
}

export function loadFavorites(): Favorite[] {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]") as Favorite[];
  } catch {
    return [];
  }
}

function persistFavorites(favs: Favorite[]) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  } catch {}
}

export function saveFavorite(name: string, sessionInput: GenerateInput, session: SessionDrill[]): Favorite {
  const fav: Favorite = {
    id: `fav-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim(),
    sessionInput,
    session,
    createdAt: Date.now(),
  };
  persistFavorites([...loadFavorites(), fav]);
  return fav;
}

export function deleteFavorite(id: string) {
  persistFavorites(loadFavorites().filter((f) => f.id !== id));
}

export function isAtFreeLimit(): boolean {
  return loadFavorites().length >= FREE_LIMIT;
}

/** Generate a default name for a session based on its config and today's date */
export function defaultFavoriteName(sessionInput: GenerateInput): string {
  const groupLabel =
    sessionInput.clubGroups[0] === "full-bag"
      ? "Full Bag"
      : sessionInput.clubGroups.length === 1
      ? capitalize(sessionInput.clubGroups[0].replace(/-/g, " "))
      : "Mixed";
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" });
  return `${groupLabel} Session · ${date}`;
}

function capitalize(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
