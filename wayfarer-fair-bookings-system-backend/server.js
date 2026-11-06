const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { query, pool } = require('./src/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Base health route
app.get('/api', (req, res) => {
  res.json({ message: 'Wayfarer API is running', status: 'healthy' });
});

/**
 * 1. GET /api/users
 * Returns all seeded users (e.g., Sara, Abel, Liya) for persona switching
 */
app.get('/api/users', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, name FROM users ORDER BY id ASC;'
    );
    res.json({ users: rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users from database' });
  }
});

/**
 * 2. GET /api/places
 * Returns all places with aggregated review counts, average ratings,
 * and Bayesian Average Ranking (Weighted Score).
 * Query parameters:
 * - ?category=History (optional)
 * - ?sort=top_rated | most_reviewed | name (optional, defaults to top_rated)
 */
app.get('/api/places', async (req, res) => {
  const { category, sort } = req.query;
  const m = 5; // Minimum smoothing threshold (m=5)

  try {
    let orderByClause = 'ORDER BY weighted_score DESC, ps.review_count DESC, ps.id ASC';

    if (sort === 'most_reviewed' || sort === 'most-reviewed') {
      orderByClause = 'ORDER BY ps.review_count DESC, weighted_score DESC, ps.id ASC';
    } else if (sort === 'name') {
      orderByClause = 'ORDER BY ps.name ASC';
    }

    const sql = `
      WITH global_stats AS (
        SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 4.5)::float AS global_avg
        FROM reviews
      ),
      place_stats AS (
        SELECT 
          p.id,
          p.name,
          p.category,
          p.description,
          p.opening_hours,
          COUNT(r.id)::int AS review_count,
          COALESCE(ROUND(AVG(r.rating)::numeric, 2), 0)::float AS average_rating
        FROM places p
        LEFT JOIN reviews r ON p.id = r.place_id
        WHERE ($1::text IS NULL OR LOWER(p.category) = LOWER($1))
        GROUP BY p.id
      )
      SELECT 
        ps.id,
        ps.name,
        ps.category,
        ps.description,
        ps.opening_hours,
        ps.review_count,
        ps.average_rating,
        CASE 
          WHEN ps.review_count = 0 THEN 0
          ELSE ROUND(
            (
              (ps.review_count::numeric / (ps.review_count + ${m})) * ps.average_rating + 
              (${m}.0 / (ps.review_count + ${m})) * gs.global_avg
            )::numeric, 
            2
          )::float
        END AS weighted_score
      FROM place_stats ps
      CROSS JOIN global_stats gs
      ${orderByClause};
    `;

    const { rows } = await query(sql, [category || null]);
    res.json({ places: rows });
  } catch (error) {
    console.error('Error fetching places:', error);
    res.status(500).json({ error: 'Failed to fetch places from database' });
  }
});

/**
 * 3. GET /api/places/:id
 * Returns a single place's details with Bayesian Average score, existing reviews, and tour slots.
 */
app.get('/api/places/:id', async (req, res) => {
  const { id } = req.params;
  const m = 5; // Minimum smoothing threshold (m=5)

  try {
    // 1. Fetch place details with Bayesian weighted score & summary rating stats
    const placeQuery = `
      WITH global_stats AS (
        SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 4.5)::float AS global_avg
        FROM reviews
      ),
      place_stats AS (
        SELECT 
          p.id,
          p.name,
          p.category,
          p.description,
          p.opening_hours,
          COUNT(r.id)::int AS review_count,
          COALESCE(ROUND(AVG(r.rating)::numeric, 2), 0)::float AS average_rating
        FROM places p
        LEFT JOIN reviews r ON p.id = r.place_id
        WHERE p.id = $1
        GROUP BY p.id
      )
      SELECT 
        ps.id,
        ps.name,
        ps.category,
        ps.description,
        ps.opening_hours,
        ps.review_count,
        ps.average_rating,
        CASE 
          WHEN ps.review_count = 0 THEN 0
          ELSE ROUND(
            (
              (ps.review_count::numeric / (ps.review_count + ${m})) * ps.average_rating + 
              (${m}.0 / (ps.review_count + ${m})) * gs.global_avg
            )::numeric, 
            2
          )::float
        END AS weighted_score
      FROM place_stats ps
      CROSS JOIN global_stats gs;
    `;
    const placeRes = await query(placeQuery, [id]);

    if (placeRes.rows.length === 0) {
      return res.status(404).json({ error: 'Place not found' });
    }

    const place = placeRes.rows[0];

    // 2. Fetch reviews with author names
    const reviewsQuery = `
      SELECT 
        r.id,
        r.rating,
        r.body,
        r.created_at,
        r.user_id,
        u.name AS user_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.place_id = $1
      ORDER BY r.created_at DESC;
    `;
    const reviewsRes = await query(reviewsQuery, [id]);

    // 3. Fetch tour slots and calculate remaining available seats
    const slotsQuery = `
      SELECT 
        ts.id,
        ts.starts_at,
        ts.capacity,
        COALESCE(SUM(b.seats), 0)::int AS booked_seats,
        (ts.capacity - COALESCE(SUM(b.seats), 0))::int AS available_seats,
        COALESCE(
          JSON_AGG(b.user_id) FILTER (WHERE b.user_id IS NOT NULL),
          '[]'::json
        ) AS booked_user_ids
      FROM tour_slots ts
      LEFT JOIN bookings b ON ts.id = b.slot_id
      WHERE ts.place_id = $1
      GROUP BY ts.id
      ORDER BY ts.starts_at ASC;
    `;
    const slotsRes = await query(slotsQuery, [id]);

    res.json({
      place: {
        ...place,
        reviews: reviewsRes.rows,
        tour_slots: slotsRes.rows,
      },
    });
  } catch (error) {
    console.error(`Error fetching place #${id}:`, error);
    res.status(500).json({ error: 'Failed to fetch place details from database' });
  }
});

/**
 * 4. POST /api/places/:id/reviews
 * Submits a new review or updates an existing review for a place/user pair.
 * Request Body: { "user_id": 1, "rating": 5, "body": "..." }
 */
app.post('/api/places/:id/reviews', async (req, res) => {
  const placeId = parseInt(req.params.id, 10);
  const { user_id, rating, body } = req.body;

  // 1. Validation
  if (isNaN(placeId)) {
    return res.status(400).json({ error: 'Invalid place ID' });
  }

  const parsedUserId = parseInt(user_id, 10);
  if (!user_id || isNaN(parsedUserId)) {
    return res.status(400).json({ error: 'Valid user_id is required' });
  }

  const parsedRating = parseInt(rating, 10);
  if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
  }

  if (!body || typeof body !== 'string' || !body.trim()) {
    return res.status(400).json({ error: 'Review body cannot be empty' });
  }

  try {
    const sql = `
      INSERT INTO reviews (place_id, user_id, rating, body)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (place_id, user_id)
      DO UPDATE SET rating = EXCLUDED.rating, body = EXCLUDED.body, created_at = NOW()
      RETURNING id, place_id, user_id, rating, body, created_at;
    `;

    const { rows } = await query(sql, [placeId, parsedUserId, parsedRating, body.trim()]);
    return res.status(201).json({
      message: 'Review submitted successfully',
      review: rows[0],
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    if (error.code === '23503') {
      return res.status(404).json({ error: 'Referenced place or user does not exist' });
    }
    return res.status(500).json({ error: 'Failed to submit review' });
  }
});

/**
 * 5. POST /api/places/:id/book
 * Books a tour slot with row-level concurrency locking (FOR UPDATE)
 * Request Body: { "slot_id": 10, "user_id": 1, "seats": 1 }
 */
app.post('/api/places/:id/book', async (req, res) => {
  const placeId = parseInt(req.params.id, 10);
  const { slot_id, user_id, seats } = req.body;

  // 1. Input Validation
  if (isNaN(placeId)) {
    return res.status(400).json({ error: 'Invalid place ID' });
  }

  const slotId = parseInt(slot_id, 10);
  if (!slot_id || isNaN(slotId)) {
    return res.status(400).json({ error: 'Valid slot_id is required' });
  }

  const userId = parseInt(user_id, 10);
  if (!user_id || isNaN(userId)) {
    return res.status(400).json({ error: 'Valid user_id is required' });
  }

  const requestedSeats = seats !== undefined ? parseInt(seats, 10) : 1;
  if (isNaN(requestedSeats) || requestedSeats <= 0) {
    return res.status(400).json({ error: 'Seats must be a positive integer' });
  }

  // 2. Concurrency-Safe Transaction with Row-Level Locking
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Row-level lock on the tour slot
    const slotQuery = `
      SELECT id, place_id, capacity, starts_at 
      FROM tour_slots 
      WHERE id = $1 AND place_id = $2 
      FOR UPDATE;
    `;
    const slotRes = await client.query(slotQuery, [slotId, placeId]);

    if (slotRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Tour slot not found for this place' });
    }

    const slot = slotRes.rows[0];

    // Check if this user has already booked any tour slot for this place
    const userBookingQuery = `
      SELECT b.id, b.slot_id
      FROM bookings b
      JOIN tour_slots ts ON b.slot_id = ts.id
      WHERE ts.place_id = $1 AND b.user_id = $2;
    `;
    const userBookingRes = await client.query(userBookingQuery, [placeId, userId]);

    if (userBookingRes.rows.length > 0) {
      await client.query('ROLLBACK');
      const isSameSlot = userBookingRes.rows.some((b) => b.slot_id === slotId);
      return res.status(400).json({
        error: isSameSlot
          ? 'You have already booked this tour slot'
          : 'You have already booked a tour for this place',
      });
    }

    // Calculate currently booked seats inside locked transaction
    const bookedQuery = `
      SELECT COALESCE(SUM(seats), 0)::int AS booked_seats 
      FROM bookings 
      WHERE slot_id = $1;
    `;
    const bookedRes = await client.query(bookedQuery, [slotId]);
    const bookedSeats = bookedRes.rows[0].booked_seats;
    const availableSeats = slot.capacity - bookedSeats;

    // Check if enough seats are left
    if (availableSeats < requestedSeats) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Selected tour slot is fully booked',
        available_seats: Math.max(0, availableSeats),
        requested_seats: requestedSeats,
      });
    }

    // Insert booking
    const insertQuery = `
      INSERT INTO bookings (slot_id, user_id, seats)
      VALUES ($1, $2, $3)
      RETURNING id, slot_id, user_id, seats, created_at;
    `;
    const insertRes = await client.query(insertQuery, [slotId, userId, requestedSeats]);

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Booking confirmed successfully',
      booking: insertRes.rows[0],
      remaining_seats: availableSeats - requestedSeats,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error booking tour slot:', error);
    if (error.code === '23503') {
      return res.status(404).json({ error: 'Referenced user or slot does not exist' });
    }
    return res.status(500).json({ error: 'Failed to process booking' });
  } finally {
    client.release();
  }
});

// 404 Handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Wayfarer backend server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
