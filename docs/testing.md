# PennyForge — Testing

## Unit tests (`npm test`)

Run with `npm test` (vitest). Files under `tests/`:

- **`tests/scoring.test.ts`** — evidence-type ordering, confirmation bonus + cap, trust bonus,
  score clamping, stale decay (7-day penny half-life, 30-day near-zero, clearance decays slower
  than penny), confirmation refreshing freshness, dead-vote penalty, suppression rule, trust-delta
  adjustments.
- **`tests/reports.test.ts`** — UTC calendar-date truncation, duplicate-key stability within a day,
  duplicate-key changes across a day boundary and across different users, Prisma P2002 detection.
- **`tests/alerts.test.ts`** — threshold gating, dedupe within 24h, re-alert after 24h, no dedupe
  across different products/stores.
- **`tests/route.test.ts`** — confidence-weighted expected value, suppressed leads contribute
  zero, gas-cost subtraction, far-but-valuable beats close-but-low-value, negative-ROI exclusion.
- **`tests/compliance.test.ts`** — every allowed source type passes, every blocked source type
  throws `ComplianceError`, unknown/novel source strings are rejected (allowlist behavior), price
  bounds, evidence-URL scheme validation, one fully-valid submission passes end-to-end.

## Acceptance tests (manual or scripted against the running app)

1. `npm run setup` completes without errors on a clean checkout.
2. `npm run dev` serves the app at `localhost:3000` with no external paid services required.
3. Seeded users, retailers, stores, products, reports, votes, and alerts all load (check `/`,
   `/search`, `/leaderboard`, `/alerts`, `/admin` render seeded data, not empty states).
4. Manual UPC/SKU search (`/search`) returns the correct product for an exact UPC and for a
   partial SKU match.
5. Feed filtering by state and by store (`/`) narrows results correctly; combining filters (state
   + store) still returns correct results.
6. Submitting a report via `/report/new` creates a `PENDING` report with a computed confidence
   score returned in the response.
7. Submitting a second report for the same product+store+user on the same day returns HTTP 409
   with a friendly error instead of creating a duplicate row.
8. A report's confidence score visibly increases when its evidence type is receipt vs. text-only,
   and when it accumulates confirmations (verify via the lead detail page's score breakdown).
9. An older report (simulate via seed data at `daysAgo(20)`) shows a visibly lower score than an
   otherwise-identical fresh report, consistent with the decay half-life.
10. Casting 2 dead votes (from different users, not the reporter) on a report flips its status to
    `SUPPRESSED` and removes it from the feed and route planner.
11. Submitting a report with a blocked `sourceType` (e.g. `SCRAPED_SITE`) is rejected with HTTP
    422 and never creates a database row.
12. Two reports on the same product+store within 24 hours produce only one alert per recipient
    (verify via `/alerts` after two rapid submissions as different reporting users).
13. Switching to `forge_admin` or `atl_captain` in the header and visiting `/admin` shows the
    moderation queue; approving/rejecting a report updates its status and it reflects on the feed.
14. The route planner (`/route`) ranks stores with a positive `routeScore` in descending order and
    excludes stores whose only leads are suppressed or whose gas cost exceeds expected value.
15. Voting on your own report is rejected (HTTP 403).
16. `npm test` passes with all suites green (scoring, reports/dedupe, alerts, route, compliance).

## Manual QA script (5 minutes)

1. Run `npm run setup`, then `npm run dev`.
2. Open `/` — confirm the feed shows seeded leads sorted by confidence, highest first.
3. Open a high-score lead's detail page — read the score breakdown table, confirm it adds up.
4. As `casey_hunts`, vote "Still there" on a lead you didn't report — confirm the score updates.
5. Switch to `lena_finds` (header dropdown), submit a new report at a Dollar General store with
   evidence type "Text only" and source "Saw it in store" — confirm it appears as `PENDING` with a
   low score.
6. Try submitting again for the *same* product/store as `lena_finds` — confirm you get the
   "already reported today" error.
7. Open `/report/new`, pick a blocked source option from the dropdown (labeled "(blocked)"),
   submit — confirm it's rejected with a compliance error message.
8. Open `/alerts` as `casey_hunts` — confirm at least one alert appears; mark it read.
9. Open `/route` — confirm stores are ranked with expected value, trip cost, and route score
   columns that make sense (higher expected value or shorter distance → higher score).
10. Switch to `forge_admin`, open `/admin` — approve or reject a pending report, confirm the queue
    updates.
11. Open `/leaderboard` — confirm trust scores and approved-report counts look consistent with the
    votes cast during this session.
