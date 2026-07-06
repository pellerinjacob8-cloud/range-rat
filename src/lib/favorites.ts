import { toast } from "sonner";
import type { GenerateInput, SessionDrill } from "./drills";
import { fetchFavorites, insertFavorite, insertCustomSession, removeFavorite } from "./db";

export const FAVORITES_KEY = "range-rat:favorites";
export const FREE_LIMIT = 1;

export interface Favorite {
  id: string;
  name: string;
  sessionInput: GenerateInput | null;
  session: SessionDrill[];
  createdAt: number;
}

export { fetchFavorites as loadFavoritesAsync };

export function saveFavorite(name: string, sessionInput: GenerateInput, session: SessionDrill[]): Favorite {
  const fav: Favorite = {
    id: `fav-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim(),
    sessionInput,
    session,
    createdAt: Date.now(),
  };
  insertFavorite(fav).catch(() => toast.error("Couldn't save favorite. Check your connection and try again."));
  return fav;
}

export function saveCustomSession(name: string, drills: SessionDrill[]): Favorite {
  const fav: Favorite = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim(),
    sessionInput: null,
    session: drills,
    createdAt: Date.now(),
  };
  insertCustomSession(fav).catch(() => toast.error("Couldn't save session. Check your connection and try again."));
  return fav;
}

export function deleteFavorite(id: string) {
  removeFavorite(id).catch(() => toast.error("Couldn't delete favorite. Check your connection and try again."));
}

export function isAtFreeLimit(favorites: Favorite[]): boolean {
  return favorites.filter((f) => f.sessionInput !== null).length >= FREE_LIMIT;
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
