import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !key) {
  if (typeof window !== "undefined") {
    throw new Error("Supabase environment variables are not configured.");
  }
}

export const supabase = createClient(url ?? "", key ?? "");
