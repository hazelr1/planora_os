-- Rewrite templated/repetitive trip_templates.summary values with genuinely
-- specific, non-generic descriptions grounded in each template's real
-- itinerary content. Excludes the two hand-authored templates (Tokyo
-- Discovery, Santorini Highlights), whose summaries were already specific.

DO $$
BEGIN
  -- 5-Day Cultural and Culinary Journey in Kyoto, Japan
  UPDATE trip_templates SET summary = 'Kinkaku-ji''s gold-leaf pavilion, the thousand vermilion gates of Fushimi Inari Taisha, and a tofu-kaiseki lunch in Arashiyama''s bamboo grove — five balanced days across Kyoto''s temple circuit.' WHERE id = '5dd875bf-c430-469c-b382-a7f8167e791a';
  -- 4 Days of Shopping and Nightlife in Paris
  UPDATE trip_templates SET summary = 'Four packed days moving from Haussmann''s department stores to a Montmartre climb up to Sacré-Cœur, ending most nights at the Moulin Rouge or Le Baron.' WHERE id = 'c003a11c-8429-49b0-8ff2-09528bd05bf2';
  -- 6-Day Adventure in Kyoto, Japan
  UPDATE trip_templates SET summary = 'Six active days built around a hike through Kurama and Kibune and a soak at Kurama Onsen, with a hands-on Kyo-yaki pottery workshop and a kaiseki dinner most evenings.' WHERE id = '5fb57952-4169-47b8-90b0-fe0b2b78401d';
  -- 4-Day Relaxed Cultural Retreat in Kyoto
  UPDATE trip_templates SET summary = 'The thousand stone Buddhas at Adashino Nenbutsu-ji and a quiet stretch of the Philosopher''s Path anchor this unhurried four-day Kyoto itinerary, timed to skip the busiest temple queues.' WHERE id = '122bb761-695f-4273-8590-17d7cd2fdde3';
  -- 4-Day Cultural and Culinary Adventure in Hanoi, Vietnam
  UPDATE trip_templates SET summary = 'Four days centered on a bún chả lunch at Huong Lien, a hands-on cooking class, and a day trip out to Ninh Binh''s limestone karsts.' WHERE id = 'a1158557-e962-4069-8685-ba5c28f71f19';
  -- 5-Day Cultural and Shopping Adventure in Bangkok
  UPDATE trip_templates SET summary = 'Chatuchak Weekend Market''s maze of stalls, the reclining Buddha at Wat Pho, and a late shopping run through Siam Paragon — five days across Bangkok.' WHERE id = '7bd92044-e5e1-48ee-925e-731f2495311b';
  -- Hidden Gems and History in Bangkok
  UPDATE trip_templates SET summary = 'Five relaxed days climbing to the Golden Mount at Wat Saket, wandering Banglamphu''s back streets, and browsing Jim Thompson''s silk house.' WHERE id = '24a90ffe-bb56-4382-85ab-def1205273d3';
  -- 4-Day Relaxed Historical and Hidden Gems Trip in Hanoi, Vietnam
  UPDATE trip_templates SET summary = 'Four relaxed days built around an evening water-puppet show and turmeric fish at Cha Ca Thang Long, with a cooking class at Hanoi Cooking Centre along the way.' WHERE id = '09b9b5d2-998e-458b-8e41-0fa969cb3062';
  -- Adventure in Hanoi, Vietnam
  UPDATE trip_templates SET summary = 'Pottery-making in Bat Trang, a trek through Sapa''s rice terraces, and rowing a sampan through Tam Coc''s karst caves fill this six-day loop out of Hanoi.' WHERE id = 'ed23329b-606b-47a5-b2ce-bf15a85d5431';
  -- 6-Day Nature and Adventure Trip in Ubud, Bali
  UPDATE trip_templates SET summary = 'Six days rafting the Ayung River''s rapids, tracing the Tegallalang rice terraces on foot, and a sunset trek up Mount Batur before a Kecak fire dance.' WHERE id = '3f0ef3ee-7d0b-4e14-b021-d82efbadc800';
  -- Cultural Journey Through Jaipur
  UPDATE trip_templates SET summary = 'Four days climbing Amber Fort''s ramparts, reading the giant stone sundials at Jantar Mantar, and bargaining for gems along Johari Bazaar.' WHERE id = '196c30f3-6286-4314-af31-fdf91734c690';
  -- 5-Day Cultural and Culinary Experience in Paris
  UPDATE trip_templates SET summary = 'Five days built around a Seine river cruise and a full afternoon at Versailles, with a hands-on culinary workshop and dinner at the century-old Bouillon Pigalle.' WHERE id = 'fcf8a969-70fd-4836-b909-e2a3f4a9fab7';
  -- 5 Days in Rome: Nightlife and Hidden Gems
  UPDATE trip_templates SET summary = 'The ancient Appian Way and the layered underground basilica of San Clemente set this trip apart, ending most nights with drinks at Freni e Frizioni or the Campo de'' Fiori night market.' WHERE id = '29870d82-4fd0-44ca-9ee8-65137e22bf41';
  -- 4-Day Food and Nightlife Adventure in Seminyak, Bali
  UPDATE trip_templates SET summary = 'Four nights moving from a Balinese cooking class to sunset at Finns Beach Club, then dancing at Potato Head and La Favela after dinner at Motel Mexicola.' WHERE id = 'cac9ed5d-fc68-42aa-b456-213f5d3b4cb7';
  -- 5-Day Food and Shopping Adventure in Seoul
  UPDATE trip_templates SET summary = 'Gwangjang Market''s street stalls, Dongdaemun''s overnight fashion malls, and a quiet detour through Changdeokgung''s Secret Garden — five days across Seoul.' WHERE id = '9d57a042-13a4-4043-acc2-19fb88e629f1';
  -- 4-Day Cultural and Historical Journey in Seoul
  UPDATE trip_templates SET summary = 'Four days in a rented hanbok at Gyeongbokgung Palace, a bowl of ginseng chicken soup at Tosokchon Samgyetang, and a walk through Bukchon''s centuries-old alleys.' WHERE id = '269af124-afa1-4531-8149-05efd28df798';
  -- 5-Day Seoul Adventure: Nightlife and Hidden Gems
  UPDATE trip_templates SET summary = 'Contemporary art at the Leeum, indie bars in Hongdae, and Namsan Tower''s observation deck after dark carry this five-day Seoul itinerary through to a night out in Gangnam.' WHERE id = '82fa8f75-47ec-4772-82d7-4ab4fcd3603b';
  -- 4-Day Adventure and Shopping Trip in Dubai
  UPDATE trip_templates SET summary = 'Four days pairing a desert safari''s dune-bashing with Burj Khalifa''s observation deck, an abra ride across Dubai Creek, and a sunset cruise along the marina.' WHERE id = '0bc1f06f-adf8-47b3-bf2a-fe6cfe3f78aa';
  -- 5-Day Dubai Food & Nightlife Experience
  UPDATE trip_templates SET summary = 'Five days sliding down Atlantis Aquaventure''s water slides, watching the Dubai Fountain after dark, and catching La Perle by Dragone''s aqua theatre show.' WHERE id = 'a0666d5b-b049-443d-835a-3d0cd69579fd';
  -- 4-Day Jaipur Food and Shopping Adventure
  UPDATE trip_templates SET summary = 'Four unhurried days built around bargaining in Johari Bazaar and a hands-on Rajasthani cooking class, with cocktails under Bar Palladio''s hand-painted ceilings to close each night.' WHERE id = '4d5e1ae9-6dc3-414d-8e97-30c6c58b3d4e';
  -- 5-Day Adventure in Jaipur: Discovering Hidden Gems
  UPDATE trip_templates SET summary = 'Five days seeking out Jaipur''s lesser-visited corners — the stepwells at Panna Meena ka Kund and Abhaneri, a hike up to Nahargarh Fort, and monkeys at the Galta Ji temple.' WHERE id = '5571996b-8e99-489e-97ce-e4c2ca6e6ee6';
  -- 4-Day Athens Cultural and Historical Exploration
  UPDATE trip_templates SET summary = 'Four days climbing the Acropolis at opening time, a coastal day trip to the Temple of Poseidon at Cape Sounion, and evenings among Psiri''s tavernas.' WHERE id = '6182c62a-cff9-44e1-9b45-294dcea76a75';
  -- 4-Day Food and Nightlife Adventure in Athens, Greece
  UPDATE trip_templates SET summary = 'Four packed days shopping the stalls at Varvakios Central Market, a Greek dance show at Zorba the Greek, and rooftop drinks at A for Athens overlooking the Acropolis.' WHERE id = 'b1036b18-ca8d-456e-88e7-32d5674297e8';
  -- 5-Day Relaxed Trip to Athens, Greece
  UPDATE trip_templates SET summary = 'A swim at Vouliagmeni''s thermal lake and a hike up Lycabettus Hill for Athens'' best sunset view replace some of the usual sightseeing on this relaxed five-day trip.' WHERE id = '967276a5-4459-4a2e-9458-fbc1fc2b6c69';
  -- 5-Day Balanced Rome Itinerary
  UPDATE trip_templates SET summary = 'Five days from the Colosseum''s underground chambers to the Sistine Chapel, with mornings at Campo de'' Fiori''s produce market and evenings in Trastevere.' WHERE id = 'a831ae28-3f5e-4e50-b183-d1ce32cac2a7';
  -- 4-Day Relaxed Food and Shopping Tour in Rome
  UPDATE trip_templates SET summary = 'Four relaxed days built around Testaccio Market''s produce stalls and a Trastevere food tour, with the view through Aventine Hill''s famous keyhole along the way.' WHERE id = '622e36c4-d61e-4b9e-bc19-920bf59c1502';
  -- 5-Day Relaxed Historical Exploration of Paris
  UPDATE trip_templates SET summary = 'Five unhurried days for Monet''s water lilies at the Musée de l''Orangerie, a full afternoon at Versailles, and the stained glass of Sainte-Chapelle on Île de la Cité.' WHERE id = '0abdd728-1e79-41d3-aa3e-a7cd5d650d18';
  -- 4-Day Food and Nightlife Adventure in Barcelona
  UPDATE trip_templates SET summary = 'Four packed days touring La Boqueria''s market stalls, a paella cooking class, and a flamenco show at Tablao Cordobés before dancing at Razzmatazz.' WHERE id = '10715fd5-4e33-4756-b1a2-d1bfaccd10ec';
  -- Relaxed Nature and Hidden Gems in Barcelona
  UPDATE trip_templates SET summary = 'Four slow days swimming at Ocata Beach outside the city center, wandering Gràcia''s neighborhood squares, and a quiet afternoon by Parc de la Creueta del Coll''s urban lake.' WHERE id = 'c9477c61-0b18-4ddb-b1b0-90eddfdc6ad2';
  -- Cultural and Culinary Adventure in Lisbon
  UPDATE trip_templates SET summary = 'Four days pairing custard tarts near Jerónimos Monastery with the street art at LX Factory and ceviche at A Cevicheria.' WHERE id = 'c0683272-58c1-4fb2-a356-a0a60c50f5cf';
  -- 4-Day Packed Itinerary in Lisbon: Nightlife & Shopping
  UPDATE trip_templates SET summary = 'Four fast-paced days combining a train trip to Sintra''s Pena Palace with Chiado boutiques and bar-hopping through Bairro Alto until Park Bar closes.' WHERE id = 'd9fe4f7e-cc81-48a2-9bb4-d851d84bed71';
  -- 5-Day Relaxed Itinerary in Lisbon, Portugal
  UPDATE trip_templates SET summary = 'Five relaxed days for Sintra''s Pena Palace, sunset from Miradouro de Santa Catarina, and a wander through Alfama''s steep tiled streets.' WHERE id = '543b7f5a-364a-4c49-b947-0387febda9d4';
  -- Adventure in Reykjavik, Iceland
  UPDATE trip_templates SET summary = 'Five days crossing the Golden Circle''s Gullfoss and Geysir, a glacier hike on Sólheimajökull, and a soak in the Blue Lagoon before flying home.' WHERE id = '9eaf84ed-169c-4a89-91e8-08f2001e8f7e';
  -- 4-Day Cultural and Hidden Gems Trip in Reykjavik, Iceland
  UPDATE trip_templates SET summary = 'A ferry to Viðey Island''s sculpture park, the excavated Viking longhouse at the Settlement Exhibition, and an evening at Harpa''s glass concert hall fill this unhurried four-day Reykjavik trip.' WHERE id = '8e4fbf21-a796-4085-854a-8ad58d398229';
  -- 5-Day Relaxed Adventure in Reykjavik, Iceland
  UPDATE trip_templates SET summary = 'Five relaxed days covering the South Coast''s waterfalls, a whale-watching tour from the harbor, and a soak in the Blue Lagoon before a last stroll down Laugavegur.' WHERE id = 'f33d3bb8-63b3-4631-b069-ec7dd6500507';
  -- 5-Day Relaxed Nature and Culture Trip in Interlaken, Switzerland
  UPDATE trip_templates SET summary = 'Five relaxed days for a boat ride on Lake Thun, the cable car up to Harder Kulm, and a full day trip to the Jungfraujoch glacier plateau.' WHERE id = '670b75eb-259f-44ea-8a17-50a941824e1c';
  -- 4-Day Adventure in Interlaken, Switzerland
  UPDATE trip_templates SET summary = 'Four days pairing a paraglide over the valley with the funicular up to Harder Kulm, a trip to the Jungfraujoch, and the ice tunnels of the Ice Palace.' WHERE id = '52fd3c75-a399-41f9-9078-b38c52791c4f';
  -- 4-Day Food and Nightlife Adventure in Bangkok
  UPDATE trip_templates SET summary = 'Four packed days on a Chao Phraya river boat past Wat Arun, street food through Chinatown''s Yaowarat, and cocktails at Sky Bar - Lebua above the skyline.' WHERE id = 'df7f4e10-9cd8-4450-8c47-7adba886e9e3';
  -- 5-Day Relaxed Cultural and Natural Exploration in Ubud, Bali
  UPDATE trip_templates SET summary = 'Five slow days walking the Campuhan Ridge at sunrise, a yoga class at the Yoga Barn, and the carved reliefs of Goa Gajah''s Elephant Cave before a tasting menu at Mozaic.' WHERE id = 'b7090a30-1f30-49c5-843a-a311f17a0ab3';
END $$;
