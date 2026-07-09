# PennyForge — Final Integration Package (Agent 11)

**Role:** Final Integrator. This document merges the outputs of Agents 1–10 (source
verification, competitor teardown, OSS scouting, product strategy, data model/scoring, UX,
compliance, business/growth, QA/simulation, and build planning) into one deduplicated,
contradiction-resolved, build-ready handoff. Where agent outputs disagreed, the resolution and
its rationale are recorded inline. Where a claim could be verified against this repository, it
was verified on 2026-07-09; everything else is labeled as unverified.

**Canonical inputs.** The agent outputs live in this repository rather than as loose transcripts:
`README.md` (strategy/competitive/architecture synthesis), `docs/product-spec.md`,
`docs/scoring.md`, `docs/compliance.md`, `docs/testing.md`, the mobile/tooling audit docs
(`docs/status.md`, `docs/tooling-options.md`, `docs/recommended-app-store-path.md`, `docs/ios-*`,
`docs/mobile-*`, `docs/backend-readiness.md`, `docs/connectors.md`, `docs/credentials-needed.md`,
`docs/github-secrets.md`), and the code itself (`lib/`, `app/`, `prisma/`, `tests/`).

---

## 1. Executive Summary

PennyForge is **"Waze for hidden clearance"**: receipt-verified, community-scored local deal
intelligence for penny items and hidden clearance. It competes with Discord-chaos communities
(Deal Soldier) and gray-data lookup tools (BrickSeek, Endless, Hidden Clearances) by winning on
**trust, proof, routing, ROI, community, and compliance** — never by out-scraping anyone.

**State of the build: the Phase 0 local MVP vertical slice is complete and green.**
Local feed → manual UPC/SKU search → report submission with compliance guardrail → confidence
scoring with visible breakdown → confirm/dead voting with auto-suppression → mock alerts with
per-recipient dedupe → admin moderation → route planner → leaderboard, all seeded and runnable
with `npm run setup && npm run dev`, no external paid services. The unit suite (5 files,
46 tests: scoring, dedupe, decay/suppression, alert dedupe, route ROI, compliance allowlist)
passes in full — verified in this session.

The strategy is anchored on one asymmetry: competitors compete on data freshness from sources
they can't legally defend; PennyForge competes on evidence weighting (a receipt is proof, a
screenshot is a rumor), honest freshness (aggressive decay + dead-vote suppression), route ROI
math nobody else offers, and contributor economics that make the data moat compound. Penny items
are the viral hook; hidden clearance (30–90% off) is the durable market; receipt proof is the moat.

## 2. Context Ledger

Decisions locked across all agents. Do not re-litigate these in future sessions.

| # | Decision | Where recorded |
|---|---|---|
| 1 | Codename **PennyForge**; positioning "Waze for hidden clearance" | `README.md`, `CLAUDE.md` |
| 2 | Stack: **Next.js (App Router) + TypeScript + Tailwind + Prisma + SQLite + Vitest** for the MVP | `CLAUDE.md`, `package.json` |
| 3 | First deliverable: **local MVP vertical slice**, no paid services — built | `docs/product-spec.md` |
| 4 | Hard boundaries: no scraping, no private endpoints, no competitor ingestion, no reverse engineering, no automated checkout | `CLAUDE.md`, `docs/compliance.md`, `lib/compliance.ts` |
| 5 | Data sourcing is an **allowlist, not a denylist** — unknown source types rejected by default | `lib/compliance.ts` |
| 6 | Same-day duplicate prevention uses a real **`reportDate`** column (UTC midnight) in a composite unique — SQLite prohibits `date(createdAt)` expressions in UNIQUE constraints | `prisma/schema.prisma`, `CLAUDE.md` |
| 7 | Business logic lives in framework-free `lib/*.ts` functions, fully unit-tested; route handlers and components stay thin | `CLAUDE.md` |
| 8 | Enum-like fields are `String` columns validated against `lib/constants.ts` (Prisma/SQLite has no native enum) | `lib/constants.ts` |
| 9 | Mock auth behind a stable `getCurrentUser()` interface (`lib/currentUser.ts`) so real auth is a one-file swap | `lib/currentUser.ts` |
| 10 | Users should see **badges, never raw scores**, with "last confirmed X ago" always visible — a locked *design target* (README Trust Scoring / Design Language), **not yet implemented**: `components/ConfidenceBadge.tsx` currently renders the raw 0–100 score, and no UI surfaces last-confirm time (only report age). Verified 2026-07-09; see R10 | `README.md` (Trust Scoring), `components/ConfidenceBadge.tsx` |
| 11 | Postgres migration is a `datasource` swap; no SQLite-only features beyond the documented `reportDate` workaround | `CLAUDE.md`, schema comments |
| 12 | Design language: "Thermal Receipt Modernism" — mono type for prices/SKUs, clearance-tag yellow as sole accent, no coupon-blog cheese | `README.md` (Design Language) |
| 13 | iOS path: **Capacitor wrap of the existing Next.js app + Fastlane/Codemagic CI** (scaffolded, activatable), not an immediate React Native rewrite — see contradiction R2 below | `docs/recommended-app-store-path.md`, `capacitor.config.ts` |
| 14 | Chat platforms (Discord/Telegram) are alert **delivery channels, never dependencies** | `README.md` |
| 15 | No token/credential requests in chat; secrets are documented as *named requirements* only | `docs/credentials-needed.md`, `docs/github-secrets.md` |

**Contradictions found and resolved:**

- **R1 — Two roadmaps.** `README.md` carries a 7-phase business roadmap (local MVP → iOS launch →
  compounding); `docs/product-spec.md` carries a 5-phase engineering sequence. They order the same
  work differently (e.g. spec puts OCR in its Phase 3, README in its Phase 2). **Resolution:** the
  README roadmap is the master *business* timeline; the product-spec phases are *engineering
  sequencing* within it. Section 14 merges them into one table; the merged table governs.
- **R2 — Mobile framework.** `README.md` (Architecture) sketches Phase 3+ mobile as React
  Native + Expo; the repo's actual scaffolding (`capacitor.config.ts`, `codemagic.yaml`,
  `scripts/ios-bootstrap.sh`, `tooling/ios/fastlane/`) and the dedicated audit
  (`docs/recommended-app-store-path.md`) chose **Capacitor wrapping the existing web app**.
  **Resolution:** Capacitor-first (what is built and recommended by the dedicated audit wins over
  the README's earlier sketch). React Native/Expo remains a *later option* if native-module needs
  (VisionKit scanning depth, Live Activities) outgrow the wrapper — revisit at Phase 3 exit, not before.
- **R3 — Alert dedupe scope.** Early drafts described alert dedupe per (product, store);
  implementation and `docs/scoring.md` dedupe **per recipient** per (product, store) per 24h so
  every qualifying nearby user still gets one alert. **Resolution:** per-recipient dedupe (the
  implemented, tested behavior) is canonical.
- **R4 — iOS CI secret naming.** `docs/github-secrets.md`, `docs/credentials-needed.md`, and
  `docs/ios-deployment.md` name one secret set (`APPLE_TEAM_ID`, `IOS_BUNDLE_ID`,
  `ASC_API_KEY_BASE64`, `ASC_APP_ID`, `IOS_DIST_CERT_BASE64`, `IOS_DIST_CERT_PASSWORD`,
  `IOS_PROVISIONING_PROFILE_BASE64`, `IOS_KEYCHAIN_PASSWORD`) built around a manual
  `.p12`/`.mobileprovision` decode-to-keychain flow. `docs/mobile-automation-stack.md`,
  `docs/tooling-options.md`, `docs/ios-ci-cd-options.md`, and `docs/recommended-app-store-path.md`
  name a different set (`ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8`, `DEVELOPER_TEAM_ID`,
  `FASTLANE_APPLE_ID`, `CAPACITOR_SERVER_URL`, optional `MATCH_GIT_URL`/`MATCH_PASSWORD`) built
  around an ASC API key + Fastlane `match`/automatic signing flow. **Resolution: code wins.**
  `.github/workflows/ios-release.yml` and `tooling/ios/fastlane/Fastfile` (verified by direct
  read) both consume the second set — `ASC_KEY_ID`/`ASC_ISSUER_ID`/`ASC_KEY_P8`/
  `DEVELOPER_TEAM_ID`/`FASTLANE_APPLE_ID`/`CAPACITOR_SERVER_URL`/`MATCH_*` — with no `.p12`/
  `.mobileprovision` decode step anywhere in the workflow. `.env.example` also uses
  `CAPACITOR_SERVER_URL`, not `NEXT_PUBLIC_API_BASE_URL`. The ASC-API-key/Fastlane-match scheme is
  what's actually implemented; `github-secrets.md`, `credentials-needed.md`, and
  `ios-deployment.md` describe a superseded manual-signing design and need a docs-only correction
  pass before Phase 3 (do not create the `.p12`/`IOS_DIST_CERT_*` secrets — they're unused by any
  wired workflow).
- **R5 — Primary iOS CI runner.** `docs/ios-ci-cd-options.md`, `docs/tooling-options.md`, and
  `docs/recommended-app-store-path.md` recommend Codemagic as primary with GitHub Actions as
  fallback; `docs/ios-deployment.md` describes the pipeline entirely on a GitHub Actions macOS
  runner and never mentions Codemagic. **Resolution:** both are staged in-repo
  (`codemagic.yaml` + `.github/workflows/ios-release.yml`) and are consistent with each other on
  secrets/signing per R4 — they're alternatives, not a conflict, but the majority recommendation
  (3 of 4 docs, plus free managed macOS minutes and managed signing) makes **Codemagic primary,
  GitHub Actions the fallback/readiness-check path** the canonical framing. `ios-deployment.md`
  should be read as the GitHub Actions fallback procedure, not the primary path.
- **R6 — Primary Phase-1 backend host.** `docs/backend-readiness.md` names Vercel + Neon Postgres
  + Vercel Blob as the *default* recommendation and Supabase as "Alternative B." `.env.example`
  (the actual staged scaffolding) documents only Supabase env vars
  (`NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`) alongside generic pooled/direct
  Postgres URLs, and `docs/tooling-options.md` + `docs/recommended-app-store-path.md` both name
  Supabase as the Phase-1 choice. **Resolution:** treat Supabase (DB + auth + storage in one
  vendor, matching what's actually staged in `.env.example`) as the working default for Phase 1;
  Vercel+Neon+Blob remains a documented alternative if Mason prefers fewer-vendor lock-in tradeoffs
  differently. This is a real open decision, not a docs bug — flag it to Mason before Phase 1
  kickoff rather than silently picking one.
- **R7 — CI typecheck step.** `docs/status.md` and `docs/connectors.md` describe CI as
  install→prisma→lint→test→build with no separate typecheck step; `docs/backend-readiness.md`
  says CI "now also runs `npm run typecheck`." **Resolution: code wins.** `.github/workflows/ci.yml`
  (verified) runs a dedicated `Typecheck` step (`npm run typecheck`) between lint and test.
  `status.md`/`connectors.md` predate that addition — treat them as historical snapshots, not
  current state.
- **R8 — Push notifications in v1.** `docs/ios-roadmap.md`, `docs/mobile-automation-stack.md`,
  and `docs/tooling-options.md` defer `@capacitor/push-notifications` entirely past v1.
  `docs/ios-deployment.md`'s Phase 1 lists adding the push plugin, and it/`credentials-needed.md`
  say to enable the Push Notifications capability on the bundle ID at creation time.
  **Resolution:** not a real conflict — enabling the *capability* on the bundle ID at creation
  (cheap, avoids a later profile regeneration) is compatible with deferring the *plugin
  integration and APNs delivery* to a later phase. Do both: enable the capability now, defer the
  code.
- **R9 — First auth provider.** `docs/backend-readiness.md` and `docs/mobile-readiness.md`
  prescribe Sign in with Apple (via NextAuth/Auth.js) as the first real-auth provider, citing
  Guideline 4.8 (any third-party sign-in requires SiwA as an option). `docs/tooling-options.md`
  and `docs/recommended-app-store-path.md` say "Supabase Auth or NextAuth" without foregrounding
  SiwA. **Resolution:** Guideline 4.8 is a hard App Review requirement, not a preference — Sign in
  with Apple must ship alongside whatever provider is chosen. If Supabase Auth is the Phase-1
  choice (R6), configure Supabase's Apple OAuth provider rather than treating SiwA as optional.
- **R10 — Trust-badge UX: design target vs. shipped UI.** The README (Trust Scoring / Design
  Language) and `docs/scoring.md` describe "badges, never raw numbers" and "last confirmed X ago"
  as if they were current UX. **Verified 2026-07-09 by reading the code:**
  `components/ConfidenceBadge.tsx` renders the raw `{score}` (0–100) directly, and no page
  displays a last-confirmed timestamp — `LeadView`/`toLeadView` (`lib/leads.ts`) computes
  `lastConfirmAgeDays` for the *scoring decay calculation* but nothing renders it in the UI; leads
  and alerts show `timeAgo(createdAt)` (report age) instead. **Resolution:** this is a real,
  hard-requirement UX gap in the Phase 0 build, not a resolved design decision — surfaced here so
  a future session fixes the badge/freshness display instead of assuming it's done or silently
  downgrading the requirement. See the corrected wording in Sections 6, 9, 10, and 16.
- **R11 — Codemagic secret contract incomplete in earlier drafts of this doc.** Section 5/15
  originally listed only the Fastlane/GitHub Actions secret set for the iOS CI path. **Verified by
  reading `codemagic.yaml` directly:** the primary runner (R5) separately requires
  `APP_STORE_APPLE_ID` and `BUNDLE_ID` in its own `pennyforge_ios` environment group (not a GitHub
  secret), and the build-number step exits with an error if `APP_STORE_APPLE_ID` is unset or the
  placeholder value. **Resolution:** corrected in Sections 5 and 15 — both secret contracts
  (GitHub/Fastlane and Codemagic/ASC) must be provisioned before Phase 3 activation, not just one.
- **R12 — Alert-suppression scope overstated in earlier drafts.** Section 9 originally said
  suppression removes a report "from the feed, alerts, and routing." **Verified by reading
  `app/alerts/page.tsx`:** the alerts inbox query is `where: { userId: user.id }` with no join or
  filter on the underlying report's status, so alerts created before a report is later suppressed
  remain visible and still link to the (now-suppressed) lead. **Resolution:** corrected wording in
  Section 9 — suppression stops *future* alert fan-out for that report; it does not retroactively
  remove alerts already delivered. `docs/scoring.md`'s similar phrasing should be read the same
  way (a docs-correction candidate for that file, out of scope for this PR).
- **R13 — Capacitor `webDir` did not exist.** `capacitor.config.ts` sets `webDir: 'public'` and
  its own comment asserted `public/` is "a valid, committed folder." **Verified:** `git ls-files`
  showed no `public/` directory anywhere in the repo, and `scripts/ios-bootstrap.sh` never creates
  one before invoking `cap add ios`/`cap sync ios`, so first-time activation would have failed
  immediately. **Resolution:** fixed directly in this PR — a placeholder `public/index.html` was
  added (low-risk, one file, no behavior change to the Next.js app, which doesn't serve from
  `public/` in server-rendered mode) so the Capacitor config's own claim is now true.

## 3. Verified vs Unverified Claims

**Verified directly against this repo (2026-07-09):**

- `npm test`: **46/46 tests pass** across 5 suites (`compliance` 7, `scoring` 18, `alerts` 11,
  `route` 5, `reports` 5).
- The `reportDate` composite unique exists as `@@unique([productId, storeId, userId, reportDate])`
  in `prisma/schema.prisma` with applied migrations (`20260708200333_init`,
  `20260708201618_add_report_previous_status`). The SQLite expression-in-UNIQUE failure mode was
  tested against `sqlite3` directly before adoption (per `CLAUDE.md`).
- Scoring/alert/route constants in Section 9 were read from `lib/scoring.ts`, `lib/alerts.ts`,
  `lib/route.ts` — the code is the spec.
- The app surface is 8 pages + 6 API handlers (Section 10), matching `docs/product-spec.md`.
- Compliance allowlist enforcement (`assertSafeSource`) rejects unknown source strings, verified
  by `tests/compliance.test.ts`.

**Unverified — retained because decision-relevant, labeled as such (do not present as fact):**

- Deal Soldier revenue "reportedly >$200k/mo" — reviewer-cited Whop stats, unverified.
- Markdown-cycle compression (~13–14 weeks historically → ~14 days in recent community reports) —
  community-derived, not retailer-confirmed.
- Competitor pricing (BrickSeek ~$9.99/~$29.99, Penny app $14.99/$29.99, Deal Soldier $44/mo,
  Penny Finder $2.99 one-time) — point-in-time market observations.
- Whether BrickSeek's retailer-endpoint usage is licensed — unknown; treated as gray regardless.
- Retailer penny/clearance handling policies — vary store-by-store; no retailer publicly documents
  them uniformly.
- **Every PennyForge revenue/pricing figure is a hypothesis** pending landing-page and cohort tests.

## 4. Competitive Intelligence Summary

| Service | Model | Price | Data source | Fatal weakness |
|---|---|---|---|---|
| BrickSeek | Web+apps, SKU/ZIP lookup, alerts | Free / ~$9.99 / ~$29.99 mo | Retailer endpoints (licensing unverified) | Stale data, paywall fatigue, no trust layer |
| Deal Soldier | Discord via Whop, scan tools, education | $44/mo | Human scouting + proprietary scan tools | Discord-only UX, price, gray tooling dependency |
| PennyCentral | Free web penny list | Free | 120k+ member Facebook group | No alerts, no scoring beyond counts, HD-only |
| Penny app (iOS) | Curated lists + metered scans | Free / $14.99 / $29.99 mo | Curated + retailer feeds | Punitive scan metering, thin community |
| Endless | HD markdown-stage tracker | Freemium | Endpoint monitoring | Single retailer, no community/verification |
| Hidden Clearances / RebelSavings | Ad/affiliate feeds | Free | "Retailer pricing systems" | Gray data core, ad clutter, no trust signals |
| Penny Finder (iOS) | Crowdsourced DG UPC database | $2.99 once | Community | Stale, one retailer, no scoring |

**Gaps nobody fills** (PennyForge's lane): trust scoring beyond raw counts · multi-store route
planning · clean compliant/gray data separation · Spanish-language UX · reseller P&L · local-first
privacy. The shared formula (`signal collection + localization + alerting + in-store verification +
community + subscription`) is kept; only the legally-gray collection layer is replaced with a trust layer.

## 5. OSS / Tooling Recommendations

**Adopted in the MVP (installed, working):** Next.js 15 (App Router) · React 19 · TypeScript 5.7 ·
Tailwind 3.4 · Prisma 6.7 + SQLite · Vitest 3 · tsx (seeding).

**Recommended for later phases (all compliant-by-design; none installed prematurely):**

| Tool | Phase | Role |
|---|---|---|
| `@zxing/browser` + BarcodeDetector API | 2 | In-aisle UPC scanning feeding the existing search input |
| changedetection.io (self-hosted) | 2 | Personal watchlists on **user-supplied URLs only**, gentle frequency, robots.txt-honoring |
| Apprise | 1–2 | Alert dispatch fan-out: email + web push first; Discord webhook/Telegram as delivery channels only |
| Tesseract / receipt-parser lineage → Apple Vision on-device | 2–3 | Receipt OCR; on-device parsing is both a privacy feature and an App Review asset |
| Impact / Walmart Affiliate API / eBay Partner Network | 2 | Catalog enrichment + resale comps via official affiliate feeds — never scraped |
| Capacitor + Fastlane + Codemagic (scaffolded in-repo) | 3–4 | iOS wrapper + signed CI builds; activation via `npm run ios:bootstrap`. Verified wiring: ASC API key + Fastlane `match`/automatic signing (`ASC_KEY_ID`/`ASC_ISSUER_ID`/`ASC_KEY_P8`/`DEVELOPER_TEAM_ID`/`FASTLANE_APPLE_ID`/`CAPACITOR_SERVER_URL`), **not** a manual `.p12`/`.mobileprovision` flow — see R4. Codemagic is primary, GitHub Actions (`ios-release.yml`) is the fallback/readiness-check runner — see R5. Codemagic additionally needs `APP_STORE_APPLE_ID` (and `BUNDLE_ID`) set in its own `pennyforge_ios` environment group — see R11. |
| Postgres (Supabase) + pg-boss | 1 | Hosted DB + job queue when concurrent writes/hosting require it. `.env.example` stages Supabase env vars specifically; confirm with Mason before Phase 1 kickoff — see R6 |
| next-intl | 1 | i18n scaffolding so Spanish is a locale file, not a refactor |

## 6. Product Strategy

**Wedge:** trust, workflow, and community economics — not data freshness from indefensible sources.

1. **Receipt-verified confidence** — evidence weighting nobody in the niche does.
2. **Waze model** — reporter reputation rises on confirmations, falls on flags; target UX is
   badges, never raw scores (not yet implemented — see R10).
3. **Route ROI** — trips ranked by confidence × value ÷ cost; a Saturday hunt with math behind it.
4. **Honest freshness** — aggressive decay, dead-vote suppression, target UX is "last confirmed
   6h ago" visibility (not yet implemented — see R10).
5. **Contributor economics** — verified contributions earn Pro credits; the moat compounds and can't be scraped.
6. **Compliance as moat** — when C&Ds hit gray-data rivals, PennyForge keeps standing.
7. **Bilingual from day one** (Phase 1+) — Spanish UX the niche ignores.

**Personas:** casual penny hunters · serious clearance shoppers · resellers (the paying persona) ·
local contributors · regional captains/moderators · admins.

**Core loop:** Find → Verify → Prove (<30s in-aisle) → Rank → Alert → Route → Reward.

## 7. MVP Scope

**Built (Phase 0, this repo):** local feed with state/retailer/store/min-confidence filters ·
manual UPC/SKU/name search · report submission (existing or new product; price, deal type,
evidence type, source type, placeholder evidence URL, notes) · compliance guardrail rejecting
unsafe source types before any DB write (HTTP 422) · same-day duplicate prevention (HTTP 409) ·
confidence scoring with full "why this lead scores X" breakdown · confirm/dead voting (one
changeable vote per user per report; self-votes rejected 403) with auto-suppression and exact
status restoration on reversal (`previousStatus`) · mock alert fan-out (75mi radius, per-recipient
24h dedupe, read/unread inbox) · route planner (expected value − round-trip gas cost, negative-ROI
excluded) with saved plans · admin moderation queue gated to ADMIN/CAPTAIN · contributor
leaderboard · seed data across GA/FL/TX for Home Depot, Lowe's, Dollar General, Walmart.

**Explicitly deferred (do not build prematurely):** real auth (swap point `lib/currentUser.ts`) ·
camera barcode scanning · receipt OCR · real push/email/SMS delivery (swap point `lib/alerts.ts`)
· Postgres migration · multi-stop TSP routing · native mobile app · i18n wiring (schema-ready:
`User.locale`) · fraud detection beyond dead-vote suppression · quiet hours/digest/offline mode.

## 8. Data Model and Prisma Schema

Source of truth: `prisma/schema.prisma`. Models: `User` (role, trustScore 0–100, home
ZIP/lat/lng, locale), `Retailer`, `Store` (geo + `@@index([state, zip])`), `Product` (UPC/SKU
indexed, `msrpCents` for route ROI), `Report`, `ReportVote` (`@@unique([reportId, userId])`),
`Alert` (recipient-scoped, dedupe-window index), `RoutePlan` (stops as JSON).

The load-bearing constraint — **do not "simplify" this**:

```prisma
model Report {
  // ...
  previousStatus String?   // status held before auto-suppression; restored exactly on reversal
  reportDate     DateTime  // real UTC-midnight column, set by lib/reports.ts#toReportDate
  @@unique([productId, storeId, userId, reportDate])
}
```

SQLite rejects expressions inside table-level UNIQUE constraints, so
`UNIQUE(..., date(created_at))` is a syntax error. The materialized `reportDate` column is
portable to Postgres unchanged. Enum-like fields (`role`, `dealType`, `evidenceType`, `status`,
`vote`, `sourceType`) are `String` columns validated against `lib/constants.ts` /
`lib/compliance.ts`; moderators may only set `APPROVED`/`REJECTED` (`MODERATABLE_STATUSES`) —
`PENDING` is creation-only and `SUPPRESSED` is vote-driven only.

## 9. Scoring and Route Algorithms

Code is the exact spec (`lib/scoring.ts`, `lib/alerts.ts`, `lib/route.ts`); all constants below verified.

```
score = clamp( (evidenceBase + trustBonus + confirmBonus − deadPenalty) × decayFactor, 0, 100 )
```

- **Evidence base:** RECEIPT 45 · SHELF_TAG_PHOTO 32 · PRODUCT_PHOTO 22 · TEXT_ONLY 10.
- **Trust bonus:** `round(clamp(trust,0,100)/100 × 15)` — up to +15.
- **Confirm bonus:** +12 per distinct confirmer, capped at +36 (anti-brigading).
- **Dead penalty:** −18 per dead vote, uncapped ("it's gone" is a stronger signal than "still there").
- **Decay:** `0.5^(effectiveAgeDays / halfLife)`; half-life 7d (PENNY) / 14d (CLEARANCE); a recent
  confirmed vote resets the effective age — community verification keeps leads alive.
- **Suppression:** `deads >= 2 && deads > confirms` → status `SUPPRESSED`, removed from the feed
  (`lib/leads.ts`) and route planner (`lib/routePlanner.ts`), and blocks *future* alert fan-out for
  that report; reverses automatically, restoring `previousStatus` exactly. **Correction (verified
  2026-07-09, see R12):** suppression does **not** retroactively remove alert rows already
  delivered before the report was suppressed — `app/alerts/page.tsx` fetches by `userId` only,
  with no report-status filter, so an already-alerted user still sees that alert (now pointing at
  a suppressed lead) in their inbox. `docs/scoring.md`'s "dropping out of ... alerts" phrasing
  should be read as "stops generating new alerts," not "purges past ones."
- **Reporter trust:** +2 per confirmation received, −3 per dead vote, clamped [0,100]; vote
  *changes* apply only the net delta (`voteTrustDelta`) so toggling can't inflate or crater trust.
- **Alerts:** fire at score ≥ 60 to users within 75mi of the store (haversine), excluding the
  reporter; deduped **per recipient** per (product, store) per 24h.
- **Route ROI:** `expectedValue = Σ estValue × confidence/100` over non-suppressed leads;
  `tripCost = miles × 2 × $0.15`; stores ranked by `expectedValue − tripCost`, non-positive
  excluded. Single-store ranking, not TSP.

## 10. UX / Screens

**Pages (8):** `/` feed with filters · `/search` manual UPC/SKU/name · `/report/new` submission ·
`/leads/[id]` detail with score-breakdown table · `/alerts` inbox · `/route` planner ·
`/admin` moderation queue (role-gated) · `/leaderboard`.

**API (6 handlers):** `POST /api/reports` · `POST /api/reports/[id]/vote` ·
`POST /api/reports/[id]/moderate` · `POST /api/alerts/[id]/read` · `POST /api/route-plans` ·
`POST /api/user` (mock-auth cookie switcher). Server components read via `lib/db.ts`; client
components call these handlers — keep that split.

**Design language ("Thermal Receipt Modernism" — a hard requirement, not a nice-to-have):**
dark-first palette (`ink` #101418, `paper` #F7F5F0, `tag` #FFCE00 as the *only* accent, `verify`
#2E9E6B, `dead` #C24E42 clay — never alarm-red, `mute` #8A9099); monospace for prices/SKUs/
timestamps/scores, grotesk for UI body; the **Verification Seal** badge ("RECEIPT-VERIFIED · 7 RPT
· 3 ST · 2D") wherever trust matters and nowhere else; plain active copy, no exclamation points,
no emoji chrome, no starburst badges, no raw score numbers where a badge belongs. **Gap against
this requirement, verified 2026-07-09:** `components/ConfidenceBadge.tsx` currently renders the
raw numeric score (0–100) directly, not a non-numeric Verification Seal, and no screen displays
"last confirmed X ago" (report age only). Treat this as an open Phase-0.5 polish item against a
locked requirement, not a future-phase nice-to-have — see R10.

## 11. Compliance Guardrails

Enforcement: `lib/compliance.ts` (`assertSafeSource`), covered by `tests/compliance.test.ts`;
policy: `docs/compliance.md`. **Allowlist, not denylist** — unknown source types are rejected.

- **Allowed:** `IN_STORE_OBSERVATION` · `RECEIPT_PURCHASE` · `SHELF_TAG` · `STORE_FLYER_PUBLIC`.
- **Blocked (permanent):** `SCRAPED_SITE` · `PRIVATE_API` · `COMPETITOR_REPOST` ·
  `AUTOMATED_TOOL` · `EMPLOYEE_INTERNAL_SYSTEM` — and by policy: credentialed access, automated
  checkout, buying scraped data, rate-limit/bot-detection evasion, scraping Facebook groups.
- Server rejects bad sources with HTTP 422 **before any DB write**; price sanity bounds 1¢–$5,000;
  evidence URLs restricted to `http(s)`.
- Later-phase sources stay inside the allowlist model: user-supplied watchlist URLs
  (changedetection.io, robots.txt-honoring), official affiliate feeds/APIs, public datasets.
- Privacy: home coordinates used only for distance math, never shown to other users; any future
  location sharing must fuzz first. Disclaimers on every pricing surface; nominative trademark use
  only ("works with Home Depot — not affiliated"), no retailer logos/trade dress.
- **If a feature request implies crossing a boundary, stop and flag it — never build a workaround.**

## 12. Business / Growth Strategy

**Pricing (hypotheses, anchored between BrickSeek and Penny app, 4× under Deal Soldier):**
Scout free (delayed feed, 5 scans/day) · **Pro $9.99/mo · $79.99/yr** (instant high-confidence
alerts, unlimited scans, routing, watchlists) · **Reseller $19.99/mo · $159.99/yr** (profit
calculator with live comps, haul P&L + CSV, multi-state, ROI analytics) · **Founder** one-time
lifetime Pro at launch (cold-start incentive). iOS via StoreKit 2 with server-side entitlements
shared with Stripe web billing (one entitlement record across platforms); contributor credits
applied server-side, outside IAP. Affiliate revenue on resale comps; optional tasteful ads on
Scout only, never in Hunt Mode; **zero data sales, ever**.

**Growth:** single-metro depth over national thinness — Louisiana/Gulf South first with 2–3
regional captains and 1–2 reseller creators; haul-recap share cards (`$3.41 spent · $212 retail`)
as the organic TikTok/IG engine; education/SEO layer (the proven PennyCentral/Endless engine);
referrals; Founder-tier scarcity at launch. Etiquette systems (anti-shelf-sweeping,
anti-confrontation) protect both community reputation and App Review standing.

**Risks (with mitigations):** gray-data rivals are faster at first (accept the ceiling; win on
trust and survive their C&Ds) · penny volatility (honest decay + the durable clearance market
underneath) · adversarial data (reputation, evidence weighting, velocity/geo checks, probation) ·
App Store sensitivity (PWA-first hedge, moderation infra, careful positioning) · legal review
required before commercial launch (retailer ToS, UGC terms, DMCA agent, retention policy, trademark).

## 13. Acceptance Tests

**Unit (all green, verified):** `npm test` → 46/46 across scoring (evidence ordering, caps,
clamping, decay half-lives, confirmation-refresh, suppression, trust deltas), reports (UTC date
truncation, duplicate-key behavior across days/users, P2002 detection), alerts (threshold, 24h
dedupe, re-alert, cross-product/store isolation), route (confidence weighting, suppressed→zero,
gas subtraction, negative-ROI exclusion), compliance (allowlist pass, blocklist throw, novel-source
rejection, price bounds, URL schemes).

**Acceptance checklist (16 items, from `docs/testing.md`):** clean `npm run setup` · dev server
with no paid services · seeded data renders on all pages · exact-UPC and partial-SKU search ·
combined feed filters · report creates PENDING with computed score · same-day duplicate → 409 ·
receipt outscores text-only and confirmations raise score visibly · 20-day-old lead scores
visibly lower · 2 dead votes suppress and remove from feed/planner · blocked source → 422 with no
row · two rapid reports → one alert per recipient · admin/captain moderation round-trip ·
route planner ranks positive-ROI stores descending, excludes the rest · self-vote → 403 ·
full suite green. Plus the 11-step, 5-minute manual QA script in `docs/testing.md`.

## 14. Phase Roadmap

Merged roadmap (resolves R1): README business phases govern timing; product-spec engineering
sequencing slots inside them.

| Phase | Timeline | Scope | Exit criteria |
|---|---|---|---|
| **0 — Local MVP** | wks 1–3 | This repo: full vertical slice, mock auth/alerts, SQLite | All acceptance tests green ✅ **done** |
| **1 — Hosted web beta (Louisiana)** | wks 4–8 | Postgres/Supabase, real auth, evidence upload + review queue, Apprise email/web-push, decay jobs, PWA offline + `@zxing/browser` scanning, Spanish (next-intl), versioned `/api/v1`, analytics; Home Depot only; hand-seeded data, 2–3 captains | 100 WAU; ≥60% of surfaced leads carry evidence |
| **2 — Trust & community** | wks 8–14 | Reputation graph, receipt-OCR pipeline + verified badges, bounties, captain tooling, fraud detection (image hashing, velocity, probation), watchlists (changedetection.io), affiliate catalog enrichment (apply to Impact/Walmart early), haul recaps, referrals, Stripe subs, SEO engine | First paying subscribers; alert CTR >25% |
| **3 — Mobile foundation** | wks 14–20 | Harden/version API; **Capacitor iOS shell** (per R2): Hunt Mode, camera scanning, camera evidence, on-device receipt OCR, offline lead cache, push, fuzzed location, Sign in with Apple, StoreKit 2 + entitlement service | Core-loop parity; crash-free >99.5% internal |
| **4 — TestFlight beta** | wks 20–24 | Web community as testers; App Review package: UGC moderation (1.2), StoreKit-only purchases (3.1.1), privacy nutrition label + purpose strings + on-device OCR, "community savings & trip planner" positioning | Review-ready; PWA carries the business as hedge |
| **5 — App Store launch** | ~wk 26 | Creator push, haul-recap virality, Founder scarcity, ASO ("hidden clearance", "penny items"), captains in 3–5 metros | Launch |
| **6 — Compounding** | mo 7–12 | Android, Live Activities/widgets/Siri, markdown-cadence predictor, speed-to-penny tracker, crew mode, reseller P&L suite, licensed-feed partnerships (the only sanctioned first-party data path), seasonal events | Durable retention |

Future-proofing already baked in: versioned API from Phase 1 · one entitlement service
(Stripe + StoreKit) · Prisma as the portability layer · local-first sync from the PWA phase ·
i18n scaffolding day one · feature flags + instrumentation from Phase 1 · design tokens as code ·
data-source adapter pattern with the compliance allowlist at the boundary · chat platforms as
delivery only · retailer-countermeasure resilience (if pennies die, the clearance + reseller-P&L
business remains).

## 15. Claude Code Handoff Package

Everything a fresh Claude Code session needs to work on PennyForge safely:

- **Read first:** `CLAUDE.md` (mission, hard boundaries, schema note, coding standards) — it is
  checked in and authoritative. Then `docs/product-spec.md` for scope and deferrals.
- **Commands:** `npm run setup` (install + migrate + seed) · `npm run dev` · `npm test` ·
  `npm run lint` · `npm run typecheck` · `npm run verify` (lint + typecheck + test + build) ·
  `npx prisma studio`.
- **Architecture invariants:** business logic in framework-free `lib/*.ts` (unit-tested); server
  components read via `lib/db.ts`; client components call `app/api/**`; enum values only via
  `lib/constants.ts`; compliance allowlist at every ingestion boundary; `getCurrentUser()` and
  `shouldCreateAlert` kept stable as swap points.
- **Load-bearing details that look like bugs but aren't:** the materialized `reportDate` column
  (SQLite UNIQUE limitation); `previousStatus` exact-restore on suppression reversal;
  per-recipient alert dedupe; net-delta trust updates on vote changes (anti-toggling); moderators
  restricted to `APPROVED`/`REJECTED`.
- **Deferred list** (Section 7) is a *do-not-build-yet* list, not a backlog to freelance on.
- **Mobile scaffolding** is present but dormant: `capacitor.config.ts`, `codemagic.yaml`,
  `scripts/ios-bootstrap.sh`, `tooling/ios/fastlane/` — activation is Phase 3. The wired secret
  contract for the GitHub Actions/Fastlane path is the ASC-API-key set in
  `mobile-automation-stack.md`/`tooling-options.md` (`ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8`,
  `DEVELOPER_TEAM_ID`, `FASTLANE_APPLE_ID`, `CAPACITOR_SERVER_URL`, optional `MATCH_*`) — verified
  against `ios-release.yml` and `tooling/ios/fastlane/Fastfile` directly (see R4).
  **Codemagic (the primary runner, R5) needs its own, separate contract:** `APP_STORE_APPLE_ID`
  and `BUNDLE_ID` in a `pennyforge_ios` environment group inside the Codemagic dashboard, not
  GitHub secrets — `codemagic.yaml` fails fast in its build-number step if `APP_STORE_APPLE_ID` is
  unset (verified by reading `codemagic.yaml` directly). See R11. `docs/github-secrets.md` and
  `docs/credentials-needed.md` describe a superseded manual-signing secret set; a docs-correction
  pass should reconcile them before anyone provisions credentials. Never paste secrets in chat.
- **Capacitor `webDir` gap (verified 2026-07-09, fixed in this PR — see R13):** `capacitor.config.ts`
  sets `webDir: 'public'` and its own comment claimed `public/` is "a valid, committed folder," but
  no `public/` directory existed in the repo and `scripts/ios-bootstrap.sh` never creates one —
  `cap add ios`/`cap sync ios` would have failed on first activation. A placeholder
  `public/index.html` was added alongside this doc so the claim is now true; if it's later
  deleted, re-add it (or point `webDir` at a real build output) before running
  `npm run ios:bootstrap`.
- **Docs drift flagged for cleanup** (found by cross-reading all 13 `docs/*.md` mobile/backend
  files against the actual workflow/Fastlane/`.env.example` code): secret naming (R4), primary CI
  runner framing (R5), primary Phase-1 backend host (R6, a real open decision — ask Mason), CI
  typecheck step presence (R7, `status.md`/`connectors.md` are stale snapshots), and the
  `CAPACITOR_SERVER_URL` vs `NEXT_PUBLIC_API_BASE_URL` env-var name (R4). None of this blocks
  Phase 0–2 work; resolve before Phase 3 (mobile) kickoff.
- **Boundaries:** if a request implies scraping, private endpoints, competitor ingestion, reverse
  engineering, or automated checkout — stop and flag; never build a workaround.

## 16. Next Prompt to Paste into Claude Code

Copy-paste everything inside the fence into a fresh Claude Code session:

```text
You are building PennyForge — codename locked. Positioning: "Waze for hidden clearance":
receipt-verified, community-scored local deal intelligence for penny items and hidden clearance.
We win on trust, proof, routing, ROI, community, and compliance — never by scraping anyone.

STACK (locked): Next.js (App Router) + TypeScript + Tailwind CSS + Prisma + SQLite + Vitest.
Server components fetch via a shared Prisma client (lib/db.ts); client components call route
handlers under app/api/**. Pure business logic lives in framework-free lib/*.ts functions with
unit tests. Enum-like fields are String columns validated against arrays in lib/constants.ts
(Prisma/SQLite has no native enum). Mock auth: lib/currentUser.ts reads a pf_user_id cookie set
by POST /api/user, exposing getCurrentUser(): Promise<User | null> — keep that interface stable.

HARD BOUNDARIES (refuse and flag, never work around):
1. No scraping retailer or competitor websites.
2. No private/undocumented/reverse-engineered retailer endpoints.
3. No ingesting or reposting competitor paid feeds/lists.
4. No reverse engineering of retailer systems, apps, or POS tooling.
5. No automated checkout or purchase bots.
6. Data sourcing is an ALLOWLIST, not a denylist — lib/compliance.ts rejects any source type not
   explicitly allowed (allowed: IN_STORE_OBSERVATION, RECEIPT_PURCHASE, SHELF_TAG,
   STORE_FLYER_PUBLIC; blocked: SCRAPED_SITE, PRIVATE_API, COMPETITOR_REPOST, AUTOMATED_TOOL,
   EMPLOYEE_INTERNAL_SYSTEM, and anything unknown).
7. All product data is first-hand, in-store, user-generated reports.
8. Never ask for or handle credentials/tokens in chat.

FIRST: check the workspace. If the PennyForge MVP already exists (look for CLAUDE.md naming
PennyForge, prisma/schema.prisma with a Report.reportDate composite unique, and tests/), do NOT
rebuild — run `npm run setup`, then `npm test` and the acceptance checklist in docs/testing.md,
fix anything red, and report status. Only if the workspace is empty, build the MVP below.

BUILD THE LOCAL MVP VERTICAL SLICE (no external paid services, everything runnable locally):
- Local deal feed filtered by state / retailer / store / minimum confidence, seeded.
- Manual UPC/SKU/name search page.
- Report submission (existing or new product): price (cents), deal type PENNY|CLEARANCE, evidence
  type RECEIPT|SHELF_TAG_PHOTO|PRODUCT_PHOTO|TEXT_ONLY, source type (allowlist), optional
  evidence URL (http/https only), notes. Server-side compliance rejection = HTTP 422 before any
  DB write. Price sanity bounds 1¢–$5,000.
- SAME-DAY DUPLICATE PREVENTION — the one schema landmine: SQLite prohibits expressions in
  table-level UNIQUE constraints, so UNIQUE(productId, storeId, userId, date(createdAt)) will NOT
  compile. Store a real `reportDate` DateTime column (UTC midnight, computed in lib/reports.ts)
  and enforce @@unique([productId, storeId, userId, reportDate]). Duplicate submission → HTTP 409.
- Confidence scoring in lib/scoring.ts as a pure function returning a full breakdown:
  score = clamp((evidenceBase + trustBonus + confirmBonus − deadPenalty) × decay, 0, 100), with
  evidenceBase RECEIPT 45 / SHELF_TAG_PHOTO 32 / PRODUCT_PHOTO 22 / TEXT_ONLY 10; trustBonus up
  to +15 scaled by reporter trust 0–100; +12 per distinct confirm capped at +36; −18 per dead
  vote uncapped; decay = 0.5^(effectiveAgeDays / halfLife) with half-life 7d PENNY / 14d
  CLEARANCE, where a recent confirmed vote resets effective age. Suppression when
  deads >= 2 && deads > confirms → status SUPPRESSED, hidden from feed/alerts/routing, with the
  prior status saved to Report.previousStatus and restored exactly if confirms later reverse it.
- Voting: one changeable CONFIRMED|DEAD vote per user per report; self-votes rejected (403);
  reporter trust +2 per confirm / −3 per dead, applied as the NET delta on vote changes so
  toggling can't be farmed; clamp [0,100].
- Mock alerts: rows in an Alert table rendered on /alerts. Fire when score >= 60, to users within
  75 miles of the store (haversine), excluding the reporter, deduped PER RECIPIENT per
  (product, store) per 24h. Read/unread state.
- Route planner: per store, expectedValue = Σ (estimated value × confidence/100) over
  non-suppressed leads; tripCost = distance × 2 × $0.15/mile; rank by expectedValue − tripCost,
  exclude non-positive. Single-store ranking (no TSP). Saveable plans.
- Admin moderation queue at /admin gated to ADMIN|CAPTAIN roles; moderators may only set
  APPROVED or REJECTED (PENDING is creation-only, SUPPRESSED is vote-driven only).
- Contributor leaderboard. Mock-auth user switcher in the header.
- Prisma models: User (role, trustScore default 50, homeZip/lat/lng, locale en|es), Retailer,
  Store (geo, @@index([state, zip])), Product (upc/sku indexed, msrpCents), Report,
  ReportVote (@@unique([reportId, userId])), Alert, RoutePlan. Seed GA/FL/TX stores across
  Home Depot, Lowe's, Dollar General, Walmart with users, products, reports, votes, alerts.
- Vitest unit tests for: scoring (evidence ordering, caps, clamping, decay half-lives,
  confirm-refresh, suppression, trust deltas), report-date dedupe keys, alert threshold/dedupe,
  route ROI (suppressed contribute zero, negative-ROI excluded), compliance (every allowed type
  passes, every blocked type throws, UNKNOWN types throw — allowlist behavior, price bounds, URL
  scheme checks).
- npm scripts: dev/build/test/lint/typecheck, setup (install+migrate+seed), and a `verify`
  script running lint+typecheck+test+build.

UX RULES: users see badges, never raw score numbers, except the lead-detail breakdown that
explains "why this lead scores X". Show "last confirmed X ago" freshness. Footer disclaimer on
every pricing surface: community-reported, varies by store, nothing guaranteed, not affiliated
with any retailer, be kind to store employees. Design language: dark-first, monospace for
prices/SKUs/timestamps, one yellow accent (#FFCE00) reserved for verified-deal moments; no
starbursts, no emoji chrome, no coupon-blog styling. NOTE if the workspace already has the MVP
built: as of 2026-07-09, `components/ConfidenceBadge.tsx` renders the raw numeric score and no
screen shows "last confirmed X ago" — this is a known gap against the rule above, not a signal
that the rule changed. Fix the component (non-numeric tone/label, e.g. a confidence tier word or
the Verification Seal format) and surface `lastConfirmAgeDays` (already computed in
`lib/leads.ts#toLeadView`) in the UI rather than reinterpreting the requirement away.

DO NOT BUILD YET (deferred; schema may anticipate them but no implementation): real auth, camera
barcode scanning, receipt OCR, real push/email delivery, Postgres migration, TSP multi-stop
routing, native mobile shell, i18n wiring, fraud detection beyond dead-vote suppression, quiet
hours/digests/offline mode.

DEFINITION OF DONE: `npm run verify` fully green; the 16-item acceptance checklist in
docs/testing.md passes end-to-end against `npm run dev`; write CLAUDE.md documenting the mission,
hard boundaries, the reportDate constraint rationale, and the coding standards above so every
future session inherits them.
```

---

*End of integration package. The repo state at this commit is the Phase 0 exit: acceptance
criteria met, suite green, boundaries enforced in code.*
