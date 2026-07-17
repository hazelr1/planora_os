import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Permanently deletes the calling user's own account. Supabase has no
 * client-safe self-deletion API — auth.admin.deleteUser requires the
 * service-role key, which must never reach the browser — so this function
 * exists purely to run that one privileged call on the caller's own behalf,
 * after verifying their identity via their own JWT first.
 *
 * profiles/trips/trip_days/activities/ai_revisions all reference
 * auth.users(id) ON DELETE CASCADE (see the baseline schema migration), so
 * deleting the auth user row is sufficient to remove every trace of the
 * account — no separate per-table cleanup needed here.
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonRes({ error: "Authentication required." }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return jsonRes({ error: "Authentication required." }, 401);

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { error: deleteErr } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteErr) {
      console.error("[delete-account] deleteUser:", deleteErr.message);
      return jsonRes({ error: "Could not delete your account. Please try again." }, 500);
    }

    console.log(`[delete-account] Account ${user.id} deleted.`);
    return jsonRes({ success: true });
  } catch (err) {
    console.error("[delete-account] Unhandled error:", err);
    return jsonRes({ error: "An unexpected error occurred." }, 500);
  }
});
