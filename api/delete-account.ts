import type { IncomingMessage, ServerResponse } from "http";
import { ensureSentry, Sentry } from "./_sentry.js";
import { getSupabaseAdmin, missingEnv } from "./_config.js";

// Tables keyed by user_id that hold this user's data. profiles is keyed by id
// and handled separately. Deleting rows explicitly (rather than relying on a
// cascade) keeps cleanup correct regardless of the FK setup.
const USER_TABLES = ["sessions", "bag", "favorites", "handicap_history", "yardages", "putting_zones"] as const;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  ensureSentry();
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.writeHead(405);
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const missing = missingEnv();
  if (missing.length) {
    console.error("Delete account misconfigured, missing env:", missing.join(", "));
    res.writeHead(503);
    res.end(JSON.stringify({ error: "Server configuration error" }));
    return;
  }

  try {
    const supabase = getSupabaseAdmin();

    // Identity comes only from the verified JWT, never the request body.
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: "Not authenticated" }));
      return;
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: "Invalid session" }));
      return;
    }

    const userId = user.id;

    // 1. Remove the user's data rows.
    for (const table of USER_TABLES) {
      const { error } = await supabase.from(table).delete().eq("user_id", userId);
      // Tolerate tables whose migration hasn't run yet (undefined_table);
      // any other failure must still block the auth-user deletion below.
      if (error && error.code !== "42P01" && !/does not exist/i.test(error.message)) {
        throw new Error(`Failed to clear ${table}: ${error.message}`);
      }
    }
    const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId);
    if (profileError) throw new Error(`Failed to clear profile: ${profileError.message}`);

    // 2. Delete the auth user last, so a failure above leaves the account intact.
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) throw new Error(deleteError.message);

    res.writeHead(200);
    res.end(JSON.stringify({ deleted: true }));
  } catch (err: any) {
    Sentry.captureException(err);
    console.error("Delete account error:", err);
    res.writeHead(500);
    res.end(JSON.stringify({ error: "Could not delete account. Please try again." }));
  }
}
