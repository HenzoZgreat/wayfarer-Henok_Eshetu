const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { query } = require('./src/db');

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
  const m = 3; // Minimum smoothing threshold

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
 * Returns a single place's details, existing reviews, and tour slots with remaining seat calculations.
 */
app.get('/api/places/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Fetch place details with summary rating stats
    const placeQuery = `
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
      GROUP BY p.id;
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
        (ts.capacity - COALESCE(SUM(b.seats), 0))::int AS available_seats
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
    return res.status(201).json({ review: rows[0] });
  } catch (error) {
    console.error('Error submitting review:', error);
    if (error.code === '23503') {
      return res.status(404).json({ error: 'Referenced place or user does not exist' });
    }
    return res.status(500).json({ error: 'Failed to submit review' });
  }
});

// 404 Handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Wayfarer backend server running on http://localhost:${PORT}`);
});
