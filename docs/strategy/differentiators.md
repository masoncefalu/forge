# PennyForge — Differentiators

This is deliverable 4 of the product strategy packet: which of the 15 candidate differentiators in
the brief are actually worth building first, and why. See [`positioning.md`](./positioning.md) for
the canonical line and [`competitive-displacement.md`](./competitive-displacement.md) for the
head-to-head mechanics against Discord-style groups and BrickSeek-style lookup tools; this doc is
scoped to ranking and justifying the differentiator set itself.

"Waze for hidden clearance: receipt-verified local deal intelligence, not random Discord chaos" is
not a marketing line here — it is the filter. Every candidate below is scored on whether it makes
that sentence true, not on whether it sounds good in a pitch.

## Ranking methodology

Each of the 15 candidates from the brief is scored on three axes:

1. **Defensibility** — could a Discord group or a BrickSeek-style lookup tool copy this without
   first building PennyForge's first-hand-UGC-plus-trust infrastructure? High means the feature
   *is* a function of the trust graph, evidence pipeline, or community vote history and cannot be
   bolted onto a chat channel or a SKU-lookup table. Low means it is a feature any competitor could
   ship in a sprint regardless of their data model.
2. **Compliance safety** — is this fully achievable inside the `lib/compliance.ts` allowlist with
   zero workaround temptation, per the hard boundaries in `CLAUDE.md`? Everything in the MVP scope
   passes this cleanly because the schema only stores first-hand UGC; a few roadmap items need
   careful scoping to stay on the right side of the line (surveillance-flavored fraud detection,
   real-time location sharing) and are flagged where relevant.
3. **Shipped status** — real progress beats a roadmap bet. `shipped` means working code with test
   coverage today; `partial` means a real mechanism exists but is incomplete (a scalar where a
   graph is implied, a role flag where regional scoping is implied); `roadmap-phase-N` means no
   dedicated code path exists yet, labeled against the phase numbers in `docs/product-spec.md`
   where the brief or the docs assign one, or left unphased where they don't.

Where two candidates land on the same combination of axis scores, ties are broken by centrality to
the six pillars named in `CLAUDE.md`'s mission statement — trust, proof, routing, ROI, community,
compliance — favoring whichever candidate is *harder to fake* along those pillars, not whichever
sounds more novel.

## Top 10, ranked

| Rank | Differentiator | Defensibility rationale | Compliance check | Status |
|---|---|---|---|---|
| 1 | Receipt-verified confidence | Requires the full evidence-tier scoring engine plus a corpus of first-hand receipts; a lookup tool has price data, not proof-of-purchase | Clean — `RECEIPT_PURCHASE` is allowlisted, strongest-tier source | Shipped |
| 2 | Shelf-tag/photo evidence weighting | Same infrastructure as #1, extends it to the majority of real-world submissions that aren't receipts | Clean — `SHELF_TAG` allowlisted | Shipped |
| 3 | Dead-deal suppression | Requires a real confirm/dead vote corpus per report; a static list has no mechanism to know a lead has gone stale | Clean — pure UGC voting, no external check | Shipped |
| 4 | Lead half-life (freshness decay) | Requires timestamped, structured reports and a confirm-driven decay reset; chat threads have no equivalent clock | Clean — computed from own report/vote timestamps only | Shipped |
| 5 | Route ROI score | Requires per-store aggregation of confidence-weighted lead value against real distance/gas cost; no competitor in the landscape table does multi-store trip math at all | Clean — uses only first-hand report data plus user-supplied home location | Shipped |
| 6 | Reporter reputation graph | A persisted, portable trust ledger tied to outcomes is exactly what a Discord "known trusted regular" can't be — a mod's memory, not a number | Clean — trust is derived entirely from this app's own vote history | Partial |
| 7 | Local captain system | A structured, role-gated moderation queue fed by community-triaged (voted) reports is a different shape of work than a mod skimming a live feed | Clean — role is an internal permission gate, not a data source | Partial |
| 8 | Store freshness score | Builds directly on the shipped per-report decay primitive; cheap for PennyForge to add, impossible for a competitor without the same report density | Clean — aggregates only first-hand report timestamps already on file | Roadmap (unphased in `product-spec.md`; adjacent to Phase 2's captain/bounty tooling) |
| 9 | Fraud/poisoned-submission detection | Anomaly detection needs an existing trust graph and vote corpus to detect deviations against — nothing to detect anomalies in without the community data this app already has | Requires scoping: must stay UGC pattern-analysis (rate limits, image-hash de-dup, vote-velocity/geo-plausibility checks on *this app's own submissions*), never surveillance of retailer systems or competitor sources | Roadmap-phase-3 |
| 10 | Verification bounties | Directs scarce community attention at exactly the stale/high-value gaps a Discord group has no mechanism to coordinate | Clean — bounty payout is contributor credit for first-hand reports, same allowlist applies | Roadmap-phase-2 |

## Differentiator details

### 1. Receipt-verified confidence

**What it is.** Every report is submitted with an evidence type; a receipt-backed report renders
with the highest confidence tier and a "why this lead scores X" breakdown on the lead detail page
(`app/leads/[id]/page.tsx`) that shows the receipt evidence contribution explicitly, not just a
final number.

**Mechanism.** `lib/scoring.ts` `EVIDENCE_BASE.RECEIPT = 45` — the largest single input to the score
formula:

```
score = clamp((evidenceBase + trustBonus + confirmBonus − deadPenalty) × decayFactor, 0, 100)
```

Forty-five points is enough on its own, even with a brand-new reporter (trust bonus 0) and zero
confirms, to clear the `ALERT_THRESHOLD` of 60 once combined with almost any positive `trustBonus`
or `confirmBonus`, and it's nearly 2× the next tier (`SHELF_TAG_PHOTO` at 32).

**Why hard to copy.** A gray-data lookup tool has a price field, not a proof field — it has nothing
resembling `evidenceType` because its "data" was never submitted by a person who was physically in
the store. A Discord group can ask for a receipt photo as a norm, but without a persisted
evidence-type column feeding a scoring function, there is no weighting, no audit trail, and no way
to distinguish a receipt-backed claim from a screenshot at query time — the entire feed reads as one
undifferentiated trust level.

**Compliance posture.** Fully clean. `RECEIPT_PURCHASE` is on the `lib/compliance.ts` allowlist as
first-hand, in-store evidence; `assertSafeSource` rejects anything else before the row is written.

### 2. Shelf-tag/photo evidence weighting

**What it is.** The same evidence-tier system covers the far more common case of a shopper who saw
a marked-down item but didn't buy it: shelf-tag photo, product photo, or text-only, each rendering
at a visibly different confidence tier on the same UI (`ConfidenceBadge`, evidence label from
`EVIDENCE_LABELS` in `lib/constants.ts`).

**Mechanism.** `lib/scoring.ts` `EVIDENCE_BASE`: `SHELF_TAG_PHOTO = 32` (verifiable in-store
signage, no proof of an actual ring-up), `PRODUCT_PHOTO = 22` (shows the item exists, no price
confirmation), `TEXT_ONLY = 10` (no visual evidence at all). This is the same mechanism as #1, one
lookup table, not a separate system — which is precisely why it's ranked directly behind receipts
rather than as an unrelated feature.

**Why hard to copy.** Most real-world submissions in this niche are shelf-tag photos, not receipts
— penny items in particular are often found, not bought. A tiered weighting scheme only pays off
once there's a live scoring pipeline and a UI that visibly differentiates tiers; without that, "post
a photo" is the same unweighted norm every Discord server already has.

**Compliance posture.** Fully clean. `SHELF_TAG` and `IN_STORE_OBSERVATION` are both allowlisted
first-hand sources in `lib/compliance.ts`.

### 3. Dead-deal suppression

**What it is.** A lead that's been marked "gone" by enough of the community disappears from the
feed, alerts, and route planner automatically — no moderator has to notice and delete it. The
lead-detail page and moderation queue both surface `SUPPRESSED` status distinctly from a normal
rejection.

**Mechanism.**

```
isSuppressed = deads >= 2 && deads > confirms   // lib/scoring.ts
```

Suppression is enforced at the query layer — `getFeedLeads` in `lib/leads.ts` only pulls
`PENDING`/`APPROVED` status, and `lib/routePlanner.ts` does the same — so a suppressed lead isn't
merely downranked, it's invisible. Reversal is automatic too: `Report.previousStatus` (see `prisma/schema.prisma`) captures
the status held immediately before suppression, so if confirms later outnumber deads again, the
report is restored to exactly what it was (e.g. back to `APPROVED`, not reset to `PENDING`) instead
of re-entering the moderation queue.

**Why hard to copy.** This requires a real, per-report confirm/dead vote corpus tied to identity
(one vote per user per report, `ReportVote` `@@unique([reportId, userId])`) to compute against. A
static list or a chat thread has no mechanism to know a lead has gone dead except someone noticing
and saying so once, which then scrolls away.

**Compliance posture.** Fully clean. The signal is entirely first-party vote data on this app's own
reports.

### 4. Lead half-life (freshness decay)

**What it is.** Every lead's confidence score visibly drops over time even with no new activity,
and the drop rate is tuned per deal type — penny leads fade twice as fast as clearance leads because
stores correct penny errors quickly. A recent confirmation resets the clock instead of the lead
purely aging out.

**Mechanism.**

```
decayFactor      = 0.5 ^ (effectiveAgeDays / HALF_LIFE_DAYS[dealType])   // PENNY: 7, CLEARANCE: 14
effectiveAgeDays = min(ageDays, lastConfirmAgeDays)   // if any confirmation exists
```

`lib/scoring.ts`. This is applied as a multiplier over the whole raw score, not just the evidence
base, so an old lead decays toward zero even if it was originally a receipt-backed, highly-confirmed
report.

**Why hard to copy.** The decay math itself (exponential half-life) isn't exotic. What's hard to
copy is having a real, continuously refreshed confirm-vote stream to anchor `effectiveAgeDays`
against — without live community verification, a competitor's "freshness" can only ever be
"time since posted," which is exactly the invisible, unmanaged decay problem chat threads have.

**Compliance posture.** Fully clean. Computed entirely from this app's own report and vote
timestamps.

### 5. Route ROI score

**What it is.** The route planner (`app/route/page.tsx`) ranks nearby stores by whether a trip is
actually worth the gas, not just by distance or raw lead count — a farther store with one
high-confidence, high-value lead can outrank a closer store with a weak one, and trips that would
cost more in gas than they're expected to return are hidden entirely.

**Mechanism.**

```
expectedValue(store) = Σ over active (non-suppressed) leads of estValue × (confidence / 100)
tripCost              = distanceMiles × 2 × costPerMile   (default $0.15/mile, gas-only)
routeScore            = expectedValue − tripCost
```

`lib/route.ts`. `rankStores` filters out any store with `routeScore <= 0` before sorting descending
— `DEFAULT_COST_PER_MILE` is `0.15`.

**Why hard to copy.** None of the landscape table's competitors do multi-store trip math at all —
they're single-SKU or single-store lookups. Doing this credibly requires confidence-weighted
per-store aggregation, which in turn requires the scoring pipeline in #1–#4 to already exist; a
distance-sorted list of raw leads is not the same product.

**Compliance posture.** Fully clean. Inputs are first-hand report data (`estValue`, `confidence`)
plus the user's own supplied home coordinates, used only for this calculation per
`docs/compliance.md`'s privacy constraints.

### 6. Reporter reputation graph

**What it is.** Contributors build a visible trust score (`/leaderboard`,
`app/leaderboard/page.tsx`) that rises with confirmed reports and falls with dead votes, and that
score feeds back into how much weight their *next* report carries.

**Mechanism, and why it's `partial` not `shipped`.** `User.trustScore` (`prisma/schema.prisma`,
default 50, range 0–100) feeds:

```
trustBonus = round((clamp(trustScore, 0, 100) / 100) × TRUST_MAX_BONUS)   // up to +15
```

via `lib/scoring.ts`. It moves through `applyTrustDelta`: **+2** per confirmed vote
received, **−3** per dead vote received (losses outweigh gains so trust is harder to game than to
lose), with `applyVoteChange` ensuring a voter toggling their vote back and forth can't repeatedly
re-apply the delta. This is a real, working reputation *score* — but it is a single scalar per user,
not a graph. There is no notion of trust *between* users (who vouches for whom), no per-category or
per-store trust weighting, and no network structure to detect coordinated manipulation. The brief's
"graph" framing is aspirational relative to today's code.

**Why hard to copy.** Even the scalar version requires a persisted, portable ledger of outcomes tied
to identity across every report a user has ever filed — the thing a Discord "known trusted regular"
label can never be, because it lives in a moderator's memory, not a queryable number.

**Compliance posture.** Clean today and clean as it extends toward a graph — trust is derived
entirely from this app's own confirm/dead vote history, never from external reputation signals.

### 7. Local captain system

**What it is.** `CAPTAIN` is a first-class role alongside `USER` and `ADMIN` (`lib/constants.ts`
`ROLES`) that unlocks the moderation queue (`/admin`) — approving or rejecting pending reports
outside the automatic confirm/dead/suppression path.

**Mechanism, and why it's `partial` not `shipped`.** `app/api/reports/[id]/moderate/route.ts` gates
the endpoint on `user.role === "ADMIN" || user.role === "CAPTAIN"`, and `app/admin/page.tsx` gates
the UI the same way. What doesn't exist yet: any *regional* scoping. The code comment in
`app/admin/page.tsx` is explicit — "Any ADMIN or CAPTAIN can approve/reject in the MVP (real role
gating is a later phase)" — so a captain today can moderate reports from any store in any state,
not just "their" territory, and there is no promotion pipeline (no code path turns a high-trust
`USER` into a `CAPTAIN`; the role is a static seeded field). The leaderboard's copy ("unlocks captain
moderation") describes the intended end state, not a mechanism that runs today.

**Why hard to copy.** Even the unscoped version requires a bounded, structured work queue that the
community has already triaged via voting (`getModerationQueue` in `lib/leads.ts`, scoped to
`PENDING`/`SUPPRESSED`/`REJECTED`) — a fundamentally different shape of work than a volunteer mod
scrolling a live, unbounded chat stream. Regional scoping, once added, compounds this: it requires
a real geography-to-trust mapping no chat server maintains.

**Compliance posture.** Clean. The role is purely an internal authorization gate on this app's own
data — it is not a data source and touches nothing outside the allowlist.

### 8. Store freshness score

**What it is (proposed).** A single "how alive is this store right now" signal, aggregating recency
and confirm/dead outcomes across all of a store's leads, surfaced on the feed and factored into
route ranking as a multiplier — distinct from the per-lead decay #4 already computes.

**Mechanism today.** This does not exist as a distinct concept anywhere in the code — confirmed by
inspection of `lib/leads.ts` and `lib/route.ts`, and by grep across the repo for `freshness`, which
only resolves to per-report decay language in `lib/scoring.ts`, `docs/scoring.md`, and UI copy on
`app/leads/[id]/page.tsx`. The primitives it would be built from are already shipped, though: every
report already carries a computed `decayFactor` (`lib/scoring.ts`), and every report already has a
`storeId` relation (`lib/leads.ts#fetchReports` includes `store`). Building the aggregate is a
rollup over data already on hand, not a new data-collection problem — which is why it's ranked above
several roadmap items with real remaining engineering.

**Why hard to copy.** The rollup itself is trivial once you have the report density to make it
meaningful; a competitor without a real per-store report volume would compute a freshness score over
nearly-empty data and it would say nothing useful. This is a case where the differentiator's moat is
entirely about the underlying UGC density, not the aggregation logic.

**Compliance posture.** Clean. Aggregates only first-hand report timestamps already stored under the
allowlist; introduces no new data source.

### 9. Fraud/poisoned-submission detection

**What it is (proposed).** Defense of the trust graph itself: rate limiting, perceptual image-hash
de-duplication of recycled evidence photos, and anomaly detection on suspicious vote/report
patterns (e.g. a report confirmed by accounts with no other history, or one user voting on many
reports across implausible distances in a short window).

**Mechanism today.** `docs/product-spec.md`'s "Explicitly deferred" list names this directly: "rate
limiting, image hashing for duplicate photo detection, and anomaly detection on trust-graph
manipulation," beyond the dead-vote suppression already shipped (#3). `docs/product-spec.md` Phase
3 names "fraud detection hardening" explicitly, which is the phase label used here.

**Why hard to copy.** Anomaly detection needs something to detect anomalies *against* — a real trust
graph and vote-history corpus. Without #1–#7 already existing and accumulating data, there is no
baseline of "normal" behavior to flag deviations from, so this differentiator is strictly downstream
of the ones ranked above it.

**Compliance posture.** Requires explicit scoping to stay inside the hard boundaries: every signal
here must be pattern analysis over this app's own first-hand submissions (vote velocity,
geo-plausibility of a single user's activity, duplicate-photo hashing on evidence already uploaded
to this app) — never scraping, never probing retailer systems, never anything that resembles
surveillance of a person or a store beyond what they voluntarily submitted. `CLAUDE.md`'s hard
boundaries apply to this item as much as to any data-ingestion feature; "fraud detection" is not a
license to reverse-engineer anything.

### 10. Verification bounties

**What it is (proposed).** Contributor incentives (credits, badges, leaderboard weight) targeted
specifically at stale or high-value leads that need a fresh confirm — turning "someone should check
if this is still there" into an assignable, rewarded task instead of a hope.

**Mechanism today.** Not built. `docs/product-spec.md` Phase 2 names this explicitly: "bounty
missions for stale high-value leads," alongside captain moderation tools, which is the phase label
used here.

**Why hard to copy.** A Discord group has no mechanism to direct collective attention at specific
coverage gaps — it relies on whoever happens to be active and interested. Bounties require exactly
the infrastructure this app already has and a chat server doesn't: a queryable notion of "stale,"
"high-value" (`msrpCents` on `Product`), and a persistent identity to credit the reward to.

**Compliance posture.** Clean, with one scoping note: bounty payout must remain contributor credit
for first-hand reports submitted through the normal allowlisted flow — it must not become an
incentive to fabricate evidence or rush a submission without actually being in the store, which
would undermine the trust graph the whole system depends on. The existing evidence-tier and vote
mechanisms are the natural check against this.

## Didn't make the top 10

- **Reseller profit calculator** — genuinely valuable to the reseller persona, but it's a
  monetization utility layered on top of existing price/MSRP data, not a trust-or-proof mechanism;
  a BrickSeek-style tool could bolt on the same calculator without any UGC infrastructure at all.
  Lower-leverage than the top 10 relative to the core trust moat, and `docs/product-spec.md` Phase 3
  puts it well past the near-term.

- **Offline in-store mode** — a real UX need (`docs/product-spec.md`'s "Explicitly deferred" list
  groups it under "alert UX refinements"), but it's PWA/native-shell infrastructure, not a data or
  trust differentiator — any competitor's app can add offline caching without touching evidence,
  scoring, or community mechanics. Too far out on the roadmap (dependent on the mobile-shell work in
  later phases) to differentiate near-term.

- **Spanish/bilingual UX** — a real market gap per the README's competitive-landscape notes (only
  one named competitor addresses it), and `User.locale` already exists in the schema (`en`/`es`,
  seeded), but no i18n framework is wired up and `docs/product-spec.md` Phase 3 is where real
  localization lands. Defensibility is low on its own: any competitor can localize their UI strings
  without needing anything resembling PennyForge's trust infrastructure, so this is a market-
  expansion move rather than a moat.

- **Privacy/location fuzzing** — the *posture* is already correct today: `docs/compliance.md` states
  home coordinates are used only for route-planner distance math and are never shown to other users,
  which is the outcome fuzzing would protect. But there is no real-time location-sharing feature
  shipped yet for fuzzing to actually apply to, so crediting it as a live differentiator would
  overstate the current build. This is a compliance commitment that needs careful scoping *before*
  any future feature exposes contributor location, not a shippable differentiator on its own today.

- **Ethical shopping nudges** — a real community-health idea (README's "Etiquette system," e.g.
  discouraging shelf-sweeping and employee confrontation), but it's a content/copy layer, not a
  technical mechanism — any competitor can publish similar guidelines. It's also largely duplicative
  of what `CLAUDE.md`'s hard boundaries and `docs/compliance.md`'s disclaimers already cover
  (discourage confrontation, be kind to store employees), so it adds little that the top 10's
  trust/proof/routing mechanics don't already reinforce structurally.
