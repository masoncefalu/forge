# PennyForge — Open-Source Building Blocks (OSS Scout)

Survey of open-source projects usable as building blocks (or explicit anti-patterns) for a
compliant penny/hidden-clearance MVP. Thirty projects received full metadata/README-level
evaluations on **2026-07-09**, grouped into four research clusters covering the nine requested
categories, plus a handful of adjacent one-line mentions (GraphHopper, openrouteservice, Lucia,
Tremor) — no GitHub API sweeps, no code search, no bulk repo crawling. Stars and dates were confirmed from public repo pages where cheap to do so; entries
marked *approx.* should be re-verified before being cited externally.

Scope note: this doc covers **feature-level libraries and services** (scanning, OCR, geo/routing,
alerts, admin UI, app foundations). CI/CD, hosting, and mobile-pipeline tooling is already
covered by `docs/tooling-options.md` and its companions — not repeated here.

> **Compliance lens (from `CLAUDE.md`):** no scraping, no private/undocumented retailer APIs, no
> competitor feed ingestion, no reverse engineering of retailer systems, no automated checkout,
> allowlist-not-denylist sourcing, and all product data from first-hand, in-store, user-generated
> reports. Every verdict below was made against those seven boundaries. The
> monitoring/deal-bot category is where most of the ecosystem lives on the wrong side of them —
> that's expected, and it's why several entries exist here only as documented negative examples.

---

## 1. Ranked list of safest OSS building blocks

Ranked by (a) compliance safety, (b) fit with the existing stack (Next.js 15 App Router, React
19, TypeScript, Tailwind 3, Prisma 6 + SQLite→Postgres, Vitest, no Redis/workers), and
(c) maintenance health.

| # | Project | License | Verdict | When | Why it ranks here |
|---|---------|---------|---------|------|-------------------|
| 1 | [shadcn/ui](https://github.com/shadcn-ui/ui) | MIT | Use directly | Now | Vendored components (no runtime dep), exact Tailwind/React match; upgrades admin + voting UI incrementally. Pin to Tailwind-v3-compatible component versions (current CLI targets v4). |
| 2 | [Turf.js scoped modules](https://github.com/Turfjs/turf) (`@turf/distance`, `@turf/nearest-point`) | MIT | Use directly | Now (optional) | Pure, framework-free geo math that slots into `lib/route.ts` without adding services; tree-shakeable; grows with Phase 3 (bbox, clustering, isochrone rendering). |
| 3 | [web-push](https://github.com/web-push-libs/web-push) | MPL-2.0 | Use directly | Phase 2 | Standards-based Web Push/VAPID from plain route handlers — real push with **no Redis, no workers, no Firebase**. Needs only a `PushSubscription` Prisma table + a service worker. |
| 4 | [barcode-detector](https://github.com/Sec-ant/barcode-detector) (Sec-ant, zxing-wasm) | MIT | Use directly | Phase 2 | W3C `BarcodeDetector`-shaped ponyfill: native detector on Chrome/Android, ZXing-C++ WASM elsewhere. Standard API shape makes the later swap to native ML Kit in the Capacitor shell nearly free. |
| 5 | [Auth.js / NextAuth v5](https://github.com/nextauthjs/next-auth) | ISC | Use directly | Phase 1 | `auth()` + Prisma adapter slots behind the existing `getCurrentUser()` seam in `lib/currentUser.ts` — but only the call-site swap is one file: budget for the adapter's Prisma schema additions (`Account`, `Session`, `VerificationToken`, extra `User` fields) plus a migration and the `/api/auth` route/config. (Lucia is deprecated; see avoid list.) |
| 6 | [Tesseract.js](https://github.com/naptha/tesseract.js) (~38k★, v7) | Apache-2.0 | Use directly | Phase 3 | Client-side/Node receipt OCR with word-level confidence scores that feed the scoring layer. Treat output as assistive prefill the user confirms, never auto-ingested fact. |
| 7 | [Open Food Facts](https://world.openfoodfacts.org) API | ODbL (data) | Use directly, segregated | Phase 2 | The one legitimately **open** UPC→product-metadata source; crowd-sourced like PennyForge itself. Scope strictly as **catalog-metadata prefill** (name/brand/image after a scan) — never a report-evidence `sourceType`: the `ALLOWED_SOURCE_TYPES` allowlist in `lib/compliance.ts` is first-hand, in-store evidence only and must stay that way. If adopted, document OFF as a separate metadata-source path. ODbL share-alike ⇒ keep OFF-sourced fields in a separate cache table (or fetch-at-display) with attribution so the core deal DB stays out of ODbL. Coverage skews food. |
| 8 | [Quagga2](https://github.com/ericblade/quagga2) | MIT | Use directly (fallback) | Phase 2 | Maintained fork of QuaggaJS; strong 1D localization on crumpled shelf tags. Fallback if `barcode-detector` accuracy disappoints on retail 1D codes. No QR support. |
| 9 | [Leaflet](https://github.com/Leaflet/Leaflet) (+ optional [react-leaflet](https://github.com/PaulLeCam/react-leaflet)) | BSD-2 / Hippocratic-2.1 | Leaflet: use directly. react-leaflet: license sign-off first | First map iteration | Simplest store-pin map; client component via `next/dynamic` (`ssr: false`). Leaflet itself (BSD-2) is clean, and a thin hand-rolled wrapper suffices for one map. react-leaflet's Hippocratic-2.1 license is source-available, **not OSI-approved** — given the App Store/commercial path, do not adopt it without an explicit license decision; MapLibre + react-map-gl (MIT) is the license-clean React-binding alternative. Tile source must not be `tile.openstreetmap.org` in production. |
| 10 | [ntfy](https://github.com/binwiederhier/ntfy) (~32k★) | Apache-2.0/GPLv2 | Use directly (ops only) | Now | One-line synchronous HTTP publish from a route handler — zero-infra **internal/admin** alert channel (moderation spikes, seed health). Not the consumer push path. |
| 11 | [OSRM](https://github.com/Project-OSRM/osrm-backend) + [VROOM](https://github.com/VROOM-Project/vroom) | BSD-2 / BSD-2 | Use directly | Phase 3 | The self-hosted routing stack: OSRM `/table` for drive-time matrices, VROOM for real TSP/VRP "optimal penny run" (time windows, priorities ← confidence scores). Docker-deployed from public OSM extracts; **never** the public demo servers. |
| 12 | [Valhalla](https://github.com/valhalla/valhalla) | MIT | Strong alternative | Phase 3 | Swap for OSRM if isochrones ("stores within a 20-min drive" feed filter) or runtime-tunable costing make the roadmap. Pick one engine, not both. |
| 13 | [@capacitor-mlkit/barcode-scanning](https://github.com/capawesome-team/capacitor-mlkit) | Apache-2.0 | Use directly | Capacitor phase | Native on-device ML Kit scanning in the staged iOS shell; gate on `Capacitor.isNativePlatform()` behind the same `BarcodeDetector`-shaped interface as #4. |
| 14 | [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js) | BSD-3 | Use directly | Phase 3 | Vector-tile upgrade when route polylines justify it; well-governed community fork. Contained UI swap from Leaflet. |
| 15 | [geolib](https://github.com/manuelbieh/geolib) | MIT | Alternative to #2 | — | Zero-dep `orderByDistance`/`isPointWithinRadius`; wins only on bundle size. Prefer scoped Turf (more active, GeoJSON-native). Pick one, not both. |

**Study conceptually (don't depend on, do steal ideas from):**

- **[changedetection.io](https://github.com/dgtlmoon/changedetection.io)** (~32k★, Apache-2.0) —
  the single most useful architectural idea found: **transition-gated alert dedupe**. Key each
  alert on stable identity (`userId + productId + storeId`) plus a fingerprint of the
  last-notified state; fire only when the fingerprint changes; re-arm on transition. Directly
  applicable to `lib/alerts.ts`. Never deploy the tool itself against retailer targets.
- **[Huginn](https://github.com/huginn/huginn)** (~50k★, MIT) — its DeDuplicationAgent (bounded
  memory of recent event fingerprints) and DigestAgent ("5 new penny finds near you" rollups
  instead of per-report spam) are the right future shapes for alert fatigue.
- **[urlwatch](https://github.com/thp/urlwatch)** — clean three-layer *jobs → filters → reporters*
  separation; reporters as dumb consumers of a normalized change event mirrors keeping alert
  logic framework-free with route handlers as thin delivery.
- **[create-t3-app](https://github.com/t3-oss/create-t3-app)** (MIT) — the app is already built,
  so it's a reference, not a starter. Worth lifting: `@t3-oss/env-nextjs` (Zod-validated env
  vars) and its Prisma-singleton `server/db.ts` pattern (compare with `lib/db.ts`). Skip tRPC.
- **[Refine](https://github.com/refinedev/refine)** (MIT) — headless CRUD hooks over existing API
  routes, Tailwind-compatible; adopt only if the admin surface grows to many resources. Watch
  maintenance cadence (energy shifted toward its enterprise offering).
- **[PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)** (Apache-2.0) — held in reserve as
  the server-side OCR upgrade if Tesseract.js accuracy on thermal receipts is the bottleneck;
  it's a separate Python runtime, so it's a deliberate later-phase infra decision.
- **[Apprise](https://github.com/caronc/apprise)** (BSD-2) — its channel-abstraction shape (one
  normalized notification, N pluggable transports) is the right design for a future
  `lib/notify.ts`; the Python library itself is a language/sidecar mismatch.

---

## 2. Repos to avoid and why

### Compliance violations (categorical — document as negative examples in `docs/compliance.md`)

| Project | What it is | Boundary violated |
|---------|-----------|-------------------|
| [FairGame](https://github.com/Hari-Nagarajan/fairgame) | Amazon purchase bot: monitors listings and **auto-completes checkout**. Dead since 2021; its own README warns of account bans. | #5 (automated checkout), #1, #4. The canonical negative example. |
| [streetmerchant](https://github.com/jef/streetmerchant) | 24/7 retailer stock scraper with auto-add-to-cart "checkout assistance". TypeScript, which makes it tempting — resist. | #1 (continuous scraping), skirts #5; per-store selectors are #4 in practice. "Won't auto-buy" disclaimer doesn't rescue it. |
| [Discount-Bandit](https://github.com/Cybrarist/Discount-Bandit) | Self-hosted tracker that scrapes Amazon/Walmart/Target/eBay et al. directly. | #1, #7. Scraping Target/Walmart is precisely the gray-data behavior PennyForge positions against. Watch-list UX (one product × N stores, absolute vs %-off thresholds) may be glanced at conceptually. |
| [PriceBuddy](https://github.com/jez500/pricebuddy) | Paste-a-URL price scraper with LLM-assisted extraction. | #1, #7. Key doc-worthy lesson: **"AI extraction" does not launder a prohibited source.** Its price-history-baseline *concept* translates safely to "how anomalous is this reported price vs. prior user reports" in `lib/scoring.ts`. |

### Maintenance / architectural mismatches

| Project | Why avoid |
|---------|-----------|
| [zxing-js](https://github.com/zxing-js/library) (`@zxing/library`/`@zxing/browser`) | Maintainers explicitly seeking successors; don't take on a new dependency in a maintenance vacuum. Camera-stream lifecycle handling is still instructive. |
| [html5-qrcode](https://github.com/mebjas/html5-qrcode) | Declared maintenance mode (no fixes/PRs) *and* wraps the also-dormant zxing-js — two stacked dormant deps. Its permission/torch/camera-picker UX is worth imitating. |
| Lucia (auth) | Deprecated as a maintained library in 2025 (now a learning resource). Do not build Phase 1 auth on it — use Auth.js v5. |
| [react-admin](https://github.com/marmelab/react-admin) | Healthy project, wrong fit: MUI (not Tailwind), SPA-oriented, wants to own routing/data-fetching — fights App Router server components for the sake of one working moderation page. |
| [Novu](https://github.com/novuhq/novu) | Wrong weight class: self-hosting requires MongoDB + Redis + workers, directly contradicting the no-Redis/no-workers boundary. Reconsider only at Phase 3+ if channels genuinely multiply. Open-core — check enterprise-license boundaries if ever adopted. |
| GraphHopper / openrouteservice | Credible routing engines, but JVM dependency / GPL-3.0 backend respectively make OSRM/Valhalla + VROOM the cleaner stack. |

---

## 3. Recommended dependencies for MVP (now)

The headline MVP finding: **zero new runtime dependencies are required.** The first vertical
slice is built and the "no extra services" rule holds. Optional, low-risk adds:

1. **shadcn/ui components** (vendored, not an npm dep) — `Table`, `Dialog`, `Badge`, `Toast`,
   `DropdownMenu` for the admin moderation page and vote/report UI. Use Tailwind-v3-compatible
   versions.
2. **`@turf/distance`** (+ `@turf/nearest-point`) — optional replacement/validation for the
   hand-rolled haversine in `lib/route.ts`. Pure functions; keeps everything unit-testable.
   Install scoped packages only, never the `@turf/turf` meta-package.
3. **ntfy** (external service, not a dep) — free ops/admin alert channel via synchronous
   `fetch()` from route handlers, usable today.
4. **`@t3-oss/env-nextjs`** — Zod-validated env vars to harden `DATABASE_URL` handling; small
   and boring.

Plus one free architectural adoption: refactor `lib/alerts.ts` dedupe toward
changedetection.io-style transition-gating (identity key + last-notified fingerprint) — a pure
logic change, no dependency.

## 4. Deferred dependencies (later phases)

| Phase | Dependency | Purpose |
|-------|-----------|---------|
| 1 | `next-auth@5` + `@auth/prisma-adapter` | Real auth behind the `getCurrentUser()` seam — call-site swap is one file, but also requires the adapter's schema tables (`Account`, `Session`, `VerificationToken`, `User` fields) + migration and `/api/auth` config |
| 2 | `barcode-detector` | Camera UPC scan (native `BarcodeDetector` + WASM fallback) |
| 2 | `quagga2` | Fallback 1D scanner if needed |
| 2 | `web-push` | Real push from route handlers; add `PushSubscription` Prisma table + service worker |
| 2 | Open Food Facts REST API (plain `fetch`) | UPC→name/brand/image prefill in the report form — catalog metadata only, kept outside the report-evidence allowlist in `lib/compliance.ts`; segregate + attribute (ODbL) |
| 2–3 | `leaflet` (add `react-leaflet` only after a license decision on Hippocratic-2.1) | Store-pin map (client-only via `next/dynamic`) |
| 3 | `tesseract.js` | Receipt OCR as assistive prefill; confidences feed scoring |
| 3 | OSRM (or Valhalla) + VROOM (Docker services) | Drive-time matrices + ROI-optimized multi-stop penny runs |
| 3 | `maplibre-gl` | Vector-tile map upgrade for route polylines |
| 3+ (reserve) | PaddleOCR (Python service) | Only if Tesseract.js accuracy on thermal receipts is the bottleneck |
| 4 (Capacitor) | `@capacitor-mlkit/barcode-scanning`, `@capacitor/push-notifications` | Native scan + FCM/APNs push in the iOS shell (don't force Web Push through the webview) |

---

## 5. OSS Packet (compressed hand-off)

```
PENNYFORGE OSS PACKET v1 (2026-07-09) — 30 full evaluations (+ one-line adjacents),
  metadata-level, rate-limit-safe
STACK: Next15/React19/TS/Tailwind3/Prisma6(SQLite→PG)/Vitest; no Redis/workers; Capacitor staged
COMPLIANCE: 7 hard boundaries (CLAUDE.md); allowlist sourcing; first-hand UGC only

ADOPT-NOW (0 required; optional): shadcn/ui[vendored,MIT,pin-TW3] · @turf/distance[MIT]
  · ntfy[ops-alerts-only] · @t3-oss/env-nextjs[env-validation]
PHASE1: next-auth@5+prisma-adapter[ISC] behind getCurrentUser() seam (call-site=1 file, but
  needs Account/Session/VerificationToken schema tables + migration + /api/auth config).
  Lucia=deprecated,NO.
PHASE2: barcode-detector[Sec-ant,MIT,W3C-shape→free ML Kit swap later] · quagga2[fallback-1D]
  · web-push[MPL2,VAPID,sync from route handlers,+PushSubscription table,no workers]
  · OpenFoodFacts API[catalog-metadata prefill ONLY, never a report sourceType — the
    lib/compliance.ts evidence allowlist stays first-hand; ODbL: segregate cache table +
    attribute, else share-alike contaminates core DB; food-skewed coverage]
PHASE3: tesseract.js[v7,Apache2,assistive-prefill-only] · OSRM|Valhalla + VROOM[Docker,
  OSM extracts, NEVER public demo servers, ODbL attribution] · maplibre-gl
  · leaflet[BSD-2] earlier if map wanted; react-leaflet=Hippocratic-2.1(non-OSI)→license
    sign-off first, or maplibre+react-map-gl[MIT] as license-clean binding
CAPACITOR: @capacitor-mlkit/barcode-scanning + @capacitor/push-notifications (not Web Push in shell)
STEAL-IDEAS-ONLY: changedetection.io→transition-gated alert dedupe (identity key + last-notified
  fingerprint, fire on change, re-arm) for lib/alerts.ts · Huginn→digest rollups + bounded dedupe
  memory · urlwatch→jobs/filters/reporters layering · PriceBuddy→price-anomaly-vs-user-history
  concept for lib/scoring.ts · Apprise→transport-abstraction shape for future lib/notify.ts
  · html5-qrcode→scanner UX (torch/camera-picker/ROI box)
AVOID-COMPLIANCE: FairGame[auto-checkout] · streetmerchant[scrape+add-to-cart, TS-tempting]
  · Discount-Bandit[scrapes Target/Walmart/Amazon] · PriceBuddy[scraper; AI-extraction≠laundering]
AVOID-HEALTH/FIT: zxing-js+html5-qrcode[unmaintained] · Lucia[deprecated] · react-admin[MUI/SPA]
  · Novu[needs Mongo+Redis+workers] · GraphHopper/ORS[JVM/GPL vs OSRM+VROOM]
LICENSE FLAGS: ODbL(OFF data, OSM data)=attribution+share-alike, keep derived DBs segregated;
  react-leaflet=Hippocratic(non-OSI); Novu=open-core; MLKit binaries=closed(plugin Apache2)
KEY RISK NOTE: monitoring/deal-bot category is architecturally instructive but its ecosystem
  default is retailer scraping — adopt patterns, never ingestion code.
```
