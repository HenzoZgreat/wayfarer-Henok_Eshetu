# AI Collaboration & Tool Usage Report

## 1. Tools & Areas of Assistance

During the development of Wayfarer, we utilized AI pair-programming tools (**Antigravity / Gemini / Cursor**) across several areas:
- **UI Prototyping & Layout Scaffolding**: Rapidly scaffolding Tailwind CSS v3 components (the responsive sidebar list, rating pill filters, and sticky detail view).
- **SQL Query Optimization**: Drafting the Common Table Expression (CTE) for calculating the Bayesian Average ranking in PostgreSQL.
- **Mock Data Generation**: Assembling realistic seed data (10 places across History, Food, and Nature, including single-review edge cases).
- **Concurrency Test Boilerplate**: Writing the parallel request harness (`Promise.all`) in Supertest to verify PostgreSQL row-level locks under load.

---

## 2. Example Prompts & How Outputs Were Refined

### Example 1: Bayesian Average Calculation
- **Prompt**: *"Write a function that calculates the Bayesian average ranking for our places so a 1-review 5-star venue doesn't beat a well-reviewed museum."*
- **Initial AI Output**: Provided a JavaScript utility function using `.reduce()` and `.sort()` that required fetching all reviews and places into Node.js application memory on every request.
- **Our Modification**: We rejected doing this in application memory. Instead, we translated the formula into a database-level SQL query using CTEs (`WITH global_stats AS ...`) in `server.js`. This allows PostgreSQL to calculate the weighted score and sort results via `ORDER BY weighted_score DESC` in a single query pass.

### Example 2: Automated Concurrency Test
- **Prompt**: *"Write a Jest/Supertest automated test that fires 5 parallel requests to book the last remaining seat on a tour slot."*
- **Initial AI Output**: The generated test used the exact same `testUserId` for both the pre-booked seats and all 5 parallel requests.
- **Our Modification**: When we implemented the fair-booking rule (preventing a single user from booking the same place twice), that initial test failed because all 5 requests came from the same user. We refactored the test fixture to create a separate `prebookUserId` and 5 distinct competing user IDs (`competingUser1..5`), accurately simulating 5 different travelers competing for the final ticket.

---

## 3. Notable Inaccuracy & How It Was Resolved

### The Issue: Tailwind CSS v4 & Turbopack Incompatibilities
- **What happened**: When setting up the Next.js frontend, the AI recommended configuring Tailwind CSS v4 using `@tailwindcss/postcss` with the default Next.js Turbopack dev server.
- **The failure**: On Windows, this combination caused recurring Turbopack HMR file watcher memory leaks and random browser crashes (*"Aw, Snap! Out of Memory"*), as well as hydration mismatches due to unstable prerender timing.
- **How it was caught**: Noticed in browser devtools and terminal logs where the dev server process froze after hot-reloading components.
- **The fix**: We discarded the experimental Tailwind v4 setup and converted the project to stable **Tailwind CSS v3** (`tailwindcss@3.4.17`, `postcss`, `autoprefixer`) with `tailwind.config.ts`, and configured the dev script to run via Webpack (`next dev --webpack`). This immediately stabilized HMR and eliminated hydration errors.
