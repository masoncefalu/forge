> Part of the PennyForge business strategy series — see docs/business/README.md.
> Compressed handoff packet consolidating pricing-and-revenue.md, launch-plan.md,
> community-and-contributors.md, growth-channels.md, and reseller-and-expansion.md. Read those
> five docs for full reasoning, citations, and worked math; this packet is the fast-reference
> summary for downstream planning (product, ops, or a follow-on agent).

# PennyForge — Business Packet

**Every number below is a labeled estimate, assumption, target, or scenario — none are
predictions or commitments.** Any competitor revenue figure (e.g., Deal Soldier's reported
>$200k/mo) is explicitly unverified and never treated as fact anywhere in this series.

## Thesis

Penny items ($0.01 clearance-exhaustion pricing) are the viral hook. Hidden clearance (30–90%
off), receipt proof, route ROI, and reseller P&L tooling are the durable, paid retention engine.
PennyForge does not out-scrape gray-data rivals or out-chat Discord communities; it wins on
**trust, workflow, and community economics** inside a hard compliance allowlist (no scraping, no
private endpoints, no competitor data ingestion — `docs/compliance.md`). If penny cycles
compress or retailers stop honoring pennies, the hidden-clearance + reseller-P&L core survives
independent of penny volume (see reseller-and-expansion.md §4).

## Tiers (pricing hypothesis)

| Tier | Price | Gets | Note |
|---|---|---|---|
| Scout (free) | $0 | 4h-delayed state feed, 5 scans/day (report-linked scans exempt), manual search, voting, **unlimited reports** | Contribution is never paywalled — it's the data flywheel |
| Pro | $9.99/mo · $79.99/yr | Instant alerts, unlimited scans, route planner, 10 watchlist URLs, scan history | Anchors between BrickSeek (~$9.99) and Deal Soldier ($44) |
| Reseller | $19.99/mo · $159.99/yr | Pro + profit calculator (eBay/Amazon comps), haul P&L + CSV export, multi-state feeds, 50 watchlists, ROI analytics | Highest LTV persona — see below |
| Founder | $149 one-time, capped 200 seats / 60 days | Lifetime Pro + badge | Web-only via Stripe; cold-start scarcity lever, not MRR |

Contributor credits (Pro-days, server-side, not Apple IAP) let top data producers ride free —
detailed ladder in community-and-contributors.md §2.

## Launch wedge

**New Orleans metro · Home Depot · penny items only.** One retailer concentrates liquidity; one
metro gives the route planner enough store density (~8 HD locations, estimate) to produce real
multi-stop routes; pennies are the highest-proof, most viral mechanic. No national marketing, no
paid ads, no multi-retailer sprawl, no Discord-hosted community at launch (launch-plan.md §5).

**Minimum viable density (hypothesis targets):** ≥25 fresh verified leads/metro/week, ≥6 of ~8
stores with a confirmed report in the trailing 7 days, ≥60% evidence-attach rate (this is also
the README Phase 1 exit criterion), median lead age ≤48h.

## First 500 users (weeks 1–12, targets not predictions)

| Weeks | Target (cumulative) | Primary channels | Activation gate |
|---|---|---|---|
| 1–4 | 50 | Founder store runs seed the feed; 2–3 captains recruited; direct outreach to active local posters; open (non-scraping) participation in local FB/Discord groups | ≥70% of new users submit a report in week 1 |
| 5–8 | 200 | Referral credits; 1–2 creator walkthroughs; manual haul-recap share cards | ≥40% |
| 9–12 | 500 | SEO pillar pages start indexing; short-form creator content; Founder-tier scarcity push | ≥25% (consumer share rising by design) |

Activation = first report submitted within 7 days (reports are the scarce cold-start asset, not
votes). Target 12-week cash outlay: under $2,000 — zero paid acquisition. Full detail:
launch-plan.md §4.

## Contributor rewards (hypothesis ladder)

| Action | Credit | Cap |
|---|---|---|
| Receipt-verified, confirmed report | 3 Pro-days | 30 Pro-days/mo shared cap |
| Shelf-tag-verified, confirmed report | 2 Pro-days | same shared cap |
| Bounty: re-verify a stale high-value lead | +2 Pro-days | 5 bounties/mo |
| Referral: referred user's first report confirmed | 7 Pro-days | 3/mo |

Credits require evidence-backed **and** community-confirmed reports (never raw submissions), sit
under a 45 Pro-day/month global cap, and are protected by velocity/geo checks, a probation lane
for new accounts, and fraud clawback. Cash bounties are an explicit later experiment, not a
launch commitment (fraud surface too large to price in yet). Captains (2–3/metro): trust score
≥85, get free Reseller tier + moderation tools, owe a moderation SLA. Full detail:
community-and-contributors.md §2–3.

## Growth channels (Phase 1 → Phase 2 sequencing)

| Channel | Phase focus | Why |
|---|---|---|
| Local community participation (captains/founder posting as members, never ingesting) | 1 | Near-zero cost, recruits contributors not spectators |
| Micro-creator affiliate outreach (5k–50k followers, 30% first-year rev-share hypothesis) | 1 | Cheap, authentic, local-relevant; roadmap already targets 1–2 local reseller creators |
| SEO/education content (12-week, 2 posts/wk pillar+retailer+local+tooling pages) | 2 (drafted in 1) | Proven in-niche (PennyCentral/Endless precedent); 3–6 month lag means start early |
| Partner Discord/Telegram webhooks (free delayed local feed for server owners) | 2 | Distribution without dependency — chat is delivery only, product stays canonical |
| Referral program | 2, after ~500 users | Needs an active base to refer into |
| Paid acquisition | Deferred | No LTV data yet; revisit after 2–3 months of Stripe cohorts |

State/metro SEO pages ship only above a verified-data density threshold — no thin doorway pages.
Full detail: growth-channels.md.

## Reseller ROI tools & expansion

Reseller tier breaks even on one $20+ flip or one skipped negative-ROI trip per month (worked
example in reseller-and-expansion.md §1, using `lib/route.ts`'s real gas-cost math). Tool suite:
profit calculator (eBay/Amazon official APIs), haul P&L + CSV export (bookkeeping/tax angle,
general info not tax advice), ROI-per-trip analytics, multi-region filters, rate-limited/
watermarked exports (leak-tolerant by design, not leak-proof).

**Retailer sequence:** Home Depot (launch) → Lowe's → Dollar General → Walmart → Target, each
gated on the prior retailer holding density thresholds, not a calendar date. **Geography:** Gulf
South metro → Louisiana statewide → adjacent Southeast metros → national — density before
breadth, every step. Full detail: reseller-and-expansion.md §2–3.

## Revenue scenario math (cohort-based, illustrative only)

Blended ARPPU (85% Pro / 15% Reseller, 70% monthly / 30% annual mix): **$10.34/mo**.
`MRR = registered users × conversion rate × $10.34`.

| Registered users | Conservative (2% conv.) | Base (4% conv.) | Optimistic (7% conv.) |
|---|---|---|---|
| 500 | $103 MRR | $207 MRR | $362 MRR |
| 5,000 | $1,034 MRR | $2,068 MRR | $3,619 MRR |
| 50,000 | $10,340 MRR ($124k ARR) | $20,680 MRR ($248k ARR) | $36,190 MRR ($434k ARR) |

Conversion range (2–5% freemium rule of thumb, 7% as a stretch case) and churn (8%/6%/4%
monthly) are both labeled industry-heuristic assumptions, not measured PennyForge numbers.
Full-cost break-even (including a founder-salary assumption) lands between the 5,000- and
50,000-user milestones — roughly 580–775 payers. **Sanity check:** even if Deal Soldier's
unverified >$200k/mo claim were true, it implies ~4,500 payers at $44/mo; PennyForge's base
50,000-user scenario needs only 2,000 payers at under a quarter of that price — the model does
not depend on the unverified claim holding. Full derivation: pricing-and-revenue.md §5.

## Top risks to monetization (with mitigation)

1. **Penny-cycle volatility / retailer countermeasures** — pennies are the hook, hidden clearance
   + reseller P&L is the foundation (see expansion doc §4 for the falsifiable leading indicators).
2. **Free-substitute pressure** (PennyCentral, free FB groups) — sell what free lists structurally
   lack: locality, confidence scoring, freshness, routing.
3. **Data-liquidity chicken-and-egg** — alerts are only worth paying for at density; solved by
   single-metro depth, founder seeding, captains, and Founder-tier scarcity before charging.
4. **Paywall cannibalizing the contribution flywheel** — contribution (reports, votes, basic scan)
   is never gated; only consumption advantages (latency, routing, analytics, export) are.
5. **Gray-data rivals' raw speed** — concede speed, win on verified accuracy and route ROI; rivals
   remain one C&D or endpoint rotation from breaking, we don't.
6. **App Store fees/review risk** — PWA + Stripe-first hedge, server-side entitlements, Small
   Business Program enrollment, etiquette/moderation positioning for Guideline 1.2/3.1.1.
7. **Seasonality and churn/refund culture** — annual-plan push (churn insurance), 7-day trial to
   absorb tourists, win-back offers, contributor credits to convert cancellers into free
   contributors instead of detractors.
8. **Reseller-tier data leak via export** — delayed export, per-account watermarking, rate limits,
   ToS; some leakage is accepted as the cost of not crippling the product's own differentiator.

Full risk detail and mitigations: pricing-and-revenue.md §6.

## Cross-references

| Topic | Source doc |
|---|---|
| Full pricing logic, tier deviations, price-test plan | pricing-and-revenue.md |
| Launch wedge reasoning, cold-start mechanics, week-by-week plan | launch-plan.md |
| Contribution psychology, reward rules, captain program, retention loops, moat | community-and-contributors.md |
| Creator outreach template, SEO calendar, Discord/Telegram distribution model | growth-channels.md |
| Reseller tool build order, retailer/geo expansion criteria, penny-death resilience | reseller-and-expansion.md |
