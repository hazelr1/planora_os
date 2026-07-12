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
  interests: string[];
}

interface DbActivity {
  category: string;
}

// ─── AI response schema ───────────────────────────────────────────────────────
//
// Note: everything here is AI-estimated, not a live quote from a real
// flights/hotels/weather provider. Framed clearly as suggestions/estimates
// throughout the response and in the UI that renders it.

const responseSchema = {
  type: "object",
  properties: {
    packing_checklist: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          category: { type: "string" },
        },
        required: ["label", "category"],
        additionalProperties: false,
      },
    },
    hotel_suggestions: { type: "array", items: { type: "string" } },
    restaurant_suggestions: { type: "array", items: { type: "string" } },
    estimated_flight_price: { type: "number" },
  },
  required: ["packing_checklist", "hotel_suggestions", "restaurant_suggestions", "estimated_flight_price"],
  additionalProperties: false,
};

interface AiResponse {
  packing_checklist: { label: string; category: string }[];
  hotel_suggestions: string[];
  restaurant_suggestions: string[];
  estimated_flight_price: number;
}

async function callOpenAI(trip: DbTrip, categories: string[], apiKey: string): Promise<AiResponse> {
  const days = Math.round(
    (new Date(trip.end_date + "T00:00:00").getTime() - new Date(trip.start_date + "T00:00:00").getTime()) / 86_400_000,
  ) + 1;

  const userPrompt = `
Destination: ${trip.destination}
Dates: ${trip.start_date} to ${trip.end_date} (${days} day${days !== 1 ? "s" : ""})
Travelers: ${trip.travelers}
Budget: ${trip.budget} ${trip.currency}
Interests: ${trip.interests.join(", ") || "General"}
Activity categories already planned: ${categories.length > 0 ? [...new Set(categories)].join(", ") : "None yet"}
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
            "You are Planora's trip intelligence assistant. Given a trip's destination, dates, travelers, budget, and planned activities, produce: " +
            "(1) a practical packing checklist tailored to the destination, likely season/climate for those dates, trip length, and planned activities — 8 to 16 items, each with a short category label (e.g. Clothing, Documents, Electronics, Health, Gear); " +
            "(2) 3 hotel-area/type suggestions (neighborhood or hotel style, not real live availability or prices); " +
            "(3) 3 restaurant or cuisine suggestions fitting the destination and interests; " +
            "(4) a rough estimated round-trip flight price in the trip's currency for one traveler, as a single reasonable number based on general knowledge of typical fares for this route — this is an estimate, not a live quote. " +
            "Return only structured data matching the required schema.",
        },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "trip_intelligence",
          strict: true,
          schema: responseSchema,
        },
      },
      temperature: 0.6,
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

    let body: { trip_id?: string };
    try {
      body = await req.json();
    } catch {
      return jsonRes({ error: "Invalid JSON body." }, 400);
    }

    const { trip_id } = body;
    if (!trip_id?.trim()) return jsonRes({ error: "trip_id is required." }, 400);

    const { data: tripData, error: tripErr } = await supabase
      .from("trips")
      .select("*")
      .eq("id", trip_id)
      .maybeSingle();

    if (tripErr) {
      console.error("[trip-intelligence] Trip load error:", tripErr.message);
      return jsonRes({ error: "Could not load trip." }, 500);
    }
    if (!tripData) return jsonRes({ error: "Trip not found." }, 404);

    const trip = tripData as DbTrip;
    if (trip.user_id !== user.id) return jsonRes({ error: "Trip not found." }, 404);

    const { data: actsData } = await supabase
      .from("activities")
      .select("category")
      .eq("trip_id", trip_id);
    const categories = ((actsData ?? []) as DbActivity[]).map((a) => a.category);

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      console.error("[trip-intelligence] OPENROUTER_API_KEY not set");
      return jsonRes({
        error: "AI trip intelligence is currently unavailable.\nPlease configure your AI provider.",
      }, 503);
    }

    let ai: AiResponse;
    try {
      ai = await callOpenAI(trip, categories, apiKey);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "UNKNOWN";
      console.error("[trip-intelligence] OpenAI error:", msg);
      if (msg === "RATE_LIMITED") return jsonRes({ error: "Too many requests. Please try again in a moment." }, 429);
      return jsonRes({ error: "Could not generate trip intelligence. Please try again." }, 502);
    }

    return jsonRes({
      packing_checklist: ai.packing_checklist ?? [],
      hotel_suggestions: ai.hotel_suggestions ?? [],
      restaurant_suggestions: ai.restaurant_suggestions ?? [],
      estimated_flight_price: typeof ai.estimated_flight_price === "number" ? ai.estimated_flight_price : null,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[trip-intelligence] Unhandled error:", err);
    return jsonRes({ error: "An unexpected error occurred." }, 500);
  }
});
