import { supabase } from "./supabase";

// Permanently delete the signed-in user's account and all their data. The
// server derives identity from the JWT; we never send a raw userId.
export async function deleteAccount(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) throw new Error("Please sign in again to delete your account.");

  const res = await fetch("/api/delete-account", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const text = await res.text();
  let data: { deleted?: boolean; error?: string } = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("Unexpected server error. Please try again.");
  }

  if (!res.ok || !data.deleted) {
    throw new Error(data.error || "Could not delete account. Please try again.");
  }
}
