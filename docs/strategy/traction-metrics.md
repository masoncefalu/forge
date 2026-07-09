# MVP Traction Metrics

_Agent 13: Founder Strategy. Each metric below is defined precisely enough to compute from the
existing schema (`prisma/schema.prisma`) once real users exist, with a note on what's missing
today to actually measure it (mostly: real auth + hosted deploy, per `founder-memo.md` §6)._

Metrics are grouped by what they prove, not chronologically. Targets assume the single-metro,
Home-Depot-only launch in `first-30-days.md`. Treat every number below as a hypothesis to be
revised after the first 2 weeks of real data — the point is having a falsifiable target in
advance, not the specific numbers being right.

## Supply-side health (the metric that matters most — see `pre-mortem.md` #1–2)

### 1. Reports-per-active-contributor-per-week

**Definition:** `count(Report where createdAt in week) / count(distinct userId with ≥1 Report in
that week)`. An "active contributor" is any user who submitted ≥1 report that week, not just any
active user.

**Why it's #1:** if this metric is flat or falling, the cold-start/secrecy-culture risk
(`founder-memo.md` §2, `pre-mortem.md` #1–2) is winning regardless of what any other metric says.
It's the earliest available signal — computable from week 1.

**Targets:** Day 30: ≥2.0 reports/contributor/week sustained for 2 consecutive weeks (early weeks
will be founder/captain-subsidized — see below). Day 90: ≥1.5 reports/contributor/week from
*non-captain* users specifically (captains excluded from this calculation from day 60 onward, to
isolate organic behavior).

**Caveat:** track captain-authored vs. non-captain-authored reports as two separate series from
day 1 (add a `isCaptainSeed` flag at report time, or simply join against known captain user IDs —
no schema change required). A healthy-looking blended number hiding an all-captain, zero-organic
reality is exactly the failure mode to catch early.

### 2. % of surfaced leads carrying real evidence

**Definition:** `count(Report where evidenceType != 'TEXT_ONLY' and status = 'APPROVED') /
count(Report where status = 'APPROVED')`, computed on the leads actually visible in the feed.

**Why it matters:** this is the trust mechanic working, not just existing in the schema — and
it's already a named Phase 1 exit criterion in `README.md` ("≥60% of surfaced leads carrying
evidence").

**Targets:** Day 30: ≥60% (per `README.md`'s existing figure). Day 90: ≥75%, once real
photo/receipt upload (`founder-memo.md` §6, item 2) has replaced the placeholder evidence URL —
this number is meaningless until that ships, so treat pre-upload weeks as "not yet measurable,"
not as a bad score.

### 3. Week-2 and week-4 contributor retention

**Definition:** of users who submitted their *first* report in week N, what % submitted ≥1
additional report in week N+2 and week N+4, respectively. Compute separately from all-user
retention (browse-only users retaining is a different, weaker signal — see metric 6).

**Targets:** Day 60 cohort check (first cohort with enough runway to measure W4): ≥25% W2
contributor retention, ≥15% W4. These are deliberately modest — consumer UGC products
commonly see steep contributor drop-off, and the goal at this stage is "is there a floor," not
"is retention already great."

## Trust-mechanic effectiveness

### 4. Dead-vote rate on approved reports

**Definition:** `count(ReportVote where vote='DEAD' and report.status='APPROVED') /
count(ReportVote where report.status='APPROVED')`, rolling 7-day window.

**Why it matters:** a data-quality canary (`founder-memo.md` §8). Rising rate → either bad actors
or the underlying pennies are genuinely too volatile to be worth reporting on that timescale;
which one it is changes the response (moderation tooling vs. product messaging/decay-rate
tuning).

**Targets:** Day 30: <20% (some dead-voting is expected and healthy — it's the mechanism working,
not a failure by itself). Day 90: investigate root cause if sustained >30% for any 2-week window.

### 5. Median time from report submission to first confirm/dead vote

**Definition:** median of `(first ReportVote.createdAt − Report.createdAt)` across approved
reports.

**Why it matters:** proxy for whether the community is actually engaging with new reports quickly
enough for the trust score to be *useful* before a fast-decaying penny lead goes stale (7-day
half-life per `lib/scoring.ts`, per `README.md`'s scoring formula description).

**Target:** Day 30: <24h median. If this is multi-day, confidence badges are stale by the time
they stabilize and the trust layer isn't actually beating Discord speed (`founder-memo.md` §3).

## Demand-side / usage

### 6. Weekly active users (WAU) and DAU/WAU ratio

**Definition:** standard — distinct users with any session in the window. Track browse-only vs.
contributor WAU as separate lines per metric 1's caveat.

**Targets:** Day 30: 100 WAU in the launch metro (already the stated Phase 1 exit criterion in
`README.md`). Day 90: 300–500 WAU, contingent on kill/double-down review at day 90 (see
`kill-criteria.md`, `double-down-criteria.md`) — this is a directional target, not a hard gate by
itself, since WAU can look healthy while supply-side metrics (1–3) are the real tell.

### 7. Route-plan-to-completion rate

**Definition:** `count(RoutePlan where a Report exists for the same user at one of the plan's
stopsJson store IDs, within 7 days after RoutePlan.createdAt) / count(RoutePlan)`.

**Why it matters:** proxy for "did the route planner change real-world shopping behavior," the
actual point of the feature (`founder-memo.md` §8).

**Target:** Day 60: ≥15% of saved route plans show a follow-up report at a planned stop within 7
days. This is a noisy proxy (a completed trip with no new report to submit isn't a failure), so
treat it as directional, not load-bearing on its own.

### 8. Alert-to-visit conversion (blocked on real alert delivery)

**Definition:** `count(Alert where readAt is not null and a Report exists for that userId at that
storeId within 48h of Alert.createdAt) / count(Alert where readAt is not null)`.

**Why it matters:** the entire justification for the Pro tier's "instant alerts" value proposition
(`founder-memo.md` §5).

**Not measurable until:** real push/email delivery ships (`founder-memo.md` §6, item 4) — the
current DB-only inbox (`docs/product-spec.md`) understates true alert reach, since users have to
remember to check `/alerts`. Don't trust this metric pre-delivery-upgrade.

**Target (once measurable):** Day 90: ≥20% conversion among delivered, read alerts.

## Monetization (only meaningful after supply-side health is established — see `founder-memo.md` §5)

### 9. Free-to-paid conversion rate

**Definition:** `count(users with active Pro or Reseller subscription) / count(users with ≥1
session in the trailing 30 days)`.

**Not measurable until:** billing ships (`founder-memo.md` §6, item 6) — explicitly sequenced
*after* the cold-start problem in every plan in this pack. Don't build billing just to get this
number early; it will be misleadingly low against an unproven feed.

**Target (once measurable, post-day-90):** ≥3% of 30-day actives converting within 60 days of
launching billing — a conservative freemium benchmark, to be revised against real cohort data
rather than treated as gospel.

### 10. Contributor-credit redemption rate

**Definition:** `% of users who earned a Pro-time credit via contribution who actually redeem/use
Pro-tier features during the credited period`, once contributor credits ship (`founder-memo.md`
§4).

**Why it matters:** validates that the non-monetary contribution incentive is actually landing as
a reward users value, not just a mechanic that exists on paper.

**Target:** Day 90 (if credits have shipped by then): ≥50% redemption — a low number here means
the incentive needs to be more visible or more valuable, not that contributors don't want it.

## What NOT to over-index on early

- **Total registered users / signups** — vanity metric in a product whose entire value proposition
  depends on *contribution*, not registration. A large signup count with metric 1 flat is a worse
  signal than a small signup count with metric 1 healthy.
- **Session count / time-in-app** — this isn't an engagement-maximization product; a user who
  checks the feed for 20 seconds, finds nothing, and leaves satisfied is using it correctly.
- **Raw feed size (total Report count)** — says nothing about freshness or trust; a feed padded
  with stale, unconfirmed, or dead-voted reports is worse than a smaller high-confidence one. Pair
  any raw-count reporting with the evidence and dead-vote-rate metrics above, always.
