# Architectural Decisions & Design Rationale

This document summarizes the core technical decisions made while building Wayfarer.

---

## 1. Ranking Formula: Bayesian Average

### The Problem
Using a simple arithmetic mean ($\frac{\sum \text{ratings}}{N}$) breaks down when review counts vary drastically. A newly added hole-in-the-wall coffee hatch with a single 5.0-star review would outrank a world-famous cathedral with 350 reviews and a 4.86 average. That creates a poor user experience and misleads travelers.

### The Solution: Bayesian Prior
We rank places using the **Bayesian Average** (weighted rating) formula:

$$\text{Weighted Score} = \left(\frac{v}{v + m}\right) \cdot R + \left(\frac{m}{v + m}\right) \cdot C$$

- $v$ = Number of reviews for the specific place (`review_count`)
- $R$ = Arithmetic average rating for that place (`average_rating`)
- $C$ = Global benchmark average across all places in the database (defaults to $\sim 4.5$)
- $m$ = Confidence smoothing threshold (set to $m = 5$)

### How it Works in Practice
Assume the global average $C = 4.5$ and confidence threshold $m = 5$:
- **Grand Cathedral**: 312 reviews, average $4.80$.
  $$\text{Score} = \left(\frac{312}{317}\right) \cdot 4.80 + \left(\frac{5}{317}\right) \cdot 4.50 = 4.72 + 0.07 = \mathbf{4.79}$$
- **The Nook Espresso Hatch** (1 review, 5.0 rating):
  $$\text{Score} = \left(\frac{1}{6}\right) \cdot 5.00 + \left(\frac{5}{6}\right) \cdot 4.50 = 0.83 + 3.75 = \mathbf{4.58}$$

Even though the espresso hatch has a perfect raw $5.0$, its lack of review volume pulls it down toward the benchmark average ($4.58$), allowing the cathedral ($4.79$) to rightfully take the top spot. As a venue accumulates more genuine reviews ($v \gg m$), its own average naturally takes over.

### Database-Level Execution
Rather than loading all reviews into Node.js memory to sort them, we compute this formula entirely inside PostgreSQL using a Common Table Expression (CTE) in both `GET /api/places` and `GET /api/places/:id`:
```sql
WITH global_stats AS (
  SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 4.5)::float AS global_avg FROM reviews
),
place_stats AS (...)
SELECT ..., 
  ROUND(((ps.review_count::numeric / (ps.review_count + 5)) * ps.average_rating + 
        (5.0 / (ps.review_count + 5)) * gs.global_avg)::numeric, 2)::float AS weighted_score
FROM place_stats ps CROSS JOIN global_stats gs
ORDER BY weighted_score DESC;
```
Sorting happens on the database engine with zero in-memory Node overhead.

---

## 2. Concurrency & Overbooking Prevention

### The Problem
When a tour slot has only 1 remaining seat and multiple users click "Book Tour" at the exact same millisecond, standard `SELECT` and `INSERT` statements suffer from a **Read-Modify-Write Race Condition**. Both requests read `remaining_seats = 1`, both proceed to insert, and the slot ends up overbooked with 11 out of 10 seats sold.

### The Solution: Row-Level Locking (`SELECT ... FOR UPDATE`)
We wrap the entire booking routine inside an atomic PostgreSQL transaction with row-level locking:

1. **Transaction Start**: `BEGIN;`
2. **Exclusive Row Lock**:
   ```sql
   SELECT id, capacity FROM tour_slots WHERE id = $1 AND place_id = $2 FOR UPDATE;
   ```
   This acquires an exclusive lock on that specific tour slot row. Any concurrent transaction attempting to book the same slot is placed in a queue by PostgreSQL until the first transaction finishes.
3. **Fair Booking & Seat Calculation**:
   Inside the lock, we verify that:
   - The user does not already hold a reservation for this place (`JOIN tour_slots WHERE place_id = $1 AND user_id = $2`).
   - `capacity - SUM(seats) >= requested_seats`.
4. **Conditional Commit / Rollback**:
   - If full or user already booked, we immediately call `ROLLBACK;` and return a clean `400 Bad Request` (`{ "error": "Selected tour slot is fully booked" }`).
   - If seats are available, we execute `INSERT INTO bookings ...;` and `COMMIT;`.
5. **Client Release**: The connection is returned to the pool in a `finally` block.

### Automated Test Proof
In `tests/concurrency.test.js`, we setup a tour slot with 10 total seats, pre-fill 9 seats, and launch **5 simultaneous Supertest requests** competing for the 1 remaining seat using `Promise.all`. The test suite verifies that:
- Exactly 1 request receives `201 Created`.
- Exactly 4 requests receive `400 Bad Request` with friendly error bodies.
- The database record confirms total booked seats capped at exactly 10.

---

## 3. Future Improvements

Given more time, here are the top architectural refinements we would introduce:
1. **Server-Sent Events (SSE) or WebSockets**: Push real-time seat availability deltas to all open browser tabs as bookings occur, rather than relying on on-action refetches.
2. **Cancellation & Waitlist Engine**: Allow travelers to cancel their reservations with automatic seat release, and implement an automated waitlist that notifies the next interested user.
3. **Pagination & Geolocation**: Add cursor-based pagination for large catalogs and PostGIS distance queries to sort places by traveler proximity.
4. **Redis Distributed Locking**: If scaling the API horizontally across multiple geographic regions with connection pooling proxies (like PgBouncer in transaction pooling mode), migrate row locks to a Redis-based Redlock or distributed reservation queue.
