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
  category: string;
  ai_reason: string;
  is_locked: boolean;
  sort_order: number;
  latitude: number | null;
  longitude: number | null;
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

// ─── Copilot conversation ─────────────────────────────────────────────────────

interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

// ─── Destination voice ────────────────────────────────────────────────────────
//
// Lets the concierge's actual replies — not just its one-time greeting —
// answer in the destination's authored character (see ExperienceCopy in
// src/destinations/copy.ts, threaded down through AIAssistantPanel). This is
// tone/register only: it's appended to the system prompt as an additional
// instruction, never replacing any of the existing safety/accuracy rules
// (no fake availability/prices, preserve locked activities, etc).

interface DestinationVoice {
  name: string;
  essence: string;
  mood: string[];
  voice_tags: string[];
  formality: number;
  exuberance: number;
}

function sanitizeVoice(raw: unknown): DestinationVoice | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === "string" ? r.name.trim().slice(0, 80) : "";
  if (!name) return null;
  return {
    name,
    essence: typeof r.essence === "string" ? r.essence.trim().slice(0, 220) : "",
    mood: Array.isArray(r.mood) ? r.mood.filter((m) => typeof m === "string").slice(0, 6) : [],
    voice_tags: Array.isArray(r.voice_tags) ? r.voice_tags.filter((v) => typeof v === "string").slice(0, 4) : [],
    formality: typeof r.formality === "number" && Number.isFinite(r.formality) ? Math.min(1, Math.max(0, r.formality)) : 0.5,
    exuberance: typeof r.exuberance === "number" && Number.isFinite(r.exuberance) ? Math.min(1, Math.max(0, r.exuberance)) : 0.45,
  };
}

function describeRegister(value: number, low: string, mid: string, high: string): string {
  if (value < 0.35) return low;
  if (value < 0.65) return mid;
  return high;
}

function buildVoiceInstruction(voice: DestinationVoice): string {
  const formalityWord = describeRegister(voice.formality, "casual and relaxed", "friendly and approachable", "polished and formal");
  const exuberanceWord = describeRegister(voice.exuberance, "calm and understated", "warm and engaged", "energetic and enthusiastic");
  const traits = voice.voice_tags.length ? voice.voice_tags.join(", ") : "warm, curious";
  const moodClause = voice.mood.length ? ` The trip's mood is ${voice.mood.join(", ")}.` : "";
  return (
    ` This trip is to ${voice.name}. Answer in a voice that is ${traits} — ${formalityWord}, ${exuberanceWord}.${moodClause}` +
    ` ${voice.essence ? `Keep in mind: ${voice.essence}.` : ""}` +
    " Let this voice color your wording and phrasing naturally — a passing local expression or a specific, real cultural detail is welcome where it fits — but never let tone override accuracy, safety, or any of the rules above."
  );
}

// ─── Proposal types (match the contract with the frontend) ───────────────────

interface ActivitySnapshot {
  title: string;
  description: string;
  location: string;
  start_time: string;
  duration_minutes: number;
  estimated_cost: number;
  cost_confidence: "low" | "medium" | "high";
  category: string;
  ai_reason: string;
  latitude: number;
  longitude: number;
}

interface ProposalChange {
  operation: string;
  activity_id: string;
  source_day_id: string;
  destination_day_id: string;
  before: ActivitySnapshot;
  after: ActivitySnapshot;
  day_theme: string;
  day_summary: string;
  day_activities: ActivitySnapshot[];
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

/** What the model returns for a single turn — either a plain answer or a full proposal. */
interface CopilotModelReply extends Proposal {
  reply_type: "answer" | "proposal";
  answer_text: string;
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
    cost_confidence: { type: "string", enum: ["low", "medium", "high"] },
    category: { type: "string" },
    ai_reason: { type: "string" },
    latitude: { type: "number" },
    longitude: { type: "number" },
  },
  required: [
    "title", "description", "location", "start_time", "duration_minutes",
    "estimated_cost", "cost_confidence", "category", "ai_reason", "latitude", "longitude",
  ],
  additionalProperties: false,
};

const copilotReplySchema = {
  type: "object",
  properties: {
    reply_type: { type: "string", enum: ["answer", "proposal"] },
    // Used when reply_type = "answer". Empty string when reply_type = "proposal".
    answer_text: { type: "string" },
    // Everything below is used when reply_type = "proposal". Use the same
    // empty/zero defaults as the "not applicable" convention below when
    // reply_type = "answer".
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
          operation: { type: "string", enum: ["add", "remove", "replace", "move", "update", "add_day", "remove_day"] },
          activity_id: { type: "string" },
          source_day_id: { type: "string" },
          destination_day_id: { type: "string" },
          before: activitySnapshotSchema,
          after: activitySnapshotSchema,
          day_theme: { type: "string" },
          day_summary: { type: "string" },
          day_activities: { type: "array", items: activitySnapshotSchema },
          reason: { type: "string" },
        },
        required: [
          "operation", "activity_id", "source_day_id", "destination_day_id",
          "before", "after", "day_theme", "day_summary", "day_activities", "reason",
        ],
        additionalProperties: false,
      },
    },
    old_estimated_total: { type: "number" },
    new_estimated_total: { type: "number" },
    budget_difference: { type: "number" },
    pace_effect: { type: "string" },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: [
    "reply_type", "answer_text", "summary", "constraints", "changes",
    "old_estimated_total", "new_estimated_total", "budget_difference", "pace_effect", "warnings",
  ],
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
- First decide reply_type. Use "answer" for general travel questions that do not require changing
  the itinerary (e.g. tipping norms, tap water safety, SIM cards, what to wear, scams to avoid,
  cash vs card). Use "proposal" whenever the user is asking to add, remove, move, replace, or
  otherwise change activities, days, or budget — including making the trip longer or shorter.
- If reply_type = "answer": put your response in answer_text. Set summary="", constraints=[],
  changes=[], old_estimated_total=0, new_estimated_total=0, budget_difference=0, pace_effect="",
  warnings=[].
- If reply_type = "proposal": set answer_text="" and propose the smallest necessary changes to
  fulfill the user's instruction, exactly as described below.
- Activities marked [LOCKED] MUST NOT be edited, moved, removed, or replaced. A day containing a
  [LOCKED] activity MUST NOT be removed via "remove_day".
- Maximum 6 activities per day.
- Estimated cost must be >= 0.
- Use "" for activity_id/source_day_id/destination_day_id when not applicable to the operation.
- For "add": activity_id="", source_day_id="", destination_day_id=<target day id>, before=all empty strings/zeros, after=new activity details.
- For "remove": activity_id=<id>, source_day_id=<day id>, destination_day_id="", after=all empty strings/zeros.
- For "move": activity_id=<id>, source_day_id=<from day id>, destination_day_id=<to day id>, before/after = same activity details.
- For "replace": activity_id=<existing id>, source_day_id=<day id>, destination_day_id="", before=existing activity, after=replacement.
- For "update": activity_id=<id>, source_day_id=<day id>, destination_day_id="", before=current values of changed fields (other fields empty/""), after=new values.
- In before/after for "add"/"remove" where data is not applicable, use: title="", description="", location="", start_time="", duration_minutes=0, estimated_cost=0, cost_confidence="medium", category="Other", ai_reason="", latitude=0, longitude=0.
- For "add"/"replace", set after.latitude/after.longitude to your best-effort real-world coordinates for after.location, and after.cost_confidence to how confident you are in after.estimated_cost.

WHOLE-DAY CHANGES — use these when the user wants to make the trip longer or shorter (e.g.
"add 2 more days", "shorten this trip by a day"), never by stuffing extra activities into an
existing day or leaving a day empty as a substitute:
- "add_day" appends exactly one new day immediately after the CURRENT LAST DAY of the trip — you
  cannot insert a day anywhere else, and the actual calendar date is assigned by the app, not you.
  Set activity_id="", source_day_id="", destination_day_id="", before/after to the empty-value
  convention above. Set day_theme and day_summary for the new day, and day_activities to a full
  day's worth of new activities (each using the same shape as an activity's "after" snapshot,
  including your best-effort latitude/longitude and cost_confidence). To add N days, emit N
  separate "add_day" changes.
- "remove_day" removes exactly the CURRENT LAST DAY of the trip — you cannot remove a day from
  the middle or start, and never a day containing a [LOCKED] activity. Set source_day_id to that
  day's day_id from the itinerary above; leave activity_id/destination_day_id="" and
  day_theme/day_summary=""/day_activities=[]. To remove N days, emit N separate "remove_day"
  changes, ordered starting from the actual last day and working backward.
- For both, before/after use the full empty-value convention (title="", description="", etc.).
`.trim();
}

// ─── Validate locked activities ───────────────────────────────────────────────

function validateLockedActivities(
  changes: ProposalChange[],
  lockedIds: Set<string>,
  daysWithLockedActivities: Set<string>,
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
    if (change.operation === "remove_day" && daysWithLockedActivities.has(change.source_day_id)) {
      violations.push("Removed invalid change: cannot remove a day that contains a locked activity.");
      continue;
    }
    clean.push(change);
  }

  return { clean, violations };
}

// ─── Call OpenRouter ──────────────────────────────────────────────────────────

async function callOpenAI(
  context: string,
  history: ConversationTurn[],
  instruction: string,
  apiKey: string,
  voice: DestinationVoice | null,
): Promise<CopilotModelReply> {
  const messages = [
    {
      role: "system",
      content:
        "You are Planora Copilot, a conversational AI travel assistant embedded in a trip-planning app. " +
        "For every user message, first decide whether it is a general travel question (e.g. tipping, tap water, SIM cards, what to wear, scams, cash vs card, hidden gems advice) or a request to modify the trip's itinerary. " +
        "Answer questions helpfully and concisely using the trip's destination and dates for context. " +
        "For itinerary modification requests, propose the smallest necessary changes. Preserve locked activities exactly. " +
        "Do not claim confirmed availability, live prices, or opening hours. All costs are estimates. Explain every proposed change clearly. " +
        "If a constraint cannot be satisfied, state it clearly in the constraints list. Return only structured data matching the required schema." +
        (voice ? buildVoiceInstruction(voice) : ""),
    },
    { role: "user", content: `ITINERARY CONTEXT:\n${context}` },
    { role: "assistant", content: "Understood. I have the current itinerary. What would you like?" },
    ...history.map((t) => ({ role: t.role, content: t.content })),
    { role: "user", content: instruction },
  ];

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Title": "Planora",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "copilot_reply",
          strict: true,
          schema: copilotReplySchema,
        },
      },
      temperature: 0.5,
      max_tokens: 6000,
    }),
  });

  if (response.status === 429) throw new Error("RATE_LIMITED");
  if (response.status === 401) throw new Error("INVALID_API_KEY");
  if (response.status === 402) throw new Error("INSUFFICIENT_CREDITS");
  if (!response.ok) throw new Error(`OPENROUTER_ERROR:${response.status}`);

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("EMPTY_RESPONSE");

  let parsed: CopilotModelReply;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("INVALID_JSON");
  }

  if (parsed.reply_type === "proposal" && !Array.isArray(parsed.changes)) {
    throw new Error("INVALID_STRUCTURE");
  }
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

    let body: { trip_id?: string; instruction?: string; conversation_history?: ConversationTurn[]; destination_voice?: unknown };
    try {
      body = await req.json();
    } catch {
      return jsonRes({ error: "Invalid JSON body." }, 400);
    }

    const { trip_id, instruction } = body;
    if (!trip_id?.trim()) return jsonRes({ error: "trip_id is required." }, 400);
    if (!instruction?.trim()) return jsonRes({ error: "instruction is required." }, 400);
    if (instruction.length > 1000) return jsonRes({ error: "Instruction must be 1000 characters or fewer." }, 400);

    const voice = sanitizeVoice(body.destination_voice);

    // Cap history to the last 10 turns so the prompt doesn't grow unbounded
    // over a long copilot session.
    const history = Array.isArray(body.conversation_history)
      ? body.conversation_history.slice(-10).filter((t) => t && (t.role === "user" || t.role === "assistant") && typeof t.content === "string")
      : [];

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

    // Build locked IDs set, and which days contain at least one locked activity
    const lockedIds = new Set(activities.filter((a) => a.is_locked).map((a) => a.id));
    const daysWithLockedActivities = new Set(activities.filter((a) => a.is_locked).map((a) => a.trip_day_id));

    // Compute old estimated total
    const oldTotal = activities.reduce((sum, a) => sum + Number(a.estimated_cost), 0);

    // Build snapshot for before_json
    const beforeSnapshot = { days, activities };

    // Call OpenRouter
    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      console.error("[revise-itinerary] OPENROUTER_API_KEY not set");
      return jsonRes({
        error: "AI itinerary revisions are currently unavailable.\nPlease configure your AI provider.",
      }, 503);
    }

    const context = buildContext(trip, days, activities);

    let modelReply: CopilotModelReply;
    try {
      modelReply = await callOpenAI(context, history, instruction.trim(), apiKey, voice);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "UNKNOWN";
      console.error("[revise-itinerary] OpenAI error:", msg);
      if (msg === "RATE_LIMITED") return jsonRes({ error: "Too many requests. Please try again in a moment." }, 429);
      return jsonRes({ error: "Could not generate a response. Please try again." }, 502);
    }

    // ── Plain travel-question reply — no itinerary changes, nothing saved ──
    if (modelReply.reply_type === "answer") {
      return jsonRes({ type: "answer", message: modelReply.answer_text || "I don't have an answer for that." });
    }

    // ── Itinerary modification proposal — same reviewable-diff flow as before ──
    const proposal: Proposal = modelReply;

    // Validate locked activities
    const { clean: validChanges, violations } = validateLockedActivities(proposal.changes, lockedIds, daysWithLockedActivities);
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
      return jsonRes({ type: "proposal", revisionId: null, ...proposal, warning: "Proposal could not be saved to history." });
    }

    const revisionId = (revisionData as { id: string }).id;
    console.log(`[revise-itinerary] Revision ${revisionId} saved for trip ${trip_id} by user ${user.id}`);

    return jsonRes({ type: "proposal", revisionId, ...proposal });
  } catch (err) {
    console.error("[revise-itinerary] Unhandled error:", err);
    return jsonRes({ error: "An unexpected error occurred." }, 500);
  }
});
