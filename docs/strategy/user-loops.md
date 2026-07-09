# PennyForge — User Loops

## The flywheel

PennyForge has no single "core loop" — it has seven, and the point of the product is that they
chain into one flywheel instead of standing alone. A user finds a lead, verifies the exact product,
proves it with evidence, the system ranks that proof into a confidence score, high-confidence leads
alert nearby shoppers, shoppers route to the store, and the resulting confirm/dead votes reward (or
penalize) the original reporter's trust score — which then feeds straight back into how much weight
their *next* report gets in the rank step. Nothing here is a one-shot transaction. Every loop's
output is the next loop's input, and the last loop's output (trust) is the first loop's input
(what gets surfaced and how it's weighted). A Discord channel or a static lookup list has no
equivalent feedback path: a post there is either believed or not, once, by whoever happens to be
scrolling at the time.

```
        ┌───────────────────────────────────────────────────────────────┐
        │                                                                │
        ▼                                                                │
 1. FIND ──▶ 2. VERIFY ──▶ 3. PROVE ──▶ 4. RANK ──▶ 5. ALERT ──▶ 6. ROUTE │
   (feed)      (search)    (report)     (score)     (fan-out)    (trip)  │
        ▲                                              │                │
        │                                              ▼                │
        └───────────────────────── 7. REWARD ◀── confirm/dead votes ────┘
                                  (trust score, leaderboard)
```

| # | Loop | Input | Output | Feeds into |
|---|------|-------|--------|------------|
| 1 | Find | filter state/retailer/store/min-confidence | ranked list of live leads | Verify (pick a lead) or Prove (nothing found, go report) |
| 2 | Verify | UPC / SKU / name query | matched product + its active leads | Prove (no lead yet) or Rank (confirm what's there) |
| 3 | Prove | price, store, evidence type, source type, notes | new `Report` row, `PENDING` | Rank (score gets computed) |
| 4 | Rank | evidence base + trust bonus + confirms − deads, decayed | confidence score 0–100 | Alert (threshold gate) and Route (expected-value input) |
| 5 | Alert | score ≥ threshold + nearby recipients | deduped `Alert` rows in inboxes | Route (drives the trip) |
| 6 | Route | ranked leads per store, distance from home | ranked stores, saved trip plans | Find/Prove (the trip itself generates new finds and reports) |
| 7 | Reward | confirm/dead votes on a user's reports | trust score delta, leaderboard rank | Rank (trust bonus on the *next* report) and Find (higher-trust reporters' future leads carry more weight) |

Loop 7 closing back into loop 4 (and, downstream, loop 1's ranking) is the mechanism the rest of
this document keeps coming back to — see "Why the closed loop is the moat" at the end.

## 1. Find

**Job to be done.** A casual penny hunter or serious clearance shopper opens the app wanting "what's
live near me right now," without committing to a specific product first.

**Shipped mechanics.** `app/page.tsx` renders the local feed via `getFeedLeads` (`lib/leads.ts`),
filterable by state, retailer, store, and a minimum-confidence dropdown (`Any` / `25+` / `50+` /
`75+`). The query restricts to `status IN (PENDING, APPROVED)` — suppressed and rejected reports are
excluded outright, not just deprioritized — and results are sorted by computed confidence score
descending. Each `LeadCard` (`components/LeadCard.tsx`) shows the deal-type badge, price vs. MSRP,
`ConfidenceBadge` score, evidence type label, confirm/dead counts, and reporter handle with trust
score, so a shopper is triaging on proof strength before they click in.

**Why defensible.** The feed's ranking and even its membership (suppressed leads are invisible, not
just downranked) are functions of the trust graph built by loops 4 and 7. A scraped or copy-pasted
feed can show *that* an item existed; it cannot show a live, decaying, community-checked confidence
score, because that score is computed from this app's own confirm/dead history and per-reporter
trust — data no outside feed has.

**Gap vs. ideal end-state.** The feed is a manual filter form, not a push-driven "near me right now"
experience — that's downstream of real push notifications (Phase 2, see the Alert section) and
precise location (still fuzzed per `docs/compliance.md`). No gap in the ranking logic itself; it's a
delivery-surface gap, not a scoring gap.

## 2. Verify

**Job to be done.** A shopper has a specific UPC, SKU, or product name in hand (from a shelf tag,
a tip, or their own memory) and wants to know if PennyForge already has active leads on it before
they report a duplicate.

**Shipped mechanics.** `app/search/page.tsx` runs a `contains` match across `upc`, `sku`, and `name`
on `Product`, joins each match's `PENDING`/`APPROVED` reports, and renders them with the same
`LeadCard` used in the feed. An empty result set prompts "No active leads for this product yet" —
the explicit cue to go prove one. This is a manual text input; there is no camera involved.

**Why defensible.** Verify is the funnel that prevents duplicate/noisy reporting: the same-day dedupe
constraint in loop 3 only works because loop 2 makes it easy to check "does this already exist"
before submitting. A Discord channel has no equivalent lookup — you're scrolling or asking, not
querying a structured product+evidence index.

**Gap vs. ideal end-state.** Camera barcode scanning is explicitly deferred; the search input is
already the exact code path a scanner would feed (`app/search/page.tsx` comment: "the same UPC/SKU
input a scanner would feed"). This lands in **Phase 2** per `docs/product-spec.md` roadmap.

## 3. Prove

**Job to be done.** The shopper is standing in the aisle (or just left) and wants to convert what
they saw into a durable, credible record — the actual proof event, not just a claim.

**Shipped mechanics.** `app/report/new/page.tsx` → `POST /api/reports`
(`app/api/reports/route.ts`). Order of operations: (1) `validateReportInput`
(`lib/compliance.ts`) rejects the request before any
DB write if `sourceType` isn't on the allowlist (`IN_STORE_OBSERVATION`, `RECEIPT_PURCHASE`,
`SHELF_TAG`, `STORE_FLYER_PUBLIC`), or if price isn't an integer in `[1, 500000]` cents, or if
`evidenceUrl` isn't a valid `http(s)` URL — unknown source strings are rejected the same as
known-blocked ones (`SCRAPED_SITE`, `PRIVATE_API`, `COMPETITOR_REPOST`, `AUTOMATED_TOOL`,
`EMPLOYEE_INTERNAL_SYSTEM`), because the policy is allowlist-not-denylist; (2) the product is
resolved or created, matched against the store's retailer by UPC/SKU/name first so a "new" product
report can't silently fork a duplicate `Product` row and dodge the dedupe key; (3) the `Report` row
is inserted with `reportDate` = UTC midnight (`lib/reports.ts#toReportDate`) — the DB's composite
`@@unique([productId, storeId, userId, reportDate])` constraint blocks a second report on the same
product+store+user same day, surfaced as a 409 ("You already reported this product at this store
today. Confirm the existing lead instead."); (4) the report is scored fresh (loop 4) and mock alerts
fan out if it clears threshold (loop 5).

**Why defensible.** The compliance guardrail is the literal implementation of hard boundary #7
(all data first-hand, in-store, UGC) — see `lib/compliance.ts` and `docs/compliance.md`. This is
the step a scraper-based competitor cannot replicate at all: there is no submission event, no reporter
identity, no evidence type to score, because there was never a human in the store. Gray-data
lookup tools have inventory *numbers*; they have no proof chain.

**Gap vs. ideal end-state.** `evidenceUrl` is a placeholder string field today, not a real upload —
file upload for receipts/photos is **Phase 1**. Receipt OCR-assisted price/date extraction on top of
that upload is **Phase 3**.

## 4. Rank

**Job to be done.** Every reader of a lead — casual browser, serious planner, reseller — needs a
single trustworthy number that answers "how likely is this real, right now" without reading a wall
of comments.

**Shipped mechanics (`lib/scoring.ts`, surfaced in full on `app/leads/[id]/page.tsx`'s "why this
lead scores X" breakdown table):**

```
score = clamp( round( (evidenceBase + trustBonus + confirmBonus − deadPenalty) × decayFactor ), 0, 100 )
```

- `evidenceBase` (`EVIDENCE_BASE`): `RECEIPT` 45, `SHELF_TAG_PHOTO` 32, `PRODUCT_PHOTO` 22,
  `TEXT_ONLY` 10.
- `trustBonus = round((clamp(reporterTrust, 0, 100) / 100) × 15)` — up to +15 (`TRUST_MAX_BONUS`).
- `confirmBonus = min(confirms × 12, 36)` — `CONFIRM_POINTS` 12 per distinct confirming user,
  capped at `CONFIRM_CAP` 36 (3 confirms).
- `deadPenalty = deads × 18` (`DEAD_PENALTY`), uncapped.
- `decayFactor = 0.5 ^ (effectiveAgeDays / halfLifeDays)`, half-life 7 days for `PENNY`, 14 for
  `CLEARANCE` (`HALF_LIFE_DAYS`); `effectiveAgeDays = min(ageDays, lastConfirmAgeDays)` when a
  confirmation exists, so a recent confirm resets the clock instead of the lead purely aging out.
- Suppression: `isSuppressed = deads >= 2 && deads > confirms` flips `status` to `SUPPRESSED`,
  saving the prior status to `previousStatus` so reversal (enough confirms later) restores the
  exact prior state instead of re-queuing an already-approved report for moderation
  (`app/api/reports/[id]/vote/route.ts`).

**Why defensible.** This score cannot be forged by an outside actor because every input — evidence
type on a real submission, trust score built from that specific user's vote history, confirms/deads
from other real accounts — lives inside PennyForge's own DB and transaction history. A lookup tool
scraping a retailer's stock feed has a boolean ("in stock" / "not"), never a confidence *gradient*
built from accumulated community behavior.

**Gap vs. ideal end-state.** Fraud/poisoned-submission detection beyond dead-vote suppression —
rate limiting, image-hash duplicate-photo detection, trust-graph anomaly detection — is explicitly
deferred with no phase number assigned yet in `docs/product-spec.md`; general fraud-detection
hardening is grouped into **Phase 3**.

## 5. Alert

**Job to be done.** A serious clearance shopper or reseller doesn't want to poll the feed — they
want to be told the moment a high-confidence lead appears near them, without getting buried in
noise the way an unfiltered Discord channel buries everything.

**Shipped mechanics (`lib/alerts.ts`, fan-out logic embedded in `POST /api/reports`, inbox at
`app/alerts/page.tsx`):**

```
recipients        = pickNearbyRecipients(allUsers, reporterId, store, ALERT_RADIUS_MILES)
                     // excludes the reporter and anyone without home coordinates
shouldCreateAlert  = score >= ALERT_THRESHOLD (60)
                     && no alert already sent to THIS recipient for (productId, storeId)
                        within the last 24h (ALERT_DEDUPE_WINDOW_MS)
```

`ALERT_RADIUS_MILES` is 75, measured via `haversineMiles` (`lib/geo.ts`). Dedupe is scoped per
*recipient*: every qualifying nearby user still gets alerted once each, but no single user gets
more than one alert for the same (product, store) pair inside a 24h window no matter how many
reports land on it. Alerts render as DB rows with `readAt`/unread state and a `MarkReadButton`;
delivery is fully mock — no push, email, or SMS in the MVP.

**Why defensible.** The threshold-plus-dedupe design is the mechanical version of "not random
Discord chaos": it requires both a real confidence score (loop 4, which requires the trust graph
from loop 7) and a real distance calculation from verified home coordinates. A Discord ping has
neither a quality gate nor a dedupe window — the same lead gets reposted and re-argued
indefinitely.

**Gap vs. ideal end-state.** Real push/email/SMS delivery behind the same `shouldCreateAlert` gate
is **Phase 2** ("push notification delivery" in the roadmap). Quiet hours/digest mode and offline
in-store mode are explicitly deferred alert-UX refinements with no phase number assigned yet.

## 6. Route

**Job to be done.** Resellers and serious clearance shoppers need to know which specific trip is
worth the gas today, not just which stores have *some* lead.

**Shipped mechanics (`lib/route.ts` pure functions, DB assembly in `lib/routePlanner.ts`, UI at
`app/route/page.tsx`):**

```
expectedValue(store) = Σ over non-suppressed leads of estValue × (confidence / 100)
tripCost              = distanceMiles × 2 × costPerMile   (DEFAULT_COST_PER_MILE = $0.15/mile)
routeScore            = expectedValue − tripCost
```

`getRankedStoresForUser` pulls only `PENDING`/`APPROVED` reports per store (suppressed leads are
excluded before scoring even runs), computes `estValue` from `msrpCents` falling back to the paid
`priceCents`, and uses the user's `homeLat`/`homeLng` as the trip origin (falling back to a fixed
downtown-Atlanta point if unset). `rankStores` sorts by `routeScore` descending and **excludes any
store with `routeScore <= 0`** — the planner never recommends a trip that costs more in gas than its
expected haul. Plans can be saved (`POST /api/route-plans`) as a snapshot with a `totalScore` (sum
of ranked `routeScore`s) and rendered store-name sequence.

**Why defensible.** Route ranking is confidence-weighted, so a single well-verified $300 item can
outrank a closer store with a low-confidence lead on a similar item — that weighting only exists
because loop 4's score exists. A static list has a price and an address; it has no expected-value
math and no way to tell a shopper a trip isn't worth the drive.

**Gap vs. ideal end-state.** This is single-store ranking only, no multi-stop TSP ordering —
**Phase 3** ("multi-stop route optimization"). A reseller-specific profit calculator (resale value
minus cost minus gas, rather than MSRP-based expected value) is also **Phase 3**.

## 7. Reward

**Job to be done.** Local community contributors need their accuracy to matter — a track record
that makes their next report carry more weight and that's visible to the community, not just a
karma number that decays into the scrollback.

**Shipped mechanics.** Confirm/dead voting is one vote per (report, user), changeable
(`app/api/reports/[id]/vote/route.ts`); a reporter cannot vote on their own report. `TRUST_DELTA`
(`lib/scoring.ts`) is **+2** per confirmed vote received, **−3** per dead vote received — losses
outweigh gains so trust is harder to game than to lose. Because a voter can toggle their vote at
any time, the route applies only the *net* delta via `voteTrustDelta` (undo the old vote's delta,
apply the new one) rather than re-applying a full delta on every call, so repeated toggling can't
inflate or crater a reporter's trust. That update runs as a single atomic
`UPDATE ... SET trustScore = CASE ... END` SQL statement (clamped to `[0, 100]` in the same
statement) rather than a read-modify-write, specifically because a reporter can hold multiple
reports voted on concurrently in separate transactions — an atomic statement is the only way to
avoid a lost update across those transactions. Trust score is visible on `/leaderboard`
(`app/leaderboard/page.tsx`), sorted by trust score descending then approved-report count, alongside
total reports and confirms received.

**Why defensible.** This is the step that makes the whole system compounding rather than flat: trust
score is a first-class, per-user, DB-resident number built entirely from other real users' votes on
that person's real submissions. It feeds directly back into loop 4's `trustBonus` (up to +15 points
on every future report that same user files) — so a contributor's *history* literally raises the
starting confidence of their *next* report. No scraped or copy-pasted feed carries per-contributor
reputation at all, because it never had contributors in the first place.

**Gap vs. ideal end-state.** Today, moderator eligibility (who can approve/reject in
`app/api/reports/[id]/moderate/route.ts`) is gated on a static seeded `role` field
(`ADMIN`/`CAPTAIN`), checked directly — there is no code path yet that promotes a user to `CAPTAIN`
automatically once trust crosses a threshold, even though `docs/product-spec.md` frames trust as
feeding "moderator eligibility." Building out that dynamic promotion path, plus captain moderation
tooling generally and bounty missions for stale high-value leads, is **Phase 2**.

## Why the closed loop is the moat

The seven loops would each be replicable in isolation — any app can have a feed, a search bar, a
report form, a threshold alert, a distance-sorted list. What isn't replicable is loop 7 writing
back into loop 4, which writes back into loop 1's ranking and loop 5's alert weighting: trust
earned from confirm/dead votes on *this specific user's past reports* raises the starting
confidence of *their next report*, which changes what surfaces in the feed, what triggers an
alert, and what gets routed to. That's a compounding asset that lives entirely inside PennyForge's
own transaction history — a per-user trust score, a per-report vote ledger, a per-recipient
alert-dedupe history — none of which has any equivalent in a source a competitor could scrape or
repost.

A Discord server's "trust" is social memory that resets every time someone new joins a channel and
has to scroll back (or just ask and get conflicting answers). A static gray-data lookup tool has no
concept of a contributor at all, so it has nothing to compound — every snapshot is only as good as
its last scrape, with no mechanism to get *better* over time or reward the people making it
accurate. PennyForge's flywheel gets more accurate, more current, and more personally weighted with
every trip through it, and that accumulated trust graph is the thing hard boundary #7 (first-hand
UGC only) exists to keep flowing legally and sustainably. Out-scraping PennyForge is possible in
principle; out-*trusting* it is not, because trust here is the recorded, load-bearing output of
real people's in-store verification of real people's prior reports.
