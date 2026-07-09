# PennyForge — Data Model & Scoring Packet

Compressed data-model and scoring reference for downstream consumers (originally commissioned as
a handoff for "Agent 11") who need the exact contracts — schema shapes, constants, formulas,
dedupe/suppression rules — without reading through `prisma/schema.prisma` and `lib/*.ts`
themselves. Every number in this doc is copied from source, not approximated. Source of truth
remains the code — see `docs/scoring.md` and `docs/compliance.md` for the narrative version of the
scoring/compliance sections.

## 1. Schema summary

8 models, SQLite via Prisma (`prisma/schema.prisma`). Enum-like string columns are validated at
the app layer against `lib/constants.ts` (SQLite/Prisma has no native enum).

| Model | Key fields | Relations | Unique / index constraints |
|---|---|---|---|
| `User` | `id`, `email`, `handle`, `role` (default `USER`), `trustScore` (default `50`, 0..100), `homeZip`/`homeLat`/`homeLng`, `locale` (default `en`) | has many `Report`, `ReportVote`, `Alert`, `RoutePlan` | `@unique email`, `@unique handle` |
| `Retailer` | `id`, `name`, `slug` | has many `Store`, `Product` | `@unique name`, `@unique slug` |
| `Store` | `id`, `retailerId`, `name`, `storeNumber?`, `address?`, `city`, `state` (2-letter), `zip`, `lat`, `lng` | belongs to `Retailer`; has many `Report`, `Alert` | `@@index([state, zip])` |
| `Product` | `id`, `retailerId`, `name`, `upc?`, `sku?`, `category?`, `msrpCents?` (route ROI input), `imageUrl?` | belongs to `Retailer`; has many `Report`, `Alert` | `@@index([upc])`, `@@index([sku])` |
| `Report` | `id`, `productId`, `storeId`, `userId`, `priceCents`, `dealType`, `evidenceType`, `evidenceUrl?`, `sourceType`, `status` (default `PENDING`), `previousStatus?`, `notes?`, `reportDate`, `createdAt` | belongs to `Product`/`Store`/`User`; has many `ReportVote`, `Alert` | `@@unique([productId, storeId, userId, reportDate])`; `@@index([storeId, status])`; `@@index([productId, storeId])` |
| `ReportVote` | `id`, `reportId`, `userId`, `vote`, `createdAt` | belongs to `Report`/`User` | `@@unique([reportId, userId])` — one vote per user per report, vote can be changed (upsert) |
| `Alert` | `id`, `productId`, `storeId`, `reportId?` (nullable), `userId` (recipient), `score` (confidence at alert time), `message`, `createdAt`, `readAt?` | belongs to `Product`/`Store`/`User`; optionally belongs to `Report` | `@@index([userId, createdAt])`; `@@index([productId, storeId, createdAt])` (dedupe window lookups) |
| `RoutePlan` | `id`, `userId`, `name`, `stopsJson` (JSON array of `{storeId, storeName, distanceMiles, expectedValue, routeScore}`), `totalScore`, `createdAt` | belongs to `User` | none beyond PK |

**`Report.reportDate` and its unique constraint** — SQLite prohibits expressions inside
table-level `UNIQUE` constraints, so `UNIQUE(product_id, store_id, user_id, date(created_at))` is
a syntax error ("expressions prohibited in PRIMARY KEY and UNIQUE constraints"). The schema
instead stores a real `reportDate` column — the UTC calendar date at midnight, set by
`lib/reports.ts#toReportDate` — and enforces same-day duplicate prevention with:

```prisma
@@unique([productId, storeId, userId, reportDate])
```

Do not "simplify" this back to a `date()` expression — verified directly against `sqlite3`, see
`CLAUDE.md`.

## 2. Enum-name mapping

The commissioning task spec used generic names for evidence/status/vote enums. The actual
implementation (`lib/constants.ts`) uses different concrete names — this table is the
disambiguation key.

| Spec name | Implemented name | Notes |
|---|---|---|
| NONE (evidence) | `TEXT_ONLY` | floor evidence weight, base 10 |
| PHOTO (evidence) | `PRODUCT_PHOTO` | base 22 |
| SHELF_TAG (evidence) | `SHELF_TAG_PHOTO` | base 32 |
| RECEIPT (evidence) | `RECEIPT` | unchanged, base 45 (highest) |
| PENDING (status) | `PENDING` | unchanged, default on creation |
| PUBLISHED (status) | `APPROVED` | unchanged semantics |
| REJECTED (status) | `REJECTED` | unchanged |
| SUPPRESSED (status) | `SUPPRESSED` | vote-driven only (`isSuppressed`) — never set directly by a moderator |
| EXPIRED (status) | `EXPIRED` (derived, not stored) | see §14. In `lib/constants.ts#REPORT_STATUSES`; computed at read time via `lib/reports.ts#isExpired()`, never written to the `Report.status` column; excluded from `MODERATABLE_STATUSES` |
| CONFIRMED (vote) | `CONFIRMED` | unchanged |
| DEAD (vote) | `DEAD` | unchanged |

Current `lib/constants.ts` arrays:

```ts
ROLES              = ["USER", "CAPTAIN", "ADMIN"]
DEAL_TYPES         = ["PENNY", "CLEARANCE"]
EVIDENCE_TYPES     = ["RECEIPT", "SHELF_TAG_PHOTO", "PRODUCT_PHOTO", "TEXT_ONLY"]
REPORT_STATUSES    = ["PENDING", "APPROVED", "REJECTED", "SUPPRESSED", "EXPIRED"]
MODERATABLE_STATUSES = ["APPROVED", "REJECTED"]
VOTE_TYPES         = ["CONFIRMED", "DEAD"]
```

## 3. Confidence score formula

```
score = clamp( round( (evidenceBase + trustBonus + confirmBonus − deadPenalty) × decayFactor ), 0, 100 )

evidenceBase   = EVIDENCE_BASE[evidenceType]                     // §5
trustBonus     = round( (clamp(reporterTrust, 0, 100) / 100) × 15 )
confirmBonus   = min(confirms × 12, 36)
deadPenalty    = deads × 18                                       // uncapped
decayFactor    = 0.5 ** (effectiveAgeDays / HALF_LIFE_DAYS[dealType])
effectiveAgeDays = lastConfirmAgeDays != null ? min(ageDays, lastConfirmAgeDays) : ageDays
```

Constants (all from `lib/scoring.ts`): `TRUST_MAX_BONUS = 15`, `CONFIRM_POINTS = 12`,
`CONFIRM_CAP = 36`, `DEAD_PENALTY = 18`, `HALF_LIFE_DAYS = { PENNY: 7, CLEARANCE: 14 }`.

**Worked example 1** — fresh receipt report, default (unknown) reporter trust, no votes:
`evidenceType=RECEIPT, reporterTrust=50, confirms=0, deads=0, ageDays=0, dealType=PENNY`.
`base=45, trustBonus=round(7.5)=8, confirmBonus=0, deadPenalty=0, decayFactor=1` →
`raw=53 → final=53`.

**Worked example 2** — 1-day-old receipt report, trust=72, 2 confirms (latest 0.2 days old),
`dealType=PENNY`: `base=45, trustBonus=round(10.8)=11, confirmBonus=min(24,36)=24,
deadPenalty=0`, `effectiveAgeDays=min(1, 0.2)=0.2`, `decayFactor=0.5^(0.2/7)≈0.9804`,
`raw=80 → final=round(80×0.9804)=78`.

## 4. Evidence weights (`EVIDENCE_BASE`)

| Evidence type | Base points |
|---|---|
| `RECEIPT` | 45 |
| `SHELF_TAG_PHOTO` | 32 |
| `PRODUCT_PHOTO` | 22 |
| `TEXT_ONLY` | 10 |

## 5. Reporter trust formula

```ts
TRUST_DELTA = { CONFIRMED: 2, DEAD: -3 }

applyTrustDelta(current, vote)         = clamp(current + TRUST_DELTA[vote], 0, 100)
voteTrustDelta(oldVote, newVote)       = oldVote === newVote ? 0
                                        : (oldVote ? -TRUST_DELTA[oldVote] : 0) + TRUST_DELTA[newVote]
applyVoteChange(trust, oldVote, newVote) = clamp(trust + voteTrustDelta(oldVote, newVote), 0, 100)
```

`ReportVote` is one row per `(reportId, userId)` — a voter can change or resubmit their vote at
any time via upsert. `voteTrustDelta` computes the **net** delta (undo the old vote's effect, if
any, then apply the new one) rather than re-applying `applyTrustDelta` on every call:

- Resubmitting the same vote is a no-op (delta `0`) — prevents a single user from repeatedly
  toggling a vote to inflate or crater a reporter's trust.
- Switching `CONFIRMED → DEAD` (or vice versa) nets to a single signed delta equivalent to
  reverting then applying, because revert and apply always move in the same direction for a
  2-valued vote — safe to clamp once at the end.
- This net-delta form is also safe to apply as an atomic single-statement DB update (the vote
  route uses a raw `UPDATE ... SET trustScore = CASE WHEN ... END` clamp) instead of a
  read-modify-write, closing a race where two votes on two different reports by the same reporter
  could each read a stale starting `trustScore`.

Boundary clamping example: `applyVoteChange(1, "CONFIRMED", "DEAD")` clamps the revert step at 0
before applying the new `-3`, landing at `0` (not `-2`).

## 6. Age decay / half-life

```
decayFactor = 0.5 ** (effectiveAgeDays / HALF_LIFE_DAYS[dealType])
effectiveAgeDays = lastConfirmAgeDays != null ? min(ageDays, lastConfirmAgeDays) : ageDays
```

| Deal type | Half-life (days) |
|---|---|
| `PENNY` | 7 |
| `CLEARANCE` | 14 |

Penny items get pulled/corrected fast once a store notices; clearance tends to sit for weeks. A
recent `CONFIRMED` vote refreshes the effective age — `lastConfirmAgeDays` is the age (in days) of
the most recent `CONFIRMED` vote, and `effectiveAgeDays` takes the *minimum* of the report's own
age and that value, so community re-verification keeps a decaying lead's score elevated without
resetting confirm/dead counts. `ageInDays(from, now)` floors at `0` (never negative).

## 7. Dead-vote suppression

```ts
isSuppressed({ confirms, deads }) = deads >= 2 && deads > confirms
```

Requires **both** conditions — a raw `deads >= 2` count alone is not sufficient if confirms have
kept pace (e.g. `confirms=3, deads=2` is *not* suppressed). This is enforced in the vote-status
transition logic (`lib/voteStatus.ts` / inline in the vote route, `app/api/reports/[id]/vote/route.ts`
in this worktree) on every vote upsert:

- If newly suppressed and the report wasn't already `SUPPRESSED`: `status → SUPPRESSED`, and the
  status held immediately before (`PENDING`/`APPROVED`/`REJECTED`) is saved to
  `Report.previousStatus`.
- If no longer suppressed (enough confirms arrived) and the report is currently `SUPPRESSED`:
  `status → previousStatus ?? "PENDING"`, and `previousStatus → null`.

This means suppression reversal restores the exact prior state (e.g. an already-`APPROVED` report
comes back `APPROVED`, not reset to `PENDING`), so a report never re-enters the moderation queue
just because it was briefly suppressed. The moderation endpoint
(`app/api/reports/[id]/moderate/route.ts`) additionally refuses to `APPROVE` a report that is
currently suppressed by vote count or already past its expiry threshold (§13), to avoid a
moderator action silently overriding community dead-vote signal or approving a report that would
just be filtered right back out of the feed.

## 8. Store freshness score

`storeFreshnessScore` (`lib/scoring.ts`) is a pure, unit-tested function with no current UI
consumer — it's implemented and available for a future feed/store badge, not yet rendered
anywhere.

```ts
export interface FreshnessInput {
  evidenceType: EvidenceType;
  ageDays: number;
  dealType: DealType;
  lastConfirmAgeDays?: number | null;
}
export function storeFreshnessScore(leads: FreshnessInput[]): number
```

```
effectiveAgeDays  = same rule as confidence scoring (§6) — confirm-refresh applies per lead
decayFactor(lead) = 0.5 ** (effectiveAgeDays / HALF_LIFE_DAYS[dealType])
storeScore        = round(100 × max(decayFactor across all leads))   // clamped [0, 100]; 0 for no leads
```

This is a **display/feed metric only** — e.g. a "how fresh is this store's data" badge — and is
**not** folded into route scoring (§9). Route score already embeds age indirectly via each lead's
own decayed `confidence`; multiplying a store-level freshness factor into `expectedValue` again
would double-count age decay.

## 9. Route score formula

```
expectedValue(store) = Σ over non-suppressed leads of estValue × (confidence / 100)
tripCost              = distanceMiles × 2 × costPerMile      // round-trip, default $0.15/mile
routeScore            = expectedValue − tripCost
```

- `estValue` is dollars (product `msrpCents`, falling back to the reported `priceCents` if no
  MSRP is known — see `lib/routePlanner.ts`).
- `confidence` is each lead's `scoreBreakdown(...).final` (0..100), so route score already embeds
  age indirectly through the lead's own decay — there is no separate age term at the route level.
- `rankStores` filters to `routeScore > 0` (a trip that costs more in gas than its expected haul
  is never recommended) and sorts descending by `routeScore`.
- `DEFAULT_COST_PER_MILE = 0.15`. Single-store ranking only — no multi-stop TSP ordering yet.

## 10. Alert dedupe rules

```
shouldCreateAlert = score >= ALERT_THRESHOLD (60)
                    && no existing alert to THIS recipient for (productId, storeId)
                       created within the last ALERT_DEDUPE_WINDOW_MS (24h)
```

- `ALERT_THRESHOLD = 60`, `ALERT_DEDUPE_WINDOW_MS = 24 * 3600 * 1000`, `ALERT_RADIUS_MILES = 75`.
- Recipients: `pickNearbyRecipients(users, reporterId, store, radiusMiles)` excludes the reporter
  and any user with no `homeLat`/`homeLng`, and keeps users within `radiusMiles` via
  `haversineMiles` (`lib/geo.ts`, Earth radius 3958.8 mi).
- Dedupe key is **(productId, storeId)**, scoped **per recipient** — callers pass only that
  recipient's own prior alerts into `shouldCreateAlert`. Each qualifying nearby user still gets
  alerted once even though the (product, store) pair itself can recur across many reports; the
  window just prevents the same user being re-alerted on the same pair within 24h.
- Fan-out is mock/synchronous in the MVP — `Alert` rows are created directly and rendered at
  `/alerts`; no real push/email.

## 11. Duplicate same-day report prevention

Three-layer defense against the same user reporting the same product at the same store twice in
one UTC calendar day:

1. **Schema constraint** — `@@unique([productId, storeId, userId, reportDate])` on `Report`
   (§1). This is the actual source of truth; everything else is a courtesy layer around it.
2. **App-level key** — `toReportDate(d)` truncates any timestamp to UTC midnight;
   `makeDupKey(productId, storeId, userId, reportDate)` produces a
   `` `${productId}|${storeId}|${userId}|${YYYY-MM-DD}` `` string mirroring the DB constraint, for
   any app-layer pre-check logic.
3. **Error detection** — `isUniqueViolation(err)` checks for Prisma's `P2002` error code so
   `POST /api/reports` can catch the DB-level rejection and return a friendly `409` ("You already
   reported this product at this store today...") instead of a raw 500.

`reportDate` is set once at report creation time (`toReportDate(now)`) and is never recomputed
from `createdAt` later.

## 12. Unsafe data source blocking (compliance)

Allowlist model — `lib/compliance.ts`. Per `CLAUDE.md` hard boundary #6, unknown source strings
are rejected by default; safety is opt-in, not opt-out.

```ts
ALLOWED_SOURCE_TYPES = [
  "IN_STORE_OBSERVATION", // shopper saw it on the shelf / at register
  "RECEIPT_PURCHASE",     // shopper bought it and has the receipt
  "SHELF_TAG",            // shopper photographed the shelf/clearance tag
  "STORE_FLYER_PUBLIC",   // public printed/posted store flyer or signage
]

BLOCKED_SOURCE_TYPES = [
  "SCRAPED_SITE",              // scraping retailer or competitor sites
  "PRIVATE_API",               // undocumented/private retailer endpoints
  "COMPETITOR_REPOST",         // reposting paid competitor feeds/lists
  "AUTOMATED_TOOL",            // bot-generated inventory probes
  "EMPLOYEE_INTERNAL_SYSTEM",  // data pulled from internal retailer systems
]
```

`assertSafeSource(sourceType)` throws `ComplianceError` for anything in `BLOCKED_SOURCE_TYPES`
(specific "why blocked" message) **and** for anything not in `ALLOWED_SOURCE_TYPES` (generic
"unknown source type" message) — i.e. a novel string nobody has classified yet is rejected exactly
like a known-bad one, not silently admitted. `validateReportInput` also enforces price bounds
(`MIN_PRICE_CENTS = 1`, `MAX_PRICE_CENTS = 500_000`, integer only) and evidence-URL scheme
(`http:`/`https:` only, when a URL is provided). All three checks run before the DB is touched;
`POST /api/reports` maps a `ComplianceError` to HTTP `422`.

## 13. Expiry (derived lifecycle state)

```ts
export const EXPIRY_HALF_LIVES = 4;
export function isExpired(effectiveAgeDays: number, dealType: DealType): boolean {
  return effectiveAgeDays >= EXPIRY_HALF_LIVES * HALF_LIFE_DAYS[dealType];
}
```

At 4 half-lives, `decayFactor` is down to `0.5^4 = 1/16 ≈ 0.0625` of base — the cutoff is a
"functionally dead for scoring purposes" threshold, not a magic number.

| Deal type | Half-life | Expiry (effective-age days) |
|---|---|---|
| `PENNY` | 7 | 28 |
| `CLEARANCE` | 14 | 56 |

Purely derived at read time — no background job, no write to `Report.status` or any other column.
`EXPIRED` is added to `REPORT_STATUSES` (§2) but intentionally excluded from
`MODERATABLE_STATUSES`, since a moderator cannot set or unset it. `LeadView#expired`
(`lib/leads.ts#toLeadView`) computes this once per lead and is used to exclude expired leads from
the feed (`getFeedLeads`), UPC/SKU search (`app/search/page.tsx`), and route planning
(`lib/routePlanner.ts`) — the same way `SUPPRESSED` leads already are — and to block the
moderation endpoint from approving an already-expired report (§7). `getLeadById` (the lead detail
page) does not filter it out — an old link (e.g. from a past alert) still resolves, with the page
showing an "Expired" indicator instead of a 404.

## 14. Test inventory

9 suites.

| Suite | Status | Covers |
|---|---|---|
| `tests/scoring.test.ts` | present | evidence-weight ordering, confirm cap, trust bonus, score clamping, half-life decay, confirm-refresh, dead penalty, `isSuppressed`, `applyTrustDelta`, net `applyVoteChange` upsert/no-double-count/boundary-clamp behavior |
| `tests/route.test.ts` | present | confidence-weighted expected value, suppressed-lead exclusion, gas-cost subtraction, far-but-high-value vs. close-but-low-value ranking, non-positive-ROI trip exclusion |
| `tests/alerts.test.ts` | present | threshold gating, 24h dedupe (same pair), re-alert after window, no cross-dedupe across different product/store pairs, radius fan-out inclusion/exclusion, reporter self-exclusion, missing-coordinates exclusion, custom radius override |
| `tests/reports.test.ts` | present | `toReportDate` UTC truncation, `makeDupKey` equality/inequality across day boundary and user, `isUniqueViolation` P2002 detection |
| `tests/compliance.test.ts` | present | allowlist acceptance, blocklist rejection, unknown-source rejection (allowlist-not-denylist), full-input rejection on blocked source, price bounds, evidence URL scheme, valid-input acceptance |
| `tests/freshness.test.ts` | present | `storeFreshnessScore` — max-decay-across-leads selection, confirm-refresh per lead, clamping, empty-leads-array → 0 |
| `tests/expiry.test.ts` | present | `isExpired` threshold behavior per deal type (28d PENNY / 56d CLEARANCE), `REPORT_STATUSES`/`MODERATABLE_STATUSES` membership |
| `tests/contracts.test.ts` | present | exact-literal pins for every scoring/alert/route/compliance constant and enum array, plus hand-computed worked-example confidence scores |
| `tests/vote-status.test.ts` | present | extracted vote-status transition logic (§7) — suppress/unsuppress, `previousStatus` save-and-restore |

## 15. Edge cases

- Confirm bonus saturates at 3 confirms (`CONFIRM_CAP = 36`); a 4th+ confirm adds nothing further
  to `confirmBonus`.
- Dead penalty (`deads × 18`) is **uncapped** — many dead votes can drive the raw pre-decay score
  arbitrarily negative before the final `clamp(..., 0, 100)`.
- Decay is exponential and asymptotic — `decayFactor` never hits exactly `0` for finite age, but
  `Math.round(raw × decayFactor)` rounds down to a displayed score of `0` well before that.
- Suppression requires **both** `deads >= 2` **and** `deads > confirms` — a raw dead-vote count
  alone (e.g. `confirms=3, deads=2`) does not suppress.
- Trust upsert must use the **net** delta (`voteTrustDelta`) — re-running `applyTrustDelta` per
  vote call instead would let a single user inflate/crater a reporter's trust by toggling votes.
- Self-voting is blocked at the **API layer** (`app/api/reports/[id]/vote/route.ts`, HTTP `403`),
  not inside the pure `lib/scoring.ts` functions — the pure functions have no concept of "whose
  report this is."
- `Alert.reportId` is nullable with `ON DELETE SET NULL` semantics at the Prisma relation level —
  alerts can outlive the report that triggered them.
- Route ranking excludes stores with non-positive `routeScore` (gas cost ≥ expected value).
- Price bounds: 1¢ to $5,000 (`500_000` cents), integer only.
- Evidence URLs must be `http:` or `https:` — anything else (or an unparseable URL) is rejected
  when a URL is supplied; the field itself is optional.
- A moderator cannot `APPROVE` a report that is currently community-suppressed by dead votes
  (`app/api/reports/[id]/moderate/route.ts` returns `409`); `REJECTED` remains allowed regardless.
- The vote route wraps its read+write sequence in a single `prisma.$transaction` to prevent lost
  updates on concurrent votes on the *same* report, and separately applies the trust-score change
  as a single atomic SQL `UPDATE ... SET trustScore = CASE WHEN ... END` statement (not
  read-modify-write) to stay correct even when the same reporter's trust is touched by concurrent
  votes landing on two *different* reports in two separate transactions.

## 16. API surface

| Route | Method | Key `lib/*` calls |
|---|---|---|
| `/api/user` | `POST` | sets `pf_user_id` cookie (`lib/currentUser.ts#USER_COOKIE`) after validating the user exists |
| `/api/reports` | `POST` | `lib/compliance.ts#validateReportInput`, `lib/reports.ts#toReportDate`/`isUniqueViolation`, `lib/scoring.ts#confidenceScore`, `lib/alerts.ts#pickNearbyRecipients`/`shouldCreateAlert`/`ALERT_DEDUPE_WINDOW_MS` |
| `/api/reports/[id]/vote` | `POST` | `lib/scoring.ts#isSuppressed`/`voteTrustDelta`, `lib/constants.ts#VOTE_TYPES` |
| `/api/reports/[id]/moderate` | `POST` | `lib/scoring.ts#isSuppressed`, `lib/constants.ts#MODERATABLE_STATUSES` |
| `/api/route-plans` | `POST` | `lib/routePlanner.ts#getRankedStoresForUser` → `lib/route.ts#rankStores` |
| `/api/alerts/[id]/read` | `POST` | none (direct `prisma.alert.update`, ownership-checked) |

Server components (feed, moderation queue, route planner pages) fetch data directly via
`lib/leads.ts` (`getFeedLeads`, `getModerationQueue`, `toLeadView`) and `lib/routePlanner.ts`
rather than calling these API routes — the routes exist for client-component interactivity
(voting, report submission, moderation actions, saving a route plan) per `CLAUDE.md`'s
server-component/client-component split.
