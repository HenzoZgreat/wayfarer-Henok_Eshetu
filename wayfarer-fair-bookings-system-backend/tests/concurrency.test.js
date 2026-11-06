const request = require('supertest');
const app = require('../server');
const { query, pool } = require('../src/db');

describe('Tour Booking Concurrency Safety & Fair Booking Policy', () => {
  let testPlaceId;
  let prebookUserId;
  let competingUserIds = [];
  let testSlotId;

  beforeAll(async () => {
    // 1. Create a dedicated test place
    const placeRes = await query(`
      INSERT INTO places (name, category, description, opening_hours)
      VALUES ('Concurrency Test Landmark', 'History', 'Testing race conditions', '09:00 - 18:00')
      RETURNING id;
    `);
    testPlaceId = placeRes.rows[0].id;

    // 2. Create a prebook host user
    const prebookRes = await query(`
      INSERT INTO users (name)
      VALUES ('Prebook Host User')
      RETURNING id;
    `);
    prebookUserId = prebookRes.rows[0].id;

    // 3. Create 5 distinct competing users
    for (let i = 1; i <= 5; i++) {
      const uRes = await query(`
        INSERT INTO users (name)
        VALUES ($1)
        RETURNING id;
      `, [`Competing User ${i}`]);
      competingUserIds.push(uRes.rows[0].id);
    }

    // 4. Create a tour slot with capacity 10
    const slotRes = await query(`
      INSERT INTO tour_slots (place_id, starts_at, capacity)
      VALUES ($1, NOW() + INTERVAL '1 day', 10)
      RETURNING id;
    `, [testPlaceId]);
    testSlotId = slotRes.rows[0].id;

    // 5. Pre-book 9 seats so EXACTLY 1 seat remains
    await query(`
      INSERT INTO bookings (slot_id, user_id, seats)
      VALUES ($1, $2, 9);
    `, [testSlotId, prebookUserId]);
  });

  afterAll(async () => {
    // Clean up test data
    if (testPlaceId) {
      await query('DELETE FROM places WHERE id = $1;', [testPlaceId]);
    }
    if (prebookUserId) {
      await query('DELETE FROM users WHERE id = $1;', [prebookUserId]);
    }
    for (const uid of competingUserIds) {
      await query('DELETE FROM users WHERE id = $1;', [uid]);
    }
    await pool.end();
  });

  test('prevents overbooking when 5 parallel requests compete for 1 remaining seat', async () => {
    // Fire 5 simultaneous requests from distinct users for 1 seat each
    const parallelRequests = competingUserIds.map((uid) =>
      request(app)
        .post(`/api/places/${testPlaceId}/book`)
        .send({
          slot_id: testSlotId,
          user_id: uid,
          seats: 1,
        })
    );

    const responses = await Promise.all(parallelRequests);

    // Filter statuses
    const successfulBookings = responses.filter((res) => res.status === 201);
    const rejectedBookings = responses.filter((res) => res.status === 400);

    // Assert: Exactly 1 succeeds and 4 are cleanly rejected
    expect(successfulBookings.length).toBe(1);
    expect(rejectedBookings.length).toBe(4);

    // Verify error message on rejected requests
    rejectedBookings.forEach((res) => {
      expect(res.body.error).toBe('Selected tour slot is fully booked');
    });

    // Verify in database: total booked seats must be exactly 10 (capacity limit)
    const dbCheck = await query(
      'SELECT SUM(seats)::int AS total_booked FROM bookings WHERE slot_id = $1;',
      [testSlotId]
    );

    expect(dbCheck.rows[0].total_booked).toBe(10);
  });

  test('prevents the same user from booking the same place twice', async () => {
    // Create a fresh test user
    const freshUserRes = await query(`
      INSERT INTO users (name) VALUES ('Duplicate Booking Tester') RETURNING id;
    `);
    const freshUserId = freshUserRes.rows[0].id;

    // Create a slot with ample capacity
    const newSlotRes = await query(`
      INSERT INTO tour_slots (place_id, starts_at, capacity)
      VALUES ($1, NOW() + INTERVAL '2 days', 5)
      RETURNING id;
    `, [testPlaceId]);
    const newSlotId = newSlotRes.rows[0].id;

    // First booking attempt by the user should succeed
    const firstRes = await request(app)
      .post(`/api/places/${testPlaceId}/book`)
      .send({
        slot_id: newSlotId,
        user_id: freshUserId,
        seats: 1,
      });

    expect(firstRes.status).toBe(201);
    expect(firstRes.body.booking).toBeDefined();

    // Second booking attempt by the same user for the same slot should be rejected
    const secondRes = await request(app)
      .post(`/api/places/${testPlaceId}/book`)
      .send({
        slot_id: newSlotId,
        user_id: freshUserId,
        seats: 1,
      });

    expect(secondRes.status).toBe(400);
    expect(secondRes.body.error).toBe('You have already booked this tour slot');

    // Clean up fresh user
    await query('DELETE FROM users WHERE id = $1;', [freshUserId]);
  });
});
