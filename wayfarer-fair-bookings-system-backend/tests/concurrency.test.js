const request = require('supertest');
const app = require('../server');
const { query, pool } = require('../src/db');

describe('Tour Booking Concurrency Safety (Row-Level Locking)', () => {
  let testPlaceId;
  let testUserId;
  let testSlotId;

  beforeAll(async () => {
    // 1. Create a dedicated test place
    const placeRes = await query(`
      INSERT INTO places (name, category, description, opening_hours)
      VALUES ('Concurrency Test Landmark', 'History', 'Testing race conditions', '09:00 - 18:00')
      RETURNING id;
    `);
    testPlaceId = placeRes.rows[0].id;

    // 2. Create a test user
    const userRes = await query(`
      INSERT INTO users (name)
      VALUES ('Test Concurrency User')
      RETURNING id;
    `);
    testUserId = userRes.rows[0].id;

    // 3. Create a tour slot with capacity 10
    const slotRes = await query(`
      INSERT INTO tour_slots (place_id, starts_at, capacity)
      VALUES ($1, NOW() + INTERVAL '1 day', 10)
      RETURNING id;
    `, [testPlaceId]);
    testSlotId = slotRes.rows[0].id;

    // 4. Pre-book 9 seats so EXACTLY 1 seat remains
    await query(`
      INSERT INTO bookings (slot_id, user_id, seats)
      VALUES ($1, $2, 9);
    `, [testSlotId, testUserId]);
  });

  afterAll(async () => {
    // Clean up test data
    if (testPlaceId) {
      await query('DELETE FROM places WHERE id = $1;', [testPlaceId]);
    }
    if (testUserId) {
      await query('DELETE FROM users WHERE id = $1;', [testUserId]);
    }
    await pool.end();
  });

  test('prevents overbooking when 5 parallel requests compete for 1 remaining seat', async () => {
    // Fire 5 simultaneous requests for 1 seat each
    const parallelRequests = Array.from({ length: 5 }).map(() =>
      request(app)
        .post(`/api/places/${testPlaceId}/book`)
        .send({
          slot_id: testSlotId,
          user_id: testUserId,
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
});

