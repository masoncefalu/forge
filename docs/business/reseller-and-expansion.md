> Part of the PennyForge business strategy series — see docs/business/README.md.

# Reseller ROI Tools & Expansion Path

Every dollar figure, adoption number, and criterion threshold in this document is a labeled
estimate, assumption, or hypothesis unless a source is cited inline. Nothing here is a forecast.

## 1. Why resellers are the highest-LTV persona

Resellers are the one persona for whom PennyForge's subscription is a **business expense, not a
hobby cost** — the profit calculator, haul P&L, and ROI analytics only need to pay for themselves
once per month to justify the price, because the alternative isn't "no app," it's "worse bookkeeping
and blinder buying decisions."

**Worked example (assumptions labeled):**

| Input | Value | Status |
|---|---|---|
| Reseller tier price | $19.99/mo | from pricing-and-revenue.md §2 |
| Store trips per month | 6–10 | assumption; varies by market and how much time reselling is a side vs. full activity |
| Net profit per profitable flip (after resale fees, cost basis, gas) | $40–120 | assumption; wide range because it is find-dependent, not tool-dependent |
| Round-trip gas cost avoided per skipped negative-ROI trip | ~$3–6 | derived from `lib/route.ts` `DEFAULT_COST_PER_MILE = $0.15/mi` at a 10–20 mile round trip |
| Time value per skipped negative-ROI trip (1–2 hrs at $15/hr) | $15–30 | assumption |

The tier breaks even if the tool contributes to **one** additional profitable flip worth $20+ net
in a month, or helps a reseller correctly skip **one** dead-lead trip using the route planner's
existing negative-ROI exclusion (`lib/route.ts`: routes with `routeScore <= 0` are filtered out
before ranking). Either alone roughly covers the subscription; a reseller doing 6–10 trips/month
who avoids even one wasted trip *and* closes one extra flip clears the cost several times over.
This is the "trivial against margins" framing: the tool does not need to find deals for the
reseller — it needs to stop them from driving to bad ones and to tell them what the good ones are
actually worth.

**Frequency compounds in both directions.** Resellers hit more stores per week than casual
hunters (assumption, unverified against real usage data), which means they generate
proportionally more reports — more contribution to the scoring engine (`lib/scoring.ts`) — while
also consuming more alerts, more route plans, and more comps lookups. They are simultaneously the
best supply-side and best demand-side users, which is the flywheel described in
`docs/business/community-and-contributors.md` sharpened to its highest-frequency case.

**LTV comparison, using the pricing doc's own numbers.** `pricing-and-revenue.md` §5 derives
blended effective ARPPU per tier (70% monthly / 30% annual mix): Pro = $8.99/mo, Reseller =
$17.99/mo. Applying that doc's blended payer-churn scenarios (8% conservative / 6% base / 4%
optimistic) per tier as a simplifying assumption (no tier-specific churn data exists yet — this
needs real cohort data before it graduates past hypothesis), LTV ≈ ARPPU ÷ churn:

| Tier | Conservative (8% churn) | Base (6% churn) | Optimistic (4% churn) |
|---|---|---|---|
| Pro | $112 | $150 | $225 |
| Reseller | $225 | $300 | $450 |

Reseller LTV comes out ~2× Pro LTV at the same churn rate, purely from the price gap — before
accounting for the retention effect below. **Why retention should be structurally better, not
just priced higher:** once haul P&L and CSV export are embedded in a reseller's actual bookkeeping
workflow (quarterly Schedule C prep — see §2b), the switching cost is no longer "find a cheaper
alert app," it's "rebuild a season of trip-by-trip net-profit history somewhere else." That is the
same lock-in logic as accounting software, not deal-app logic.

**Honest counterpoints — do not skip these:**

- **Resellers are also the most likely persona to churn to a faster data source.** Their business
  depends on being early to a lead; if a gray-data poller consistently beats PennyForge's
  human-verification-gated feed to a high-value hidden-clearance drop, a reseller has the clearest
  economic reason of any persona to defect, C&D risk and stale data notwithstanding (see
  `pricing-and-revenue.md` §6, "gray-data rivals' raw speed"). The P&L/ROI tooling is the
  retention hedge against exactly this risk — it is not competing on speed, it is competing on
  "you can't get bookkeeping-grade P&L from a Discord poller."
- **Penny-reselling volume is capped by inventory reality.** A given store only has so many units
  at a given markdown stage in a given cycle; PennyForge cannot manufacture more penny inventory
  for a reseller no matter how good the alerts are. This caps how much a reseller's *penny* volume
  can grow from using the app alone, and is part of why §2 and §3 both lean toward hidden clearance
  (higher unit value, larger available pool, less winner-take-all) as the more scalable reseller
  value driver over time, not penny volume itself.

## 2. Reseller ROI tool suite

Each tool's compliance footing: none of these ingest anything beyond first-hand user reports and
official affiliate/developer APIs (`docs/compliance.md` allowlist). No purchase data, cost basis,
or fee figures are ever pulled automatically from a checkout flow — automated checkout is a hard
compliance boundary — so haul P&L below is manual-entry by design, not by omission.

**A note on phase numbering:** `README.md` and `docs/product-spec.md` use two different,
unreconciled roadmap schemes — README's Phase 0–6 (weeks/quarters, e.g. Phase 6 "Compounding" =
months 7–12) and product-spec's Phase 0–4 (deliverable groupings, e.g. Phase 3 = "receipt OCR,
multi-stop route optimization, reseller profit calculator..."). The table below cites whichever
document names the feature explicitly and flags the source doc; reconciling the two schemes into
one is out of scope for this document but should happen before Phase-1 planning gets specific.

| Tool | What it does | Why it's worth paying for | Build dependency | Roadmap phase |
|---|---|---|---|---|
| (a) Profit calculator w/ live comps | Looks up a scanned/searched product against eBay and Amazon official APIs to show estimated resale value | Turns "is this worth grabbing?" from a guess into a number, in-aisle | eBay Partner Network approval + Amazon Product Advertising API access; UPC-to-listing matching | product-spec.md Phase 3 ("reseller profit calculator") |
| (b) Haul P&L | Cost basis (manual entry), platform fees, mileage, net-per-trip, CSV export | The bookkeeping angle — see below | User-entered cost basis (no checkout ingestion, by compliance design); fee-schedule presets (manually maintained, no fee API); mileage sourced from route planner's existing `distanceMiles` | README.md Phase 6 ("reseller P&L suite") — (a) ships the comps engine first per product-spec.md Phase 3; (b) is the fuller bookkeeping build named later in README |
| (c) ROI-per-trip analytics | Gas + time cost vs. realized haul value, tracked over trip history | Turns route planning from one-shot into a season-long "is this hobby/business actually profitable" view | Builds on `lib/route.ts`'s existing `expectedValue`/`tripCost` math, extended with a persistence layer and the *realized* values harvested from (b) | README.md Phase 6 (feature brainstorm, reseller suite) |
| (d) Multi-region alerts + advanced filters | Filters by category, markdown stage, minimum resale value, across multiple states | Lets a reseller who drives a wider radius, or works multiple states, run one feed instead of several accounts | Multi-state feeds are already a Reseller-tier line item (pricing doc §3); markdown-stage filtering needs the shelf-tag decoder reference data (README feature brainstorm); min-resale-value filtering needs (a) shipped first | README.md Phase 2 for multi-state feed access (Stripe launch); stage/value filters layer in as (a) and the decoder ship |
| (e) Exportable lists, rate-limited and watermarked | CSV/list export of a reseller's own visible feed, throttled and stamped per account | Same "nobody in the market has this" export value as (b), packaged for reseller workflows outside the app | Needs real per-user auth/entitlements (Phase 1 in both roadmap docs) to stamp exports; export endpoint kept separate from live API access | README.md Phase 6, alongside (b)'s CSV export |

**Affiliate revenue kicker on (a).** eBay's published rate card puts Partner Network commissions
at roughly 1–4% of the sale, varying by category — lower for electronics, higher for fashion and
collectibles ([partnernetwork.ebay.com/our-program/rate-card](https://partnernetwork.ebay.com/our-program/rate-card),
checked 2026-07-09). This is a secondary PennyForge revenue line, not reseller income — it accrues
on click-through from comps lookups, not on the reseller's own resale transaction, and is too thin
per-lookup to model as a meaningful per-user revenue driver on its own; it is worth building
because the comps lookup already has to exist for (a) to work at all, so the affiliate link is a
near-zero-marginal-cost add-on, not a separate feature.

**The bookkeeping/tax angle on (b) — general information, not tax advice.** A US reseller who
treats this as more than a hobby will typically need to report the activity as business income on
Schedule C (Form 1040), which brings a 15.3% self-employment tax on net earnings and a requirement
to make quarterly estimated payments if the reseller expects to owe $1,000 or more in total tax for
the year ([irs.gov/instructions/i1040sc](https://www.irs.gov/instructions/i1040sc),
[irs.gov/newsroom/know-the-difference-between-a-hobby-and-a-business](https://www.irs.gov/newsroom/know-the-difference-between-a-hobby-and-a-business),
checked 2026-07-09). The IRS's own hobby-vs-business test weighs whether the taxpayer "carries out
the activity in a businesslike manner and maintains complete and accurate books and records" — which
is exactly the byproduct haul P&L produces automatically from ordinary app use (cost basis, fees,
net-per-trip, exportable). PennyForge should say plainly, wherever haul P&L output is shown or
exported, that it is not tax advice and the export is a bookkeeping aid, not a filing-ready
substitute for a preparer's judgment.

**The leak risk, addressed directly:** a paying reseller could export a list and republish it to
their own paid Discord or group, effectively reselling PennyForge's data second-hand. Deterrents,
none of which require crippling the export feature that the roadmap and README both call the
market's only real reseller P&L tool:

- **Delayed export** — exported data can carry a modest staleness offset relative to the live
  in-app feed (hours, not days; exact window TBD), so a re-leaked export is worth less than staying
  a real subscriber.
- **Per-account watermarking** — a unique, invisible identifier embedded in export metadata (row
  ordering, hidden field, or similar) so a leaked file traces back to the account that produced it.
- **Rate limits** — capped exports per day/month, sized around legitimate bookkeeping use (a
  reseller exporting their own trip history) rather than bulk feed dumping.
- **ToS** — explicit prohibition on redistribution or resale of exported data, with account
  termination as the enforcement lever once a leak is traced via watermarking.

**Why some leakage is accepted rather than engineered away entirely:** perfect leak-proofing would
require either crippling CSV export (killing the differentiator §2b exists to deliver) or DRM-style
restrictions that punish legitimate bookkeeping use far more than they stop a determined leaker. A
reseller who leaks a watermarked export is still a paying subscriber generating reports and
consuming alerts — the economic damage of a slow trickle of re-shared data is smaller than the
damage of making the paid tier feel hostile to its own paying users. Traceability plus a real ToS
enforcement path is treated as "good enough," not "solved."

## 3. Deliverable: expansion path beyond Home Depot

**Retailer sequence.** Each entry lists labeled entry criteria (what must be true before starting)
and what changes about the product once inside.

| Retailer | Order | Why this position | Entry criteria (labeled hypothesis) | What changes |
|---|---|---|---|---|
| Home Depot | 1 (launch) | README Phase 1: Louisiana-first, HD only, existing seed data and captain plan | None — this is the starting point | Baseline: tag-ending decoder, penny/clearance culture, catalog via Impact (README) |
| Lowe's | 2 | Same shopper profile and tag-decoding culture as HD; a home-improvement penny hunter already checks both stores in practice | HD exit criteria met (README Phase 1: 100 WAU, ≥60% of surfaced leads carrying evidence) in the launch metro; 2–3 captains active; Lowe's-specific shelf-tag/clearance-sticker education content written | Catalog enrichment source is an **open item** — README's affiliate list (HD via Impact, Walmart official API, Target via Impact) does not name a confirmed Lowe's program; assumption is Lowe's runs an affiliate program reachable via Impact or CJ, unverified — until confirmed, Lowe's leads ship on user reports + public UPC databases only, same compliance footing, thinner catalog metadata |
| Dollar General | 3 | Deepest existing penny culture in the competitive set (Penny Finder, $2.99 one-time, DG-only — README competitive table) and the strongest rural-reach argument | Louisiana density holding at HD+Lowe's (both above their WAU/evidence thresholds); at least 1 rural-market captain recruited (different recruiting pool than metro captains) | Different shopper demographic (budget-conscious, smaller-box, more rural footprint); same catalog-source gap as Lowe's — no DG program named in README; DG entry can lean on UGC-only data the way Penny Finder proved viable with zero catalog integration |
| Walmart | 4 | Larger footprint, and an official affiliate/developer API exists for catalog (README); Walmart's Catalog Product API supports filtering by clearance/rollback flags for catalog metadata ([walmart.io/docs/affiliates/v1/catalog-product](https://walmart.io/docs/affiliates/v1/catalog-product), checked 2026-07-09) — metadata only, ground-truth pricing still requires user reports per `docs/compliance.md` | Prior three retailers stable in Louisiana; Walmart-specific education content written (mechanic here is "hidden clearance more than pennies" — different hunt pattern from HD/Lowe's/DG) | Marketing and in-app framing shift from "penny hunting" toward "hidden clearance," since Walmart's dominant mechanic is markdown discovery, not $0.01 terminal pricing |
| Target | 5 | Impact affiliate program confirmed for catalog (README); active, publicly documented clearance-code community culture (community-blogged price-ending patterns, not proprietary — consistent with the allowlist) | Prior four retailers stable; Target markdown-cadence education content written; density check in at least the Louisiana + first adjacent-metro markets | Broadest, most mainstream shopper base of the five — least "penny hunter subculture," most general clearance-seeker; content and onboarding tone adjust accordingly |

**Geographic sequencing** (restates the density-first rule from README's cold-start posture):
Gulf South metro (Phase 1 launch metro) → Louisiana statewide → adjacent Southeast metros →
national. **Density before breadth, every step.** A thin national feed is worse than a deep single
metro — alert value depends on report density (`pricing-and-revenue.md` §6: "alerts are only worth
$9.99 at report density"), and that logic holds identically for the Reseller tier's higher price
point. No retailer or geography expansion should begin before the current one clears its WAU and
evidence-rate thresholds; a captain and reseller-creator presence should exist in a market before
the feed opens there, not after.

**Adjacency expansion — explicitly speculative, not roadmapped:**

- **Grocery/drugstore clearance** — same hidden-clearance mechanic, unverified whether the
  tag-decoding culture or markdown cadence transfers; would need its own community education pass.
- **Salvage/bin stores** — a structurally different inventory model (liquidation pallets, not
  markdown cycles); the confidence-scoring model would need rework since "freshness" and
  "cycle stage" don't map cleanly onto bin-store restocks.
- **Retailer partnership / licensed feeds** — the long-term *sanctioned* path to first-party data
  (README: "retailer partnership exploration... the only sanctioned path to first-party data,"
  Phase 6). This is the only adjacency item with an explicit compliance upside: a licensed feed
  would sit above the allowlist's tier 4 (affiliate feeds/official APIs), not around it.

**Compact sequencing table:**

| Trigger | Expansion step |
|---|---|
| HD Louisiana metro hits 100 WAU, ≥60% evidence-backed leads | Open Lowe's in the same metro |
| Lowe's stable at same thresholds; rural captain recruited | Open Dollar General |
| HD + Lowe's + DG stable statewide in Louisiana | Statewide Louisiana rollout across all three retailers |
| Louisiana statewide density holds; Walmart education content ready | Open Walmart, framing shifts toward hidden clearance |
| Prior four retailers stable; Target content ready | Open Target |
| Louisiana statewide stable across all live retailers | Expand to first adjacent Southeast metro (repeat density-first checks per retailer) |
| Multiple Southeast metros stable | Evaluate national rollout and adjacency categories (grocery/drugstore, bin stores) |
| Any point — retailer relationship opportunity emerges | Evaluate licensed-feed partnership (Phase 6, opportunistic, not scheduled) |

## 4. How expansion protects the business if pennies die

README already states the thesis: "if penny cycles tighten or disappear, the platform is already
a hidden-clearance + reseller-P&L business; pennies were the hook, not the foundation." This
section works through why that holds under specific retailer-countermeasure scenarios, and what
would show the shift happening early.

| Countermeasure scenario | Mechanism | Why the hidden-clearance + reseller-P&L core survives |
|---|---|---|
| Compressed markdown cycles (README: community reporting describes a 13–14 week → ~14 day shift) | Items reach the terminal $0.01 stage faster, shrinking the window a penny hunter has to find and confirm a lead | Hidden clearance (30–90% off, pre-penny stages) is a much larger and more durable inventory-disposition pool than the single terminal stage; a compressed cycle still passes through 30%, 50%, 75% markdowns on the way to $0.01 — those stages aren't shrinking the same way, and the route planner and scoring engine already treat any markdown stage generically, not penny-specifically |
| Tighter pulls (retailers train staff to pull items before they hit penny) | Fewer penny opportunities reach the floor at all | Only affects the terminal stage; pre-penny hidden-clearance leads require no pull-timing luck — the item is legitimately on the floor at a real discounted price the whole time |
| Penny-honoring refusal trends (stores increasingly decline to honor $0.01 rings — community-documented, unverified as a hard trend) | Even a correctly-found penny lead becomes unreliable at checkout | Hidden-clearance verification doesn't depend on employee discretion at all — a 40%-off shelf tag and receipt is just the price, with no "should this be honored" judgment call; this class of lead is structurally immune to the honoring-refusal problem |
| Any of the above, combined | Penny volume trends toward zero over time | Reseller P&L tooling (profit calculator, haul P&L, ROI analytics) is deal-mechanic agnostic — it computes net profit the same way whether the underlying find cost $0.01 or $8; none of §2's tools require penny inventory to keep delivering value |

**Leading indicators to watch (labeled — these are hypotheses about what an early shift would
look like in our own data, not observed trends):**

- Rising share of dead-vote-suppressed penny reports over time (`lib/scoring.ts` dead-vote data)
  would signal more stores refusing to honor penny prices.
- Falling average confirmed-lead age at the penny stage would signal cycle compression continuing
  or accelerating.
- Rising share of reports and alerts landing at non-penny hidden-clearance markdown stages,
  relative to penny-stage reports, would show organic demand already shifting — the pivot showing
  up in usage before it needs to show up in strategy.
- A growing cohort of contributors who report hidden-clearance finds but rarely or never report
  pennies would indicate the product's value already extends past the viral hook for real users.
- Reseller-tier retention holding steady (or improving) while Pro-tier retention dips would
  confirm the P&L/ROI tooling is the sticky layer, independent of penny availability — the
  clearest possible signal that the "hook vs. foundation" thesis is correct in practice, not just
  in the README.

None of these are instrumented yet in the MVP (`docs/product-spec.md` scope); they are listed here
as the metrics worth wiring into analytics once Phase 1/2 telemetry exists, specifically so this
resilience thesis is falsifiable rather than assumed.
