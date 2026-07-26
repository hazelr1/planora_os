import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Scheduled hourly by a pg_cron job (see the cron.schedule migration) —
 * sweeps auth.users for demo accounts (user_metadata.is_demo_user) whose
 * user_metadata.demo_expires_at has passed, and deletes them via the same
 * auth.admin.deleteUser() call delete-account already uses. profiles/
 * trips/trip_days/activities/ai_revisions all reference auth.users(id) ON
 * DELETE CASCADE (see the baseline schema migration), so this one call is
 * sufficient — no separate per-table cleanup needed here either.
 *
 * Not reachable with a normal user JWT: verify_jwt is off for this function
 * (see supabase/config.toml) and the check below instead requires a
 * dedicated CRON_TRIGGER_SECRET, known only to this function (as an edge
 * function secret) and the pg_cron job that calls it (via Vault) —
 * deliberately not the project's service-role key itself, so a leak of
 * this one shared secret can only ever trigger this one cleanup sweep,
 * never grant full service-role access.
 */
Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get("CRON_TRIGGER_SECRET");
  const authHeader = req.headers.get("Authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return jsonRes({ error: "Unauthorized." }, 401);
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const now = Date.now();
    let checked = 0;
    let deleted = 0;
    let page = 1;
    const perPage = 200;

    // auth.admin.listUsers() has no server-side filter for user_metadata,
    // so this walks every page and filters client-side — fine at this
    // project's scale (a handful of live demo accounts at a time, not
    // thousands).
    for (;;) {
      const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error("[delete-expired-demo-accounts] listUsers:", error.message);
        return jsonRes({ error: "Could not list users." }, 500);
      }

      const users = data.users;
      if (users.length === 0) break;
      checked += users.length;

      for (const user of users) {
        const isDemo = user.user_metadata?.is_demo_user === true;
        const expiresAt = user.user_metadata?.demo_expires_at as string | undefined;
        if (!isDemo || !expiresAt) continue;
        if (new Date(expiresAt).getTime() > now) continue;

        const { error: delErr } = await adminClient.auth.admin.deleteUser(user.id);
        if (delErr) {
          console.error(`[delete-expired-demo-accounts] deleteUser ${user.id}:`, delErr.message);
          continue;
        }
        deleted++;
      }

      if (users.length < perPage) break;
      page++;
    }

    console.log(`[delete-expired-demo-accounts] checked ${checked}, deleted ${deleted} expired demo account(s)`);
    return jsonRes({ checked, deleted });
  } catch (err) {
    console.error("[delete-expired-demo-accounts] Unhandled error:", err);
    return jsonRes({ error: "An unexpected error occurred." }, 500);
  }
});
