# PennyForge

**Waze for hidden clearance: receipt-verified local deal intelligence, not random Discord chaos.**

PennyForge is a compliance-first penny-item and hidden-clearance deal platform. It combines a community-verified deal feed, a trust-scoring engine, in-store scanning tools, and multi-store route planning — built on lawful data sources only, and designed to make Discord screenshot dumps and stale lookup databases feel obsolete.

> Penny items are the viral hook. Hidden clearance (30–90% off) is the durable market. Receipt proof is the moat.

---

## Table of Contents

- [The Market (What We Know)](#the-market-what-we-know)
- [Competitive Landscape](#competitive-landscape)
- [Why PennyForge Wins](#why-pennyforge-wins)
- [Product: The Core Loop](#product-the-core-loop)
- [Feature Set](#feature-set)
- [Feature Brainstorm (Beyond v1)](#feature-brainstorm-beyond-v1)
- [Design Language — No Cheese Allowed](#design-language--no-cheese-allowed)
- [Architecture](#architecture)
- [Data Sources & Compliance Guardrails](#data-sources--compliance-guardrails)
- [Trust Scoring Engine](#trust-scoring-engine)
- [Monetization & In-App Purchases](#monetization--in-app-purchases)
- [Getting Started (Local MVP)](#getting-started-local-mvp)
- [Roadmap: Local MVP → iOS App Store](#roadmap-local-mvp--ios-app-store)
- [Future-Proofing Decisions](#future-proofing-decisions)
- [Risks & Reality Check](#risks--reality-check)
- [Contributing](#contributing)
- [License & Disclaimers](#license--disclaimers)

---

## The Market (What We Know)

**The mechanic.** A $0.01 price at Home Depot (and similarly Dollar General, Dollar Tree, Lowe's) is not a sale — it's an inventory-disposition flag. The item exhausted its markdown cycle and should have been pulled from the floor. When employees miss items, they ring up at a penny. Stores may honor or refuse the sale; it varies by location.

**The signals hunters combine** (community-derived, not official): clearance price endings that encode markdown stage, tag dates, yellow clearance tags, "No Home" planogram status, low on-hand counts, and online "discontinued" listings with in-store stock. Markdown cycles historically ran ~13–14 weeks; recent community reporting describes compressed cycles where items can hit penny in ~14 days.

**The hard truth every service admits:** ground truth only exists in-store. Shelf tags lag the system. The winning product embraces this instead of pretending its data is real-time — which is exactly what receipt verification, freshness scores, and in-store scan workflows are for.

**The formula the whole niche runs on:**

`deal signal collection + ZIP/store localization + alerting + in-store verification workflow + community/education + subscription or affiliate monetization`

PennyForge keeps the formula but replaces the legally gray collection layer with a trust layer nobody else has.

## Competitive Landscape

| Service | Model | Price | Data source | Fatal weakness |
|---|---|---|---|---|
| **BrickSeek** | Web + apps, SKU/ZIP lookup, alerts | Free / ~$9.99 / ~$29.99 mo | Retailer endpoints (unverified whether licensed) | Stale data, paywall fatigue, zero community trust layer |
| **Deal Soldier** | Discord community via Whop, scan tools, education | $44/mo | Human scouting + proprietary scan tools probing retailer pricing | Discord-only UX, high price, gray tooling dependency. Revenue reportedly >$200k/mo — *unverified, from reviewer-cited Whop stats* |
| **PennyCentral** | Free web penny list, community submissions | Free | 120k+ member Facebook group, ~5-min ingestion | No alerts, no scoring beyond report counts, HD only |
| **Penny app** (iOS) | Curated lists + live feeds + metered barcode scans | Free / $14.99 / $29.99 mo | Curated + retailer feeds | Scan metering feels punitive; thin community |
| **Endless** | HD markdown-stage tracker | Freemium | Page/endpoint monitoring | Single retailer, no community, no verification |
| **Hidden Clearances / RebelSavings** | Free ad/affiliate-funded clearance feeds | Free | Openly "retailer pricing systems" | Gray data core; no trust signals; ad-cluttered |
| **Penny Finder** (iOS) | Crowdsourced DG penny UPC database | $2.99 once | Community | Stale finds, one retailer, no scoring |

**Market gaps no one fills:** trust scoring beyond raw report counts · multi-store route planning · clean separation of compliant vs. gray data · Spanish-language UX (only Penny app) · reseller P&L ("what did my finds actually net?") · local-first, privacy-respecting design.

## Why PennyForge Wins

Competitors compete on *data freshness* from sources they can't legally defend. PennyForge competes on **trust, workflow, and community economics**:

1. **Receipt-verified confidence** — a $0.01 line on a receipt is proof; a screenshot is a rumor. Nobody in the niche weights evidence this way.
2. **The Waze model** — reporter reputation rises when reports get confirmed, falls when flagged. Confidence badges ("Receipt-verified · 7 reports · 3 states · 2 days old"), never raw scores.
3. **Route ROI** — nobody plans multi-store trips. We rank trips by confidence × value ÷ distance so a Saturday hunt has math behind it.
4. **Honest freshness** — aggressive time decay, dead-vote suppression, "last confirmed 6h ago" honesty. Stale data destroys trust; we make staleness visible instead of hiding it.
5. **Contributor economics** — verified contributions earn Pro credits. The data moat compounds; it cannot be scraped.
6. **Compliance as a moat** — when retailers send C&Ds and rotate endpoints, gray-data competitors break. We don't.
7. **Bilingual from day one** — full Spanish UX addresses an audience the entire niche (minus one app) ignores.

## Product: The Core Loop

1. **Find** — local feed scoped to ZIP/state/store, ranked by confidence and freshness.
2. **Verify** — scan a UPC in-aisle or search a SKU; check the lead against reality.
3. **Prove** — upload receipt, shelf tag, or photo. Submission friction must stay **under 30 seconds in-aisle**.
4. **Rank** — confidence score updates from evidence weight, reporter trust, confirmations, dead votes, and decay.
5. **Alert** — nearby users get high-signal alerts only (deduped, quiet-hours-aware, digest option).
6. **Route** — planner builds the highest-ROI store circuit for the day.
7. **Reward** — contributors earn reputation, badges, bounties, leaderboard status, and Pro credits.

## Feature Set

### MVP vertical slice (local, no paid services)

- Local feed by state/ZIP/store with seeded leads
- Manual UPC/SKU search
- Report submission: price, store, evidence type, optional evidence URL
- Confidence scoring with decay · confirmed/dead voting
- Same-day duplicate prevention (`reportDate` uniqueness — see schema note)
- Mock alerts with dedupe · admin moderation queue
- Basic route planner · compliance guardrails · full unit test coverage

### Core platform (Phases 1–2)

- Receipt upload + OCR verification badge (Tesseract/receipt-parser lineage → on-device Vision later)
- Reporter reputation graph · store-level freshness scores · lead half-life decay
- Personal watchlists: user pastes product URLs, monitored via self-hosted changedetection.io (user-supplied URLs, gentle frequency, robots.txt-honoring)
- Catalog enrichment via affiliate feeds (HD via Impact, Walmart official API, Target via Impact) — product names/images/MSRP without ever scraping
- Alert dispatch via Apprise: email + web push first, Discord webhook + Telegram bot as *delivery channels, never dependencies*
- Local captains · bounty missions · evidence review queue · fraud detection
- Education layer: clearance lifecycle guides, etiquette, verification discipline (the proven PennyCentral/Endless SEO engine)
- Spanish localization

## Feature Brainstorm (Beyond v1)

**In-store (the mobile killer features)**

- **Hunt Mode** — one-thumb, offline-capable in-aisle UI: giant scan button, instant verdict (`PENNY · $0.01` / `LATE CLEARANCE · $2.03` / `FULL PRICE`), cached state list for dead zones inside big-box stores.
- **Shelf-tag decoder** — community-taught reference for price-ending stages and tag formats per retailer, built from public info and submissions only.
- **Scan history + watchlist alerts** — watched SKUs fire when verified reports land within radius.
- **On-device receipt OCR** (Apple Vision) — receipts parsed on-phone; raw images never leave the device unless the user opts in. Privacy feature *and* App Review asset.

**Intelligence (community data only, always labeled as estimates)**

- **Markdown cadence predictor** — per-store patterns learned from verified reports ("this store's garden section typically drops Tuesdays").
- **Speed-to-penny tracker** — surfaces when regional markdown cycles compress (the 14-week → 14-day shift the community documented in 2026).
- **Penny heatmaps** and category momentum ("patio is pennying across the Gulf South this week").
- **Ghost-lead resurrection** — expired leads revive on fresh confirmation without polluting the feed history.

**Community & virality**

- **Haul recaps** — auto-generated share cards (`$3.41 spent · $212 retail · 98% off`) for TikTok/IG. The organic growth engine.
- **Crew mode** — private groups sharing a feed and splitting route legs.
- **Seasonal events** — regional leaderboards, streaks, "Penny Season" competitions.
- **Etiquette system** — nudges against shelf-sweeping and employee confrontation; protects community reputation and App Review standing. Content rules ban "deceive the cashier" content outright.

**Reseller suite (the paying persona)**

- **Profit calculator with resale comps** via eBay/Amazon official APIs ("this fan sells for ~$180 on eBay" → eBay Partner Network affiliate revenue).
- **Haul P&L** — cost basis, fees, actual net per trip; CSV export for bookkeeping. Nobody in the market has this.
- **ROI-per-trip analytics** — gas + time vs. realized haul value over history.

**Trust & safety**

- Perceptual image hashing against recycled evidence photos · EXIF plausibility checks
- Velocity + geo-plausibility flags (verifying leads in 3 states in an hour = flagged)
- Probation lane for new accounts · shadow-ban tooling · poisoned-submission detection

**Apple ecosystem (post-launch)**

- Live Activities (active route on Lock Screen/Dynamic Island) · home-screen widget ("fresh verified near you") · Siri Shortcut ("is this a penny?" → Hunt Mode) · Apple Maps handoff · Sign in with Apple.

## Design Language — No Cheese Allowed

The niche's aesthetic is a race to the bottom: clip-art piggy banks, red BURST badges, ad-cluttered tables. PennyForge should look like **a precision instrument for people who treat this as a craft** — closer to a trading terminal or Flighty than a coupon blog. This is a hard product requirement, not a nice-to-have; document it so every build session inherits it.

**Direction: "Thermal Receipt Modernism."** The visual world of the hunt itself — receipt paper, price tags, barcodes, SKU type — elevated, not literal.

- **Palette (tokens, dark-mode-first):**
  - `ink` #101418 — primary surface (graphite, not pure black)
  - `paper` #F7F5F0 — receipt-white, light-mode surface and evidence cards
  - `tag` #FFCE00 — clearance-tag yellow, the single accent; used *only* for verified-deal moments and CTAs
  - `verify` #2E9E6B — receipt-verified green, small doses (badges, checkmarks)
  - `dead` #C24E42 — dead-vote clay, never alarm-red
  - `mute` #8A9099 — secondary text, hairlines
- **Type:** a monospaced face (IBM Plex Mono or JetBrains Mono) for **prices, SKUs, UPCs, timestamps, and scores** — the receipt voice; a clean grotesk (Inter or General Sans) for UI body; one display weight used sparingly for headers. Prices set in mono at large scale are the identity of the app.
- **Signature element:** the **Verification Seal** — the confidence badge rendered like a receipt stamp, with evidence tier, confirmation count, and freshness ("RECEIPT-VERIFIED · 7 RPT · 3 ST · 2D"). It appears everywhere trust matters and nowhere else.
- **Motion:** one orchestrated moment — the scan-verdict reveal in Hunt Mode (scan → beat → verdict slams in mono type). Everything else is restrained. Respect reduced-motion.
- **Copy voice:** plain, active, specific. "Confirm this find," not "Submit!" Numbers over adjectives. No exclamation points, no emoji in UI chrome, no "🔥 HOT DEAL."
- **Anti-patterns (banned):** stock coupon imagery, red/yellow starburst badges, gradient-purple SaaS defaults, cream-and-terracotta AI-default styling, cluttered ad-slot layouts, raw score numbers where a badge should be.

## Architecture

**Local MVP (Phase 0):** Next.js (App Router) + TypeScript + Tailwind + Prisma + SQLite + Vitest. One repo, no external services, everything runnable with `npm run dev`.

**Production (Phase 1+):** the research-validated compliant stack — mature OSS end to end:

```
┌─────────────────── Client (Next.js PWA, offline-capable) ───────────────────┐
│ IndexedDB/SQLite-wasm cache ←→ sync engine                                   │
│ • Cached state penny list  • Watchlist  • Scan history                       │
│ • @zxing/browser + BarcodeDetector scanning  • Receipt capture → upload      │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │ versioned HTTPS API
┌──────────────────────────────┴───────────────────────────────────────────────┐
│ Backend (single VPS / Render to start)                                        │
│ API (Next.js server actions → extracted service) ── Postgres ── pg-boss queue │
│ 1 Submissions (reports, photos → R2/S3, OCR pipeline)                         │
│ 2 Trust/scoring engine (weights, decay, dedupe by UPC+store)                  │
│ 3 Watchlist monitor (self-hosted changedetection.io, user-supplied URLs)      │
│ 4 Catalog (affiliate feeds + UPC DBs; names/images/MSRP — never scraped)      │
│ 5 Alert dispatcher (Apprise: email, push, Discord webhook, Telegram)          │
│ 6 Admin/moderation panel + takedown workflow                                  │
└───────────────────────────────────────────────────────────────────────────────┘
```

**Mobile (Phase 3+):** React Native + Expo sharing the TypeScript API, with native modules where it counts: VisionKit barcode scanning, on-device receipt OCR, APNs push, offline cache. PWA ships first as the App Review hedge (Apple has historically been picky about "deal list" apps); native follows once the review positioning is proven.

### Schema (core) — with the tested SQLite constraint fix

Models: `User`, `Retailer`, `Store`, `Product`, `Report`, `Receipt`, `ReportVote`, `WatchlistItem`, `Alert`, `RoutePlan`, `Score` (materialized).

```prisma
model Report {
  // ...
  reportDate DateTime // start-of-day, set at creation
  @@unique([productId, storeId, userId, reportDate])
}
```

> **Why:** `UNIQUE(product_id, store_id, user_id, date(created_at))` fails in SQLite — expressions aren't allowed in table-level unique constraints. A materialized `reportDate` column with `@@unique` is portable to Postgres unchanged.

## Data Sources & Compliance Guardrails

Enforced in code via a source-type allowlist — submissions from blocked source types are rejected and logged.

**Allowed (priority order):**

1. User-submitted deal reports (SKU/UPC, store, price, photo/receipt, timestamp) — ToS requires lawful in-store observation
2. User-provided receipts (OCR) — the highest-trust signal
3. User-supplied URL watchlists — changedetection.io model: pages the user explicitly pastes, gentle per-user frequency, robots.txt honored
4. Affiliate feeds / official APIs — HD via Impact, Walmart Affiliate/Developer API, Target via Impact, eBay/Amazon for resale comps
5. Public datasets — open UPC databases, one-time store-locator imports
6. ToS/robots-compliant monitoring only where explicitly permitted (in practice: rare; out of scope for v1)

**Hard-blocked, permanently:** retailer internal/undocumented endpoints · app reverse-engineering · credentialed access · automated checkout · high-volume ToS-violating scraping · scraping competitors or Facebook groups · buying scraped data (buying doesn't launder the ToS problem) · rate-limit or bot-detection evasion.

**Posture:** educate, disclaim, discourage confrontation and shelf-clearing; frame lists as unverified leads; run a real "report content" / retailer takedown channel. Nominative trademark use only ("works with Home Depot · not affiliated"), no retailer logos or trade dress.

## Trust Scoring Engine

The differentiator. A pure, fully unit-tested function:

```
score = w1·log(1 + independent_reports)
      + w2·evidence_bonus        // receipt 1.0 · shelf-tag photo 0.6 · photo 0.4 · none 0
      + w3·reporter_trust        // Waze model: confirmations raise, flags lower
      + w4·multi_state_bonus
      − λ·age_decay              // half-life ~5–7 days; penny leads decay faster
      − penalty·dead_votes       // steep; threshold suppresses the lead entirely
```

Users see **badges, never raw numbers**: the Verification Seal. Store-level resolution when report volume allows; state-level otherwise. "Last confirmed X hours ago" always visible.

**Route ROI** ranks candidate trips: `Σ(confidence × estimated_value) ÷ (distance_cost + time_cost)`, with store freshness as a multiplier so stale stores fall out of routes automatically.

## Monetization & In-App Purchases

Anchors from the market: BrickSeek $9.99/$29.99 · Penny app $14.99/$29.99 · Deal Soldier $44 · free ad-funded at the low end. PennyForge prices between BrickSeek and Penny, undercutting Deal Soldier by 4× while offering verified (not rumored) data. **All revenue figures are hypotheses until landing-page and cohort tests — treat every projection as an estimate.**

| Tier | Price (hypothesis) | Gets |
|---|---|---|
| **Scout** (free) | $0 | State feed (4h delay), 5 scans/day, manual search, voting, limited reports |
| **Pro** | $9.99/mo · $79.99/yr | Instant high-confidence alerts, unlimited scans, route planner, watchlists (10 URLs), scan history, digest controls |
| **Reseller** | $19.99/mo · $159.99/yr | Everything in Pro + profit calculator with live comps, haul P&L + CSV export, multi-state feeds, 50 watchlist URLs, ROI analytics |
| **Founder** (launch-window lifetime) | one-time, limited | Pro for life + founder badge — the cold-start incentive |

**IAP implementation (iOS):**

- **StoreKit 2** — auto-renewable subscription group (Scout→Pro→Reseller upgrade/downgrade paths), non-consumable for Founder, intro offers (7-day trial mirrors Deal Soldier's), win-back and promotional offers configured at launch.
- **Server-side entitlements** — App Store Server Notifications V2 → entitlement service in Postgres; web (Stripe) and iOS (StoreKit) purchases resolve to the same entitlement record, so one subscription works everywhere. RevenueCat is an acceptable Phase-4 shortcut if it saves a sprint.
- **Guideline 3.1.1 compliance** — digital subscriptions bought in-app go through Apple IAP, priced with Apple's commission in mind; no steering language in the app.
- **Contributor credits** — verified contributions earn Pro-time credits applied server-side (not IAP, so no Apple entanglement). The flywheel: the best data producers ride free, and the data moat compounds.

**Additional revenue:** affiliate links on resale comps (eBay Partner Network, Impact) · optional tasteful ads on Scout tier only (never in Hunt Mode) · zero data sales, ever.

## Getting Started (Local MVP)

```bash
git clone https://github.com/masoncefalu/forge.git pennyforge
cd pennyforge
npm run setup         # installs deps, creates .env from .env.example, migrates + seeds SQLite
npm run dev           # http://localhost:3000
npm test              # scoring · duplicates · decay · dead votes · alert dedupe · guardrails
```

Or step by step (`.env` is gitignored — Prisma needs it for `DATABASE_URL`):

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npx prisma db seed    # demo users, retailers, stores, products, reports, votes, alerts
```

No external paid services required. SQLite locally; `DATABASE_URL` swap migrates to Postgres.

## Roadmap: Local MVP → iOS App Store

**Phase 0 — Local MVP** *(weeks 1–3)*
Full vertical slice per the handoff spec. Exit: all acceptance tests green.

**Phase 1 — Hosted Web Beta, Louisiana first** *(weeks 4–8)*
Postgres/Supabase migration, real auth, evidence uploads + review queue, email/web-push alerts via Apprise, background decay jobs, PWA offline cache + `@zxing/browser` scanning, Spanish localization, analytics. Home Depot only. Seed data by hand from public lists and founder store runs; recruit 2–3 regional captains and 1–2 local reseller creators in one Gulf South metro. Exit: 100 WAU, ≥60% of surfaced leads carrying evidence.

**Phase 2 — Trust & Community** *(weeks 8–14)*
Reputation graph, receipt OCR pipeline + verified badges, bounties, captain tooling, fraud detection (image hashing, velocity checks, probation lane), watchlist monitoring (changedetection.io), affiliate catalog enrichment (apply to Impact/Walmart programs early — approval takes time), haul recaps, referrals, Stripe web subscriptions, education/SEO engine live. Exit: first paying subscribers; alert CTR >25%.

**Phase 3 — Mobile Foundation** *(weeks 14–20)*
Version and harden the API. React Native/Expo app: Hunt Mode, VisionKit scanning, camera evidence, on-device receipt OCR, offline lead cache, APNs, fuzzed location, Sign in with Apple, StoreKit 2 + entitlement service. Exit: core-loop parity, crash-free >99.5% internal.

**Phase 4 — TestFlight Beta** *(weeks 20–24)*
Web community as seed testers. App Review package:

- **UGC (Guideline 1.2):** in-app reporting, blocking, moderation SLA, published contact — already built; document it in review notes.
- **Subscriptions (3.1.1):** StoreKit-only in-app purchase paths verified.
- **Privacy:** nutrition label, purpose strings (camera/location/notifications), fuzzing on by default, on-device OCR highlighted.
- **Positioning:** *community savings & shopping-trip planner* with etiquette systems and verified accuracy. Zero copy implying exploitation of stores; content rules banning deception documented. (The PWA already carries the business, so a review delay costs polish, not survival — this is the hedge working.)

**Phase 5 — App Store Launch** *(~week 26)*
Coordinated creator push + haul-recap virality + Founder-tier scarcity. ASO around "hidden clearance," "penny items," "clearance finder." Expand captains to 3–5 metros.

**Phase 6 — Compounding** *(months 7–12)*
Android, Live Activities/widgets/Siri, markdown cadence predictor, speed-to-penny tracker, crew mode, reseller P&L suite, licensed comps expansion, retailer partnership exploration (licensed feeds — the only sanctioned path to first-party data), seasonal events.

## Future-Proofing Decisions

Baked in now so nothing gets rebuilt later:

- **Versioned API from Phase 1** (`/api/v1`) — web, PWA, and native clients share contracts; mobile never blocks web.
- **One entitlement service** — Stripe and StoreKit both resolve to server-side entitlements; adding Android/Google Play later is a third adapter, not a rewrite.
- **Prisma as the portability layer** — SQLite → Postgres is config; scoring stays in pure functions unaware of the database.
- **Local-first sync** from the PWA phase — the same cache/sync engine powers native offline mode later.
- **i18n scaffolding day one** (`next-intl`) — Spanish is a locale file, not a refactor; locale #3 is trivial.
- **Feature flags + event instrumentation from Phase 1** — every score weight and alert threshold tunable without deploys; every loop step measured.
- **Design tokens as code** — the palette/type system above lives in `tokens.ts` consumed by Tailwind config and native styles alike.
- **Data-source adapter pattern** — affiliate feeds, UPC DBs, and any future *licensed* retailer feed plug in behind one interface with the compliance allowlist enforced at the boundary.
- **Chat platforms as delivery only** — Discord/Telegram bots read from our DB; the community's home is the product.
- **Retailer-countermeasure resilience** — if penny cycles tighten or disappear, the platform is already a hidden-clearance + reseller-P&L business; pennies were the hook, not the foundation.

## Risks & Reality Check

- **Gray-data rivals will beat us on raw speed at first.** Endpoint pollers see markdowns before communities do. We accept the compliance ceiling and win on trust, verified accuracy, routing, and ROI — and we're still standing after their C&D letters arrive.
- **Penny volatility.** Store-specific, decays in days, and retailers can compress cycles or tighten pulls. Mitigation: honest decay, dead-vote suppression, and the durable hidden-clearance market underneath.
- **Adversarial data.** Fake reports and wild-goose-chase griefing are certainties. Mitigation: reputation, evidence weighting, velocity/geo checks, probation lanes, shadow bans.
- **App Store sensitivity.** Apple has rejected deal apps that look exploitative. Mitigation: PWA-first hedge, etiquette systems, moderation infrastructure, careful positioning.
- **Cold start.** Single-metro depth beats national thinness. Louisiana first, captains + creators seeded, Founder tier as the incentive.
- **Legal review required.** Nothing here is legal advice; retailer ToS, UGC terms, DMCA agent registration, CCPA-style retention policy, and trademark clearance for the brand name all need a lawyer before commercial launch.

## Contributing

Contributions welcome post-MVP. PRs introducing scraping, private endpoints, competitor-data ingestion, or ToS-violating sources are rejected regardless of technical quality — the compliance allowlist is load-bearing.

## License & Disclaimers

License TBD before public launch (likely proprietary core, OSS components credited: changedetection.io, ZXing, Apprise, receipt-parser lineage).

PennyForge is an independent community project, not affiliated with, endorsed by, or connected to The Home Depot, Lowe's, Walmart, Target, Dollar General, or any retailer. All deal reports are unverified community leads until evidence-confirmed; final prices are determined only at the register, and stores may decline any sale.
