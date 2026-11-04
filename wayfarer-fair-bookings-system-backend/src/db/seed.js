const { pool } = require('./index');

async function seedDatabase() {
  console.log('--- Seeding Wayfarer Database ---');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Clean existing tables safely
    console.log('Clearing existing records...');
    await client.query(`
      TRUNCATE TABLE bookings, tour_slots, reviews, places, users RESTART IDENTITY CASCADE;
    `);

    // 2. Insert 3 Mock Users
    console.log('Seeding mock users (Sara, Abel, Liya)...');
    const userRes = await client.query(`
      INSERT INTO users (name)
      VALUES 
        ('Sara'),
        ('Abel'),
        ('Liya')
      RETURNING id, name;
    `);

    const usersMap = {};
    userRes.rows.forEach((u) => {
      usersMap[u.name] = u.id;
    });

    // 3. Insert 10 Places across History, Food, Nature (including ranking edge cases)
    console.log('Seeding 10 places across categories...');
    const placesRes = await client.query(`
      INSERT INTO places (name, category, description, opening_hours)
      VALUES 
        -- 1. High-review History landmark
        (
          'Grand Metropolitan Cathedral',
          'History',
          'A 14th-century Gothic masterpiece featuring vaulted stone crypts and panoramic tower views over the old town.',
          '08:30 AM – 06:00 PM'
        ),
        -- 2. High-review Food favorite
        (
          'Old Mill Artisan Bakery & Bistro',
          'Food',
          'Rustic sourdough breads, cardamom pastries, and heirloom coffee roasted in a restored river mill.',
          '07:00 AM – 03:30 PM'
        ),
        -- 3. EDGE CASE: Single 5-star review hole-in-the-wall popup to test ranking balance
        (
          'The Nook Espresso Hatch',
          'Food',
          'A two-stool alleyway coffee counter serving single-origin espresso on the run.',
          '08:00 AM – 01:00 PM'
        ),
        -- 4. Nature Sanctuary
        (
          'Botanical Conservatories & Sunken Gardens',
          'Nature',
          'Victorian iron glasshouses filled with rare cloud-forest flora, orchids, and tranquil lily pond walkways.',
          '09:00 AM – 05:00 PM'
        ),
        -- 5. History Citadel
        (
          'Old Town Clock Tower & Citadel Fortress',
          'History',
          'Medieval fortifications and astronomical clock chamber offering guided walks along the battlements.',
          '09:00 AM – 06:30 PM'
        ),
        -- 6. Food Market
        (
          'Harbor Wharf Fish Market & Oyster Bar',
          'Food',
          'Bustling seaside seafood market serving freshly caught oysters, chowder, and grilled catches daily.',
          '10:00 AM – 08:00 PM'
        ),
        -- 7. Nature Coast
        (
          'Azure Cove Sea Caves & Coastal Trail',
          'Nature',
          'Limestone bluffs, tidal sea pools, and scenic ocean hiking trails frequented by seabirds.',
          '06:00 AM – 07:30 PM'
        ),
        -- 8. History Ruins
        (
          'Roman Aqueduct Park & Archeological Site',
          'History',
          'Well-preserved stone arches from antiquity nestled in a quiet pine grove with informational plaques.',
          '08:00 AM – 07:00 PM'
        ),
        -- 9. Food Trattoria
        (
          'Trattoria Della Piazza',
          'Food',
          'Generational family restaurant hand-rolling tagliatelle and stone-baked focaccia every morning.',
          '12:00 PM – 10:30 PM'
        ),
        -- 10. Nature Mountain Overlook
        (
          'Highland Pine Ridge Overlook',
          'Nature',
          'Elevated forest reserve featuring canopy wooden walkways and westward mountain sunset vistas.',
          '07:00 AM – 08:00 PM'
        )
      RETURNING id, name;
    `);

    const placesMap = {};
    placesRes.rows.forEach((p) => {
      placesMap[p.name] = p.id;
    });

    // 4. Seed Reviews (Honoring the UNIQUE (place_id, user_id) constraint)
    console.log('Seeding reviews (including 1-review edge case)...');
    await client.query(`
      INSERT INTO reviews (place_id, user_id, rating, body, created_at)
      VALUES 
        -- Place 1: Cathedral (multiple high reviews)
        (${placesMap['Grand Metropolitan Cathedral']}, ${usersMap['Sara']}, 5, 'The Gothic arches and midday organ rehearsal were unforgettable.', NOW() - INTERVAL '5 days'),
        (${placesMap['Grand Metropolitan Cathedral']}, ${usersMap['Abel']}, 5, 'Great climb up the 300 steps. Beautiful stone carvings throughout.', NOW() - INTERVAL '4 days'),
        (${placesMap['Grand Metropolitan Cathedral']}, ${usersMap['Liya']}, 4, 'Very historic and peaceful. Can get a little crowded near noon.', NOW() - INTERVAL '3 days'),

        -- Place 2: Old Mill Bakery
        (${placesMap['Old Mill Artisan Bakery & Bistro']}, ${usersMap['Abel']}, 5, 'The crispest cardamom buns in the entire city. Outstanding roast.', NOW() - INTERVAL '2 days'),
        (${placesMap['Old Mill Artisan Bakery & Bistro']}, ${usersMap['Liya']}, 5, 'The fermented wild sourdough has so much flavor.', NOW() - INTERVAL '1 day'),

        -- Place 3: The Nook Espresso (EDGE CASE: Exactly 1 five-star review!)
        (${placesMap['The Nook Espresso Hatch']}, ${usersMap['Sara']}, 5, 'Cute alley popup! Great macchiato on the go.', NOW() - INTERVAL '12 hours'),

        -- Place 4: Botanical Conservatories
        (${placesMap['Botanical Conservatories & Sunken Gardens']}, ${usersMap['Liya']}, 5, 'The mist garden smells incredible. A true urban sanctuary.', NOW() - INTERVAL '6 days'),
        (${placesMap['Botanical Conservatories & Sunken Gardens']}, ${usersMap['Sara']}, 4, 'Photogenic Victorian glasshouse architecture.', NOW() - INTERVAL '2 days'),

        -- Place 5: Clock Tower & Citadel
        (${placesMap['Old Town Clock Tower & Citadel Fortress']}, ${usersMap['Abel']}, 5, 'The astrolabe clock gears are a mechanical masterpiece.', NOW() - INTERVAL '8 days'),

        -- Place 7: Azure Cove
        (${placesMap['Azure Cove Sea Caves & Coastal Trail']}, ${usersMap['Sara']}, 5, 'Tidal pools were full of star fish and marine life at low tide.', NOW() - INTERVAL '7 days'),
        (${placesMap['Azure Cove Sea Caves & Coastal Trail']}, ${usersMap['Liya']}, 4, 'Wear good hiking boots, rocks can get slippery near the caves.', NOW() - INTERVAL '1 day');
    `);

    // 5. Seed Tour Slots
    console.log('Seeding guided tour slots with capacities...');
    const slotsRes = await client.query(`
      INSERT INTO tour_slots (place_id, starts_at, capacity)
      VALUES 
        -- Cathedral slots
        (${placesMap['Grand Metropolitan Cathedral']}, NOW() + INTERVAL '1 day' + INTERVAL '10 hours', 12),
        (${placesMap['Grand Metropolitan Cathedral']}, NOW() + INTERVAL '1 day' + INTERVAL '14 hours', 10),
        (${placesMap['Grand Metropolitan Cathedral']}, NOW() + INTERVAL '2 days' + INTERVAL '16 hours', 8),

        -- Bakery Sourdough Masterclass
        (${placesMap['Old Mill Artisan Bakery & Bistro']}, NOW() + INTERVAL '1 day' + INTERVAL '8 hours', 8),
        (${placesMap['Old Mill Artisan Bakery & Bistro']}, NOW() + INTERVAL '2 days' + INTERVAL '11 hours', 6),

        -- The Nook Barista Demo (Small capacity)
        (${placesMap['The Nook Espresso Hatch']}, NOW() + INTERVAL '1 day' + INTERVAL '9 hours', 4),

        -- Botanical Gardens Walk
        (${placesMap['Botanical Conservatories & Sunken Gardens']}, NOW() + INTERVAL '1 day' + INTERVAL '10 hours', 15),
        (${placesMap['Botanical Conservatories & Sunken Gardens']}, NOW() + INTERVAL '2 days' + INTERVAL '15 hours', 12),

        -- Clock Tower Machinery Tour
        (${placesMap['Old Town Clock Tower & Citadel Fortress']}, NOW() + INTERVAL '1 day' + INTERVAL '11 hours', 6),

        -- Coastal Trail Escort
        (${placesMap['Azure Cove Sea Caves & Coastal Trail']}, NOW() + INTERVAL '1 day' + INTERVAL '8 hours', 10),
        (${placesMap['Azure Cove Sea Caves & Coastal Trail']}, NOW() + INTERVAL '1 day' + INTERVAL '16 hours', 6)
      RETURNING id, place_id, capacity;
    `);

    // 6. Seed Sample Bookings to test capacity & "Fully Booked" states
    console.log('Seeding sample bookings...');
    const firstSlot = slotsRes.rows[0]; // Cathedral slot 1
    const lastSlot = slotsRes.rows[slotsRes.rows.length - 1]; // Coastal trail (capacity 6)

    await client.query(`
      INSERT INTO bookings (slot_id, user_id, seats)
      VALUES 
        -- 2 seats booked on Cathedral slot 1
        (${firstSlot.id}, ${usersMap['Sara']}, 1),
        (${firstSlot.id}, ${usersMap['Abel']}, 1),

        -- Fully book the last slot (capacity 6 booked by Liya & Abel)
        (${lastSlot.id}, ${usersMap['Liya']}, 3),
        (${lastSlot.id}, ${usersMap['Abel']}, 3);
    `);

    await client.query('COMMIT');
    console.log('✓ Seeding completed successfully!');
    console.log('  - 3 mock users');
    console.log('  - 10 places across History, Food, Nature (including 1-review edge case)');
    console.log('  - Reviews, tour slots, and initial bookings');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('✗ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase();

