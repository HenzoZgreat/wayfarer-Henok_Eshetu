-- Wayfarer PostgreSQL Database Schema Migrations

-- 1. Users Table (no passwords, seeded personas)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

-- 2. Places Table
CREATE TABLE IF NOT EXISTS places (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    opening_hours VARCHAR(255) NOT NULL
);

-- 3. Reviews Table (one review per user per place via UNIQUE constraint)
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    place_id INTEGER NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_place_review UNIQUE (place_id, user_id)
);

-- 4. Tour Slots Table
CREATE TABLE IF NOT EXISTS tour_slots (
    id SERIAL PRIMARY KEY,
    place_id INTEGER NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0)
);

-- 5. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    slot_id INTEGER NOT NULL REFERENCES tour_slots(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seats INTEGER NOT NULL DEFAULT 1 CHECK (seats > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_places_category ON places(category);
CREATE INDEX IF NOT EXISTS idx_reviews_place_id ON reviews(place_id);
CREATE INDEX IF NOT EXISTS idx_tour_slots_place_id ON tour_slots(place_id);
CREATE INDEX IF NOT EXISTS idx_bookings_slot_id ON bookings(slot_id);

