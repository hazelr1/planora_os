/*
# Seed trip templates (proof of concept)

Two curated suggested plans to exercise the browse -> view -> clone-on-edit
mechanic end to end, before authoring a full continent/country library:

- Tokyo Discovery: adapted from the existing hardcoded demo itinerary in
  supabase/functions/launch-demo/index.ts (SEED_DAYS) — real, already-
  reviewed content, ported here verbatim rather than rewritten.
- Santorini Highlights: newly authored for this proof of concept.

Idempotent: guarded by a check for an existing template with the same
title, so re-running this migration doesn't duplicate rows.
*/

DO $$
DECLARE
  tokyo_id uuid;
  santorini_id uuid;
  day_id uuid;
BEGIN

  -- ─── Tokyo Discovery ─────────────────────────────────────────────────────

  IF NOT EXISTS (SELECT 1 FROM trip_templates WHERE title = 'Tokyo Discovery') THEN
    INSERT INTO trip_templates (title, destination, country, continent, start_date, end_date, budget, currency, travelers, pace, interests, special_requests, summary)
    VALUES (
      'Tokyo Discovery', 'Tokyo, Japan', 'Japan', 'Asia',
      '2026-09-10', '2026-09-14', 1800, 'USD', 1, 'Balanced',
      ARRAY['Food', 'Culture', 'Hidden Gems'], '',
      'Markets, temples, and neon nights — five days through old and new Tokyo.'
    )
    RETURNING id INTO tokyo_id;

    -- Day 1 — Arrival & Shinjuku
    INSERT INTO template_days (template_id, label, date, theme, summary, sort_order)
    VALUES (tokyo_id, 'Day 1', '2026-09-10', 'Arrival & Shinjuku', 'Ease into Tokyo with a morning fish market, a garden afternoon, and the legendary yakitori alleys of Golden Gai.', 1)
    RETURNING id INTO day_id;
    INSERT INTO template_activities (template_day_id, template_id, title, description, time, location, latitude, longitude, duration_minutes, estimated_cost, currency, category, ai_reason, sort_order) VALUES
      (day_id, tokyo_id, 'Tsukiji Outer Market Breakfast', 'Start with a fresh seafood breakfast in the outer market. Try tamagoyaki, otoro sushi, and matcha-dusted pastries from the vendor stalls.', '09:00', 'Tsukiji Outer Market, Chuo City', 35.6654, 139.7707, 90, 25, 'USD', 'Food', 'Perfect first morning — Tsukiji''s outer market showcases Tokyo''s legendary food culture with fresh seafood and street snacks, and is calm enough for a relaxed solo breakfast.', 0),
      (day_id, tokyo_id, 'Shinjuku Gyoen National Garden', 'Explore a blend of Japanese, English, and French formal gardens across 58 hectares in the heart of Shinjuku.', '13:00', '11 Naito-machi, Shinjuku', 35.6852, 139.71, 120, 5, 'USD', 'Culture', 'A peaceful way to acclimatize after the morning market. Three distinct design styles give cultural depth and provide a rare quiet pocket in urban Tokyo.', 1),
      (day_id, tokyo_id, 'Omoide Yokocho (Memory Lane)', 'Duck into these legendary narrow yakitori alleyways behind Shinjuku station for skewered chicken, cold beer, and an atmosphere unchanged since the 1950s.', '19:00', 'Omoide Yokocho, 1-chome Nishishinjuku', 35.6938, 139.6997, 90, 35, 'USD', 'Food', 'These narrow alley yakitori stalls are a hidden gem first-timers often miss. Perfect low-key evening for a solo traveler to absorb local atmosphere without tourist crowds.', 2);

    -- Day 2 — Old Tokyo: Asakusa & Ueno
    INSERT INTO template_days (template_id, label, date, theme, summary, sort_order)
    VALUES (tokyo_id, 'Day 2', '2026-09-11', 'Old Tokyo — Asakusa & Ueno', 'Walk in the footsteps of centuries of Edo history, from Tokyo''s oldest temple to the world''s greatest collection of Japanese art.', 2)
    RETURNING id INTO day_id;
    INSERT INTO template_activities (template_day_id, template_id, title, description, time, location, latitude, longitude, duration_minutes, estimated_cost, currency, category, ai_reason, sort_order) VALUES
      (day_id, tokyo_id, 'Senso-ji Temple at Dawn', 'Approach the ancient Buddhist temple through Kaminarimon gate before the tourists arrive. Watch the morning rituals and enjoy the incense-filled courtyard in near-solitude.', '07:30', '2-3-1 Asakusa, Taito City', 35.7148, 139.7967, 90, 0, 'USD', 'Culture', 'Visiting before 9 AM means experiencing Senso-ji with local worshippers rather than tour groups — the temple''s spiritual atmosphere is completely transformed at dawn.', 0),
      (day_id, tokyo_id, 'Nakamise-dori Shopping Street', 'Browse 50+ traditional craft and souvenir stalls along the 250-meter approach to Senso-ji. Try ningyo-yaki (doll-shaped cakes) and pick up authentic Japanese gifts.', '10:00', 'Nakamise, Asakusa, Taito City', 35.7139, 139.7966, 60, 40, 'USD', 'Shopping', 'The best place in Tokyo for authentic Japanese souvenirs at fair prices. The stalls have traded here for 300 years — each specializes in a different traditional craft.', 1),
      (day_id, tokyo_id, 'Tokyo National Museum', 'Walk through 14 buildings of Japanese art, archaeology, and cultural artifacts spanning 10,000 years. Don''t miss the Honkan main hall.', '14:00', '13-9 Uenokoen, Taito City', 35.7188, 139.7765, 150, 15, 'USD', 'History', 'The world''s largest collection of Japanese art at a modest entry fee. The main hall alone is worth 2 hours — the single best museum in Japan for cultural depth.', 2);

    -- Day 3 — Modern Tokyo: Shibuya & Harajuku
    INSERT INTO template_days (template_id, label, date, theme, summary, sort_order)
    VALUES (tokyo_id, 'Day 3', '2026-09-12', 'Modern Tokyo — Shibuya & Harajuku', 'From serene forest shrines to the world''s busiest crossing — today captures Tokyo''s fascinating collision of ancient ritual and modern spectacle.', 3)
    RETURNING id INTO day_id;
    INSERT INTO template_activities (template_day_id, template_id, title, description, time, location, latitude, longitude, duration_minutes, estimated_cost, currency, category, ai_reason, sort_order) VALUES
      (day_id, tokyo_id, 'Meiji Jingu Shrine Morning Walk', 'Follow a 700-meter forested path through 70,000 trees to reach one of Japan''s most important Shinto shrines. Observe the peaceful morning purification rituals.', '09:00', '1-1 Kamizono-cho, Yoyogi, Shibuya', 35.6764, 139.6993, 75, 0, 'USD', 'Culture', 'The forest path offers a rare moment of silence in urban Tokyo. The shrine''s atmosphere contrasts beautifully with the Harajuku crowds you''ll encounter minutes later.', 0),
      (day_id, tokyo_id, 'Harajuku Takeshita Street & Crepes', 'Walk the famous 350-meter pedestrian street lined with over-the-top fashion boutiques, vintage stores, and legendary crepe shops serving outrageous sweet creations.', '10:30', 'Takeshita Street, Jingumae, Shibuya', 35.6702, 139.7026, 60, 20, 'USD', 'Food', 'Takeshita Street is a hidden gem into Tokyo''s youth subculture — the fashion boutiques and crepe shops reveal a side of contemporary Japanese identity you won''t find elsewhere.', 1),
      (day_id, tokyo_id, 'Shibuya Scramble Crossing & Ramen Lunch', 'Experience the world''s busiest pedestrian crossing at peak midday hour, then duck into a nearby standing ramen bar for a classic Tokyo lunch.', '12:30', 'Shibuya Station, Udagawacho, Shibuya', 35.6595, 139.7005, 90, 18, 'USD', 'Food', 'Shibuya Crossing is most dramatic at midday when up to 3,000 pedestrians cross at once. Paired with a standing ramen bar next door, this is the quintessential modern Tokyo experience.', 2);

    -- Day 4 — Culinary Deep Dive
    INSERT INTO template_days (template_id, label, date, theme, summary, sort_order)
    VALUES (tokyo_id, 'Day 4', '2026-09-13', 'Culinary Deep Dive', 'The centerpiece day: a hands-on sushi workshop near Tsukiji, followed by Tokyo''s most immersive digital art experience.', 4)
    RETURNING id INTO day_id;
    INSERT INTO template_activities (template_day_id, template_id, title, description, time, location, latitude, longitude, duration_minutes, estimated_cost, currency, category, ai_reason, sort_order) VALUES
      (day_id, tokyo_id, 'Sushi-Making Workshop', 'Learn nigiri, maki, and temaki from a trained chef at a cooking school steps from Tsukiji fish market. Source your fish from the market, then craft and eat your creation.', '10:00', 'Tsukiji Cooking School, Chuo City', 35.6654, 139.769, 180, 80, 'USD', 'Food', 'A hands-on sushi workshop near Tsukiji is the quintessential Tokyo food experience. You''ll learn precision knife skills and fish sourcing — techniques you can take home.', 0),
      (day_id, tokyo_id, 'TeamLab Borderless Digital Art Museum', 'Explore large rooms of borderless digital art that flows, moves, and reacts to your presence. One of Tokyo''s most unique and unmissable cultural experiences.', '16:00', 'Odaiba, Minato City', 35.6267, 139.783, 180, 35, 'USD', 'Culture', 'TeamLab Borderless is a world-famous digital art museum combining cutting-edge technology with culture. Only 25 min from central Tokyo by Yurikamome train.', 1);

    -- Day 5 — Departure: Hidden Old Tokyo
    INSERT INTO template_days (template_id, label, date, theme, summary, sort_order)
    VALUES (tokyo_id, 'Day 5', '2026-09-14', 'Departure — Hidden Old Tokyo', 'A final morning in Tokyo''s most authentic pre-war neighborhood before heading to the airport.', 5)
    RETURNING id INTO day_id;
    INSERT INTO template_activities (template_day_id, template_id, title, description, time, location, latitude, longitude, duration_minutes, estimated_cost, currency, category, ai_reason, sort_order) VALUES
      (day_id, tokyo_id, 'Ameya-Yokocho Market Breakfast', 'Start your last morning at this lively open-air market under the elevated train tracks in Ueno. Grab breakfast from the food stalls: grilled squid, yakitori, fresh fruit.', '09:00', 'Ameyoko, Taito City', 35.7103, 139.7745, 60, 20, 'USD', 'Food', 'Ameyoko opens early for a budget-friendly final breakfast. The market''s energy and variety make for a memorable last Tokyo morning before airport check-in.', 0),
      (day_id, tokyo_id, 'Yanaka Ginza — Tokyo''s Hidden Time Capsule', 'Stroll through one of the last intact pre-war shitamachi neighborhoods. Browse indie shops, artisan studios, and small temples in lanes unchanged since the 1930s.', '11:00', 'Yanaka Ginza, Yanaka, Taito City', 35.7272, 139.7671, 90, 15, 'USD', 'Culture', 'Yanaka escaped wartime bombing and remains an authentic slice of pre-modern Tokyo — a genuine hidden gem with hand-crafted shops and local temples most tourists never reach.', 1);
  END IF;

  -- ─── Santorini Highlights ────────────────────────────────────────────────

  IF NOT EXISTS (SELECT 1 FROM trip_templates WHERE title = 'Santorini Highlights') THEN
    INSERT INTO trip_templates (title, destination, country, continent, start_date, end_date, budget, currency, travelers, pace, interests, special_requests, summary)
    VALUES (
      'Santorini Highlights', 'Santorini, Greece', 'Greece', 'Europe',
      '2026-10-05', '2026-10-08', 1400, 'USD', 2, 'Relaxed',
      ARRAY['Food', 'Culture', 'Nature'], '',
      'Caldera views, volcanic wine, and whitewashed villages across the Aegean''s most iconic island.'
    )
    RETURNING id INTO santorini_id;

    -- Day 1 — Arrival & Fira
    INSERT INTO template_days (template_id, label, date, theme, summary, sort_order)
    VALUES (santorini_id, 'Day 1', '2026-10-05', 'Arrival & Fira', 'Settle in with a caldera-edge walk through the capital and a cliffside dinner as the island lights up for the evening.', 1)
    RETURNING id INTO day_id;
    INSERT INTO template_activities (template_day_id, template_id, title, description, time, location, latitude, longitude, duration_minutes, estimated_cost, currency, category, ai_reason, sort_order) VALUES
      (day_id, santorini_id, 'Fira Town Caldera Walk', 'Follow the cliffside path connecting Fira to Firostefani, past the blue-domed churches and cable-car station, with the volcano framed in the water below.', '15:00', 'Fira, Santorini', 36.4167, 25.4325, 90, 0, 'USD', 'Culture', 'The easiest way to get oriented on arrival — this stretch of path is where nearly every iconic Santorini photo is taken, and it''s walkable straight from most hotels in Fira.', 0),
      (day_id, santorini_id, 'Cliffside Dinner in Fira', 'A caldera-view taverna for your first evening — grilled octopus, fava, and local Assyrtiko wine as the sky turns pink over the volcano.', '19:00', 'Fira, Santorini', 36.4172, 25.4318, 120, 60, 'USD', 'Food', 'Booking your first dinner on the caldera rim (rather than saving it for later) means you get the view even if the famous Oia sunset spots are too crowded to enjoy this trip.', 1);

    -- Day 2 — Oia & the Sunset
    INSERT INTO template_days (template_id, label, date, theme, summary, sort_order)
    VALUES (santorini_id, 'Day 2', '2026-10-06', 'Oia & the Sunset', 'The village everyone pictures when they think of Santorini, a swim at its harbor, and the sunset that made it famous.', 2)
    RETURNING id INTO day_id;
    INSERT INTO template_activities (template_day_id, template_id, title, description, time, location, latitude, longitude, duration_minutes, estimated_cost, currency, category, ai_reason, sort_order) VALUES
      (day_id, santorini_id, 'Oia Village Morning Wander', 'Walk Oia''s marble-paved lanes past blue-domed churches and cave houses before the day-trip buses and cruise crowds arrive.', '10:00', 'Oia, Santorini', 36.4611, 25.3754, 120, 0, 'USD', 'Culture', 'Oia is genuinely a different place before 11am — the same streets that are shoulder-to-shoulder by afternoon are quiet enough to actually enjoy in the morning light.', 0),
      (day_id, santorini_id, 'Ammoudi Bay Swim & Seafood Lunch', 'Take the 300-step path down from Oia to this tiny fishing harbor for a swim in clear water and a lunch of fresh-caught fish at a taverna on the rocks.', '13:00', 'Ammoudi Bay, Oia', 36.4661, 25.3711, 120, 35, 'USD', 'Food', 'Most visitors never make it down the steps — Ammoudi is the local counterpoint to Oia''s crowds above, and the seafood is caught by the same boats moored a few meters from your table.', 1),
      (day_id, santorini_id, 'Sunset at Oia Castle', 'Claim a spot at the ruined Byzantine castle by early evening for the famous unobstructed sunset over the caldera — arrive at least an hour early in high season.', '19:00', 'Oia Castle, Oia', 36.4617, 25.3737, 75, 0, 'USD', 'Nature', 'This is the single most photographed sunset in Greece for a reason — the castle ruins sit at the village''s highest, most open point, with nothing blocking the horizon.', 2);

    -- Day 3 — Wine & the Caldera by Boat
    INSERT INTO template_days (template_id, label, date, theme, summary, sort_order)
    VALUES (santorini_id, 'Day 3', '2026-10-07', 'Wine & the Caldera by Boat', 'Volcanic-soil wine tasting followed by a catamaran cruise past the volcano itself, with a swim stop in the hot springs.', 3)
    RETURNING id INTO day_id;
    INSERT INTO template_activities (template_day_id, template_id, title, description, time, location, latitude, longitude, duration_minutes, estimated_cost, currency, category, ai_reason, sort_order) VALUES
      (day_id, santorini_id, 'Volcanic Vineyard Wine Tasting', 'Taste Assyrtiko and Vinsanto at a winery growing vines in low, basket-shaped ''kouloura'' coils — a centuries-old technique unique to Santorini''s ash-covered soil.', '10:00', 'Santo Wines, Pyrgos', 36.3844, 25.4297, 90, 45, 'USD', 'Food', 'Santorini''s volcanic soil and coiled-vine growing method produce wine you genuinely can''t get anywhere else — worth understanding before you taste it, not just after.', 0),
      (day_id, santorini_id, 'Catamaran Caldera Cruise & Hot Springs', 'Sail past the Nea Kameni volcano and swim in the warm, mineral-rich waters off Palea Kameni, with a Greek barbecue lunch served on board.', '14:00', 'Ammoudi/Vlychada Harbor, Santorini', 36.3958, 25.3958, 240, 95, 'USD', 'Adventure', 'Seeing the caldera from the water — the reason it looks the way it does — reframes everything you walked past on land the two days before. The hot springs stop is genuinely warm, not a gimmick.', 1);

    -- Day 4 — Akrotiri & Red Beach, Departure
    INSERT INTO template_days (template_id, label, date, theme, summary, sort_order)
    VALUES (santorini_id, 'Day 4', '2026-10-08', 'Akrotiri & Red Beach — Departure', 'A Bronze-Age city preserved in volcanic ash and the dramatic red-cliff beach a short walk away, before heading to the airport.', 4)
    RETURNING id INTO day_id;
    INSERT INTO template_activities (template_day_id, template_id, title, description, time, location, latitude, longitude, duration_minutes, estimated_cost, currency, category, ai_reason, sort_order) VALUES
      (day_id, santorini_id, 'Akrotiri Archaeological Site', 'Walk the covered excavation of a Bronze-Age Minoan town, buried and preserved by the same eruption that shaped the caldera you''ve been looking at all trip.', '09:30', 'Akrotiri, Santorini', 36.3506, 25.4033, 90, 12, 'USD', 'History', 'Often called the "Minoan Pompeii" — multi-story buildings, frescoes, and streets are preserved almost intact. It''s the origin story for the island shape you''ve seen from every viewpoint so far.', 0),
      (day_id, santorini_id, 'Red Beach', 'A short walk from Akrotiri to a small beach framed by sheer red and black volcanic cliffs — worth the visit for the geology alone, even for a quick swim.', '12:00', 'Red Beach, Akrotiri', 36.3481, 25.3958, 75, 0, 'USD', 'Nature', 'Pairs naturally with Akrotiri next door, and the cliffs are a striking, very different landscape from the whitewashed towns you''ve spent the rest of the trip in.', 1);
  END IF;

END $$;
