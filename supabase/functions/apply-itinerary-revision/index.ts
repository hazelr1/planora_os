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

// ─── DB row shapes ────────────────────────────────────────────────────────────

interface DbActivity {
  id: string;
  trip_day_id: string;
  trip_id: string;
  title: string;
  description: string;
  time: string;
  location: string;
  duration_minutes: number;
  estimated_cost: number;
  cost_confidence: string;
  currency: string;
  category: string;
  ai_reason: string;
  is_locked: boolean;
  personal_note: string;
  sort_order: number;
  latitude: number | null;
  longitude: number | null;
}

interface DbRevision {
  id: string;
  trip_id: string;
  user_id: string;
  prompt: string;
  status: string;
  proposed_json: ProposalJson | null;
}

// ─── Proposal shape (must match revise-itinerary's output) ───────────────────

interface ActivitySnapshot {
  title: string;
  description: string;
  location: string;
  start_time: string;
  duration_minutes: number;
  estimated_cost: number;
  cost_confidence?: "low" | "medium" | "high";
  category: string;
  ai_reason: string;
  latitude?: number;
  longitude?: number;
}

interface ProposalChange {
  operation: string;
  activity_id: string;
  source_day_id: string;
  destination_day_id: string;
  before: ActivitySnapshot;
  after: ActivitySnapshot;
  day_theme?: string;
  day_summary?: string;
  day_activities?: ActivitySnapshot[];
  reason: string;
}

interface ProposalJson {
  summary: string;
  changes: ProposalChange[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_CATEGORIES = new Set([
  "Food", "Culture", "Nature", "Adventure", "History",
  "Shopping", "Nightlife", "Transport", "Accommodation", "Other",
]);

function normaliseCategory(raw: string): string {
  const cap = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  return VALID_CATEGORIES.has(cap) ? cap : "Other";
}

function snapshotToInsert(
  snap: ActivitySnapshot,
  dayId: string,
  tripId: string,
  currency: string,
  sortOrder: number,
): Record<string, unknown> {
  const hasCoords = typeof snap.latitude === "number" && typeof snap.longitude === "number"
    && Math.abs(snap.latitude) <= 90 && Math.abs(snap.longitude) <= 180 && (snap.latitude !== 0 || snap.longitude !== 0);

  return {
    trip_day_id: dayId,
    trip_id: tripId,
    title: snap.title || "Activity",
    description: snap.description || "",
    time: snap.start_time || "",
    location: snap.location || "",
    duration_minutes: Math.max(1, snap.duration_minutes || 60),
    estimated_cost: Math.max(0, snap.estimated_cost ?? 0),
    cost_confidence: snap.cost_confidence ?? "medium",
    currency,
    category: normaliseCategory(snap.category || "Other"),
    ai_reason: snap.ai_reason || "",
    is_locked: false,
    personal_note: "[]",
    sort_order: sortOrder,
    latitude: hasCoords ? snap.latitude : null,
    longitude: hasCoords ? snap.longitude : null,
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonRes({ error: "Authentication required." }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    // Use service role for bulk mutations — ownership is verified through the user client first
    const svcClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return jsonRes({ error: "Authentication required." }, 401);

    // ── Input ─────────────────────────────────────────────────────────────────
    let body: { revision_id?: string };
    try { body = await req.json(); } catch { return jsonRes({ error: "Invalid JSON body." }, 400); }
    const { revision_id } = body;
    if (!revision_id?.trim()) return jsonRes({ error: "revision_id is required." }, 400);

    // ── Load revision (user client = ownership via RLS) ───────────────────────
    const { data: revData, error: revErr } = await userClient
      .from("ai_revisions")
      .select("id, trip_id, user_id, prompt, status, proposed_json")
      .eq("id", revision_id)
      .maybeSingle();

    if (revErr) { console.error("[apply] revision load:", revErr.message); return jsonRes({ error: "Could not load revision." }, 500); }
    if (!revData) return jsonRes({ error: "Revision not found." }, 404);

    const revision = revData as DbRevision;

    if (revision.status !== "proposed") {
      return jsonRes({ error: `This revision has already been ${revision.status}. No changes were made.` }, 409);
    }

    const proposal = revision.proposed_json;
    if (!proposal || !Array.isArray(proposal.changes)) {
      return jsonRes({ error: "Revision has no valid proposal data." }, 422);
    }

    // ── Verify trip ownership ─────────────────────────────────────────────────
    const { data: tripData, error: tripErr } = await userClient
      .from("trips")
      .select("id, currency, start_date, end_date")
      .eq("id", revision.trip_id)
      .maybeSingle();

    if (tripErr) { console.error("[apply] trip load:", tripErr.message); return jsonRes({ error: "Could not verify trip." }, 500); }
    if (!tripData) return jsonRes({ error: "Trip not found." }, 404);

    const trip = tripData as { id: string; currency: string; start_date: string; end_date: string };
    const tripCurrency: string = trip.currency || "USD";

    // ── Load current activities ───────────────────────────────────────────────
    const { data: actsData, error: actsErr } = await svcClient
      .from("activities")
      .select("*")
      .eq("trip_id", revision.trip_id)
      .order("sort_order", { ascending: true });

    if (actsErr || !actsData) { console.error("[apply] activities load:", actsErr?.message); return jsonRes({ error: "Could not load activities." }, 500); }
    const activities = actsData as DbActivity[];
    const activitiesById = new Map(activities.map((a) => [a.id, a]));

    // ── Load days ─────────────────────────────────────────────────────────────
    const { data: daysData, error: daysErr } = await svcClient
      .from("trip_days")
      .select("id, sort_order, date")
      .eq("trip_id", revision.trip_id)
      .order("sort_order", { ascending: true });

    if (daysErr || !daysData) { console.error("[apply] days load:", daysErr?.message); return jsonRes({ error: "Could not load trip days." }, 500); }
    type DbTripDayRow = { id: string; sort_order: number; date: string };
    const dayRows = daysData as DbTripDayRow[];
    const dayIds = new Set(dayRows.map((d) => d.id));

    // ── Whole-day changes (add_day / remove_day) ──────────────────────────────
    // Processed first and separately from the activity-level passes below:
    // these add or remove entire trip_days rows (never touched by the
    // per-activity add/remove/move/replace/update operations). trip_days must
    // stay a contiguous run from start_date to end_date, one calendar day
    // apart, the same invariant generate-itinerary guarantees on creation —
    // so start_date never moves, and any removal (wherever it happens in the
    // trip) cascades every later day's date/sort_order/label back by one to
    // close the gap, then shortens end_date by one day. add_day always
    // appends after the current last day. The model's own day IDs are
    // trusted for *which* day to remove, never for dates — those are always
    // recomputed here.
    function addOneDay(dateStr: string): string {
      const d = new Date(dateStr + "T00:00:00");
      d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    }

    const dayLevelChanges = proposal.changes.filter(
      (c) => c.operation === "add_day" || c.operation === "remove_day",
    );

    // Mutable working copy of the day sequence — kept in sort_order order so
    // add/remove within the same request compose correctly.
    const currentDays: DbTripDayRow[] = [...dayRows];
    const dayLevelErrors: string[] = [];

    for (const change of dayLevelChanges) {
      if (change.operation === "add_day") {
        const last = currentDays[currentDays.length - 1] ?? null;
        const newDate = last ? addOneDay(last.date) : trip.start_date;
        const newSortOrder = last ? last.sort_order + 1 : 1;

        const { data: newDayData, error: insErr } = await svcClient
          .from("trip_days")
          .insert({
            trip_id: revision.trip_id,
            label: `Day ${newSortOrder}`,
            date: newDate,
            theme: change.day_theme || "",
            summary: change.day_summary || "",
            sort_order: newSortOrder,
          })
          .select("id, sort_order, date")
          .maybeSingle();

        if (insErr || !newDayData) {
          dayLevelErrors.push("Could not add a new day.");
          continue;
        }

        const newDay = newDayData as DbTripDayRow;
        const dayActivities = change.day_activities ?? [];
        for (let k = 0; k < dayActivities.length; k++) {
          const row = snapshotToInsert(dayActivities[k], newDay.id, revision.trip_id, tripCurrency, k);
          const { error: actInsErr } = await svcClient.from("activities").insert(row);
          if (actInsErr) dayLevelErrors.push(`Could not add activity "${dayActivities[k].title}" to the new day.`);
        }

        dayIds.add(newDay.id);
        currentDays.push(newDay);
      } else if (change.operation === "remove_day") {
        const idx = currentDays.findIndex((d) => d.id === change.source_day_id);
        if (idx === -1) {
          dayLevelErrors.push("Could not find the day to remove — this proposal may be stale, please request a new one.");
          continue;
        }
        if (currentDays.length <= 1) {
          dayLevelErrors.push("Cannot remove the only remaining day in a trip.");
          continue;
        }
        const target = currentDays[idx];
        if (activities.some((a) => a.trip_day_id === target.id && a.is_locked)) {
          dayLevelErrors.push(`Cannot remove Day ${target.sort_order} — it contains a locked activity. Unlock it first.`);
          continue;
        }

        const { error: delErr } = await svcClient.from("trip_days").delete().eq("id", target.id);
        if (delErr) {
          dayLevelErrors.push("Could not remove day.");
          continue;
        }

        dayIds.delete(target.id);
        currentDays.splice(idx, 1);

        // Cascade every day from the removed slot onward back by one
        // calendar day and renumber it, so the trip stays contiguous and
        // "Day N" labels stay sequential with no gap left behind.
        for (let k = idx; k < currentDays.length; k++) {
          const day = currentDays[k];
          const newDate = k === idx ? target.date : addOneDay(currentDays[k - 1].date);
          const newSortOrder = k + 1;
          const { error: shiftErr } = await svcClient
            .from("trip_days")
            .update({ date: newDate, sort_order: newSortOrder, label: `Day ${newSortOrder}` })
            .eq("id", day.id);
          if (shiftErr) dayLevelErrors.push(`Could not reflow Day ${day.sort_order} after removal.`);
          currentDays[k] = { ...day, date: newDate, sort_order: newSortOrder };
        }
      }
    }

    if (dayLevelErrors.length > 0) {
      return jsonRes({ error: dayLevelErrors[0] }, 422);
    }

    const tripEndDate = currentDays.length > 0 ? currentDays[currentDays.length - 1].date : trip.end_date;
    if (tripEndDate !== trip.end_date) {
      const { error: endDateErr } = await svcClient
        .from("trips")
        .update({ end_date: tripEndDate })
        .eq("id", revision.trip_id);
      if (endDateErr) console.error("[apply] trip end_date update:", endDateErr.message);
    }

    // ── Validation pass ───────────────────────────────────────────────────────
    const activitiesPerDay = new Map<string, number>();
    for (const act of activities) {
      activitiesPerDay.set(act.trip_day_id, (activitiesPerDay.get(act.trip_day_id) ?? 0) + 1);
    }

    for (const change of proposal.changes) {
      const op = change.operation;

      if (change.activity_id) {
        const current = activitiesById.get(change.activity_id);
        if (!current && op !== "add") {
          return jsonRes({
            error: `Activity "${change.before?.title || change.activity_id}" no longer exists. This proposal may be stale — please request a new one.`,
          }, 409);
        }
        if (current) {
          // Staleness check: title must still match for non-trivial values
          if (change.before?.title && change.before.title !== current.title) {
            return jsonRes({
              error: `Activity "${change.before.title}" has been modified since this proposal was created. Please request a fresh proposal.`,
            }, 409);
          }
          // Locked activity protection
          if (current.is_locked && ["remove", "replace", "move", "update"].includes(op)) {
            return jsonRes({
              error: `Cannot ${op} locked activity "${current.title}". Unlock it first.`,
            }, 422);
          }
        }
      }

      // Destination day must exist for add/move
      if ((op === "add" || op === "move") && change.destination_day_id) {
        if (!dayIds.has(change.destination_day_id)) {
          return jsonRes({ error: `Target day for "${change.after?.title || "activity"}" was not found.` }, 422);
        }
      }
    }

    // Check max activities per day after applies
    const projectedPerDay = new Map(activitiesPerDay);
    for (const change of proposal.changes) {
      if (change.operation === "add") {
        const d = change.destination_day_id;
        projectedPerDay.set(d, (projectedPerDay.get(d) ?? 0) + 1);
      }
      if (change.operation === "remove") {
        const act = activitiesById.get(change.activity_id);
        if (act) projectedPerDay.set(act.trip_day_id, Math.max(0, (projectedPerDay.get(act.trip_day_id) ?? 0) - 1));
      }
      if (change.operation === "replace") {
        const act = activitiesById.get(change.activity_id);
        if (act) {
          projectedPerDay.set(act.trip_day_id, Math.max(0, (projectedPerDay.get(act.trip_day_id) ?? 0) - 1));
          projectedPerDay.set(act.trip_day_id, (projectedPerDay.get(act.trip_day_id) ?? 0) + 1);
        }
      }
      if (change.operation === "move" && change.activity_id && change.destination_day_id) {
        const act = activitiesById.get(change.activity_id);
        if (act) {
          projectedPerDay.set(act.trip_day_id, Math.max(0, (projectedPerDay.get(act.trip_day_id) ?? 0) - 1));
          projectedPerDay.set(change.destination_day_id, (projectedPerDay.get(change.destination_day_id) ?? 0) + 1);
        }
      }
    }
    for (const [, count] of projectedPerDay) {
      if (count > 6) {
        return jsonRes({ error: `Applying these changes would put more than 6 activities in a single day. Please request a revised proposal.` }, 422);
      }
    }

    // ── Apply changes ─────────────────────────────────────────────────────────
    const affectedDayIds = new Set<string>();
    const errors: string[] = [];

    // Pass 1: Removes
    const toRemove = proposal.changes
      .filter((c) => c.operation === "remove" || c.operation === "replace")
      .map((c) => c.activity_id)
      .filter(Boolean);

    if (toRemove.length > 0) {
      const { error: delErr } = await svcClient
        .from("activities")
        .delete()
        .in("id", toRemove)
        .eq("trip_id", revision.trip_id);
      if (delErr) {
        console.error("[apply] remove error:", delErr.message);
        errors.push(`Remove failed: ${delErr.message}`);
      } else {
        for (const id of toRemove) {
          const act = activitiesById.get(id);
          if (act) affectedDayIds.add(act.trip_day_id);
        }
      }
    }

    if (errors.length > 0) return jsonRes({ error: errors.join(" ") }, 500);

    // Pass 2: Moves
    for (const change of proposal.changes.filter((c) => c.operation === "move")) {
      if (!change.activity_id || !change.destination_day_id) continue;
      const current = activitiesById.get(change.activity_id);
      if (!current) continue;

      const { error: moveErr } = await svcClient
        .from("activities")
        .update({ trip_day_id: change.destination_day_id, updated_at: new Date().toISOString() })
        .eq("id", change.activity_id)
        .eq("trip_id", revision.trip_id);

      if (moveErr) {
        console.error("[apply] move error:", moveErr.message);
        errors.push(`Move failed for "${current.title}": ${moveErr.message}`);
      } else {
        affectedDayIds.add(current.trip_day_id);
        affectedDayIds.add(change.destination_day_id);
      }
    }

    if (errors.length > 0) return jsonRes({ error: errors[0] }, 500);

    // Pass 3: Updates
    for (const change of proposal.changes.filter((c) => c.operation === "update")) {
      if (!change.activity_id) continue;
      const current = activitiesById.get(change.activity_id);
      if (!current) continue;

      const snap = change.after;
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (snap.title) patch.title = snap.title;
      if (snap.description !== undefined) patch.description = snap.description;
      if (snap.location !== undefined) patch.location = snap.location;
      if (snap.start_time !== undefined) patch.time = snap.start_time;
      if (snap.duration_minutes > 0) patch.duration_minutes = snap.duration_minutes;
      if (snap.estimated_cost >= 0) patch.estimated_cost = snap.estimated_cost;
      if (snap.cost_confidence) patch.cost_confidence = snap.cost_confidence;
      if (snap.category) patch.category = normaliseCategory(snap.category);
      if (snap.ai_reason) patch.ai_reason = snap.ai_reason;
      if (typeof snap.latitude === "number" && typeof snap.longitude === "number"
        && (snap.latitude !== 0 || snap.longitude !== 0)) {
        patch.latitude = snap.latitude;
        patch.longitude = snap.longitude;
      }

      const { error: updErr } = await svcClient
        .from("activities")
        .update(patch)
        .eq("id", change.activity_id)
        .eq("trip_id", revision.trip_id);

      if (updErr) {
        console.error("[apply] update error:", updErr.message);
        errors.push(`Update failed for "${current.title}": ${updErr.message}`);
      } else {
        affectedDayIds.add(current.trip_day_id);
      }
    }

    if (errors.length > 0) return jsonRes({ error: errors[0] }, 500);

    // Pass 4: Adds (including the "after" of replace)
    const toAdd = proposal.changes.filter((c) => c.operation === "add" || c.operation === "replace");

    for (const change of toAdd) {
      const dayId = change.operation === "add"
        ? change.destination_day_id
        : (activitiesById.get(change.activity_id)?.trip_day_id ?? change.source_day_id);

      if (!dayId) continue;

      // Current max sort_order in day
      const currentMax = activities
        .filter((a) => a.trip_day_id === dayId && !toRemove.includes(a.id))
        .reduce((m, a) => Math.max(m, a.sort_order), -1);

      const row = snapshotToInsert(change.after, dayId, revision.trip_id, tripCurrency, currentMax + 1);
      const { error: addErr } = await svcClient.from("activities").insert(row);

      if (addErr) {
        console.error("[apply] add error:", addErr.message);
        errors.push(`Add failed for "${change.after.title}": ${addErr.message}`);
      } else {
        affectedDayIds.add(dayId);
      }
    }

    if (errors.length > 0) return jsonRes({ error: errors[0] }, 500);

    // ── Recalculate sort_order for affected days ───────────────────────────────
    // Previously one awaited round trip per activity per day, sequentially —
    // for a handful of affected multi-activity days this added several
    // seconds of pure network latency after the mutations above had already
    // completed, long enough that the client's "Applying…" state looked
    // stuck even though the revision had already succeeded. Fetching each
    // day's order is still sequential (cheap, one SELECT per day), but the
    // per-activity sort_order writes within and across days are independent
    // rows with no ordering dependency on each other, so they can all fire
    // concurrently.
    const sortUpdates: Promise<unknown>[] = [];
    for (const dayId of affectedDayIds) {
      const { data: dayActs } = await svcClient
        .from("activities")
        .select("id")
        .eq("trip_day_id", dayId)
        .order("sort_order", { ascending: true });

      if (!dayActs) continue;
      const ids = (dayActs as { id: string }[]).map((r) => r.id);
      ids.forEach((id, i) => {
        sortUpdates.push(svcClient.from("activities").update({ sort_order: i }).eq("id", id));
      });
    }
    await Promise.all(sortUpdates);

    // ── Mark revision accepted ────────────────────────────────────────────────
    await svcClient
      .from("ai_revisions")
      .update({ status: "accepted", decided_at: new Date().toISOString() })
      .eq("id", revision_id);

    console.log(`[apply] revision ${revision_id} applied for trip ${revision.trip_id} by user ${user.id}`);

    return jsonRes({ success: true });
  } catch (err) {
    console.error("[apply] Unhandled error:", err);
    return jsonRes({ error: "An unexpected error occurred." }, 500);
  }
});
