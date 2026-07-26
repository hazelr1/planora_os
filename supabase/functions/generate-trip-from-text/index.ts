import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/*
Entry point for the "paste a trip idea" flow: a user pastes unstructured
free text — a reel caption, a scrawled list of place names, informal notes,
anything — and gets back a real, owned trip in their My Trips, the same
kind of row generate-itinerary produces from a filled-out form.

Two OpenRouter calls, not one:
  1. Extraction — read the raw text and pull out a destination, a rough
     trip length, and the specific places/activities it mentions. The
     model is doing reading comprehension here, not itinerary design.
  2. Structuring — feed that extraction into the *same* day-by-day
     schema/prompt shape generate-itinerary already uses for a normal,
     form-driven request, with the extracted places folded into
     special_requests so they actually show up on the calendar instead of
     just informing the vibe.

This mirrors generate-trip-template's own precedent of reusing the pattern
(prompt shape, JSON schema, model) rather than importing generate-itinerary
directly — each edge function is its own deployable unit, and the two
already diverge in one key way: this one persists into the *caller's own*
trips/trip_days/activities rows via their session (RLS-protected, same as
generate-itinerary), not a shared, service-role-written template pool.
*/

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

const MAX_TEXT_LENGTH = 4000;

const VALID_PACES = new Set(["Relaxed", "Balanced", "Packed"]);
const VALID_INTERESTS = new Set([
  "Food", "Culture", "Nature", "Adventure", "History", "Shopping", "Hidden Gems", "Nightlife",
]);

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

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/*
─── Trip preference tags ──────────────────────────────────────────────────
Same rolling three-tag profile snapshot generate-itinerary reads/writes —
duplicated here rather than imported (a separately deployed Deno function),
kept in sync by hand. See that file's own comment for the full rationale.
*/

interface TripPreferenceTags {
  pace?: "slow" | "moderate" | "packed";
  travels_with_kids?: "yes" | "no";
  budget_tier?: "budget" | "mid-range" | "luxury";
}

const KIDS_KEYWORDS = [
  "kid", "kids", "child", "children", "toddler", "family friendly", "family-friendly", "stroller", "baby", "infant",
];

function deriveTripPreferenceTags(req: StructuringRequest, rawText: string, numDays: number): TripPreferenceTags {
  const tags: TripPreferenceTags = {};

  if (req.travel_pace === "Relaxed") tags.pace = "slow";
  else if (req.travel_pace === "Packed") tags.pace = "packed";
  else if (req.travel_pace === "Balanced") tags.pace = "moderate";

  const lowerText = `${req.special_requests} ${rawText}`.toLowerCase();
  tags.travels_with_kids = KIDS_KEYWORDS.some((kw) => lowerText.includes(kw)) ? "yes" : "no";

  if (req.budget > 0 && req.travelers > 0 && numDays > 0) {
    const perDayPerTraveler = req.budget / req.travelers / numDays;
    tags.budget_tier = perDayPerTraveler < 100 ? "budget" : perDayPerTraveler < 300 ? "mid-range" : "luxury";
  }

  return tags;
}

function buildPreferenceNote(tags: TripPreferenceTags | null): string | null {
  if (!tags) return null;
  const parts: string[] = [];
  if (tags.pace) parts.push(`prefers a ${tags.pace} pace`);
  if (tags.travels_with_kids === "yes") parts.push("often travels with kids");
  if (tags.budget_tier) parts.push(`typically travels ${tags.budget_tier}`);
  if (parts.length === 0) return null;
  return `Known traveler preferences from past trips (soft guidance — defer to anything explicit above): ${parts.join(", ")}.`;
}

async function readProfilePreferences(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<TripPreferenceTags | null> {
  try {
    const { data } = await supabase.from("profiles").select("preferences").eq("id", userId).maybeSingle();
    const prefs = (data as { preferences?: TripPreferenceTags } | null)?.preferences;
    return prefs && Object.keys(prefs).length > 0 ? prefs : null;
  } catch (err) {
    console.warn("[generate-trip-from-text] could not read profile preferences:", err);
    return null;
  }
}

async function updateProfilePreferences(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  tags: TripPreferenceTags,
): Promise<void> {
  try {
    const { data } = await supabase.from("profiles").select("preferences").eq("id", userId).maybeSingle();
    if (!data) return;
    const existing = (data as { preferences?: TripPreferenceTags }).preferences ?? {};
    const merged = { ...existing, ...tags };
    const { error } = await supabase
      .from("profiles")
      .update({ preferences: merged, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) console.warn("[generate-trip-from-text] preference update failed:", error.message);
  } catch (err) {
    console.warn("[generate-trip-from-text] preference update threw:", err);
  }
}

// ─── Step 1: extraction ───────────────────────────────────────────────────────

const extractionSchema = {
  type: "object",
  properties: {
    destination: { type: "string" },
    title: { type: "string" },
    days: { type: "integer" },
    travelers: { type: "integer" },
    pace: { type: "string", enum: ["Relaxed", "Balanced", "Packed"] },
    interests: {
      type: "array",
      items: { type: "string", enum: ["Food", "Culture", "Nature", "Adventure", "History", "Shopping", "Hidden Gems", "Nightlife"] },
    },
    currency: { type: "string" },
    budget: { type: "number" },
    places: { type: "array", items: { type: "string" } },
  },
  required: ["destination", "title", "days", "travelers", "pace", "interests", "currency", "budget", "places"],
  additionalProperties: false,
};

interface ExtractionResult {
  destination: string;
  title: string;
  days: number;
  travelers: number;
  pace: string;
  interests: string[];
  currency: string;
  budget: number;
  places: string[];
}

async function callExtraction(pastedText: string, apiKey: string): Promise<ExtractionResult> {
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
            "You are Planora's trip-idea extractor. The user pastes unstructured free text — a social " +
            "media caption, a list of place names, informal notes, anything — that describes or implies " +
            "a trip. Read it and extract a structured brief: the single overall destination (city and/or " +
            "country, combined into one clear location string even if only implied by the places " +
            "mentioned); a short trip title; a reasonable number of days to comfortably cover everything " +
            "mentioned at a relaxed-to-balanced pace (integer, 1 to 14); a best-guess traveler count " +
            "(default 1 if the text gives no indication); a best-guess pace; 1 to 4 interests from the " +
            "allowed list that best match the text's vibe; the ISO currency code most commonly used at " +
            "that destination; a reasonable total trip budget estimate in that currency for the given " +
            "traveler count and day count; and a deduplicated list of the specific place names, " +
            "restaurants, neighborhoods, or activities explicitly mentioned or strongly implied, in the " +
            "order they should logically be visited if that's inferable, otherwise in the order " +
            "mentioned. If the text does not clearly describe or imply any real destination, return an " +
            "empty string for destination and an empty array for places.",
        },
        { role: "user", content: pastedText },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "trip_brief", strict: true, schema: extractionSchema },
      },
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (response.status === 429) throw new Error("RATE_LIMITED");
  if (response.status === 401) throw new Error("INVALID_API_KEY");
  if (response.status === 402) throw new Error("INSUFFICIENT_CREDITS");
  if (!response.ok) throw new Error(`OPENROUTER_ERROR:${response.status}`);

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("EMPTY_RESPONSE");

  try {
    return JSON.parse(content);
  } catch {
    throw new Error("INVALID_JSON");
  }
}

// ─── Step 2: structuring — same schema/prompt shape as generate-itinerary ────

interface StructuringRequest {
  destination: string;
  start_date: string;
  end_date: string;
  budget: number;
  currency: string;
  travelers: number;
  travel_pace: string;
  interests: string[];
  special_requests: string;
}

const itinerarySchema = {
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

async function callStructuring(req: StructuringRequest, apiKey: string, preferenceNote?: string): Promise<OpenAIItinerary> {
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
${preferenceNote ? `${preferenceNote}\n` : ""}
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
            "You are Planora, an expert travel itinerary planner. Create a realistic and editable itinerary based on the user's destination, dates, budget, traveler count, pace, interests, and special requests. The special requests may list specific places or activities the traveler already wants included — work every one of them into the schedule at a sensible day/time rather than treating them as optional flavor. The prompt may also include the traveler's known preferences learned from past trips — treat those as soft guidance that loses to anything explicitly stated for this specific trip. The user prompt lists the exact required dates — you MUST return one entry in the days array for every single one of them, in order, never fewer. Group activities geographically. Include reasonable travel and rest time. Avoid impossible schedules. Do not claim confirmed availability, live prices, reservations, or opening hours. All prices are estimates. Explain briefly why each activity fits the user. For every activity, set cost_confidence to 'high' when you are confident in the estimated_cost (e.g. well-known fixed-price attractions), 'medium' for typical estimates, and 'low' when the price is highly variable or uncertain. For every activity, also provide your best-effort real-world latitude and longitude for its location — use your knowledge of the destination's geography; if you are not reasonably confident of the coordinates, still provide your best estimate rather than a placeholder. Return only structured data matching the required schema.",
        },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "itinerary", strict: true, schema: itinerarySchema },
      },
      temperature: 0.7,
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

  if (!parsed.days || !Array.isArray(parsed.days) || parsed.days.length === 0) {
    throw new Error("INVALID_STRUCTURE");
  }

  return parsed;
}

// ─── Persist — same shape as generate-itinerary's own insert path ────────────

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
  req: StructuringRequest,
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
      if (!daySpec) continue;

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Authentication required." }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return jsonResponse({ error: "Authentication required." }, 401);

    // Same policy as generate-itinerary: demo sessions get exactly one
    // seeded trip plus whatever suggested plans they clone, never
    // unlimited custom AI generation from either entry point.
    if (user.user_metadata?.is_demo_user) {
      return jsonResponse({
        error: "Demo sessions can't generate custom trips. Browse suggested plans, or sign up for a full account.",
      }, 403);
    }

    let body: { pasted_text?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body." }, 400);
    }

    const pastedText = body.pasted_text?.trim() ?? "";
    if (!pastedText) return jsonResponse({ error: "Paste some text describing your trip first." }, 400);
    if (pastedText.length > MAX_TEXT_LENGTH) {
      return jsonResponse({ error: `That's a bit long — please paste ${MAX_TEXT_LENGTH} characters or fewer.` }, 400);
    }

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      console.error("[generate-trip-from-text] OPENROUTER_API_KEY is not set");
      return jsonResponse({
        error: "AI trip building is currently unavailable.\nPlease configure your AI provider.",
      }, 503);
    }

    // Step 1: extract a structured brief from the raw text.
    let brief: ExtractionResult;
    try {
      brief = await callExtraction(pastedText, apiKey);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "UNKNOWN";
      console.error("[generate-trip-from-text] extraction error:", msg);
      if (msg === "RATE_LIMITED") return jsonResponse({ error: "Too many requests. Please try again in a moment." }, 429);
      if (msg === "INVALID_API_KEY") return jsonResponse({ error: "Generation service is misconfigured." }, 503);
      if (msg === "INSUFFICIENT_CREDITS") return jsonResponse({ error: "Generation service is out of credits." }, 503);
      return jsonResponse({ error: "Could not read that text. Please try again." }, 502);
    }

    if (!brief.destination?.trim()) {
      return jsonResponse({
        error: "Could not identify a destination from that text. Try including a city, region, or a few specific place names.",
      }, 422);
    }

    // Fill in anything the extraction left implausible with the same
    // defaults TripForm itself starts from (2 travelers, Balanced pace) —
    // this trip's own settings are editable afterward regardless.
    const days = Number.isFinite(brief.days) ? Math.min(14, Math.max(1, Math.round(brief.days))) : 3;
    const travelers = Number.isFinite(brief.travelers) ? Math.min(20, Math.max(1, Math.round(brief.travelers))) : 2;
    const pace = VALID_PACES.has(brief.pace) ? brief.pace : "Balanced";
    const interests = (brief.interests ?? []).filter((i) => VALID_INTERESTS.has(i));
    const currency = /^[A-Z]{3}$/.test(brief.currency) ? brief.currency : "USD";
    const budget = typeof brief.budget === "number" && brief.budget > 0
      ? Math.round(brief.budget)
      : days * travelers * 150;

    // Starting three weeks out is just a placeholder anchor — same as any
    // AI-generated trip, every one of these fields is editable from the
    // trip's own settings once it exists.
    const startDate = addDays(new Date().toISOString().slice(0, 10), 21);
    const endDate = addDays(startDate, days - 1);

    const placesNote = brief.places?.length
      ? `Make sure to include these specific places/activities the traveler mentioned, worked into the schedule at a sensible day and time: ${brief.places.join(", ")}.`
      : "";
    const specialRequests = [placesNote, `Original notes from the traveler: "${pastedText.slice(0, 800)}"`]
      .filter(Boolean)
      .join(" ");

    const structuringReq: StructuringRequest = {
      destination: brief.destination.trim(),
      start_date: startDate,
      end_date: endDate,
      budget,
      currency,
      travelers,
      travel_pace: pace,
      interests: interests.length > 0 ? interests : ["Culture"],
      special_requests: specialRequests,
    };

    // Read back whatever preference tags a past trip left behind — soft
    // context for this generation, same as a normal generate-itinerary call.
    const storedPreferences = await readProfilePreferences(supabase, user.id);
    const preferenceNote = buildPreferenceNote(storedPreferences);

    // Step 2: structure into a day-by-day itinerary — same schema/prompt
    // pattern as a normal form-driven generate-itinerary call.
    let itinerary: OpenAIItinerary;
    try {
      itinerary = await callStructuring(structuringReq, apiKey, preferenceNote ?? undefined);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "UNKNOWN";
      console.error("[generate-trip-from-text] structuring error:", msg);
      if (msg === "RATE_LIMITED") return jsonResponse({ error: "Too many requests. Please try again in a moment." }, 429);
      if (msg === "INVALID_API_KEY") return jsonResponse({ error: "Generation service is misconfigured." }, 503);
      if (msg === "INSUFFICIENT_CREDITS") return jsonResponse({ error: "Generation service is out of credits." }, 503);
      return jsonResponse({ error: "Could not build an itinerary from that text. Please try again." }, 502);
    }

    const expectedDates = enumerateDates(startDate, endDate);
    let result: { tripId: string; warnings: string[] };
    try {
      result = await persistItinerary(supabase, user.id, structuringReq, itinerary, expectedDates);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "UNKNOWN";
      console.error("[generate-trip-from-text] DB error:", msg);
      return jsonResponse({ error: "Could not save your trip. Please try again." }, 500);
    }

    console.log(`[generate-trip-from-text] Created trip ${result.tripId} for user ${user.id}`);

    // Refresh the traveler's preference snapshot from *this* trip, folding
    // in the raw pasted text too (the extraction step's own summarizing can
    // lose an explicit "with my kids" aside that the original text had).
    const freshTags = deriveTripPreferenceTags(structuringReq, pastedText, expectedDates.length);
    await updateProfilePreferences(supabase, user.id, freshTags);

    return jsonResponse({
      tripId: result.tripId,
      warnings: result.warnings,
      destination: structuringReq.destination,
      days: expectedDates.length,
    });
  } catch (err) {
    console.error("[generate-trip-from-text] Unhandled error:", err);
    return jsonResponse({ error: "An unexpected error occurred." }, 500);
  }
});
