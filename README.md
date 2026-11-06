# Wayfarer — City Guide & Fair Tour Bookings

Wayfarer is a full-stack city guide and tour booking application. It allows travelers to discover curated urban landmarks across categories (History, Food, Nature, Culture), inspect real-time tour schedules, submit visitor reviews, and book guided tour slots.

The core engineering focus of the project is **fairness and data integrity**:
1. **Bayesian Average Ranking**: Prevents a brand-new venue with a single 5-star review from unfairly outranking well-established cultural landmarks with hundreds of reviews.
2. **Concurrency-Safe Fair Bookings**: Prevents race conditions and overbooking using PostgreSQL database transactions with row-level locking (`SELECT ... FOR UPDATE`).
3. **Anti-Hoarding Policy**: Ensures each user can only reserve one tour slot per landmark.

---

## Tech Stack

- **Frontend**: Next.js 15 (App Router, React 19, TypeScript, Tailwind CSS v3, Lucide icons)
- **Backend**: Node.js, Express 5, `pg` (PostgreSQL connection pool)
- **Database**: PostgreSQL (relational schema, CTE ranking queries, transactions with row locks)
- **Testing**: Jest, Supertest (automated concurrency & business logic testing)

---

## Quick Start (3 Steps)

### Prerequisites
- Node.js (v18+)
- PostgreSQL running locally (default: `postgres://postgres:postgres@localhost:5432/wayfarer_db`)

### 1. Configure Database & Environment
Create a database named `wayfarer_db` in PostgreSQL:
```bash
createdb wayfarer_db
```
Both `wayfarer-fair-bookings-system-backend/.env` and `wayfarer-fair-bookings-system/.env.local` are already pre-configured for local development.

### 2. Setup & Start Backend
In your terminal, run:
```bash
cd wayfarer-fair-bookings-system-backend && npm run migrate && npm run seed && npm run dev
```
*Runs migrations, seeds 10 realistic places and test users, and boots Express on port `5000`.*

### 3. Start Frontend & View App
In a second terminal, run:
```bash
cd wayfarer-fair-bookings-system && npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## Running Automated Tests

To run the automated concurrency safety and fair-booking test suite:
```bash
cd wayfarer-fair-bookings-system-backend && npm test
```
This runs Supertest against an active test slot, firing 5 parallel requests simultaneously for 1 remaining seat to verify row-level lock safety and zero overbooking.

---

## Project Structure

```text
├── wayfarer-fair-bookings-system/           # Next.js Frontend
│   ├── app/                                 # App router & main dashboard page
│   ├── components/                          # Header, PlaceList, PlaceCard, PlaceDetail
│   ├── services/api.ts                      # Frontend API client & data mappers
│   └── .env.local                           # Points to NEXT_PUBLIC_API_URL
│
├── wayfarer-fair-bookings-system-backend/   # Express & PostgreSQL Backend
│   ├── src/db/                              # Pool config, schema.sql, migrate.js, seed.js
│   ├── tests/                               # Jest & Supertest concurrency test suite
│   ├── server.js                            # REST API endpoints & transaction logic
│   └── .env                                 # Database URL and server port
│
├── README.md                                # This documentation
├── DECISIONS.md                             # Architectural decisions & formulas
└── AI_USAGE.md                              # AI collaboration report
```

---

## Known Limitations & Trade-offs

1. **Single-Node DB Locking**: `SELECT ... FOR UPDATE` is fast and guarantees consistency on a single PostgreSQL instance. If scaling across multi-region distributed databases, we would need distributed locking (e.g. Redis Redlock) or serializable isolation.
2. **Persona Switcher vs. Real Auth**: To make evaluating this take-home frictionless, we implemented a header persona switcher (`Acting as: Sara / Abel / Liya`) instead of full JWT/OAuth2 login flows. The backend still validates incoming `user_id` values on all mutations.
3. **Curated Image Resolvers**: Landmark images are resolved on the frontend using curated Unsplash travel assets keyed by landmark type, keeping database migrations clean and lightweight without external S3/blob dependencies.
