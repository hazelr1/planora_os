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
  if (days < 1 || days > 14) return "Trip length must be between 1 and 14 days.";

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
                category: { type: "string" },
                ai_reason: { type: "string" },
              },
              required: ["title", "description", "location", "start_time", "duration_minutes", "estimated_cost", "category", "ai_reason"],
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
  category: string;
  ai_reason: string;
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

async function callOpenAI(req: GenerateRequest, apiKey: string): Promise<OpenAIItinerary> {
  const userPrompt = `
Destination: ${req.destination}
Dates: ${req.start_date} to ${req.end_date}
Budget: ${req.budget} ${req.currency} (total, for ${req.travelers} traveler${req.travelers !== 1 ? "s" : ""})
Travel pace: ${req.travel_pace}
Interests: ${req.interests.join(", ")}
${req.special_requests ? `Special requests: ${req.special_requests}` : ""}
`.trim();

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
            "You are Planora, an expert travel itinerary planner. Create a realistic and editable itinerary based on the user's destination, dates, budget, traveler count, pace, interests, and special requests. Group activities geographically. Include reasonable travel and rest time. Avoid impossible schedules. Do not claim confirmed availability, live prices, reservations, or opening hours. All prices are estimates. Explain briefly why each activity fits the user. Return only structured data matching the required schema.",
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
      max_tokens: 8000,
    }),
  });

  if (response.status === 429) throw new Error("RATE_LIMITED");
  if (response.status === 401) throw new Error("INVALID_API_KEY");
  if (!response.ok) throw new Error(`OPENAI_ERROR:${response.status}`);

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
): Promise<{ tripId: string; warnings: string[] }> {
  const warnings: string[] = [];

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

  // 2. Insert days + activities
  try {
    for (let i = 0; i < itinerary.days.length; i++) {
      const daySpec = itinerary.days[i];

      const { data: dayData, error: dayErr } = await supabase
        .from("trip_days")
        .insert({
          trip_id: tripId,
          label: `Day ${daySpec.day_number}`,
          date: daySpec.date,
          theme: daySpec.theme ?? "",
          summary: daySpec.summary ?? "",
          sort_order: i + 1,
        })
        .select("id")
        .maybeSingle();

      if (dayErr || !dayData) {
        warnings.push(`Day ${daySpec.day_number} could not be saved.`);
        continue;
      }

      const dayId: string = (dayData as { id: string }).id;

      for (let j = 0; j < daySpec.activities.length; j++) {
        const act = daySpec.activities[j];
        const cost = typeof act.estimated_cost === "number" && act.estimated_cost >= 0
          ? act.estimated_cost
          : 0;
        const duration = typeof act.duration_minutes === "number" && act.duration_minutes > 0
          ? act.duration_minutes
          : 60;

        const { error: actErr } = await supabase.from("activities").insert({
          trip_day_id: dayId,
          trip_id: tripId,
          title: act.title || "Activity",
          description: act.description ?? "",
          time: act.start_time ?? "",
          location: act.location ?? "",
          duration_minutes: duration,
          estimated_cost: cost,
          currency: req.currency,
          category: normaliseCategory(act.category),
          ai_reason: act.ai_reason ?? "",
          is_locked: false,
          personal_note: "[]",
          sort_order: j,
        });

        if (actErr) {
          warnings.push(`Activity "${act.title}" on Day ${daySpec.day_number} could not be saved.`);
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

    // Call OpenAI
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      console.error("[generate-itinerary] OPENAI_API_KEY is not set");
      return jsonResponse({ error: "Generation service is not configured." }, 503);
    }

    let itinerary: OpenAIItinerary;
    try {
      itinerary = await callOpenAI(input, apiKey);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "UNKNOWN";
      console.error("[generate-itinerary] OpenAI error:", msg);

      if (msg === "RATE_LIMITED") return jsonResponse({ error: "Too many requests. Please try again in a moment." }, 429);
      if (msg === "INVALID_API_KEY") return jsonResponse({ error: "Generation service is misconfigured." }, 503);
      return jsonResponse({ error: "Could not generate itinerary. Please try again." }, 502);
    }

    // Persist
    let result: { tripId: string; warnings: string[] };
    try {
      result = await persistItinerary(supabase, user.id, input, itinerary);
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
