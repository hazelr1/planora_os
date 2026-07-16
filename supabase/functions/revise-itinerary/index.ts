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

interface DbActivity {
  id: string;
  trip_day_id: string;
  title: string;
  time: string;
  location: string;
  duration_minutes: number;
  estimated_cost: number;
  category: string;
  is_locked: boolean;
  personal_note: string;
  sort_order: number;
}

interface DbTripDay {
  id: string;
  label: string;
  date: string;
  sort_order: number;
}

interface DbTrip {
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

interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

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

interface CopilotModelReply extends Proposal {
  reply_type: "answer" | "proposal";
  answer_text: string;
}

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
    answer_text: { type: "string" },
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

const MAX_NOTE_LENGTH = 140;
const MAX_NOTES_PER_ACTIVITY = 3;
const FULL_DETAIL_DAY_LIMIT = 10;
const MAX_SUPPORTED_DAYS = 30;
const MAX_SUPPORTED_ACTIVITIES = 150;

interface NormalizedActivity {
  id: string;
  title: string;
  time: string;
  category: string;
  durationMinutes: number;
  estimatedCost: number;
  location: string;
  locked: boolean;
  notes: string[];
}

interface NormalizedDay {
  id: string;
  label: string;
  date: string;
  activities?: NormalizedActivity[];
  summary?: string;
}

interface TripConstraints {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  travelers: number;
  pace: string;
  interests: string[];
  specialRequests: string;
}

interface NormalizedItineraryContext {
  trip: TripConstraints;
  days: NormalizedDay[];
}

function parseNoteTexts(raw: string): string[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((n) => (n && typeof n === "object" && typeof (n as { text?: unknown }).text === "string" ? (n as { text: string }).text.trim() : ""))
    .filter((t) => t.length > 0)
    .slice(0, MAX_NOTES_PER_ACTIVITY)
    .map((t) => (t.length > MAX_NOTE_LENGTH ? `${t.slice(0, MAX_NOTE_LENGTH)}…` : t));
}

function normalizeItinerary(trip: DbTrip, days: DbTripDay[], activities: DbActivity[]): NormalizedItineraryContext {
  const actsByDay = new Map<string, DbActivity[]>();
  for (const a of activities) {
    if (!actsByDay.has(a.trip_day_id)) actsByDay.set(a.trip_day_id, []);
    actsByDay.get(a.trip_day_id)!.push(a);
  }

  const normalizedDays: NormalizedDay[] = days
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((d, index) => {
      const acts = (actsByDay.get(d.id) ?? []).sort((a, b) => a.sort_order - b.sort_order);

      if (index >= FULL_DETAIL_DAY_LIMIT) {
        const total = acts.reduce((sum, a) => sum + Number(a.estimated_cost), 0);
        const lockedCount = acts.filter((a) => a.is_locked).length;
        return {
          id: d.id,
          label: d.label,
          date: d.date,
          summary: acts.length === 0
            ? "no activities"
            : `${acts.length} activities, ~${trip.currency}${Math.round(total)} total` + (lockedCount > 0 ? `, ${lockedCount} locked` : ""),
        };
      }

      return {
        id: d.id,
        label: d.label,
        date: d.date,
        activities: acts.map((a) => ({
          id: a.id,
          title: a.title,
          time: a.time,
          category: a.category,
          durationMinutes: a.duration_minutes,
          estimatedCost: a.estimated_cost,
          location: a.location,
          locked: a.is_locked,
          notes: parseNoteTexts(a.personal_note),
        })),
      };
    });

  return {
    trip: {
      title: trip.title,
      destination: trip.destination,
      startDate: trip.start_date,
      endDate: trip.end_date,
      budget: trip.budget,
      currency: trip.currency,
      travelers: trip.travelers,
      pace: trip.pace,
      interests: trip.interests,
      specialRequests: trip.special_requests,
    },
    days: normalizedDays,
  };
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function buildContext(context: NormalizedItineraryContext): string {
  const { trip, days } = context;

  const dayLines = days
    .map((d) => {
      if (d.summary) {
        return `  ${d.label} (${d.date}) [day_id:${d.id}]: ${d.summary} — condensed; ask about this day directly for full detail.`;
      }
      const actLines = (d.activities ?? []).map((a) => {
        const notesTag = a.notes.length ? ` | Notes: ${a.notes.map((n) => `"${n}"`).join("; ")}` : "";
        return `    - [id:${a.id}]${a.locked ? " [LOCKED]" : ""} ${a.time || "?"} | ${a.title} | ${a.category} | ${a.durationMinutes}min | ${trip.currency}${a.estimatedCost} | ${a.location}${notesTag}`;
      }).join("\n");
      return `  ${d.label} (${d.date}) [day_id:${d.id}]\n${actLines || "    (no activities)"}`;
    })
    .join("\n");

  return `
Trip: ${trip.title}
Destination: ${trip.destination}
Dates: ${trip.startDate} to ${trip.endDate}
Budget: ${trip.budget} ${trip.currency} total | Travelers: ${trip.travelers} | Pace: ${trip.pace}
Interests: ${trip.interests.join(", ")}
${trip.specialRequests ? `Special requests: ${trip.specialRequests}` : ""}

CURRENT ITINERARY (use the exact IDs when referencing existing activities or days):
${dayLines}

RULES:

CLASSIFICATION — reply_type:
- Use reply_type="answer" ONLY for pure informational questions that require NO change to the
  itinerary: e.g. tipping customs, tap water safety, SIM card advice, general packing tips,
  currency exchange, visa requirements, cultural etiquette. Set reply_type="proposal" for
  EVERY other request — including any mention of deleting, removing, replacing, swapping,
  changing, adding, or modifying specific places, activities, or attractions in the itinerary,
  or making the trip longer or shorter. When in doubt, use reply_type="proposal".

OPERATION MAPPING — how to translate common user requests into operations:
- "Delete/remove [specific place or activity]" → find that activity in the itinerary by title
  (case-insensitive match), use operation="remove" with its exact [id:...] as activity_id and
  its day as source_day_id.
- "Replace [X] with [Y]" or "Swap [X] for [Y]" → operation="replace" with X's activity_id,
  before=X's current details, after=the new Y activity.
- "Add [Y] to day N" or "Include [Y]" → operation="add" with destination_day_id=dayN's id.
- "Change/update [field] of [activity]" → operation="update" with the activity's id.
- "Move [activity] to day N" → operation="move" with the activity's id, destination_day_id=dayN.
- "Delete day N" or "Remove day N entirely" (whether N is the first, last, or a middle day) →
  use "remove_day" with source_day_id=dayN's id (see below). The app closes the gap and
  renumbers later days automatically — never emit per-activity "remove" changes for this.
- "Remove all activities from day N" but keep the day itself → emit one "remove" change per
  activity in that day instead of "remove_day".
- "Make the trip shorter by N days" → use "remove_day" (see below), N times, targeting the
  actual last day each time unless the user names a specific day.

FIELD DEFAULTS (EMPTY shorthand):
EMPTY = title="", description="", location="", start_time="", duration_minutes=0,
estimated_cost=0, cost_confidence="medium", category="Other", ai_reason="", latitude=0, longitude=0.
Use "" for any activity_id/source_day_id/destination_day_id not applicable to the operation.

OPERATION DETAILS:
- reply_type="answer": answer_text=your reply; summary="", constraints=[], changes=[],
  old_estimated_total=0, new_estimated_total=0, budget_difference=0, pace_effect="", warnings=[].
- reply_type="proposal": answer_text=""; propose the smallest necessary changes to fulfill the
  instruction.
- [LOCKED] activities MUST NOT be edited, moved, removed, or replaced, and a day containing
  one MUST NOT be removed via "remove_day".
- Max 6 activities per day. Estimated cost must be >= 0.
- "add": destination_day_id=<target day id>, before=EMPTY, after=new activity details.
- "remove": activity_id=<id>, source_day_id=<day id>, after=EMPTY.
- "move": activity_id=<id>, source_day_id=<from day id>, destination_day_id=<to day id>,
  before/after = same activity details.
- "replace": activity_id=<existing id>, source_day_id=<day id>, before=existing activity,
  after=replacement.
- "update": activity_id=<id>, source_day_id=<day id>, before=current values of changed fields
  (other fields EMPTY), after=new values.
- For "add"/"replace", set after.latitude/after.longitude to your best-effort real-world
  coordinates for after.location, and after.cost_confidence to how confident you are in
  after.estimated_cost.

WHOLE-DAY CHANGES — use "add_day" to make the trip longer, and "remove_day" to delete an entire
day (whether that's lengthening/shortening the trip overall or the user named one specific day
to remove):
- "add_day" appends exactly one new day immediately after the CURRENT LAST DAY of the trip.
  before/after=EMPTY. Set day_theme and day_summary, and day_activities to a full day's worth
  of new activities (each shaped like an activity's "after" snapshot, with latitude/longitude
  and cost_confidence). Emit N separate "add_day" changes to add N days.
- "remove_day" deletes exactly one day, anywhere in the trip — first, last, or middle.
  source_day_id=<that day's day_id>; before/after=EMPTY; day_theme="", day_summary="",
  day_activities=[]. The app closes the gap left behind: every later day shifts one calendar
  day earlier and is renumbered, so the trip stays contiguous with no empty day left over. To
  remove N days without the user naming which ones, emit N separate "remove_day" changes
  targeting the actual last day each time (since removing one shifts what "last" means next).
`.trim();
}

function validateLockedActivities(
  changes: ProposalChange[],
  lockedIds: Set<string>,
  daysWithLockedActivities: Set<string>,
): { clean: ProposalChange[]; violations: string[] } {
  const clean: ProposalChange[] = [];
  const violations: string[] = [];

  for (const change of changes) {
    if (change.activity_id && lockedIds.has(change.activity_id)) {
      violations.push(
        `Removed invalid change: cannot ${change.operation} locked activity "${change.before.title || change.activity_id}".`
      );
      continue;
    }
    if (change.operation === "remove_day" && daysWithLockedActivities.has(change.source_day_id)) {
      violations.push("Removed invalid change: cannot remove a day that contains a locked activity.");
      continue;
    }
    clean.push(change);
  }

  return { clean, violations };
}

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
        "Your primary job is to help users modify their itinerary: add, remove, replace, move, or update specific " +
        "activities and places. When a user mentions a specific place, attraction, restaurant, or activity by name " +
        "and asks to delete, remove, drop, skip, replace, or change it — always look it up in the itinerary context " +
        "by title, find its exact [id:...], and produce a 'remove' or 'replace' proposal. Never answer with just " +
        "text when the user is asking for an itinerary change. " +
        "For pure informational questions (tipping, safety, packing, currency, transport) with no mention of " +
        "specific itinerary changes, use reply_type='answer'. In every other case, use reply_type='proposal'. " +
        "Never claim confirmed availability, live prices, or opening hours — all costs are estimates. " +
        "Explain every proposed change clearly, and state any unsatisfiable constraint in the constraints list. " +
        "Return only structured data matching the required schema." +
        (voice ? buildVoiceInstruction(voice) : ""),
    },
    { role: "user", content: `ITINERARY CONTEXT:\n${context}` },
    { role: "assistant", content: "Understood. I have the current itinerary with all activity IDs. What would you like to change or know?" },
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

    const history = Array.isArray(body.conversation_history)
      ? body.conversation_history.slice(-10).filter((t) => t && (t.role === "user" || t.role === "assistant") && typeof t.content === "string")
      : [];

    const { data: tripData, error: tripErr } = await supabase
      .from("trips")
      .select("user_id, title, destination, start_date, end_date, budget, currency, travelers, pace, interests, special_requests")
      .eq("id", trip_id)
      .maybeSingle();

    if (tripErr) {
      console.error("[revise-itinerary] Trip load error:", tripErr.message);
      return jsonRes({ error: "Could not load trip." }, 500);
    }
    if (!tripData) return jsonRes({ error: "Trip not found." }, 404);

    const trip = tripData as DbTrip;

    if (trip.user_id !== user.id) {
      return jsonRes({ error: "Trip not found." }, 404);
    }

    const { data: daysData, error: daysErr } = await supabase
      .from("trip_days")
      .select("id, label, date, sort_order")
      .eq("trip_id", trip_id)
      .order("sort_order", { ascending: true });

    if (daysErr || !daysData) {
      console.error("[revise-itinerary] Days load error:", daysErr?.message);
      return jsonRes({ error: "Could not load trip days." }, 500);
    }

    const days = daysData as DbTripDay[];

    const { data: actsData, error: actsErr } = await supabase
      .from("activities")
      .select("id, trip_day_id, title, time, location, duration_minutes, estimated_cost, category, is_locked, personal_note, sort_order")
      .eq("trip_id", trip_id)
      .order("sort_order", { ascending: true });

    if (actsErr || !actsData) {
      console.error("[revise-itinerary] Activities load error:", actsErr?.message);
      return jsonRes({ error: "Could not load activities." }, 500);
    }

    const activities = actsData as DbActivity[];

    if (days.length > MAX_SUPPORTED_DAYS || activities.length > MAX_SUPPORTED_ACTIVITIES) {
      return jsonRes({
        error: "This trip is too large for the AI copilot to review in one go. Try asking about a specific day or a smaller part of the trip instead.",
      }, 422);
    }

    const lockedIds = new Set(activities.filter((a) => a.is_locked).map((a) => a.id));
    const daysWithLockedActivities = new Set(activities.filter((a) => a.is_locked).map((a) => a.trip_day_id));

    const oldTotal = activities.reduce((sum, a) => sum + Number(a.estimated_cost), 0);

    const beforeSnapshot = { days, activities };

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      console.error("[revise-itinerary] OPENROUTER_API_KEY not set");
      return jsonRes({
        error: "AI itinerary revisions are currently unavailable.\nPlease configure your AI provider.",
      }, 503);
    }

    const normalized = normalizeItinerary(trip, days, activities);
    const context = buildContext(normalized);

    console.log(`[revise-itinerary] trip ${trip_id}: context ~${estimateTokens(context)} tokens (${days.length} days, ${activities.length} activities)`);

    let modelReply: CopilotModelReply;
    try {
      modelReply = await callOpenAI(context, history, instruction.trim(), apiKey, voice);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "UNKNOWN";
      console.error("[revise-itinerary] OpenAI error:", msg);
      if (msg === "RATE_LIMITED") return jsonRes({ error: "Too many requests. Please try again in a moment." }, 429);
      return jsonRes({ error: "Could not generate a response. Please try again." }, 502);
    }

    if (modelReply.reply_type === "answer") {
      return jsonRes({ type: "answer", message: modelReply.answer_text || "I don't have an answer for that." });
    }

    const proposal: Proposal = modelReply;

    const { clean: validChanges, violations } = validateLockedActivities(proposal.changes, lockedIds, daysWithLockedActivities);
    proposal.changes = validChanges;
    if (violations.length > 0) {
      proposal.warnings = [...(proposal.warnings ?? []), ...violations];
    }

    const newTotal = proposal.new_estimated_total ?? 0;
    proposal.old_estimated_total = oldTotal;
    proposal.budget_difference = newTotal - oldTotal;

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