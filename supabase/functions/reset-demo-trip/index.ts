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

// ─── Seed data (duplicate of launch-demo — kept in sync) ─────────────────────

interface SeedActivity {
  title: string;
  description: string;
  location: string;
  time: string;
  duration_minutes: number;
  estimated_cost: number;
  category: string;
  ai_reason: string;
  is_locked?: boolean;
  personal_note?: string;
}

interface SeedDay {
  label: string;
  theme: string;
  summary: string;
  activities: SeedActivity[];
}

const SEED_DAYS: SeedDay[] = [
  {
    label: "Day 1",
    theme: "Arrival & Shinjuku",
    summary: "Ease into Tokyo with a morning fish market, a garden afternoon, and the legendary yakitori alleys of Golden Gai.",
    activities: [
      {
        title: "Tsukiji Outer Market Breakfast",
        description: "Start with a fresh seafood breakfast in the outer market. Try tamagoyaki, otoro sushi, and matcha-dusted pastries from the vendor stalls.",
        location: "Tsukiji Outer Market, Chuo City",
        time: "09:00", duration_minutes: 90, estimated_cost: 25, category: "Food",
        ai_reason: "Perfect first morning — Tsukiji's outer market showcases Tokyo's legendary food culture with fresh seafood and street snacks, and is calm enough for a relaxed solo breakfast.",
      },
      {
        title: "Shinjuku Gyoen National Garden",
        description: "Explore a blend of Japanese, English, and French formal gardens across 58 hectares in the heart of Shinjuku.",
        location: "11 Naito-machi, Shinjuku",
        time: "13:00", duration_minutes: 120, estimated_cost: 5, category: "Culture",
        ai_reason: "A peaceful way to acclimatize after the morning market. Three distinct design styles give cultural depth and provide a rare quiet pocket in urban Tokyo.",
      },
      {
        title: "Omoide Yokocho (Memory Lane)",
        description: "Duck into these legendary narrow yakitori alleyways behind Shinjuku station for skewered chicken, cold beer, and an atmosphere unchanged since the 1950s.",
        location: "Omoide Yokocho, 1-chome Nishishinjuku",
        time: "19:00", duration_minutes: 90, estimated_cost: 35, category: "Food",
        ai_reason: "These narrow alley yakitori stalls are a hidden gem first-timers often miss. Perfect low-key evening for a solo traveler to absorb local atmosphere without tourist crowds.",
      },
    ],
  },
  {
    label: "Day 2",
    theme: "Old Tokyo — Asakusa & Ueno",
    summary: "Walk in the footsteps of centuries of Edo history, from Tokyo's oldest temple to the world's greatest collection of Japanese art.",
    activities: [
      {
        title: "Senso-ji Temple at Dawn",
        description: "Approach the ancient Buddhist temple through Kaminarimon gate before the tourists arrive. Watch morning rituals in near-solitude.",
        location: "2-3-1 Asakusa, Taito City",
        time: "07:30", duration_minutes: 90, estimated_cost: 0, category: "Culture",
        ai_reason: "Visiting before 9 AM means experiencing Senso-ji with local worshippers rather than tour groups — the temple's spiritual atmosphere is completely transformed at dawn.",
      },
      {
        title: "Nakamise-dori Shopping Street",
        description: "Browse 50+ traditional craft and souvenir stalls along the 250-meter approach to Senso-ji. Try ningyo-yaki and pick up authentic Japanese gifts.",
        location: "Nakamise, Asakusa, Taito City",
        time: "10:00", duration_minutes: 60, estimated_cost: 40, category: "Shopping",
        ai_reason: "The best place in Tokyo for authentic Japanese souvenirs at fair prices. The stalls have traded here for 300 years — each specializes in a different traditional craft.",
      },
      {
        title: "Tokyo National Museum",
        description: "Walk through 14 buildings of Japanese art and cultural artifacts spanning 10,000 years. Don't miss the Honkan main hall.",
        location: "13-9 Uenokoen, Taito City",
        time: "14:00", duration_minutes: 150, estimated_cost: 15, category: "History",
        ai_reason: "The world's largest collection of Japanese art at a modest entry fee. The main hall alone is worth 2 hours — the single best museum in Japan for cultural depth.",
      },
    ],
  },
  {
    label: "Day 3",
    theme: "Modern Tokyo — Shibuya & Harajuku",
    summary: "From serene forest shrines to the world's busiest crossing — today captures Tokyo's collision of ancient ritual and modern spectacle.",
    activities: [
      {
        title: "Meiji Jingu Shrine Morning Walk",
        description: "Follow a 700-meter forested path through 70,000 trees to one of Japan's most important Shinto shrines.",
        location: "1-1 Kamizono-cho, Yoyogi, Shibuya",
        time: "09:00", duration_minutes: 75, estimated_cost: 0, category: "Culture",
        ai_reason: "The forest path offers a rare moment of silence in urban Tokyo. The shrine's atmosphere contrasts beautifully with the Harajuku crowds you'll encounter minutes later.",
      },
      {
        title: "Harajuku Takeshita Street & Crepes",
        description: "Walk the famous 350-meter pedestrian street lined with over-the-top fashion boutiques, vintage stores, and legendary crepe shops.",
        location: "Takeshita Street, Jingumae, Shibuya",
        time: "10:30", duration_minutes: 60, estimated_cost: 20, category: "Food",
        ai_reason: "Takeshita Street is a hidden gem into Tokyo's youth subculture — the fashion boutiques and crepe shops reveal contemporary Japanese identity you won't find elsewhere.",
      },
      {
        title: "Shibuya Scramble Crossing & Ramen Lunch",
        description: "Experience the world's busiest pedestrian crossing at peak midday hour, then duck into a nearby standing ramen bar for a classic Tokyo lunch.",
        location: "Shibuya Station, Udagawacho, Shibuya",
        time: "12:30", duration_minutes: 90, estimated_cost: 18, category: "Food",
        ai_reason: "Shibuya Crossing is most dramatic at midday when up to 3,000 pedestrians cross at once. Paired with a standing ramen bar, this is the quintessential modern Tokyo experience.",
      },
    ],
  },
  {
    label: "Day 4",
    theme: "Culinary Deep Dive",
    summary: "The centerpiece day: a hands-on sushi workshop near Tsukiji, followed by Tokyo's most immersive digital art experience.",
    activities: [
      {
        title: "Sushi-Making Workshop",
        description: "Learn nigiri, maki, and temaki from a trained chef at a cooking school steps from Tsukiji fish market. Source your fish from the market, then craft and eat your creation.",
        location: "Tsukiji Cooking School, Chuo City",
        time: "10:00", duration_minutes: 180, estimated_cost: 80, category: "Food",
        ai_reason: "A hands-on sushi workshop near Tsukiji is the quintessential Tokyo food experience. You'll learn precision knife skills and fish sourcing — techniques you can take home.",
        is_locked: true,
        personal_note: "Already booked — Confirmation #SKW-4291. Bring an apron (provided aprons run small). Metro: Hibiya Line to Tsukiji, 3-min walk.",
      },
      {
        title: "TeamLab Borderless Digital Art Museum",
        description: "Explore large rooms of borderless digital art that flows, moves, and reacts to your presence. One of Tokyo's most unique cultural experiences.",
        location: "Odaiba, Minato City",
        time: "16:00", duration_minutes: 180, estimated_cost: 35, category: "Culture",
        ai_reason: "TeamLab Borderless combines cutting-edge technology with culture. Only 25 min from central Tokyo by Yurikamome train — worth the trip out to Odaiba.",
      },
    ],
  },
  {
    label: "Day 5",
    theme: "Departure — Hidden Old Tokyo",
    summary: "A final morning in Tokyo's most authentic pre-war neighborhood before heading to the airport.",
    activities: [
      {
        title: "Ameya-Yokocho Market Breakfast",
        description: "Start your last morning at this lively open-air market under the elevated train tracks in Ueno. Grab breakfast from the food stalls.",
        location: "Ameyoko, Taito City",
        time: "09:00", duration_minutes: 60, estimated_cost: 20, category: "Food",
        ai_reason: "Ameyoko opens early for a budget-friendly final breakfast. The market's energy makes for a memorable last Tokyo morning before airport check-in.",
      },
      {
        title: "Yanaka Ginza — Tokyo's Hidden Time Capsule",
        description: "Stroll through one of the last intact pre-war shitamachi neighborhoods. Browse indie shops, artisan studios, and small temples in lanes unchanged since the 1930s.",
        location: "Yanaka Ginza, Yanaka, Taito City",
        time: "11:00", duration_minutes: 90, estimated_cost: 15, category: "Culture",
        ai_reason: "Yanaka escaped wartime bombing and remains an authentic slice of pre-modern Tokyo — a genuine hidden gem with hand-crafted shops and local temples most tourists never reach.",
      },
    ],
  },
];

async function seedDemoTrip(
  svcClient: ReturnType<typeof createClient>,
  userId: string,
): Promise<string> {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + 14);

  const dates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  const { data: tripData, error: tripErr } = await svcClient
    .from("trips")
    .insert({
      user_id: userId,
      title: "Tokyo Discovery",
      destination: "Tokyo, Japan",
      start_date: dates[0],
      end_date: dates[4],
      budget: 1800,
      currency: "USD",
      travelers: 1,
      pace: "Balanced",
      interests: ["Food", "Culture", "Hidden Gems"],
      special_requests: "",
      status: "Planning",
      is_demo: true,
      last_updated: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (tripErr || !tripData) throw new Error("Failed to create demo trip: " + tripErr?.message);
  const tripId = (tripData as { id: string }).id;

  for (let dayIdx = 0; dayIdx < SEED_DAYS.length; dayIdx++) {
    const day = SEED_DAYS[dayIdx];
    const { data: dayData, error: dayErr } = await svcClient
      .from("trip_days")
      .insert({
        trip_id: tripId,
        label: day.label,
        date: dates[dayIdx],
        theme: day.theme,
        summary: day.summary,
        sort_order: dayIdx + 1,
      })
      .select("id")
      .maybeSingle();

    if (dayErr || !dayData) continue;
    const dayId = (dayData as { id: string }).id;

    for (let actIdx = 0; actIdx < day.activities.length; actIdx++) {
      const act = day.activities[actIdx];
      const noteJson = act.personal_note
        ? JSON.stringify([{ id: crypto.randomUUID(), text: act.personal_note, createdAt: new Date().toISOString() }])
        : "[]";

      const { error: actErr } = await svcClient.from("activities").insert({
        trip_day_id: dayId, trip_id: tripId,
        title: act.title, description: act.description,
        time: act.time, location: act.location,
        duration_minutes: act.duration_minutes, estimated_cost: act.estimated_cost,
        currency: "USD", category: act.category, ai_reason: act.ai_reason,
        is_locked: act.is_locked ?? false, personal_note: noteJson, sort_order: actIdx,
      });

      if (actErr) {
        console.error(`[reset-demo-trip] activity insert (${act.title}):`, actErr.message);
      }
    }
  }

  return tripId;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonRes({ error: "Authentication required." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const svcClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return jsonRes({ error: "Authentication required." }, 401);

    // Verify this is a demo user
    if (!user.user_metadata?.is_demo_user) {
      return jsonRes({ error: "Reset is only available for demo sessions." }, 403);
    }

    // Delete all existing demo trips for this user (cascades to days/activities/revisions)
    const { error: delErr } = await svcClient
      .from("trips")
      .delete()
      .eq("user_id", user.id)
      .eq("is_demo", true);

    if (delErr) {
      console.error("[reset-demo-trip] delete:", delErr.message);
      return jsonRes({ error: "Could not reset demo data. Please try again." }, 500);
    }

    // Re-seed
    const tripId = await seedDemoTrip(svcClient, user.id);
    console.log(`[reset-demo-trip] Demo trip reset for user ${user.id} → new trip ${tripId}`);

    return jsonRes({ trip_id: tripId });
  } catch (err) {
    console.error("[reset-demo-trip] Unhandled error:", err);
    return jsonRes({ error: "An unexpected error occurred." }, 500);
  }
});
