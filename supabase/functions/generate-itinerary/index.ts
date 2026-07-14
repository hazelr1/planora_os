import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Input validation ─────────────────────────────────────────────────────────

interface GenerateRequest {
  destination: string;
  start_date: string;
  end_date: string;
  budget: number;
  currency: string;
  travelers: number;
  travel_pace: string;
  interests: string[];
  special_requests?: string;
}

function validateInput(body: Partial<GenerateRequest>): string | null {
  if (!body.destination?.trim()) return "Destination is required.";
  if (body.destination.trim().length > 200) return "Destination is too long.";

  if (!body.start_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.start_date))
    return "Start date is required and must be YYYY-MM-DD.";
  if (!body.end_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.end_date))
    return "End date is required and must be YYYY-MM-DD.";

  const start = new Date(body.start_date + "T00:00:00");
  const end = new Date(body.end_date + "T00:00:00");
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return "Invalid date values.";
  if (end < start) return "End date must be on or after start date.";
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  if (days < 1) return "Trip length must be greater than 0 days.";

  if (typeof body.budget !== "number" || body.budget <= 0) return "Budget must be greater than zero.";
  if (typeof body.travelers !== "number" || body.travelers < 1 || body.travelers > 20)
    return "Travelers must be between 1 and 20.";

  if (!Array.isArray(body.interests) || body.interests.length === 0)
    return "At least one interest must be selected.";

  if (body.special_requests && body.special_requests.length > 500)
    return "Special requests must be 500 characters or fewer.";

  return null;
}

// ─── OpenAI structured output schema ─────────────────────────────────────────

const responseSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    travel_persona: { type: "string" },
    days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day_number: { type: "integer" },
          date: { type: "string" },
          theme: { type: "string" },
          summary: { type: "string" },
          activities: {
            type: "array",
            items: {
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
            },
          },
        },
        required: ["day_number", "date", "theme", "summary", "activities"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "summary", "travel_persona", "days"],
  additionalProperties: false,
};

// ─── Call OpenAI ──────────────────────────────────────────────────────────────

interface OpenAIActivity {
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

interface OpenAIDay {
  day_number: number;
  date: string;
  theme: string;
  summary: string;
  activities: OpenAIActivity[];
}

interface OpenAIItinerary {
  title: string;
  summary: string;
  travel_persona: string;
  days: OpenAIDay[];
}

/** Every calendar date in the trip, inclusive, as YYYY-MM-DD strings. */
function enumerateDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

async function callOpenAI(req: GenerateRequest, apiKey: string): Promise<OpenAIItinerary> {
  const dates = enumerateDates(req.start_date, req.end_date);
  const numDays = dates.length;
  const dateList = dates.map((d, i) => `Day ${i + 1}: ${d}`).join("\n");

  const userPrompt = `
Destination: ${req.destination}
Trip length: exactly ${numDays} day${numDays !== 1 ? "s" : ""} (${req.start_date} to ${req.end_date})
Budget: ${req.budget} ${req.currency} (total, for ${req.travelers} traveler${req.travelers !== 1 ? "s" : ""})
Travel pace: ${req.travel_pace}
Interests: ${req.interests.join(", ")}
${req.special_requests ? `Special requests: ${req.special_requests}` : ""}

REQUIRED DAYS — the "days" array MUST contain exactly ${numDays} entries, one per date below, in this exact order. Do not omit, merge, or summarize any day, even for long trips:
${dateList}

For each day, cover a full schedule: a morning activity, an afternoon activity, an evening activity, and meals (breakfast/lunch/dinner using the "Food" category) where appropriate for the pace. Include transportation between distant locations as its own activity using the "Transport" category when relevant.
`.trim();

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Title": "Planora",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are Planora, an expert travel itinerary planner. Create a realistic and editable itinerary based on the user's destination, dates, budget, traveler count, pace, interests, and special requests. The user prompt lists the exact required dates — you MUST return one entry in the days array for every single one of them, in order, never fewer. Group activities geographically. Include reasonable travel and rest time. Avoid impossible schedules. Do not claim confirmed availability, live prices, reservations, or opening hours. All prices are estimates. Explain briefly why each activity fits the user. For every activity, set cost_confidence to 'high' when you are confident in the estimated_cost (e.g. well-known fixed-price attractions), 'medium' for typical estimates, and 'low' when the price is highly variable or uncertain. For every activity, also provide your best-effort real-world latitude and longitude for its location — use your knowledge of the destination's geography; if you are not reasonably confident of the coordinates, still provide your best estimate rather than a placeholder. Return only structured data matching the required schema.",
        },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "itinerary",
          strict: true,
          schema: responseSchema,
        },
      },
      temperature: 0.7,
      // Scale with trip length so longer itineraries don't get truncated
      // mid-generation — roughly 900 tokens/day plus headroom, capped well
      // under the model's context limit.
      max_tokens: Math.min(16_000, Math.max(4000, numDays * 900 + 2000)),
    }),
  });

  if (response.status === 429) throw new Error("RATE_LIMITED");
  if (response.status === 401) throw new Error("INVALID_API_KEY");
  if (response.status === 402) throw new Error("INSUFFICIENT_CREDITS");
  if (!response.ok) throw new Error(`OPENROUTER_ERROR:${response.status}`);

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("EMPTY_RESPONSE");

  let parsed: OpenAIItinerary;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("INVALID_JSON");
  }

  if (!parsed.days || !Array.isArray(parsed.days) || parsed.days.length === 0)
    throw new Error("INVALID_STRUCTURE");

  return parsed;
}

// ─── Persist to DB ────────────────────────────────────────────────────────────

const VALID_CATEGORIES = new Set([
  "Food", "Culture", "Nature", "Adventure", "History",
  "Shopping", "Nightlife", "Transport", "Accommodation", "Other",
]);

function normaliseCategory(raw: string): string {
  const cap = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  return VALID_CATEGORIES.has(cap) ? cap : "Other";
}

async function persistItinerary(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  req: GenerateRequest,
  itinerary: OpenAIItinerary,
  expectedDates: string[],
): Promise<{ tripId: string; warnings: string[] }> {
  const warnings: string[] = [];
  if (itinerary.days.length < expectedDates.length) {
    warnings.push(
      `The AI generated ${itinerary.days.length} of ${expectedDates.length} requested days — ` +
      `the rest were added empty so your trip still covers its full date range. Ask the AI Copilot to fill them in.`,
    );
  } else if (itinerary.days.length > expectedDates.length) {
    warnings.push(
      `The AI generated ${itinerary.days.length} days for a ${expectedDates.length}-day trip. Extra days were dropped.`,
    );
  }

  // 1. Insert trip
  const { data: tripData, error: tripErr } = await supabase
    .from("trips")
    .insert({
      user_id: userId,
      title: itinerary.title || req.destination,
      destination: req.destination,
      start_date: req.start_date,
      end_date: req.end_date,
      budget: req.budget,
      currency: req.currency,
      travelers: req.travelers,
      pace: req.travel_pace,
      interests: req.interests,
      special_requests: req.special_requests ?? "",
      status: "Planning",
      last_updated: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (tripErr || !tripData) {
    throw new Error("DB_TRIP_INSERT_FAILED");
  }

  const tripId: string = (tripData as { id: string }).id;

  // 2. Insert days + activities — always exactly one row per requested date,
  // in order, regardless of how many days the model actually returned. Its
  // structured output isn't reliably following the "exactly N days" prompt
  // instruction (this is what was causing trips of any length to persist as
  // a single day), so day count and date now come entirely from the
  // request's own date range; a day the model didn't produce is inserted
  // empty rather than silently dropped, and the model's own `date` field is
  // never trusted for what gets stored (matched positionally instead), so a
  // date-formatting slip can't misalign a day from the calendar the user
  // actually picked.
  try {
    for (let i = 0; i < expectedDates.length; i++) {
      const daySpec: OpenAIDay | undefined = itinerary.days[i];
      const dayNumber = i + 1;

      const { data: dayData, error: dayErr } = await supabase
        .from("trip_days")
        .insert({
          trip_id: tripId,
          label: `Day ${dayNumber}`,
          date: expectedDates[i],
          theme: daySpec?.theme ?? "",
          summary: daySpec?.summary ?? "",
          sort_order: dayNumber,
        })
        .select("id")
        .maybeSingle();

      if (dayErr || !dayData) {
        warnings.push(`Day ${dayNumber} could not be saved.`);
        continue;
      }

      const dayId: string = (dayData as { id: string }).id;
      if (!daySpec) continue; // AI returned fewer days than requested — left empty, not fabricated

      for (let j = 0; j < daySpec.activities.length; j++) {
        const act = daySpec.activities[j];
        const cost = typeof act.estimated_cost === "number" && act.estimated_cost >= 0
          ? act.estimated_cost
          : 0;
        const duration = typeof act.duration_minutes === "number" && act.duration_minutes > 0
          ? act.duration_minutes
          : 60;

        const confidence = ["low", "medium", "high"].includes(act.cost_confidence)
          ? act.cost_confidence
          : "medium";
        const hasCoords = typeof act.latitude === "number" && typeof act.longitude === "number"
          && Math.abs(act.latitude) <= 90 && Math.abs(act.longitude) <= 180;

        const { error: actErr } = await supabase.from("activities").insert({
          trip_day_id: dayId,
          trip_id: tripId,
          title: act.title || "Activity",
          description: act.description ?? "",
          time: act.start_time ?? "",
          location: act.location ?? "",
          duration_minutes: duration,
          estimated_cost: cost,
          cost_confidence: confidence,
          currency: req.currency,
          category: normaliseCategory(act.category),
          ai_reason: act.ai_reason ?? "",
          is_locked: false,
          personal_note: "[]",
          sort_order: j,
          latitude: hasCoords ? act.latitude : null,
          longitude: hasCoords ? act.longitude : null,
        });

        if (actErr) {
          warnings.push(`Activity "${act.title}" on Day ${dayNumber} could not be saved.`);
        }
      }
    }
  } catch {
    // Clean up the trip if days/activities failed catastrophically
    await supabase.from("trips").delete().eq("id", tripId);
    throw new Error("DB_SAVE_FAILED");
  }

  return { tripId, warnings };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Authentication required." }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return jsonResponse({ error: "Authentication required." }, 401);

    // Parse + validate input
    let body: Partial<GenerateRequest>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body." }, 400);
    }

    const validationError = validateInput(body);
    if (validationError) return jsonResponse({ error: validationError }, 400);

    const input = body as GenerateRequest;

    // Call OpenRouter
    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      console.error("[generate-itinerary] OPENROUTER_API_KEY is not set");
      return jsonResponse({
        error: "AI itinerary generation is currently unavailable.\nPlease configure your AI provider.",
      }, 503);
    }

    let itinerary: OpenAIItinerary;
    try {
      itinerary = await callOpenAI(input, apiKey);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "UNKNOWN";
      console.error("[generate-itinerary] OpenRouter error:", msg);

      if (msg === "RATE_LIMITED") return jsonResponse({ error: "Too many requests. Please try again in a moment." }, 429);
      if (msg === "INVALID_API_KEY") return jsonResponse({ error: "Generation service is misconfigured." }, 503);
      if (msg === "INSUFFICIENT_CREDITS") return jsonResponse({ error: "Generation service is out of credits." }, 503);
      return jsonResponse({ error: "Could not generate itinerary. Please try again." }, 502);
    }

    // Persist
    const expectedDates = enumerateDates(input.start_date, input.end_date);
    let result: { tripId: string; warnings: string[] };
    try {
      result = await persistItinerary(supabase, user.id, input, itinerary, expectedDates);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "UNKNOWN";
      console.error("[generate-itinerary] DB error:", msg);
      return jsonResponse({ error: "Could not save your itinerary. Please try again." }, 500);
    }

    console.log(`[generate-itinerary] Created trip ${result.tripId} for user ${user.id}`);

    return jsonResponse({ tripId: result.tripId, warnings: result.warnings });
  } catch (err) {
    console.error("[generate-itinerary] Unhandled error:", err);
    return jsonResponse({ error: "An unexpected error occurred." }, 500);
  }
});
