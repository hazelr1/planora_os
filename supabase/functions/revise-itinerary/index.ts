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
  category: string;
  ai_reason: string;
  is_locked: boolean;
  sort_order: number;
}

interface DbTripDay {
  id: string;
  trip_id: string;
  label: string;
  date: string;
  theme: string;
  sort_order: number;
}

interface DbTrip {
  id: string;
  user_id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget: number;
  currency: string;
  travelers: number;
  pace: string;
  interests: string[];
  special_requests: string;
}

// ─── Proposal types (match the contract with the frontend) ───────────────────

interface ActivitySnapshot {
  title: string;
  description: string;
  location: string;
  start_time: string;
  duration_minutes: number;
  estimated_cost: number;
  category: string;
  ai_reason: string;
}

interface ProposalChange {
  operation: string;
  activity_id: string;
  source_day_id: string;
  destination_day_id: string;
  before: ActivitySnapshot;
  after: ActivitySnapshot;
  reason: string;
}

interface ProposalConstraint {
  constraint: string;
  satisfied: boolean;
  explanation: string;
}

interface Proposal {
  summary: string;
  constraints: ProposalConstraint[];
  changes: ProposalChange[];
  old_estimated_total: number;
  new_estimated_total: number;
  budget_difference: number;
  pace_effect: string;
  warnings: string[];
}

// ─── OpenAI JSON schema ───────────────────────────────────────────────────────

const activitySnapshotSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    location: { type: "string" },
    start_time: { type: "string" },
    duration_minutes: { type: "integer" },
    estimated_cost: { type: "number" },
    category: { type: "string" },
    ai_reason: { type: "string" },
  },
  required: ["title", "description", "location", "start_time", "duration_minutes", "estimated_cost", "category", "ai_reason"],
  additionalProperties: false,
};

const proposalSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    constraints: {
      type: "array",
      items: {
        type: "object",
        properties: {
          constraint: { type: "string" },
          satisfied: { type: "boolean" },
          explanation: { type: "string" },
        },
        required: ["constraint", "satisfied", "explanation"],
        additionalProperties: false,
      },
    },
    changes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          operation: { type: "string", enum: ["add", "remove", "replace", "move", "update"] },
          activity_id: { type: "string" },
          source_day_id: { type: "string" },
          destination_day_id: { type: "string" },
          before: activitySnapshotSchema,
          after: activitySnapshotSchema,
          reason: { type: "string" },
        },
        required: ["operation", "activity_id", "source_day_id", "destination_day_id", "before", "after", "reason"],
        additionalProperties: false,
      },
    },
    old_estimated_total: { type: "number" },
    new_estimated_total: { type: "number" },
    budget_difference: { type: "number" },
    pace_effect: { type: "string" },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "constraints", "changes", "old_estimated_total", "new_estimated_total", "budget_difference", "pace_effect", "warnings"],
  additionalProperties: false,
};

// ─── Build itinerary context string ──────────────────────────────────────────

function buildContext(trip: DbTrip, days: DbTripDay[], activities: DbActivity[]): string {
  const actsByDay = new Map<string, DbActivity[]>();
  for (const a of activities) {
    if (!actsByDay.has(a.trip_day_id)) actsByDay.set(a.trip_day_id, []);
    actsByDay.get(a.trip_day_id)!.push(a);
  }

  const dayLines = days
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((d) => {
      const acts = (actsByDay.get(d.id) ?? []).sort((a, b) => a.sort_order - b.sort_order);
      const actLines = acts.map((a) =>
        `    - [id:${a.id}]${a.is_locked ? " [LOCKED]" : ""} ${a.time || "?"} | ${a.title} | ${a.category} | ${a.duration_minutes}min | ${trip.currency}${a.estimated_cost} | ${a.location}`
      ).join("\n");
      return `  ${d.label} (${d.date}) [day_id:${d.id}]\n${actLines || "    (no activities)"}`;
    })
    .join("\n");

  return `
Trip: ${trip.title}
Destination: ${trip.destination}
Dates: ${trip.start_date} to ${trip.end_date}
Budget: ${trip.budget} ${trip.currency} total | Travelers: ${trip.travelers} | Pace: ${trip.pace}
Interests: ${trip.interests.join(", ")}
${trip.special_requests ? `Special requests: ${trip.special_requests}` : ""}

CURRENT ITINERARY (use the exact IDs when referencing existing activities or days):
${dayLines}

RULES:
- Activities marked [LOCKED] MUST NOT be edited, moved, removed, or replaced.
- Maximum 6 activities per day.
- Estimated cost must be >= 0.
- Use "" for activity_id/source_day_id/destination_day_id when not applicable to the operation.
- For "add": activity_id="", source_day_id="", destination_day_id=<target day id>, before=all empty strings/zeros, after=new activity details.
- For "remove": activity_id=<id>, source_day_id=<day id>, destination_day_id="", after=all empty strings/zeros.
- For "move": activity_id=<id>, source_day_id=<from day id>, destination_day_id=<to day id>, before/after = same activity details.
- For "replace": activity_id=<existing id>, source_day_id=<day id>, destination_day_id="", before=existing activity, after=replacement.
- For "update": activity_id=<id>, source_day_id=<day id>, destination_day_id="", before=current values of changed fields (other fields empty/""), after=new values.
- In before/after for "add"/"remove" where data is not applicable, use: title="", description="", location="", start_time="", duration_minutes=0, estimated_cost=0, category="Other", ai_reason="".
`.trim();
}

// ─── Validate locked activities ───────────────────────────────────────────────

function validateLockedActivities(
  changes: ProposalChange[],
  lockedIds: Set<string>,
): { clean: ProposalChange[]; violations: string[] } {
  const clean: ProposalChange[] = [];
  const violations: string[] = [];

  for (const change of changes) {
    if (change.activity_id && lockedIds.has(change.activity_id)) {
      if (change.operation !== "update") {
        violations.push(
          `Removed invalid change: cannot ${change.operation} locked activity "${change.before.title || change.activity_id}".`
        );
        continue;
      }
    }
    clean.push(change);
  }

  return { clean, violations };
}

// ─── Call OpenAI ──────────────────────────────────────────────────────────────

async function callOpenAI(context: string, instruction: string, apiKey: string): Promise<Proposal> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are Planora, an expert travel itinerary revision assistant. Your task is to propose the smallest necessary changes to fulfill the user's instruction. Preserve locked activities exactly. Do not claim confirmed availability, live prices, or opening hours. All costs are estimates. Explain every proposed change clearly. If a constraint cannot be satisfied, state it clearly in the constraints list.",
        },
        {
          role: "user",
          content: `ITINERARY CONTEXT:\n${context}\n\nUSER INSTRUCTION: ${instruction}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "itinerary_revision_proposal",
          strict: true,
          schema: proposalSchema,
        },
      },
      temperature: 0.5,
      max_tokens: 6000,
    }),
  });

  if (response.status === 429) throw new Error("RATE_LIMITED");
  if (response.status === 401) throw new Error("INVALID_API_KEY");
  if (!response.ok) throw new Error(`OPENAI_ERROR:${response.status}`);

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("EMPTY_RESPONSE");

  let parsed: Proposal;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("INVALID_JSON");
  }

  if (!Array.isArray(parsed.changes)) throw new Error("INVALID_STRUCTURE");
  return parsed;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonRes({ error: "Authentication required." }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return jsonRes({ error: "Authentication required." }, 401);

    let body: { trip_id?: string; instruction?: string };
    try {
      body = await req.json();
    } catch {
      return jsonRes({ error: "Invalid JSON body." }, 400);
    }

    const { trip_id, instruction } = body;
    if (!trip_id?.trim()) return jsonRes({ error: "trip_id is required." }, 400);
    if (!instruction?.trim()) return jsonRes({ error: "instruction is required." }, 400);
    if (instruction.length > 1000) return jsonRes({ error: "Instruction must be 1000 characters or fewer." }, 400);

    // Load trip (RLS verifies ownership, but we double-check explicitly)
    const { data: tripData, error: tripErr } = await supabase
      .from("trips")
      .select("*")
      .eq("id", trip_id)
      .maybeSingle();

    if (tripErr) {
      console.error("[revise-itinerary] Trip load error:", tripErr.message);
      return jsonRes({ error: "Could not load trip." }, 500);
    }
    if (!tripData) return jsonRes({ error: "Trip not found." }, 404);

    const trip = tripData as DbTrip;

    // Explicit ownership check — defense in depth alongside RLS
    if (trip.user_id !== user.id) {
      return jsonRes({ error: "Trip not found." }, 404);
    }

    // Load days
    const { data: daysData, error: daysErr } = await supabase
      .from("trip_days")
      .select("*")
      .eq("trip_id", trip_id)
      .order("sort_order", { ascending: true });

    if (daysErr || !daysData) {
      console.error("[revise-itinerary] Days load error:", daysErr?.message);
      return jsonRes({ error: "Could not load trip days." }, 500);
    }

    const days = daysData as DbTripDay[];

    // Load activities
    const { data: actsData, error: actsErr } = await supabase
      .from("activities")
      .select("*")
      .eq("trip_id", trip_id)
      .order("sort_order", { ascending: true });

    if (actsErr || !actsData) {
      console.error("[revise-itinerary] Activities load error:", actsErr?.message);
      return jsonRes({ error: "Could not load activities." }, 500);
    }

    const activities = actsData as DbActivity[];

    // Build locked IDs set
    const lockedIds = new Set(activities.filter((a) => a.is_locked).map((a) => a.id));

    // Compute old estimated total
    const oldTotal = activities.reduce((sum, a) => sum + Number(a.estimated_cost), 0);

    // Build snapshot for before_json
    const beforeSnapshot = { days, activities };

    // Call OpenAI
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      console.error("[revise-itinerary] OPENAI_API_KEY not set");
      return jsonRes({ error: "Revision service is not configured." }, 503);
    }

    const context = buildContext(trip, days, activities);

    let proposal: Proposal;
    try {
      proposal = await callOpenAI(context, instruction.trim(), apiKey);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "UNKNOWN";
      console.error("[revise-itinerary] OpenAI error:", msg);
      if (msg === "RATE_LIMITED") return jsonRes({ error: "Too many requests. Please try again in a moment." }, 429);
      return jsonRes({ error: "Could not generate revision proposal. Please try again." }, 502);
    }

    // Validate locked activities
    const { clean: validChanges, violations } = validateLockedActivities(proposal.changes, lockedIds);
    proposal.changes = validChanges;
    if (violations.length > 0) {
      proposal.warnings = [...(proposal.warnings ?? []), ...violations];
    }

    // Compute new estimated total from proposal
    const newTotal = proposal.new_estimated_total ?? 0;
    proposal.old_estimated_total = oldTotal;
    proposal.budget_difference = newTotal - oldTotal;

    // Save to ai_revisions
    const { data: revisionData, error: revErr } = await supabase
      .from("ai_revisions")
      .insert({
        trip_id,
        user_id: user.id,
        prompt: instruction.trim(),
        summary: proposal.summary ?? "",
        before_json: beforeSnapshot,
        proposed_json: proposal,
        budget_difference: proposal.budget_difference,
        status: "proposed",
      })
      .select("id")
      .maybeSingle();

    if (revErr || !revisionData) {
      console.error("[revise-itinerary] Revision save error:", revErr?.message);
      // Non-fatal — return the proposal without a revision ID
      return jsonRes({ revisionId: null, ...proposal, warning: "Proposal could not be saved to history." });
    }

    const revisionId = (revisionData as { id: string }).id;
    console.log(`[revise-itinerary] Revision ${revisionId} saved for trip ${trip_id} by user ${user.id}`);

    return jsonRes({ revisionId, ...proposal });
  } catch (err) {
    console.error("[revise-itinerary] Unhandled error:", err);
    return jsonRes({ error: "An unexpected error occurred." }, 500);
  }
});
