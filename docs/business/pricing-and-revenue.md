> Part of the PennyForge business strategy series — see docs/business/README.md.

# Pricing & Revenue

Every dollar figure in this document is a hypothesis, an estimate, or a labeled scenario.
Nothing here is a forecast. Numbers get promoted from "hypothesis" to "plan" only after
landing-page tests and post-Stripe cohort data (Phase 2). Where a public source exists it is
cited inline; where it does not, the number is marked as an assumption.

## 1. Why people would pay instead of staying in Discord

Paid Discord communities (the Deal Soldier model, $44/mo via Whop) sell four things:

1. **Speed** — someone posts a find and 5,000 people see it in minutes.
2. **Curation** — mods filter noise; the good channels feel high-signal.
3. **Belonging** — a named community, inside jokes, status, live wins.
4. **Education** — markdown-cycle guides, tag decoding, "how to hunt" onboarding.

What a chat platform structurally cannot deliver, no matter how good the mods are:

- **Locality.** A national #penny-finds channel is mostly noise for a shopper in Lafayette, LA.
  Discord has no concept of "within 25 miles of me."
- **Searchable structured history.** A find is a message. Three weeks later it is 40,000
  messages up-scroll. There is no per-UPC, per-store record you can query in the aisle.
- **Per-store confidence.** Chat carries no evidence weighting, no reporter trust, no decay,
  no dead-vote suppression. A screenshot from an unknown account and a receipt from a
  500-confirmation contributor look identical.
- **Alert latency tuned to your ZIP.** Discord pings everyone or no one. PennyForge alerts
  fire only on high-confidence leads near you, deduped, quiet-hours-aware.
- **Route math.** Nobody in chat ranks a Saturday circuit by expected value minus gas cost.
- **Proof.** A $0.01 receipt line is evidence; a cropped screenshot is a rumor. Chat cannot
  distinguish them; our scoring engine exists to.

**What Discord does better — and we should not fight:** live banter, reaction culture, the
feeling of a room. PennyForge does not try to out-chat Discord. Discord and Telegram remain
outbound delivery channels only (per docs/compliance.md, never data sources); the product's
job is the structured layer chat cannot be. A user can stay in their free Facebook group for
belonging and still pay us for locality, confidence, and routing.

Per persona:

| Persona | Job to be done | Why chat fails them | What they'd pay for |
|---|---|---|---|
| Casual penny hunter | "Is anything worth a stop near me this week?" | Scroll fatigue; national noise | Mostly nothing — they are the free tier and the voting base |
| Serious clearance shopper | "Plan a high-ROI trip; don't drive to dead leads" | No locality, no freshness, no route math | Instant local alerts, route planner, watchlists (Pro) |
| Reseller | "What did my finds actually net after fees and gas?" | Zero P&L tooling anywhere in the niche | Comps, haul P&L, CSV export, ROI analytics (Reseller) |

## 2. Pricing hypothesis

Competitive anchors (prices from README.md competitive research; treat as approximate and
re-verify at launch):

| Competitor | Price | What the price buys |
|---|---|---|
| PennyCentral / Facebook groups | Free | Unscored lists, community chatter |
| Penny Finder (iOS) | $2.99 one-time | Stale single-retailer UPC list |
| BrickSeek | ~$9.99 / ~$29.99 mo | Lookups + alerts, stale gray data, no trust layer |
| Penny app (iOS) | $14.99 / $29.99 mo | Curated lists, punitive scan metering |
| Deal Soldier | $44/mo | Community + speed + education (revenue claim unverified — see §5 sanity check) |

**The defensible slot is between BrickSeek and Deal Soldier.** Below ~$10/mo we anchor
against BrickSeek's familiar price while selling something it does not have (verified data,
locality, routing). Above ~$20 we start competing with Deal Soldier's community-and-speed
bundle, which we deliberately do not sell. Pricing hypothesis (unchanged from README):

- **Pro $9.99/mo or $79.99/yr** — matches BrickSeek's low tier, undercuts Deal Soldier ~4.4x.
  Willingness-to-pay logic: one confirmed hidden-clearance trip ($30–100 saved, estimate)
  pays for months of Pro. The serious shopper already spends more than $9.99/mo in gas
  chasing unverified leads.
- **Reseller $19.99/mo or $159.99/yr** — priced against the value of P&L clarity, not
  against lookup tools. A reseller clearing an estimated $200–1,000/mo (assumption; varies
  wildly) treats $19.99 as a business expense, especially with CSV export for bookkeeping.
- **Scout free** — the flywheel tier; see §3.

**Monthly vs annual.** Annual is priced at ~33% off (12 × $9.99 = $119.88 vs $79.99;
12 × $19.99 = $239.88 vs $159.99). That is aggressive on purpose: in a churn-prone deal
niche, annual prepay is churn insurance and smooths penny-cycle seasonality. Target mix
assumption: 70% monthly / 30% annual at steady state (assumption; measure from month one).

**7-day trial.** Mirrors Deal Soldier's intro offer so trial length is never the objection.
Seven days is long enough to catch at least one weekend hunt (the natural aha moment: an
alert that leads to a verified find) and short enough to keep trial-abuse cost low. Card
required on web trial to filter tourists; revisit if trial-start rate is poor.

## 3. Free vs paid tier design

**What must stay free — the data flywheel.** PennyForge's moat is first-hand, in-store,
user-generated reports (docs/compliance.md). Anything that produces or validates data must
never sit behind the paywall:

- **Report submission** — free and unlimited (fraud-rate-limited, never monetization-limited).
- **Confirm/dead voting** — free; this is how freshness and dead-vote suppression work.
- **Basic scanning/search** — enough free lookups that in-aisle verification stays viable.
- **Contributor credits** — verified contributions earn Pro time, applied server-side (not
  Apple IAP). The best data producers ride free by design; that is the moat compounding.

Paywalling contribution would starve confidence scoring, freshness decay, and alerts — the
exact things paid users pay for. Charge for **consumption advantages**, never production.

**What gates cleanly** (value asymmetries that do not touch the flywheel): latency (4h feed
delay on free), alert immediacy, route planning, multi-state breadth, watchlist capacity,
history/analytics, and export.

| Tier | Price (hypothesis) | Gets |
|---|---|---|
| **Scout** (free) | $0 | State feed (4h delay), 5 scans/day, manual search, voting, **unlimited reports** |
| **Pro** | $9.99/mo · $79.99/yr | Instant high-confidence alerts, unlimited scans, route planner, watchlists (10 URLs), scan history, digest controls |
| **Reseller** | $19.99/mo · $159.99/yr | Pro + profit calculator with live comps, haul P&L + CSV export, multi-state feeds, 50 watchlist URLs, ROI analytics |
| **Founder** | one-time, limited window | Lifetime Pro + founder badge (see §4 mechanics) |

**Deviations from the README hypothesis (explicit):**

1. **Scout "limited reports" → unlimited reports.** The README caps free reports; this doc
   recommends removing that cap. Reports are the product's raw material — capping them to
   sell upgrades is paying-for-our-own-inventory in reverse. Keep anti-fraud rate limits only.
2. **Scan metering never applies to scans attached to a report submission.** The 5/day cap
   meters free *lookups*; a scan that becomes a report is contribution and stays free. This
   also avoids the "punitive metering" resentment documented against the Penny app.
3. **Founder tier sells web-only (Stripe) during its window.** The window opens at Phase 2
   Stripe launch and closes before Phase 4/5 App Store launch, so no StoreKit non-consumable
   is needed unless the window is deliberately reopened at iOS launch.

## 4. Deliverable: pricing scenarios

| Scenario | Pro | Reseller | Expected effects (all directional assumptions) |
|---|---|---|---|
| **Undercut** | $6.99/mo · $59.99/yr | $14.99/mo · $119.99/yr | Higher conversion (+20–40% vs Base, assumption), lower ARPPU, "cheap tool" positioning risk, thin margin after fees; hard to raise later without churn spike |
| **Anchor** (Base — README) | $9.99/mo · $79.99/yr | $19.99/mo · $159.99/yr | BrickSeek-familiar price point; clean "verified data at gray-data prices" story; room to discount via credits and win-backs |
| **Value-priced** | $12.99/mo · $99.99/yr | $24.99/mo · $199.99/yr | Lower conversion (−20–30%, assumption), higher ARPPU, premium positioning; defensible only after alert density is proven in ≥2 metros |

**Test Anchor first.** It is the README hypothesis, it maps to the competitive slot argument
in §2, and discounting down (credits, promos, win-back offers) is far cheaper than repricing
up. Undercut is the fallback if Phase 2 trial→paid conversion lands under ~5% (assumption
threshold); Value-priced is a later experiment gated on demonstrated alert ROI, not a launch
option.

**Founder-lifetime mechanics (the cold-start incentive):**

- Price hypothesis: **$149 one-time** (≈ 1.9 years of annual Pro; range to test: $129–$199).
- Cap: **200 seats or 60 days** after Stripe launch, whichever first. Scarcity must be real —
  publish the counter, never quietly extend.
- Grants lifetime **Pro**, not Reseller (protects the highest-ARPPU tier), plus founder badge
  and first access to betas.
- Revenue treatment: recognize as deferred/one-time, not MRR. 200 × $149 = **$29,800 gross**
  (scenario ceiling, not a projection) — meaningful Phase 2 runway, capped so it cannot
  cannibalize more than ~200 potential subscriptions.

**Price-test plan:**

1. **Pre-Stripe (Phase 1): landing-page tests.** Three price variants shown to split traffic
   with a "Notify me at launch" email capture as the conversion proxy. Minimum ~300 visitors
   per arm before reading anything (heuristic, not a power calculation). Fake-door only on
   price display — never take money before Stripe is live.
2. **Post-Stripe (Phase 2): cohort A/B on new sign-ups only.** One variable at a time
   (price level, then trial length, then annual-offer placement). 60–90 day windows so
   early churn is visible, not just conversion. Existing subscribers are never repriced;
   grandfathering is permanent and stated publicly.
3. **Annual-mix test:** offer annual at checkout vs. after the first paid month; measure
   90-day net revenue per cohort, not take-rate alone.

## 5. Deliverable: revenue scenario math

**Assumptions (all labeled):**

- Free→paid conversion of registered users: **2% conservative / 4% base / 7% optimistic**.
  The commonly cited freemium rule of thumb is 2–5% of registered users (industry
  rule-of-thumb range, not a measured PennyForge number — assumption). 7% assumes the
  high-intent niche outperforms generic freemium; treat as the stretch case.
- Paid mix: **85% Pro / 15% Reseller** (assumption; resellers likely grow as P&L tools mature).
- Billing mix: **70% monthly / 30% annual** (assumption from §2).
- Monthly churn on payers: **8% conservative / 6% base / 4% optimistic** (assumption; deal
  communities churn high — see §6). Milestone tables below are snapshots of payer counts;
  churn sets the gross adds needed to hold them (shown after the tables).

**Blended revenue per paying user per month (ARPPU) — derivation:**

```
Pro effective  = 0.7 × $9.99  + 0.3 × ($79.99/12  = $6.67) = $6.99 + $2.00 = $8.99/mo
Rsl effective  = 0.7 × $19.99 + 0.3 × ($159.99/12 = $13.33) = $13.99 + $4.00 = $17.99/mo
Blended ARPPU  = 0.85 × $8.99 + 0.15 × $17.99 = $7.64 + $2.70 = $10.34/mo
```

**Milestone scenarios** (`MRR = registered × conversion × $10.34`; ARR = MRR × 12; rounded):

| Registered users | Conservative (2%) | Base (4%) | Optimistic (7%) |
|---|---|---|---|
| **500** (Phase 2, Stripe just live) | 10 payers → **$103 MRR** ($1.2k ARR) | 20 payers → **$207 MRR** ($2.5k ARR) | 35 payers → **$362 MRR** ($4.3k ARR) |
| **5,000** (multi-metro) | 100 payers → **$1,034 MRR** ($12.4k ARR) | 200 payers → **$2,068 MRR** ($24.8k ARR) | 350 payers → **$3,619 MRR** ($43.4k ARR) |
| **50,000** (post-App-Store) | 1,000 payers → **$10,340 MRR** ($124k ARR) | 2,000 payers → **$20,680 MRR** ($248k ARR) | 3,500 payers → **$36,190 MRR** ($434k ARR) |

The 500-user row will likely underperform its own column: conversion needs live alert density,
which barely exists at 500 users in one metro. Treat that row as a mechanism check, not a target.

**Churn arithmetic (what the snapshot hides):** holding N payers at monthly churn c requires
N × c gross new payers per month. Base case: 200 payers × 6% = **12 new payers/mo** at the
5,000-user milestone; 2,000 × 6% = **120/mo** at 50,000. Implied lifetime value per payer
(LTV ≈ ARPPU ÷ churn, simple model, assumption): $129 conservative / $172 base / $259
optimistic.

**Cost sketch (estimates):**

| Cost | ~500 users | ~5,000 users | ~50,000 users |
|---|---|---|---|
| Hosting (VPS/Render + Postgres + object storage) | $30–75/mo | $100–250/mo | $400–1,000/mo |
| Email/push delivery (Apprise + SMTP provider) | $0–20/mo | $20–50/mo | $100–300/mo |
| Stripe fees — 2.9% + $0.30 per charge ([stripe.com/pricing](https://stripe.com/pricing), checked 2026-07-09) | ~4–6% of web MRR ($0.59 on a $9.99 charge = 5.9%; $2.62 on $79.99 = 3.3%) | same | same |
| Apple commission — 15% under the Small Business Program (<$1M/yr proceeds), 30% standard ([developer.apple.com](https://developer.apple.com/app-store/small-business-program/), checked 2026-07-09) | n/a (no IAP until Phase 4) | n/a | 15% of iOS-originated subscriptions only |
| Moderation | founder time | founder + captain Pro credits | part-time mods, est. $500–2,000/mo |
| Misc (domain, monitoring, backups, legal reserve) | $10–30/mo | $30–100/mo | $100–500/mo |

Contributor credits are a real cost too: every credited month is forgone MRR. Budget
assumption: credits ≤10% of paid-equivalent seats, tuned so top contributors ride free
without hollowing out conversion.

**Break-even framing (estimates):** infrastructure-only break-even is roughly $155–360 MRR
(15–35 payers at the $10.34 ARPPU) — inside the base case at even 500 registered users. The honest break-even
includes a founder salary: at $6,000–8,000/mo fully loaded (assumption), break-even is
$6,000–8,000 ÷ $10.34 ≈ **580–775 payers**, i.e. roughly 14,500 registered users at 4%
conversion or 38,700 at 2%. That places full-cost break-even between the 5,000 and 50,000
milestones — consistent with the roadmap's expectation that Phases 1–3 are investment, not
income.

**Sanity check — the Deal Soldier claim (UNVERIFIED; do not treat as fact):** reviewers
citing Whop stats have claimed Deal Soldier revenue above $200k/mo. If roughly true, at
$44/mo that implies ~4,500+ paying subscribers for a Discord community in this niche; if
only a quarter true (~$50k/mo), it still implies ~1,100 payers at 4.4x our Pro price.
Either bound says the niche contains a four-figure population willing to pay real money.
PennyForge's model does not depend on the claim: the base 50,000-user scenario needs 2,000
payers at a $10.34 blended ARPPU — fewer subscribers than the claim implies, at less than a
quarter of the price, on a compliance footing that survives the C&D wave gray-data rivals
will not.

## 6. Deliverable: risks to monetization

| Risk | Why it hits revenue | 1-line mitigation |
|---|---|---|
| Penny-cycle volatility / retailer countermeasures | Retailers compress cycles or tighten pulls; the viral hook dries up and Pro churn spikes | Position pennies as the hook, hidden clearance + reseller P&L as the durable paid value (README "retailer-countermeasure resilience") |
| Free-substitute pressure (PennyCentral, Facebook groups) | "Why pay when the list is free?" caps conversion | Sell what free lists structurally lack — locality, confidence, freshness, routing — and keep Scout genuinely useful so free users become contributors, not defectors |
| Data-liquidity chicken-and-egg | Alerts are only worth $9.99 at report density; density needs users we don't have yet | Single-metro depth first (Louisiana, Home Depot only), captains + Founder scarcity + contributor credits to buy density before charging for it |
| Paywall cannibalizing the contribution flywheel | Gating reporting/voting starves the scoring engine that paid tiers sell | Contribution is never paywalled (§3 deviations 1–2); gate consumption latency and tooling only |
| Gray-data rivals' raw speed | Endpoint pollers see markdowns before humans do; speed-sensitive users churn to them | Concede raw speed; win on verified accuracy, per-store confidence, and route ROI — and outlast rivals' C&D/endpoint-rotation breakage |
| App Store fees and review risk | 15–30% commission compresses iOS margin; Apple has rejected deal apps | PWA-first hedge, web (Stripe) as primary billing, server-side entitlements, Small Business Program enrollment, etiquette/moderation positioning per Phase 4 review package |
| Seasonality | Clearance waves cluster (seasonal resets); MRR sawtooths between waves | Push annual plans (33% discount as churn insurance), digest/watchlist features that retain between waves, pause-instead-of-cancel offer |
| Churn/refund culture in deal communities | Subscribe-for-one-haul-then-cancel behavior; chargeback exposure | 7-day trial absorbs tourists, annual mix, win-back offers, clear refund policy, and contributor credits that convert cancellers into free contributors instead of detractors |

Every mitigation above must stay inside the compliance allowlist (docs/compliance.md); none
of them requires scraping, private endpoints, or competitor data — by design.
