# PennyForge — Scoring & Route Algorithms

Source of truth: `lib/scoring.ts`, `lib/alerts.ts`, `lib/route.ts`. This doc explains the *why*;
the code is the exact spec.

## Confidence score

```
score = clamp( (evidenceBase + trustBonus + confirmBonus − deadPenalty) × decayFactor, 0, 100 )
```

### Evidence weights (`EVIDENCE_BASE`)

| Evidence type | Base points | Rationale |
|---|---|---|
| `RECEIPT` | 45 | Strongest possible proof — the shopper paid this price. |
| `SHELF_TAG_PHOTO` | 32 | Verifiable in-store signage, but not proof of an actual ring-up. |
| `PRODUCT_PHOTO` | 22 | Shows the product exists on shelf, no price confirmation. |
| `TEXT_ONLY` | 10 | Lowest trust — no visual evidence at all. |

### Reporter trust bonus

`trustBonus = round((clamp(trustScore, 0, 100) / 100) × 15)` — up to +15 points for a maximally
trusted reporter (trust score 100), scaling linearly. Trust score itself moves via
`applyTrustDelta`: **+2** per confirmed vote received, **−3** per dead vote received, clamped to
[0, 100]. Losses outweigh gains slightly so trust is harder to game than to lose.

### Community confirmation bonus

`confirmBonus = min(confirms × 12, 36)` — each distinct confirming user adds 12 points, capped at
3 confirms (36 points). The cap prevents brigading a single lead into an artificially high score.

### Dead-vote penalty

`deadPenalty = deads × 18` — uncapped. Dead votes are a stronger per-vote signal than confirms
(18 vs 12) because a "this is gone" report is usually more certain than "still here" (someone
physically checked and found nothing).

### Freshness decay

```
decayFactor = 0.5 ^ (effectiveAgeDays / halfLifeDays)
effectiveAgeDays = min(ageDays, lastConfirmAgeDays)   // if any confirmation exists
```

| Deal type | Half-life |
|---|---|
| `PENNY` | 7 days |
| `CLEARANCE` | 14 days |

Penny items get pulled/corrected fast once a store notices, so they decay twice as fast as
clearance items, which tend to sit for weeks. A **recent confirmation resets the effective age** —
community verification keeps a lead alive rather than each lead being purely age-gated. This is
lead half-life + automatic decay + dead-deal suppression working together, not three separate
systems.

### Suppression (dead-deal suppression)

```
isSuppressed = deads >= 2 && deads > confirms
```

Suppressed reports flip to `status = SUPPRESSED`, dropping out of the feed (`lib/leads.ts`
`getFeedLeads`), alerts, and the route planner (`lib/routePlanner.ts` only pulls
`PENDING`/`APPROVED`). Suppression reverses automatically if enough confirms arrive later — the
status held just before suppression is saved to `Report.previousStatus` and restored exactly
(e.g. an already-`APPROVED` report comes back as `APPROVED`, not `PENDING`), so reversal never
re-adds a previously-moderated report to the admin queue.

## Store freshness

```
storeFreshnessScore(leads) = clamp( round(100 × max over leads of decayFactor), 0, 100 )
decayFactor  = 0.5 ^ (effectiveAgeDays / halfLifeDays[dealType])
effectiveAgeDays = min(ageDays, lastConfirmAgeDays)   // if any confirmation exists
```

This is a **store-level display/feed metric** — "how fresh is the best-supported lead currently
active at this store" — not a per-report score and not a route-score input. It reuses the exact
same decay math as `scoreBreakdown` (same `HALF_LIFE_DAYS`, same confirm-refreshed effective age)
via a small shared helper, so a store's freshness always agrees with the freshest lead's own decay
factor. It is deliberately **not** wired into `lib/route.ts`'s `routeScore` — `expectedValue`
already discounts each lead by its own decayed confidence, so multiplying the whole store by
freshness again would double-count age.

Given `leads: FreshnessInput[]` (each an `{ evidenceType, ageDays, dealType, lastConfirmAgeDays? }`
view of an active, non-suppressed report at the store), the score takes the **maximum** decay
factor across leads, not an average — one very fresh lead is enough to make a store worth a look,
even if the rest of its leads are stale. An empty `leads` array (no active leads at the store)
returns `0`.

Worked examples:

- A single fresh `PENNY` lead (`ageDays: 0`) → `decayFactor = 0.5^0 = 1` → freshness `100`.
- A single `PENNY` lead at exactly its 7-day half-life (`ageDays: 7`) → `decayFactor = 0.5^1 = 0.5`
  → freshness `50`.
- A 30-day-old `PENNY` lead (`decayFactor = 0.5^(30/7) ≈ 0.051`) alongside a 10-day-old `CLEARANCE`
  lead (`decayFactor = 0.5^(10/14) ≈ 0.610`) → the store takes the max, so freshness ≈ `61`, driven
  entirely by the clearance lead even though it isn't the newest report by evidence strength.

## Alert quality controls

```
recipients        = pickNearbyRecipients(allUsers, reporterId, store, ALERT_RADIUS_MILES)
                     // excludes the reporter and anyone without home coordinates
shouldCreateAlert  = score >= ALERT_THRESHOLD (60)
                     && no alert already sent to THIS recipient for (productId, storeId)
                        within the last 24h
```

Fan-out targets users within `ALERT_RADIUS_MILES` (75mi default) of the reporting store, via
haversine distance (`lib/geo.ts`). Dedupe is scoped **per recipient**: each qualifying user gets at
most one alert for a given (product, store) pair per 24h, no matter how many reports land on it —
but every qualifying nearby user still gets alerted once, not just the first one processed. This is
the "no random Discord chaos" promise made mechanical. See `lib/alerts.ts`.

## Route ROI score

```
expectedValue(store) = Σ over active (non-suppressed) leads of estValue × (confidence / 100)
tripCost              = distanceMiles × 2 × costPerMile   (default $0.15/mile, gas-only)
routeScore            = expectedValue − tripCost
```

Stores are ranked by `routeScore` descending; any store with `routeScore <= 0` is excluded — the
planner never recommends a trip that costs more in gas than its expected haul is worth. Confidence
weighting means a store with one perfectly-verified $300 item can outrank a closer store with a
low-confidence lead on a similar item. See `lib/route.ts` and `lib/routePlanner.ts`.

This is a **single-store ranking**, not multi-stop route optimization (no TSP ordering yet) — see
`docs/product-spec.md` roadmap.
