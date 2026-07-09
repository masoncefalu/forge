# Pre-Mortem — It's July 2027 and PennyForge Is Dead

_Agent 13: Founder Strategy. Method: assume failure has already happened, work backward to the
most plausible causes, rank by probability × how early a warning sign would appear, then attach a
prevention to each. Companion to `founder-memo.md` §2 and `kill-criteria.md`._

## Ranked failure narratives

### 1. The feed never got past "empty enough to feel dead" (most likely)

**What happened:** Captains recruited a first wave of reports, but weekly report volume per
active contributor declined starting week 3 as the novelty wore off. New users opening the app in
week 6 saw a thin, stale-looking feed, bounced, and never came back. The trust mechanic never
accumulated enough independent reports for confidence scores to mean anything, so the product's
one real differentiator (verified confidence, vs. Discord rumor) never became visible to anyone.

**Early warning:** reports-per-active-contributor-per-week flat or declining by day 21 (see
`traction-metrics.md` §1). This is the single earliest, cheapest signal available — track it from
week 1, not at the 30-day review.

**Prevention:** front-load captain-seeded volume harder and longer than feels necessary; treat
week 1–4 report volume as founder/captain-subsidized by design, not organic, and say so
internally so a dip in organic reports isn't mistaken for a crisis before organic supply is even
expected to exist. Ship contributor-credit rewards before launch, not after — the incentive has
to be live from a user's very first report.

### 2. Secrecy culture won — contributors free-rode instead of reporting

**What happened:** The people with the best information (serious hunters, resellers) correctly
judged that reporting a hot lead to a shared feed made it worse for them personally (more
competition at that store, faster price correction) and used the app only to *consume* others'
reports, not contribute their own. The feed filled with low-value, already-stale, or low-effort
reports from casual users while the highest-signal information stayed in private group chats,
exactly the dynamic the product was supposed to fix.

**Early warning:** a growing gap between DAU/WAU and unique weekly contributors — usage grows,
contribution doesn't. Also watch reseller-persona signups specifically converting to browse-only
behavior (view leads, never submit) at a materially higher rate than casual-hunter signups.

**Prevention:** this is the risk the founder memo (`founder-memo.md` §2, §4) treats as hardest and
most central — the time-delayed free feed plus contributor-credit unlock structure exists
specifically to make reporting individually rational, not just collectively good. If this pattern
appears, the fix is mechanism design (bigger contribution payoff, faster unlock, private-first
visibility for the reporter before wide release), not more marketing.

### 3. Retailer countermeasures compressed the penny mechanic itself

**What happened:** Independent of anything PennyForge did, retailers (having already dealt with
Deal Soldier-style communities for years) tightened penny-honoring policy, retrained cashiers to
refuse penny sales, or further compressed markdown cycles to reduce the exploit window. The
viral-hook mechanic (pennies) weakened faster than the durable hidden-clearance business could
pick up the slack, and the product's growth story (built around penny virality per `README.md`)
lost its engine before hidden-clearance retention had time to mature into a standalone draw.

**Early warning:** rising % of PENNY-dealType reports marked DEAD by vote, or a rising
report-to-honored-sale gap reported anecdotally by contributors, ahead of any change in
PennyForge's own product.

**Prevention:** this is explicitly why `README.md`'s "Retailer-countermeasure resilience" future-
proofing decision exists — treat hidden clearance (not pennies) as the actual product from day
one internally, even while marketing leans on penny virality. If this risk materializes, the
correct response is to shift feed emphasis and onboarding copy toward clearance, not to try to
out-game retailer countermeasures (which would also cross the compliance line).

### 4. App Store rejected the app, and the PWA hedge wasn't enough to sustain growth

**What happened:** Apple rejected the app under Guideline 1.2 (UGC moderation) or as a
"repackaged website" (4.2) at the Capacitor-wrap stage, and the appeal/resubmission cycle burned
enough calendar time that competitor communities absorbed the growth window. The PWA kept the
product alive but without App Store search/share-sheet distribution, growth stayed too slow to
reach a defensible position before runway (founder time/money) ran out.

**Early warning:** this risk is binary and mostly invisible until submission — the real leading
indicator is whether the UGC report/block gap (`docs/status.md`: "flagged... as a pre-launch
backlog item") and moderation SLA get closed *before* submission is attempted, not discovered
during review.

**Prevention:** close the Guideline 1.2 gap (user-facing report/block) before any App Store
submission attempt, treat the PWA as the primary distribution channel through at least the first
90 days regardless of iOS timeline, and don't let App Store readiness work compete for the same
scarce founder time as the cold-start problem — the cold-start problem is strictly higher
priority and this pack's plans sequence it that way.

### 5. Monetization never worked even after trust existed

**What happened:** The trust graph and contributor base actually grew — the hard problem got
solved — but conversion to Pro/Reseller stayed too low to sustain the business, because free-tier
Scout (4h-delayed feed) was good enough for the median user's actual use case (browsing for fun,
occasional in-store check), and the users motivated enough to pay were a small fraction of the
active base.

**Early warning:** healthy contributor/retention metrics but free-to-paid conversion stuck below
plan at the 90-day mark despite a live billing flow and real alert delivery.

**Prevention:** this is a real possible outcome even in a "the hard problem got solved" world —
`kill-criteria.md` and `double-down-criteria.md` deliberately gate the "double down" decision on
monetization signal, not just engagement/trust signal, specifically so this scenario gets caught
rather than mistaken for success. If it happens, the fix is pricing/packaging experimentation
(the reseller profit calculator and haul P&L are the most likely underbuilt lever, per
`founder-memo.md` §5) before assuming the whole model is broken.

### 6. A single founder ran out of time before any of the above resolved

**What happened:** Building the product, recruiting captains, moderating the community, handling
support, and pursuing App Store/legal prep all competed for one person's hours, and none of them
got enough sustained attention to reach a real signal in either direction — the project didn't so
much fail a test as never finish running one.

**Early warning:** slipping weekly-plan milestones in `first-30-days.md`/`first-90-days.md`
without a clear technical blocker — the tell is calendar slippage, not a metric.

**Prevention:** the 30/90-day plans in this pack are deliberately narrow-scope (one metro, one
retailer, MVP feature set) specifically to fit inside single-founder bandwidth; resist the urge to
parallelize into a second metro, a native app, or a broader feature set before the first loop
closes — see `founder-memo.md` §7 ("what not to build"), which exists largely to protect founder
time as a scarce resource, not just to avoid technical debt.

## What this pre-mortem implies about sequencing

Failure modes #1 and #2 (empty feed, free-riding) are both supply-side and both show up within
the first 2–3 weeks if you're watching the right metric. Failure modes #4 and #5 (App Store, monetization)
can't even be tested until supply-side health is already established. That ordering is exactly why
`first-30-days.md` and `first-90-days.md` sequence App Store prep and billing after — not
parallel to — proving the reporting loop works in one metro.
