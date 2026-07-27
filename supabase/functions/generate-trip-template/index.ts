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

/*
Generates ONE trip_templates row (+ template_days + template_activities)
from a destination/trip-parameter spec, using the same OpenAI structured-
output approach as generate-itinerary — reusing the pattern (prompt shape,
JSON schema, model), not the function itself, since this writes into the
shared trip_templates tables via the service-role client instead of a
specific user's trips row, and needs its own validation pass before
anything is persisted.

Designed to generate exactly one template per invocation (not a whole
continent's batch) so a single call stays comfortably within an edge
function's execution window even with an internal retry. The batch
(Asia/Europe seed pool) is driven by an external orchestrator script
calling this once per spec with its own concurrency control — see
scripts/seed-trip-templates.mjs.

Every inserted row lands with review_status = 'pending'. Nothing this
function writes is visible to the picker until a human reviews and flips
it to 'approved' (see supabase/migrations/20260722080000_add_trip_template_review_status.sql).
*/

interface TemplateSpec {
  destination: string;
  country: string;
  continent: string;
  days: number;
  budget: number;
  currency: string;
  travelers: number;
  pace: string;
  interests: string[];
}

function validateSpec(body: Partial<TemplateSpec>): string | null {
  if (!body.destination?.trim()) return "destination is required.";
  if (!body.country?.trim()) return "country is required.";
  if (!body.continent?.trim()) return "continent is required.";
  if (typeof body.days !== "number" || body.days < 1 || body.days > 14) return "days must be between 1 and 14.";
  if (typeof body.budget !== "number" || body.budget <= 0) return "budget must be greater than zero.";
  if (!body.currency?.trim()) return "currency is required.";
  if (typeof body.travelers !== "number" || body.travelers < 1) return "travelers must be at least 1.";
  if (!body.pace?.trim()) return "pace is required.";
  if (!Array.isArray(body.interests) || body.interests.length === 0) return "at least one interest is required.";
  return null;
}

// ─── OpenAI structured output schema (same shape as generate-itinerary) ──────

const responseSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day_number: { type: "integer" },
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
                latitude: { type: "number" },
                longitude: { type: "number" },
              },
              required: [
                "title", "description", "location", "start_time", "duration_minutes",
                "estimated_cost", "category", "ai_reason", "latitude", "longitude",
              ],
              additionalProperties: false,
            },
          },
        },
        required: ["day_number", "theme", "summary", "activities"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "summary", "days"],
  additionalProperties: false,
};

interface OpenAIActivity {
  title: string;
  description: string;
  location: string;
  start_time: string;
  duration_minutes: number;
  estimated_cost: number;
  category: string;
  ai_reason: string;
  latitude: number;
  longitude: number;
}

interface OpenAIDay {
  day_number: number;
  theme: string;
  summary: string;
  activities: OpenAIActivity[];
}

interface OpenAIItinerary {
  title: string;
  summary: string;
  days: OpenAIDay[];
}

async function callOpenAI(spec: TemplateSpec, apiKey: string, previousIssues?: string[]): Promise<OpenAIItinerary> {
  const retryNote = previousIssues?.length
    ? `\n\nA previous attempt at this exact request had these problems — fix all of them this time: ${previousIssues.join("; ")}`
    : "";

  const userPrompt = `
Destination: ${spec.destination} (${spec.country})
Trip length: exactly ${spec.days} day${spec.days !== 1 ? "s" : ""}
Budget: ${spec.budget} ${spec.currency} (total, for ${spec.travelers} traveler${spec.travelers !== 1 ? "s" : ""})
Travel pace: ${spec.pace}
Interests: ${spec.interests.join(", ")}

REQUIRED — the "days" array MUST contain exactly ${spec.days} entries, day_number 1 through ${spec.days} in order. Every day must have at least one activity — never an empty day.

For each day, cover a full schedule: a morning activity, an afternoon activity, an evening activity, and meals (breakfast/lunch/dinner using the "Food" category) where appropriate for the pace. Include transportation between distant locations as its own activity using the "Transport" category when relevant. Keep all activities within the same day geographically coherent — don't schedule two far-apart locations back to back with no travel time.${retryNote}
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
            "You are Planora, an expert travel itinerary planner, generating a curated SUGGESTED TRIP PLAN — a template other users will browse and adopt, not one specific traveler's live trip. Create a realistic, appealing itinerary based on the destination, trip length, budget, traveler count, pace, and interests given. Return exactly the required number of days, each with at least one activity, in order. Group activities geographically — never schedule two far-apart locations back to back. Include reasonable travel and rest time. Avoid impossible schedules. Do not claim confirmed availability, live prices, reservations, or opening hours; all prices are estimates. Keep each individual activity's estimated_cost realistic for the destination (rarely above 200 for a single activity unless it's a genuinely premium experience like a multi-hour private tour or safari), and keep the day's and trip's total costs broadly consistent with the stated budget. Explain briefly why each activity fits the trip. Provide your best-effort real-world latitude and longitude for every activity's location using your knowledge of the destination's geography.\n\nThe \"summary\" field is a one-sentence pitch shown on a browse card next to dozens of other destinations' summaries — it must read as specific to this exact itinerary, not swappable with any other trip to the same country. Name at least one real, specific place, dish, or activity that appears in the days you generated (an actual landmark, neighborhood, market, dish, or venue — not a generic category like \"the old town\" or \"local cuisine\"). Never open the summary with \"Explore the\" or \"Experience the\" — vary sentence structure between calls. Do not use these overused travel-brochure words anywhere in the summary: vibrant, rich, iconic, hidden gem(s), scene, perfect, delicious, bustling, breathtaking, must-see. Return only structured data matching the required schema.",
        },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "itinerary", strict: true, schema: responseSchema },
      },
      temperature: 0.8,
      max_tokens: Math.min(16_000, Math.max(4000, spec.days * 900 + 2000)),
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

// ─── Automated sanity pass ────────────────────────────────────────────────────
// Runs against every generated candidate before it's allowed anywhere near
// trip_templates. Anything that fails triggers one regeneration attempt
// (see the retry loop in the handler); still-failing candidates are
// excluded outright rather than persisted as 'rejected' — no value in
// keeping broken content around, the orchestrator's log already records
// what got excluded and why.

const VALID_CATEGORIES = new Set([
  "Food", "Culture", "Nature", "Adventure", "History",
  "Shopping", "Nightlife", "Transport", "Accommodation", "Other",
]);

function timeToMinutes(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t?.trim() ?? "");
  if (!m) return null;
  const h = Number(m[1]), min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function validateItinerary(itinerary: OpenAIItinerary, spec: TemplateSpec): string[] {
  const issues: string[] = [];

  if (Math.abs(itinerary.days.length - spec.days) > 1) {
    issues.push(`Expected ~${spec.days} days, got ${itinerary.days.length}`);
  }

  let totalCost = 0;

  itinerary.days.forEach((day, dayIdx) => {
    const dayLabel = `Day ${dayIdx + 1}`;
    if (!day.activities || day.activities.length === 0) {
      issues.push(`${dayLabel} has no activities`);
      return;
    }

    const seen: { title: string; location: string; minutes: number | null; lat?: number; lon?: number }[] = [];
    let prevInOrder: { title: string; minutes: number } | null = null;

    day.activities.forEach((act, actIdx) => {
      const label = `${dayLabel} activity ${actIdx + 1}`;
      if (!act.title?.trim()) issues.push(`${label}: missing title`);
      if (!act.description?.trim()) issues.push(`${label}: missing description`);
      if (!act.location?.trim()) issues.push(`${label}: missing location`);
      const minutes = timeToMinutes(act.start_time);
      if (minutes === null) issues.push(`${label}: missing/invalid start_time "${act.start_time}"`);
      if (!act.duration_minutes || act.duration_minutes <= 0) issues.push(`${label}: invalid duration_minutes`);
      if (typeof act.estimated_cost !== "number" || act.estimated_cost < 0) issues.push(`${label}: invalid estimated_cost`);
      if (!act.ai_reason?.trim()) issues.push(`${label}: missing ai_reason`);
      const hasCoords = typeof act.latitude === "number" && typeof act.longitude === "number"
        && Math.abs(act.latitude) <= 90 && Math.abs(act.longitude) <= 180 && !(act.latitude === 0 && act.longitude === 0);
      if (!hasCoords) issues.push(`${label}: missing/invalid coordinates`);

      if (typeof act.estimated_cost === "number" && act.estimated_cost > 500) {
        issues.push(`${label} "${act.title}": cost ${act.estimated_cost} is implausibly high for a single activity`);
      }
      totalCost += typeof act.estimated_cost === "number" ? act.estimated_cost : 0;

      for (const prev of seen) {
        if (minutes !== null && prev.minutes === minutes && prev.location?.toLowerCase() === act.location?.toLowerCase()) {
          issues.push(`${dayLabel}: duplicate activity "${prev.title}" and "${act.title}" at the same time and location`);
        }
        if (hasCoords && prev.lat != null && prev.lon != null && minutes !== null && prev.minutes !== null) {
          const distKm = haversineKm(prev.lat, prev.lon, act.latitude, act.longitude);
          const gapMin = Math.abs(minutes - prev.minutes);
          if (distKm > 150 && gapMin < 90) {
            issues.push(`${dayLabel}: "${prev.title}" and "${act.title}" are ${distKm.toFixed(0)}km apart but only ${gapMin}min apart on the schedule`);
          }
        }
      }
      // Chronological order — each activity within a day must be at or
      // after the one listed before it. This is exactly the bug class
      // that let a "Transport to Namsan Tower" (17:30) get listed after
      // "Namsan Tower Evening Visit" (18:00) through in an earlier batch
      // — cheap to catch here, no reason to ship it again.
      if (minutes !== null) {
        if (prevInOrder && minutes < prevInOrder.minutes) {
          issues.push(`${dayLabel}: "${act.title}" (${act.start_time}) is listed after "${prevInOrder.title}" (earlier activity), but its time is earlier — activities must stay in chronological order within a day`);
        }
        prevInOrder = { title: act.title, minutes };
      }

      seen.push({ title: act.title, location: act.location, minutes, lat: act.latitude, lon: act.longitude });
    });
  });

  if (totalCost > spec.budget * 1.5) {
    issues.push(`Total estimated cost ${totalCost.toFixed(0)} ${spec.currency} far exceeds the ${spec.budget} ${spec.currency} budget`);
  }
  if (totalCost < spec.budget * 0.05) {
    issues.push(`Total estimated cost ${totalCost.toFixed(0)} ${spec.currency} is implausibly low for the ${spec.budget} ${spec.currency} budget`);
  }

  return issues;
}

function normaliseCategory(raw: string): string {
  const cap = raw?.charAt(0).toUpperCase() + raw?.slice(1).toLowerCase();
  return VALID_CATEGORIES.has(cap) ? cap : "Other";
}

// ─── Persist ──────────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function persistTemplate(
  svcClient: ReturnType<typeof createClient>,
  spec: TemplateSpec,
  itinerary: OpenAIItinerary,
  startDate: string,
): Promise<string> {
  const { data: tplData, error: tplErr } = await svcClient
    .from("trip_templates")
    .insert({
      title: itinerary.title || spec.destination,
      destination: spec.destination,
      country: spec.country,
      continent: spec.continent,
      start_date: startDate,
      end_date: addDays(startDate, itinerary.days.length - 1),
      budget: spec.budget,
      currency: spec.currency,
      travelers: spec.travelers,
      pace: spec.pace,
      interests: spec.interests,
      special_requests: "",
      summary: itinerary.summary || "",
      review_status: "pending",
    })
    .select("id")
    .maybeSingle();

  if (tplErr || !tplData) throw new Error(`DB_TEMPLATE_INSERT_FAILED: ${tplErr?.message}`);
  const templateId = (tplData as { id: string }).id;

  for (let i = 0; i < itinerary.days.length; i++) {
    const day = itinerary.days[i];
    const { data: dayData, error: dayErr } = await svcClient
      .from("template_days")
      .insert({
        template_id: templateId,
        label: `Day ${i + 1}`,
        date: addDays(startDate, i),
        theme: day.theme || "",
        summary: day.summary || "",
        sort_order: i + 1,
      })
      .select("id")
      .maybeSingle();
    if (dayErr || !dayData) continue;
    const dayId = (dayData as { id: string }).id;

    for (let j = 0; j < day.activities.length; j++) {
      const act = day.activities[j];
      const hasCoords = typeof act.latitude === "number" && typeof act.longitude === "number"
        && Math.abs(act.latitude) <= 90 && Math.abs(act.longitude) <= 180;
      await svcClient.from("template_activities").insert({
        template_day_id: dayId,
        template_id: templateId,
        title: act.title || "Activity",
        description: act.description ?? "",
        time: act.start_time ?? "",
        location: act.location ?? "",
        duration_minutes: act.duration_minutes > 0 ? act.duration_minutes : 60,
        estimated_cost: act.estimated_cost >= 0 ? act.estimated_cost : 0,
        currency: spec.currency,
        category: normaliseCategory(act.category),
        ai_reason: act.ai_reason ?? "",
        latitude: hasCoords ? act.latitude : null,
        longitude: hasCoords ? act.longitude : null,
        cost_confidence: "medium",
        sort_order: j,
      });
    }
  }

  return templateId;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Authentication required." }, 401);

    const authedClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await authedClient.auth.getUser();
    if (authErr || !user) return jsonResponse({ error: "Authentication required." }, 401);

    let body: Partial<TemplateSpec>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body." }, 400);
    }

    const specErr = validateSpec(body);
    if (specErr) return jsonResponse({ error: specErr }, 400);
    const spec = body as TemplateSpec;

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) return jsonResponse({ error: "AI generation is currently unavailable." }, 503);

    // trip_templates has no client-writable RLS policy at all — every write
    // here goes through the service-role client, same precedent as
    // launch-demo's seeding and the client-side cloneTemplateIntoTrip path
    // (which uses the caller's own session instead, since that write lands
    // in the caller's own trips row, not shared content).
    const svcClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const MAX_ATTEMPTS = 2;
    let lastIssues: string[] = [];
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let itinerary: OpenAIItinerary;
      try {
        itinerary = await callOpenAI(spec, apiKey, attempt > 1 ? lastIssues : undefined);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "UNKNOWN";
        console.error(`[generate-trip-template] OpenRouter error (attempt ${attempt}):`, msg);
        if (attempt === MAX_ATTEMPTS) {
          return jsonResponse({ ok: false, excluded: true, reason: `Generation failed: ${msg}`, spec }, 200);
        }
        continue;
      }

      const issues = validateItinerary(itinerary, spec);
      if (issues.length === 0) {
        const today = new Date();
        today.setDate(today.getDate() + 60);
        const startDate = today.toISOString().slice(0, 10);
        try {
          const templateId = await persistTemplate(svcClient, spec, itinerary, startDate);
          return jsonResponse({
            ok: true,
            id: templateId,
            title: itinerary.title,
            attempts: attempt,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "UNKNOWN";
          console.error("[generate-trip-template] persist error:", msg);
          return jsonResponse({ ok: false, excluded: true, reason: `Save failed: ${msg}`, spec }, 200);
        }
      }

      console.warn(`[generate-trip-template] validation failed (attempt ${attempt}) for ${spec.destination}:`, issues);
      lastIssues = issues;
      if (attempt === MAX_ATTEMPTS) {
        return jsonResponse({ ok: false, excluded: true, reason: "Failed validation after retry", issues, spec }, 200);
      }
    }

    return jsonResponse({ ok: false, excluded: true, reason: "Unreachable", spec }, 200);
  } catch (err) {
    console.error("[generate-trip-template] Unhandled error:", err);
    return jsonResponse({ error: "An unexpected error occurred." }, 500);
  }
});
