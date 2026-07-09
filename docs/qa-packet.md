# PennyForge — QA Packet (Agent 9 deliverable, for Agent 11)

Produced by running the existing local MVP end-to-end: `npm install`, `npx prisma migrate dev`,
`npx prisma db seed`, `npm test`, a live `npm run dev` session driven with `curl` against every
API route and page, plus a new standalone simulation script
(`scripts/qa-simulation.ts`) that exercises all 8 core scoring/compliance behaviors directly
against `lib/*.ts` with hand-computed expected values. Everything below reflects what was actually
run, not just read from source.

## 0. Bottom line

- **46/46 unit tests pass** (`npm test`), **41/41 simulation checks pass**
  (`npx tsx scripts/qa-simulation.ts`), lint and `tsc --noEmit` are both clean.
- **12 of the 13 acceptance criteria from `docs/testing.md` were exercised live** against a
  running `npm run dev` instance with seeded data and passed. Acceptance criterion #12 (alert
  dedupe: two rapid submissions on the same product+store should produce only one alert per
  recipient) could **not** be exercised as written — see §5: fresh submissions by seeded users
  never clear `ALERT_THRESHOLD`, so no organic alert is ever created for dedupe to act on in the
  first place.
- **One real product gap found** (not a bug — a tuning gap): see §5, "Alert threshold is
  effectively unreachable from a first submission." This gap is what blocks acceptance
  criterion #12 above.

---

## 1. Test matrix

| # | Behavior | Unit test | Simulation | Live HTTP/UI | Result |
|---|---|---|---|---|---|
| 1 | Confidence scoring (component math) | `tests/scoring.test.ts` | §1 | via lead detail page breakdown | ✅ |
| 2 | Evidence weighting (receipt > shelf tag > product photo > text) | `tests/scoring.test.ts` | §2 | new-report score comparison (16 vs 51) | ✅ |
| 3 | Duplicate same-day report prevention | `tests/reports.test.ts` | §3 | POST /api/reports twice same day → 201 then 409 | ✅ |
| 4 | Stale lead decay (7d penny half-life, clearance slower) | `tests/scoring.test.ts` | §4 | seed report r7 (20 days old) shows decayed score | ✅ |
| 5 | Dead-vote suppression (2+ deads > confirms) | `tests/scoring.test.ts` | §5 | 2 live DEAD votes → `suppressed:true`, vanishes from feed, blocked from admin-approve (409) | ✅ |
| 6 | Alert dedupe (per-recipient, 24h window) | `tests/alerts.test.ts` | §6 | seed alerts render on `/alerts`, mark-read works; **organic alert creation not exercisable — acceptance #12 blocked, see §5** | ⚠️ pure logic only |
| 7 | Route ranking (confidence-weighted ROI, gas cost) | `tests/route.test.ts` | §7 | `/route` renders ranked stores | ✅ |
| 8 | Unsafe source blocking (allowlist) | `tests/compliance.test.ts` | §8 | POST with `SCRAPED_SITE`/`PRIVATE_API` → 422, no row created | ✅ |
| — | Self-vote rejection | — | — | vote on own report → 403 | ✅ |
| — | Moderation blocks approving a suppressed report | — | — | approve suppressed report → 409 | ✅ |
| — | Feed filter by state | — | — | `/?state=GA` excludes FL/TX-only leads | ✅ |
| — | Feed filter by store | — | — | `/?storeId=<HD Midtown>` shows only that store's leads | ✅ |
| — | Manual UPC/SKU search (exact + partial) | — | — | `/search?q=<upc>` and partial SKU both resolve | ✅ |

## 2. Unit test list (existing, all passing — `npm test`, 46 tests / 5 files)

- **`tests/scoring.test.ts`** (18 tests) — evidence-type ordering; confirm bonus capped at 3;
  trust bonus scaling; score clamped to [0,100]; 7-day penny half-life; 30-day near-zero decay;
  clearance decays slower than penny; a recent CONFIRMED vote refreshes freshness; single dead
  vote reduces score; suppression rule (2+ deads outnumbering confirms) both fires and doesn't
  fire at the boundary; trust-delta application and clamping; net vote-upsert delta (no
  double-counting on resubmit/switch).
- **`tests/reports.test.ts`** (5 tests) — UTC calendar-date truncation; identical dup keys within
  a day; different dup keys across a UTC day boundary; different dup keys per user; Prisma P2002
  detection helper.
- **`tests/alerts.test.ts`** (11 tests) — below-threshold never alerts; at-threshold alerts;
  24h dedupe; re-alert after window; no cross-product/store dedupe; nearby-recipient fan-out
  (radius include/exclude, reporter exclusion, missing-coords exclusion, custom radius).
- **`tests/route.test.ts`** (5 tests) — confidence-weighted expected value; suppressed leads
  contribute zero; gas-cost subtraction; far-but-valuable beats close-but-low-value; negative-ROI
  stores excluded from ranking.
- **`tests/compliance.test.ts`** (7 tests) — every allowlisted source passes; every known-blocked
  source throws `ComplianceError`; unknown/novel strings rejected (allowlist, not denylist); price
  bounds; evidence-URL scheme validation; one fully-valid submission passes end-to-end.

## 3. Integration test list (live HTTP, run manually this session — recommend automating)

All run against `npm run dev` with seeded data, using cookie-based mock auth
(`POST /api/user {userId}`):

1. `GET /` → 200, feed renders seeded leads.
2. `GET /search?q=<UPC>` → exact UPC match resolves the correct product.
3. `GET /search?q=<partial SKU>` → partial SKU match resolves the correct product.
4. `GET /?state=GA` → only GA-store leads appear in the feed body (store-name matches confirmed
   absent for FL-only products like the Jacksonville patio set).
5. `GET /?storeId=<id>` → only that store's leads appear.
6. `POST /api/reports` (TEXT_ONLY, new product) → 201, low score (16 observed).
7. `POST /api/reports` (RECEIPT, same store, different new product) → 201, materially higher score
   (51 observed) — evidence hierarchy holds on live scoring, not just in isolation.
8. `POST /api/reports` twice for the same product+store+user same day → first 201, second 409 with
   the friendly duplicate message; no duplicate DB row (unique constraint holds).
9. `POST /api/reports` with `sourceType: SCRAPED_SITE` → 422, blocked-source message, no row.
10. `POST /api/reports` with `sourceType: PRIVATE_API` → 422, same guarantee.
11. `POST /api/reports/:id/vote` on your own report → 403 "You can't vote on your own report".
12. `POST /api/reports/:id/vote {DEAD}` from two distinct non-reporter users → second call returns
    `suppressed:true`; report disappears from `/?storeId=...` feed and does not appear in
    `getRankedStoresForUser` (route planner only pulls PENDING/APPROVED).
13. `POST /api/reports/:id/moderate {APPROVED}` on a suppressed report (as ADMIN) → 409, blocked
    with an explicit "community-suppressed" message; status unchanged.
14. `POST /api/reports/:id/moderate {APPROVED}` on a PENDING report (as ADMIN) → 200, status flips
    and is reflected in the admin queue HTML on next fetch.
15. `GET /admin` (as ADMIN) → 200, shows PENDING and SUPPRESSED reports with correct status badges.
16. `GET /route` (as any logged-in user) → 200, renders ranked stores with expected value/trip
    cost/route score columns; ranking order matches `lib/route.ts` semantics (HD Midtown — which
    holds the two highest-confidence receipt-verified leads — ranks at the top).
17. `GET /alerts` (as a seeded alert recipient) → 200, seeded alerts render with product/store
    names and a "Mark read" action.

**Recommend for Agent 11 / follow-up:** wrap steps 6–17 in a Vitest + `next/test` (or Playwright)
integration suite under `tests/integration/` that spins up the dev DB against a throwaway SQLite
file, since right now this coverage only exists as this session's manual `curl` transcript and
isn't regression-protected.

## 4. Manual QA script

Already maintained and accurate: **`docs/testing.md`** §"Manual QA script (5 minutes)". Re-walked
it this session end-to-end (dev server + seeded DB); all 11 steps behave as documented. No changes
needed there.

## 5. Edge cases and failure modes found

**Product gap (not a bug):**
- **Alert threshold is effectively unreachable from a first submission.** Alerts are scored at
  submission time with `confirms=0, deads=0, ageDays=0` (`app/api/reports/route.ts:134-141`), so
  the achievable score is just `evidenceBase + trustBonus`. Even a RECEIPT report (base 45) needs
  `reporterTrust >= 97` to clear `ALERT_THRESHOLD` (60) — no seeded user has trust that high (max
  is 90, `forge_admin`). Verified live: casey (trust 55) submitting a fresh RECEIPT report scored
  53, `alertsCreated: 0`. The three alerts visible in `/alerts` are all pre-materialized by
  `prisma/seed.ts`, not organically generated by the running scoring pipeline. This means the
  "alert on high-confidence lead" feature is currently **dead code in practice** until either (a)
  alerts are also generated/re-evaluated after confirm votes push a report over threshold, or (b)
  the base/threshold constants are retuned. Flagging for a product decision, not fixing
  unilaterally — this touches `lib/scoring.ts` constants that `docs/scoring.md` documents as
  deliberate.

**Edge cases verified to behave correctly (no bug):**
- Tie of confirms == deads (e.g. 2/2) does **not** suppress — `isSuppressed` requires strictly
  `deads > confirms`, confirmed both in unit tests and simulation.
- Suppression is reversible: enough confirms un-suppress and restore `previousStatus` (e.g. back to
  APPROVED, not reset to PENDING) — covered by the vote route's comment and schema design; not
  independently re-verified live this session (recommend Agent 11 add a live repro: suppress, then
  add confirms until it un-suppresses, and assert the restored status).
  Same-day duplicate is keyed on UTC midnight, so a report at 23:59 UTC and one at 00:01 UTC one
  minute later are treated as different days — confirmed via `toReportDate`/`makeDupKey` unit tests
  and simulation; this is a deliberate simplification (see `CLAUDE.md`) and not a bug, but a
  reporter near a UTC day boundary could in theory double-report within a few real-world minutes.
- Resubmitting the identical vote is a no-op on trust (can't be repeated to inflate/crater a
  reporter's trust) — covered by `applyVoteChange` tests and the vote route's transaction design.
- Approving an already-suppressed report is explicitly blocked (409) rather than silently
  succeeding and reintroducing a dead lead to the feed — verified live.
- Unknown/novel `sourceType` strings are rejected by default (allowlist, not denylist) — verified
  both in unit tests and live (`TIKTOK_SCREENSHOT`-style values would 422).
- Price bounds (must be a positive integer cents value, capped at $5,000) and non-http(s) evidence
  URLs (e.g. `javascript:`) are both rejected — unit-tested, not independently re-run live this
  session (low risk, pure function, already covered).

**Failure modes not exercised this session (scope/tooling gap, not a defect found):**
- Concurrent double-submission race (two simultaneous requests for the same product/store/user/day)
  relies on the DB's unique constraint + P2002 catch rather than an app-level lock; not load-tested.
- Cross-user trust-clamping race described in the vote route's comment (atomic SQL `CASE` update)
  was read and reasoned about but not stress-tested with concurrent requests this session.
- No negative-path test for `/api/route-plans` (save a route plan) — page renders but the save
  endpoint wasn't exercised live.

## 6. Suggested test files for Claude Code

- **`scripts/qa-simulation.ts`** (added this session) — standalone, DB-free simulation of all 8
  core behaviors with hand-computed expected values and pass/fail output; run via
  `npx tsx scripts/qa-simulation.ts`. Good CI smoke check independent of the Vitest suite (different
  failure mode: it write-checks the *documented* formulas, e.g. "one dead vote costs exactly 18
  points pre-decay," rather than just relative comparisons).
- **`tests/integration/reports-flow.test.ts`** (not yet created, recommended) — Vitest tests that
  spin up a temp SQLite DB, run the real route handlers (or hit a locally-started `next dev`
  server), and assert the 17 integration-test-list items in §3 as automated assertions instead of
  manual `curl`.
- **`tests/integration/moderation-flow.test.ts`** (not yet created, recommended) — admin
  approve/reject + the suppress-then-recover-status round trip flagged in §5.
- **`tests/alerts-live.test.ts`** (not yet created, recommended) — once the §5 alert-threshold gap
  is resolved, add a live-scoring test that pushes a lead over `ALERT_THRESHOLD` via confirm votes
  and asserts an `Alert` row is actually created (today's alert tests only cover the pure
  `shouldCreateAlert`/`pickNearbyRecipients` functions, not the end-to-end fan-out).

## 7. Environment / setup notes for whoever runs this next

- `npm install && npx prisma generate && npx prisma migrate dev --name init && npx prisma db seed`
  (or just `npm run setup`) gets a clean local DB with 5 users / 4 retailers / 8 stores / 12
  products / 10 reports / 7 votes / 3 alerts / 1 route plan.
- No paid external services required — SQLite file DB, mock auth via cookie, mock alerts (DB rows
  only, no real push/email). Matches `CLAUDE.md`'s MVP boundary.
- `npm run verify` (lint + typecheck + test + build) all pass as of this session.
