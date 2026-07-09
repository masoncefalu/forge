# PennyForge — Product Spec

## Positioning

"Waze for hidden clearance: receipt-verified local deal intelligence, not random Discord chaos."
The durable wedge is trust, proof, routing, ROI, community, and compliance — not raw data volume.
Penny items are the viral hook; hidden clearance is the durable business; receipt proof and route
ROI are the retention loops that outlast a single viral find.

## Personas

1. **Casual penny hunters** — browse the feed for fun, low commitment, price-sensitive.
2. **Serious clearance shoppers** — plan trips around hidden-clearance leads, want ROI clarity.
3. **Resellers** — need profit math (resale value − cost − gas), want the route planner most.
4. **Local community contributors** — post finds regularly, care about trust score and recognition.
5. **Regional captains / trusted moderators** — high-trust users who moderate their area's queue.
6. **Admins/moderators** — full moderation queue access, policy enforcement.

## Core user loops

1. **Find** — open the local feed filtered by state/ZIP/store (`app/page.tsx`).
2. **Verify** — search a UPC/SKU/name manually to check a specific product (`app/search/page.tsx`).
3. **Prove** — submit a report with price, store, evidence type, and source type
   (`app/report/new/page.tsx` → `POST /api/reports`).
4. **Rank** — the confidence score updates from evidence strength, reporter trust, confirmations,
   dead votes, and freshness decay (`lib/scoring.ts`).
5. **Alert** — high-signal leads fan out as deduped alerts (`lib/alerts.ts`, `app/alerts/page.tsx`).
6. **Route** — the route planner ranks stores by expected value vs. gas cost
   (`lib/route.ts`, `app/route/page.tsx`).
7. **Reward** — contributors build trust score, visible on `/leaderboard`; trust score currently
   feeds directly into confidence scoring and moderator eligibility.

## MVP scope (built)

- Local feed with state / retailer / store / min-confidence filters.
- Manual UPC/SKU/name search.
- Report submission: existing or new product, price, deal type, evidence type, source type,
  placeholder evidence URL, notes.
- Compliance guardrail blocking unsafe source types before any DB write.
- Same-day duplicate report prevention (one report per product+store+user+day).
- Confidence scoring with full breakdown shown on the lead detail page ("why this lead scores X").
- Expiry: leads past 4 half-lives of effective age (PENNY: 28 days, CLEARANCE: 56 days) are
  treated as `EXPIRED` and dropped from the feed and route planner. This is a derived, read-time
  status computed from the existing decay math (`lib/reports.ts#isExpired`) — no background job,
  and the DB row's `status` is never rewritten to `EXPIRED`.
- Confirm/dead voting (one vote per user per report, changeable), with dead-vote suppression.
- Mock alert fan-out, deduped per (product, store) per 24h window, with a read/unread inbox.
- Route planner: expected value (est. value × confidence) minus round-trip gas cost, ranked, with
  negative-ROI trips excluded.
- Saved route plans.
- Admin moderation queue (approve/reject), gated to ADMIN/CAPTAIN roles via mock auth.
- Contributor leaderboard (trust score, reports, approvals, confirmations received).
- Seed data covering GA/FL/TX stores across Home Depot, Lowe's, Dollar General, and Walmart.

## Explicitly deferred (not in MVP — do not build prematurely)

- **Real authentication** — mock cookie-based user switcher stands in for NextAuth/Clerk/etc.
  Swap point: `lib/currentUser.ts`.
- **Camera barcode scanning** — the search page already accepts the same UPC/SKU input a scanner
  would feed; add a scanning library (e.g. a maintained ZXing/QuaggaJS wrapper) as a client
  component that fills the same search input.
- **Receipt OCR** — evidence is a placeholder URL today; OCR-assisted price/date extraction is a
  post-MVP enhancement once real file upload exists.
- **Real push notifications / email / SMS** — alerts are DB rows rendered on `/alerts`. Swap point:
  `lib/alerts.ts` + a notification-delivery service behind the same `shouldCreateAlert` gate.
- **Postgres/Supabase migration** — swap `datasource` provider + `DATABASE_URL` once concurrent
  writes or hosted deployment require it; the schema was written to avoid SQLite-only constructs
  other than the documented `reportDate` workaround.
- **Multi-stop route optimization (TSP)** — the MVP ranks single-store trips only.
- **Native mobile app** — web-first; a wrapped PWA or native shell is a later phase.
- **Bilingual UX** — `User.locale` exists in the schema (en/es seeded) but no i18n framework is
  wired up yet.
- **Fraud/poisoned-submission detection beyond dead-vote suppression** — rate limiting, image
  hashing for duplicate photo detection, and anomaly detection on trust-graph manipulation.
- **Quiet hours / digest mode, offline in-store mode** — alert UX refinements.

## Roadmap phases

1. **Phase 0 (this repo)** — local SQLite MVP, mock auth, mock alerts, single-store routing.
2. **Phase 1** — real auth, file upload for evidence (receipts/photos), Postgres migration.
3. **Phase 2** — camera barcode scanning, push notification delivery, captain moderation tools,
   bounty missions for stale high-value leads.
4. **Phase 3** — receipt OCR, multi-stop route optimization, reseller profit calculator, bilingual
   UX, fraud detection hardening.
5. **Phase 4** — native app shell, paid tier rollout, regional captain program at scale.
