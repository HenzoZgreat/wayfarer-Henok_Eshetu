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
 * Returns all places with aggregated review counts and average ratings.
 * Optional query parameter: ?category=History
 */
app.get('/api/places', async (req, res) => {
  const { category } = req.query;

  try {
    const sql = `
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
      ORDER BY p.id ASC;
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

// 404 Handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Wayfarer backend server running on http://localhost:${PORT}`);
});
