# Kill Criteria

_Agent 13: Founder Strategy. These are pre-committed, falsifiable conditions for stopping or
pivoting — written now, before emotional/sunk-cost pressure exists, specifically so a future
review doesn't quietly rationalize a bad signal into "let's give it one more month." Companion to
`double-down-criteria.md`; both should be read together at the day-30 and day-90 gate reviews
defined in `first-30-days.md` / `first-90-days.md`._

## How to use this document

At each gate review, check every criterion below against the actual measured numbers from
`traction-metrics.md`. If **any single "hard kill" criterion** is met, stop building new
features and either pivot (per the pivot options below) or wind down — do not keep extending the
timeline hoping the next month fixes it. If a "yellow flag" criterion is met without a
corresponding hard kill, it's a signal to change approach within the same 90-day plan, not to
abandon it.

## Hard kill criteria (any one of these, sustained, ends the current approach)

### 1. Supply-side death: reports-per-active-contributor-per-week never recovers

**Trigger:** by day 45 (mid-point of month 2), `traction-metrics.md` metric 1, computed on
*non-captain* users only, is below 0.5 reports/contributor/week for 3 consecutive weeks, with no
improving trend, despite the mechanism-design interventions in `founder-memo.md` §4 having been
tried (contribution payoff speed, visibility of impact, captain coaching).

**Why this kills it:** this is the core bet of the entire business — that receipt-verified
community reporting can sustain itself. If it can't get organic traction even in a small,
captain-seeded, favorable test metro, there's no reason to believe it works at scale. This isn't
a "try harder" problem at that point; it's evidence the secrecy-culture risk
(`founder-memo.md` §2, `pre-mortem.md` #2) is structurally dominant.

**If triggered:** pivot options, not straight shutdown — (a) narrow to a captain/creator-curated
model instead of open crowdsourcing (closer to PennyCentral's model, per `README.md`'s
competitive table, trading the "compounding data moat" thesis for a more defensible but less
differentiated position); (b) pivot the value proposition entirely toward the route-planning and
reseller-P&L tooling as a standalone product that consumes *existing* public/curated lead sources
rather than trying to generate its own; (c) shut down if neither pivot has a credible path to
differentiation.

### 2. The trust mechanic doesn't outperform Discord in practice

**Trigger:** by day 60, evidence-carrying report % (`traction-metrics.md` metric 2) stays below
40% despite real photo/receipt upload being live, or median time-to-first-vote
(`traction-metrics.md` metric 5) stays above 48 hours — either one means the Verification Seal
isn't actually more trustworthy-in-practice than a Discord post, which erases the entire stated
differentiation in `founder-memo.md` §3.

**Why this kills it:** the whole thesis is "verified beats rumored." If verification doesn't
functionally beat rumor in the launch metro's actual usage pattern, the product has no real
advantage over the incumbent it's 4x cheaper than, and price alone isn't a durable moat
(`founder-memo.md` §10 explicitly excludes price from the defensibility list).

**If triggered:** before killing, diagnose whether this is a product-execution problem (evidence
upload too high-friction, badge not legible enough) vs. a fundamental mismatch — the first is
fixable within the existing plan; only the second warrants a pivot/kill decision.

### 3. Zero willingness to pay even after trust exists

**Trigger:** by day 90, with organic supply-side metrics healthy (i.e., criteria 1–2 above did
*not* trigger) and billing live for at least 3 weeks, free-to-paid conversion
(`traction-metrics.md` metric 9) is below 0.5% — an order of magnitude under even the
conservative 3% target, with no meaningful uptick after a pricing/packaging experiment.

**Why this kills it (specifically the monetization thesis, not the whole product):** this is the
scenario from `pre-mortem.md` #5 — the hard problem got solved but nobody pays. Distinguish this
carefully from criteria 1–2: if this triggers alone, the product may still have value as a
community/traffic asset (ad-supported, affiliate-revenue-only, or acquisition-target positioning)
even without a viable direct-subscription business — don't treat it as an automatic full kill,
but do treat it as a kill of the subscription-tier plan as currently designed.

### 4. Retailer response eliminates the core mechanic faster than hidden-clearance retention matures

**Trigger:** dead-vote rate on PENNY-dealType reports specifically (a variant of
`traction-metrics.md` metric 4) exceeds 50% sustained for 4+ weeks *and* is corroborated by
captain/community reports of retailers actively refusing penny sales or removing markdown-stage
signals in the launch metro — i.e., a real-world mechanic failure, not just a data-quality issue.

**Why this kills the current form (not necessarily the business):** per `pre-mortem.md` #3, this
is largely outside product control. If it happens this early (within the first 90 days, before
hidden-clearance retention has had time to become the primary loop), the viral hook is gone
before the durable business had a chance to stand on its own.

**If triggered:** pivot to hidden-clearance-only positioning immediately (drop penny-specific
onboarding/marketing) rather than shutting down — `founder-memo.md` §1 already frames hidden
clearance as the durable business and pennies as just the hook; this criterion is when that
framing gets tested for real.

## Yellow flags (change approach, don't kill yet)

- **WAU targets missed but supply-side metrics healthy.** Slow user acquisition with a genuinely
  working trust mechanic is a marketing/distribution problem, solvable with more time or a
  different acquisition channel — not a signal the core bet is wrong.
- **App Store rejection at first submission.** Expected-probability event per `founder-memo.md`
  §2 and `pre-mortem.md` #4; the PWA hedge exists precisely so this doesn't gate survival. Fix and
  resubmit; only escalate to a real concern if rejection recurs after addressing the stated reason
  twice.
- **A single metro underperforming due to metro-specific factors** (unexpectedly low store
  density, a captain who didn't work out, unusually aggressive local retailer policy). Diagnose
  metro-specific causes before concluding the model itself is broken — consider a controlled
  second-metro test rather than a full kill if the launch metro's failure looks locally caused.
- **Founder bandwidth strain without a clear metric failure** (`pre-mortem.md` #6). This is a
  process problem — cut scope further per `founder-memo.md` §7, don't treat it as evidence against
  the business itself.

## What "kill" means in practice

Killing the current approach does not necessarily mean abandoning the codebase or the compliance-
first positioning — those remain valid regardless of outcome. It means: stop the single-metro
consumer-crowdsourcing bet as currently scoped, and either (a) pursue one of the pivots named
above, or (b) if no pivot has a credible differentiated angle, wind down and redirect founder time
elsewhere. The worst outcome this document is designed to prevent is neither killing nor doubling
down — quietly continuing an unproven bet past the point where the data already gave an answer.
