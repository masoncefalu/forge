> Part of the PennyForge business strategy series — see docs/business/README.md.

# Launch Plan

How PennyForge goes from a working MVP to its first 500 users. Scope matches Phase 1 of the
roadmap (README.md): hosted web beta, Louisiana first, Home Depot only. Every number below is a
target, hypothesis, or assumption unless a source is cited — none are predictions.

## 1. The launch wedge: one metro, one retailer, one mechanic

**Wedge: New Orleans metro · Home Depot · penny items.**

Why New Orleans over Baton Rouge:

- **Store density for the route planner.** The route planner (`lib/route.ts`) ranks trips by
  expected value minus gas cost — it only earns its keep when several covered stores sit within
  one drive. The New Orleans metro (including Metairie, Kenner, the West Bank, New Orleans East,
  Slidell, and the Northshore) has an estimated ~8 Home Depot locations within a ~45-minute drive
  of the city center (estimate — verify against Home Depot's public store locator before launch).
  Baton Rouge has an estimated ~4–5. More stores in radius means more multi-stop routes with
  positive ROI.
- **Larger contributor pool.** New Orleans metro population is roughly 1.2M vs. roughly 0.9M for
  Baton Rouge (estimates from public census figures; verify before quoting externally). Cold
  start is a contributor-count problem, so the bigger pool wins.
- **Baton Rouge is the natural second metro, not a competitor for first.** It sits ~80 miles up
  I-10/I-12. Once New Orleans density holds, the same captains-and-creators playbook extends up
  the corridor without new infrastructure.

Why one retailer (Home Depot): penny mechanics, tag formats, and markdown cadence are
retailer-specific. A single retailer concentrates every scan, report, and education page on one
system, so liquidity compounds instead of fragmenting. PennyCentral proved a Home-Depot-only
focus can sustain a 120k+ member community (README.md competitive table).

Why one mechanic (penny items): pennies are the viral hook with a binary, provable outcome — a
$0.01 receipt line is undeniable evidence and the perfect seed for the trust engine. Hidden
clearance broadens the funnel later; it is not the launch story.

### Why depth beats breadth

- **Alerts are only valuable at local density.** An alert for a penny lead 300 miles away is
  noise. An alert for a store 10 minutes away is actionable within the lead's half-life
  (~5–7 days per the scoring model; pennies decay faster).
- **The route planner needs multiple covered stores in driving range.** One covered store per
  metro means no routes, which means the paid tier's flagship feature demos as empty.
- **A thin national feed is worse than a deep local one.** Ten leads spread across 50 states
  reads as a dead product; ten leads across 8 stores in one metro reads as a living map. Waze
  worked the same way: useless nationally at low density, indispensable locally at high density.

### Minimum viable density (hypothesis — tune against real usage)

| Metric | Target (hypothesis) | Why this number |
|---|---|---|
| Fresh verified leads per metro per week | ≥ 25 | Roughly 3–4 per covered store per week; enough that a Saturday route has 3+ positive-ROI stops |
| Covered stores | ≥ 6 of ~8 metro Home Depots with ≥1 confirmed report in the trailing 7 days | Route planner needs ≥3 live stops per route with headroom |
| Evidence-attach rate on surfaced leads | ≥ 60% | Phase 1 exit criterion (README.md roadmap) |
| Median age of surfaced leads | ≤ 48 hours | Inside the decay half-life, so scores still read "fresh" |

If four weeks of effort cannot hold these numbers in one metro, the fix is more captain and
founder activity in that metro — never adding a second metro to pad the totals.

## 2. Local launch strategy

**Founder store runs.** The founder personally hunts the ~8 metro Home Depots on a weekly circuit,
submitting first-hand, receipt-backed reports (source types `IN_STORE_OBSERVATION`,
`RECEIPT_PURCHASE`, `SHELF_TAG` — the compliance allowlist in docs/compliance.md). Target: every
covered store has founder-seeded leads before any outside user signs up. This is compliant by
construction and doubles as product QA on the sub-30-second in-aisle submission target.

**Regional captains (2–3).** Who: proven local hunters — people already posting verified finds
with photos in Gulf South Facebook groups and reseller Discords. What they get: free Reseller
tier for as long as they serve (tier price hypothesis $19.99/mo per README.md), the CAPTAIN
moderation role (approve/reject queue, already built in the MVP), a founder badge, and named
credit on the leaderboard. What they do: weekly store runs on their side of the metro, first-pass
moderation, and welcoming new contributors. Recruit by direct, transparent outreach: "I built the
tool you keep wishing the Facebook group was."

**Local reseller creators (1–2).** Who: Gulf South resellers on TikTok/YouTube/Instagram doing
haul and sourcing content. What they get: free Reseller tier, early input on the profit-calculator
and haul P&L features (their persona's tools), and first access to the Founder lifetime tier for
their audience. No cash sponsorship at launch (assumption — revisit if organic creator interest
stalls). The ask: one honest walkthrough video and haul recaps that credit the app.

**Open participation in existing communities.** Join local deal, penny, and reseller Facebook
groups and Discords as a named, transparent member. Share genuinely useful first-hand finds and
education, and link back to PennyForge where group rules allow. Hard rule from
docs/compliance.md: recruiting members by participating openly is fine; ingesting, scraping, or
reposting those communities' data is permanently banned. If a group bans self-promotion, respect
it — be the most useful member, not the loudest.

**Haul-culture events.** Monthly informal meetup ("Penny Run Saturday"): group route through 3–4
stores using the route planner, coffee after, compare hauls. Cheap, photogenic, and it converts
the strongest offline behavior in this niche — group hunting — into product usage. Also table or
lightning-talk at local reseller meetups where they exist.

## 3. Cold-start strategy

The chicken-and-egg, stated plainly: consumers need a dense feed; a dense feed needs
contributors; contributors need an audience to feel useful. PennyForge breaks the loop by making
**the first 50 users contributors, not consumers** — hand-picked hunters who get value from the
tool itself (scan verdicts, scoring, their own trust graph) even when the feed is thin. Consumers
arrive at phase two, after there is something to consume.

What makes the product useful before density:

1. **Education content has standalone value.** Clearance lifecycle guides, price-ending stage
   decoding, and shelf-tag reference material are useful with zero leads in the feed — this is
   the proven PennyCentral/Endless SEO engine (README.md). It also becomes the Phase 2 SEO
   corpus.
2. **Founder-seeded leads.** Weeks of founder store runs mean the feed is never empty on day one
   for the launch metro.
3. **Bounty missions, run manually.** Bounty tooling is Phase 2 (docs/product-spec.md), so at
   launch a captain pins a weekly "verify these 5 stale high-value leads" mission. Verification
   trips give new hunters a concrete first task and refresh decayed leads at the same time.
4. **Single-retailer focus concentrates liquidity.** Every report, scan, and guide compounds on
   one retailer's mechanics instead of spreading across four.
5. **The free 4h-delayed Scout feed still demonstrates value.** Penny leads live for days, not
   minutes, so a 4-hour delay proves the data is real while preserving the instant-alert upgrade
   reason for Pro.
6. **Founder lifetime tier converts early believers.** Launch-window-only lifetime Pro, capped at
   100 seats at a hypothesis price of $79 one-time (roughly one year of Pro at the $79.99/yr
   hypothesis — price-test before committing). Scarcity is real: the cap never re-opens.

## 4. First 500 users plan (weeks 1–12)

Week 1 = hosted-beta launch week (start of roadmap Phase 1). All weekly figures are cumulative
signup **targets, not predictions**, set to force honest weekly review.

**Activation definition: first report submitted within 7 days of signup.** Chosen over scan+vote
because reports are the scarce asset at cold start — a vote needs an existing report to act on,
and the feed's liquidity, the trust engine, and the evidence rate all run on report volume.
Scan+vote becomes a secondary "consumer activation" metric once density exists (tracked from
Phase B onward, not a gate).

| Weeks | Phase | Cumulative signup target | Channels | Concrete pitch | Activation target (hypothesis) | Budget (assumption) |
|---|---|---|---|---|---|---|
| 1–4 | 0 → 50: hand recruitment | W1 10 · W2 25 · W3 35 · W4 50 | Captain recruitment; direct outreach (DMs) to active local posters; open participation in local FB groups/Discords; founder store runs seeding the feed | "You already do this in a Facebook group. Here your finds get receipt-verified, scored, and credited — and top contributors ride free." | ≥ 70% of new users submit a report in week 1 | ~$150/wk: founder gas + penny/clearance test purchases; $0 paid ads |
| 5–8 | 50 → 200: referral + creators | W5 75 · W6 110 · W7 150 · W8 200 | Referral mechanic (referrer and referee each get 1 week of Pro credit when the referee activates — hypothesis, uses the contributor-credit system); 1–2 creator walkthroughs/shoutouts; manually produced haul-recap share cards ("$3.41 spent · $212 retail") posted by captains and creators | "Verified penny map for New Orleans Home Depots — here's my haul and the exact route." | ≥ 40% of new users submit a report in week 1 | ~$100/wk founder gas; creator comp is free Reseller tier, $0 cash |
| 9–12 | 200 → 500: content + scarcity | W9 260 · W10 330 · W11 410 · W12 500 | Education/SEO pages start landing search traffic (published from week 1, indexing by now); creator TikTok/short-form penny-find content; Founder-tier scarcity push ("100 lifetime seats, never re-opened"); second monthly meetup | "The trust layer the penny community never had — 4h-delayed feed free, lifetime Pro for the first 100 believers." | ≥ 25% of new users submit a report in week 1 (consumer share rising by design) | ~$100/wk gas + ~$200 one-time meetup/printing; $0 paid ads |

Total 12-week cash outlay target: under $2,000 (assumption — founder gas, test purchases, meetup
incidentals; zero paid acquisition). Labor is founder time plus captain/creator time compensated
in free tiers.

### Launch metrics (all targets are hypotheses to revisit every Friday)

| Metric | Hypothesis target | Notes |
|---|---|---|
| New-user activation (report in week 1) | ≥ 70% (weeks 1–4) → ≥ 40% (5–8) → ≥ 25% (9–12) | Declines by design as consumers join; below-floor = recruiting the wrong users |
| Evidence-attach rate on surfaced leads | ≥ 60% | Phase 1 exit criterion (README.md) |
| WAU | 100 by week 8 · 250 by week 12 | Week-8 figure is the roadmap's Phase 1 exit target |
| D30 retention | ≥ 30% contributors · ≥ 15% overall | No niche benchmark found — treat as a starting guess, not a standard |
| Minimum viable density held | ≥ 25 fresh verified leads/wk across ≥ 6 stores from week 6 onward | Section 1 table; the density gate for ever opening metro #2 |

If signups run ahead of activation or density, slow acquisition and fix contribution — 500
signed-up spectators over an empty feed is a failed launch that merely looks like a successful
one.

## 5. What we deliberately do NOT do at launch

- **No national marketing.** Every user outside driving range of a covered store gets a dead
  feed, churns, and remembers the product as empty. National attention before density burns the
  only first impression the wedge metro gets.
- **No paid ads at cold start.** Paid traffic delivers consumers, and consumers are worthless
  before density — they'd land on a thin feed and bounce. The first 200 users must come from
  hand-picked, high-intent channels where activation (a submitted report) is plausible. Revisit
  paid only after Phase 2 subscriptions exist and CAC can be measured against real LTV.
- **No multi-retailer sprawl.** Lowe's/Dollar General/Walmart leads would fragment scarce
  contributor attention and dilute the Home Depot education moat. Seed data for other retailers
  stays dormant until the wedge metro holds minimum viable density for 4+ consecutive weeks
  (hypothesis gate).
- **No Discord-hosted community.** Discord and Telegram are outbound delivery channels only,
  never the community's home and never data sources (README.md, docs/compliance.md). Hosting the
  community on Discord recreates the exact screenshot-chaos product PennyForge exists to replace,
  hands the community graph to a platform we don't control, and forfeits the trust-scored UX
  that is the differentiator.
- **No gray-data shortcuts under launch pressure.** Cold starts tempt teams toward "just this
  once" scraping or competitor-list seeding. The allowlist in `lib/compliance.ts` is
  load-bearing; a launch that violates it has already failed, whatever the WAU chart says.

Each restraint protects the same asset: one metro where the feed is visibly alive, the evidence
rate is high, and the route planner has real routes. That is the demo that earns metro #2.
