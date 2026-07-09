# Discovery screens — Home, Local feed, Store selector

Author: Agent 6 (UX and Frontend Flow). Scope: the three "discovery" surfaces a user hits before
they ever submit a report — where they land, how they browse leads, and how they pick a store.
Grounded in the real MVP code (`app/page.tsx`, `components/LeadCard.tsx`,
`components/ConfidenceBadge.tsx`, `lib/leads.ts`, `lib/geo.ts`, `prisma/schema.prisma`) as of this
writing. See sibling docs in `docs/ux/` for nav shell and other flows — this doc does not design
nav itself, just references "the primary nav."

Every proposal below stays inside `CLAUDE.md`'s hard boundaries: no scraping, no private
endpoints, no automated checkout, first-hand in-store reports only, allowlist-based sources. All
"Future" ideas are additive UI/ranking work on top of existing first-hand report data — none of
them introduce a new data-acquisition path.

---

## 1. Home / dashboard

**MVP (built) baseline:** there is no separate home screen. `app/page.tsx` (route `/`) is the feed
itself and is first in `NAV` in `app/layout.tsx` (label "Feed"). This section specs a light
**dashboard strip** layered on top of the existing feed page for MVP polish — not a new route, not
a heavy separate screen. It answers "am I looking at MY area, and what needs my attention" before
the user scans the lead grid.

### Purpose

Give the user, in one glance above the fold, a sense of "here's what's near me and what's changed
since I last looked" — without duplicating the feed's job of listing individual leads. It's a
summary strip, not a second feed.

### Main components

- **MVP (net-new, to build):** a single-row "your area" strip inserted between the `<h1>` and the
  filter form in `app/page.tsx`, e.g.:
  - Nearby store count (count of `Store` rows matching the user's selected/home state or a radius
    around `homeLat`/`homeLng` via `haversineMiles`, once the store selector below exists to set a
    "my store")
  - Unread alert count (`prisma.alert.count({ where: { userId, readAt: null } })` — same query
    shape `app/alerts/page.tsx` already uses for the full list, just counted) — links to `/alerts`
  - Your recent activity (count of the current user's own reports in the last 7 days, e.g. via
    `prisma.report.count({ where: { userId, createdAt: { gte: sevenDaysAgo } } })`) — links to a
    future "my reports" view
  - Each stat is a small pill/card, not a chart — 3-4 numbers in a flex row, consistent with the
    existing `border border-stone-200 bg-white` card language already used for the filter form.
- **MVP (built):** everything below the strip is unchanged — the existing filter form (State,
  Retailer, Store, Min confidence) and the `LeadCard` grid.

### User actions

- Glance at the strip, click "Alerts" stat to jump to `/alerts`.
- Click "recent activity" stat to see own reports (future link target; MVP can point at
  `/leaderboard` or a simple `/me` stub if no dedicated page exists yet).
- Everything else defers to the Local feed section below (filter, click into a `LeadCard`).

### Data needed

- `prisma.alert.count` (unread, current user) — cheap, already indexed via
  `@@index([userId, createdAt])` on `Alert`.
- `prisma.report.count` (own reports, recent window) — no new index strictly required at MVP data
  volume, but note for later: add `@@index([userId, createdAt])` on `Report` if this gets slow.
- `prisma.store.count` scoped by state/home — reuses data already fetched in `page.tsx` for the
  state `<select>` (`[...new Set(stores.map(s => s.state))]`), so "nearby" at MVP can mean "stores
  in my home state" rather than true radius until the store selector (section 3) supplies a
  concrete "my store" with lat/lng.
- `getCurrentUser()` (`lib/currentUser.ts`) for the mock-auth `pf_user_id` cookie user; all stats
  are `null`/hidden for a signed-out (no cookie) visitor.

### Empty state

- No current user (no `pf_user_id` cookie set yet): hide the strip entirely rather than show
  zeros — an anonymous browsing user has no "your area" to summarize. Feed below still renders
  normally.
- Current user exists but has zero alerts / zero recent reports / no home location set: show the
  strip with honest zeros and a soft nudge, e.g. "0 unread alerts · 0 reports this week · set your
  home store to see nearby counts" (last clause links to the store selector, section 3).

### Error state

- If any of the three count queries fails (DB error), fail the whole strip silently (render
  nothing, log server-side) rather than breaking the page — the feed below is the primary content
  and must still render. This matches the existing page's resilience posture (no client JS
  dependency for the core feed).

### MVP version

Exactly as described above: one dashboard strip, three counts, zero new routes, computed
server-side in the same `FeedPage` server component alongside the existing `Promise.all` for
stores/retailers. No personalized ranking — the feed's sort order (by score, per
`getFeedLeads`/`toLeadView`) is untouched.

### Future version

- Personalized "leads near you" ranking: blend `score` with `haversineMiles` distance from the
  user's home or selected store so nearby high-confidence leads surface above distant
  higher-scored ones (a distinct sort mode, e.g. a "Near me" toggle next to the existing filter
  form, not a replacement for the confidence-sorted default).
- Contribution stats / streaks: "3-day reporting streak," "12 confirms given this month," pulling
  from `ReportVote` and `Report` history — ties into the existing trust-score/leaderboard system
  (`docs/product-spec.md` roadmap item: "Contributor leaderboard (trust score, reports, approvals,
  confirmations received)").
- A true separate `/dashboard` or `/home` route only if the strip's content grows enough to need
  its own scroll — deliberately deferred; the feed staying as home is a feature (fewer clicks to
  the thing people actually came for), not a gap to "fix" prematurely.
- Digest/quiet-hours summary ("what happened while you were away") once alerts move beyond the
  mock inbox — explicitly deferred per `docs/product-spec.md` ("Quiet hours / digest mode... alert
  UX refinements").

---

## 2. Local feed

**MVP (built).** This section specs `app/page.tsx` (route `/`) faithfully as it exists today,
plus the dashboard strip from section 1 sitting above it.

### Purpose

The default landing surface: browse community-reported penny/clearance leads ranked by
receipt-verified confidence, filterable to the user's area. This is the core "Waze for hidden
clearance" screen — trust and freshness signals must be visible without opening a lead.

### Main components

- `<h1>` "Local deal feed" + one-line subhead: "Community-reported penny and hidden-clearance
  leads, ranked by receipt-verified confidence."
- Filter form (GET, so filters are shareable/bookmarkable URLs): four `<select>`s — State (derived
  from `[...new Set(stores.map(s => s.state))].sort()`), Retailer (`prisma.retailer.findMany`),
  Store (`prisma.store.findMany`, labeled `"{name} ({state})"`), Min confidence (`Any` / `25+` /
  `50+` / `75+`) — plus a "Filter" submit button (`bg-forge-600`).
- Results grid: `<LeadCard>` per lead, each card showing:
  - Deal-type chip (`PENNY` → `bg-forge-100 text-forge-900`, `CLEARANCE` → `bg-sky-100
    text-sky-900`)
  - "pending review" pill when `status === "PENDING"` (`bg-stone-200`)
  - Product name, store name + city/state/zip
  - Price (`centsToUSD(priceCents)`, bold `text-forge-600`) with struck-through MSRP if present
  - Meta row: `ConfidenceBadge` (color-tiered pill: ≥75 emerald / ≥50 amber / ≥25 orange / <25
    red), evidence label (`EVIDENCE_LABELS[evidenceType]` — Receipt / Shelf tag photo / Product
    photo / Text only), confirm/dead counts (`✓ N · ✗ N`), reporter handle + trust score (`@handle
    (trust N)`), relative age (`timeAgo(createdAt)`)
  - Whole card is a `<Link href="/leads/{id}">` — one tap/click to full detail.

### User actions

- Set any combination of State / Retailer / Store / Min confidence and submit → server re-renders
  with `getFeedLeads(filter)` results, sorted by score descending.
- Click any `LeadCard` → navigate to `/leads/{id}` for full detail (evidence, vote buttons, etc.
  — out of scope for this doc).
- Use primary nav to reach Search, Report a find, Route, Alerts, Leaderboard, Admin.

### Data needed

- `prisma.store.findMany({ orderBy: { name: "asc" } })`, `prisma.retailer.findMany({ orderBy: {
  name: "asc" } })` — populate filter selects.
- `getFeedLeads({ state, retailerId, storeId, minScore })` from `lib/leads.ts` → only `PENDING`
  and `APPROVED` reports are visible (`status: { in: ["PENDING", "APPROVED"] }` — `REJECTED` and
  `SUPPRESSED` are excluded at the query level, not just hidden in UI), mapped through
  `toLeadView` (joins `product.retailer`, `store`, `user`, `votes`; computes `score` via
  `scoreBreakdown`), filtered by `minScore`, sorted by `score` descending.

### Empty state

Built and exact: `"No visible leads match these filters. Suppressed and rejected leads are
hidden."` in a dashed-border card (`border-dashed border-stone-300`) — deliberately tells the user
*why* a lead might be missing (moderation, not a bug), which reinforces trust in the system rather
than looking broken.

### Error state

Not explicitly handled in the current code (`export const dynamic = "force-dynamic"`, no
try/catch) — a DB failure would surface as Next.js's default error boundary. Not a gap this doc
needs to close by itself, but worth flagging for a shared error-boundary pass: a filtered-feed
page should fail toward "show unfiltered feed or a friendly retry," not a blank Next.js error
page, since this is the highest-traffic screen in the app.

### MVP version

Exactly the built behavior above, plus the dashboard strip from section 1. No pagination — all
matching leads render in one grid (acceptable at MVP seed-data volume; see Future for when this
needs to change).

### Future version

- Infinite scroll or numbered pagination once lead volume per area grows past a single screenful
  — `getFeedLeads` would need `skip`/`take` params and a stable secondary sort key (e.g. `id`) to
  paginate reliably alongside `score` ties.
- Saved filter presets ("my usual: GA, Target, 50+") persisted per user — small addition to `User`
  or a new lightweight table, surfaced as a dropdown next to the filter form.
- Map view toggle: plot filtered leads by `store.lat`/`store.lng` (already on the `Store` model)
  as an alternative to the list grid, using the same `getFeedLeads` result set — no new data
  source, just a second renderer. Must stay marker-only/first-party-data (no third-party
  store-locator scraping) per the compliance boundaries.
- "Near me" sort mode blended with confidence score, once a concrete user location (home coords or
  selected store from section 3) is available — same mechanism proposed in section 1's Future.

---

## 3. Store selector

**MVP (net-new, to build).** No dedicated store page exists today — the only store pickers are the
plain `<select>` in the feed filter form (`app/page.tsx`) and inside `ReportForm`
(`components/ReportForm.tsx`, a `<select name="storeId">` driven by a `stores` prop). This section
designs a real screen because store-level freshness and a settable "my store" are both explicit UX
principles for this MVP and neither exists yet.

### Purpose

Let a user find "the store(s) near me" and see, before they even open a lead, how fresh that
store's reporting is — then commit to one as "my store" so it pre-fills the feed filter and the
report form's store field. This directly satisfies the "show store-level freshness" principle and
removes friction from the sub-30-second report flow (no more scrolling a flat alphabetical
`<select>` to find your Target).

### Main components

- New route, e.g. `/stores` (linked from primary nav or from the dashboard strip / feed filter's
  Store label as a "browse stores" affordance — nav placement is out of scope per the brief).
- **Location input** (MVP fallback, no real geolocation yet):
  - A single text input for ZIP or city/state, pre-filled from `user.homeZip` if set
    (`User.homeZip`/`homeLat`/`homeLng` already exist on the schema).
  - Submitting geocodes to a lat/lng via a small first-party lookup — MVP can ship with a static
    ZIP-centroid table (a first-party seed dataset, not a live third-party geocoding API call, to
    avoid adding an external dependency mid-MVP) or, if simplest, skip lat/lng entirely for users
    without `homeLat`/`homeLng` and fall back to exact-state text filtering only (see below).
- **Distance-sorted store list:**
  - If the user has resolvable coordinates (`homeLat`/`homeLng`, or a geocoded ZIP entry): fetch
    `prisma.store.findMany()`, compute `haversineMiles(userLat, userLng, store.lat, store.lng)`
    for each (`lib/geo.ts`, already implemented, framework-free — matches the `lib/*.ts`
    business-logic convention in `CLAUDE.md`), sort ascending, render distance ("2.3 mi") per row.
  - If no coordinates are resolvable yet: fall back to an alphabetical or state-grouped list
    (reuse the same `[...new Set(stores.map(s => s.state))]` grouping pattern already in
    `app/page.tsx`) with a persistent prompt to enter a ZIP for distance sorting.
  - Each row: store name, retailer name (`store.retailer.name`), address/city/state/zip, distance
    (if known), and a **freshness indicator**.
- **Freshness indicator** (per store row): "last verified report: 2h ago" style, computed from the
  most recent `CONFIRMED` vote or, absent any, the most recent report's `createdAt` at that store
  — reusing `timeAgo()` from `lib/format.ts` for consistent phrasing with the rest of the app.
  Suggested tiers for a small color/weight cue (not a new component, just styling consistent with
  `ConfidenceBadge`'s tone system): fresh (<24h, emerald-ish), aging (1-7d, amber-ish), stale (>7d
  or never reported, stone/neutral, e.g. "no reports yet").
- Primary action per row: **"Set as my store"** button (writes the store id somewhere — MVP can
  reuse the same mock-auth pattern as `lib/currentUser.ts`/the `pf_user_id` cookie: a
  `pf_store_id` cookie, or a `homeStoreId` field if the `User` model gains one) and a secondary
  **"View leads"** link that jumps straight to `/?storeId={id}` (the feed already supports
  `storeId` as a query param via `getFeedLeads`).

### User actions

- Enter ZIP/city (or accept pre-filled `homeZip`) and submit to (re)sort the list by distance.
- Scan freshness indicators to judge which nearby store is actively being reported on.
- Tap "Set as my store" → store preference persists (cookie or user field) → feed filter and
  `ReportForm`'s store `<select>` both default to this store on next visit, cutting steps out of
  the sub-30-second report flow.
- Tap "View leads" on any row → `/?storeId={id}`, reusing the existing feed filter rather than
  building a parallel per-store leads view.

### Data needed

- `prisma.store.findMany({ include: { retailer: true } })` — name, retailer name, address,
  city/state/zip, `lat`/`lng` (all already on the `Store` model per `prisma/schema.prisma`).
- Per store, most recent report/confirm timestamp for the freshness indicator — either a
  `groupBy`/`orderBy` query on `Report`/`ReportVote` per store, or (simpler at MVP data volume) one
  query for latest `Report.createdAt` per `storeId` plus one for latest `CONFIRMED`
  `ReportVote.createdAt` joined through `Report.storeId`, taking the max of the two. **This query
  must scope to visible reports only** — `status: { in: ["PENDING", "APPROVED"] }`, the same filter
  `getFeedLeads` already applies (`lib/leads.ts`) — and, for the confirm-timestamp half, only
  consider `CONFIRMED` votes on reports that still pass that same filter. Without that scope, a
  `REJECTED` or community-`SUPPRESSED` report's `createdAt` (or a confirm vote on one) could make a
  store read as freshly verified even though that exact lead is deliberately hidden from the feed,
  search, and route planner — misleading a user into thinking a store is actively "hot" based on
  data the trust system has already suppressed. This is pure display logic and belongs in
  `lib/*.ts` (e.g. a new `lib/stores.ts` `getStoresWithFreshness` function) per `CLAUDE.md`'s
  convention of keeping business logic out of route handlers/components.
- `getCurrentUser()` for `homeZip`/`homeLat`/`homeLng` pre-fill.
- `haversineMiles` from `lib/geo.ts` (already implemented — no new math needed).

### Empty state

- No stores in the system at all: dashed-border card, "No stores yet in PennyForge." (matches the
  feed's empty-state visual language) — realistically only hit in a fresh/unseeded DB.
- Stores exist but none near the entered ZIP/city (e.g. a genuinely remote area, or a typo): show
  the full alphabetical/state-grouped list instead of a hard empty result, with a note like "No
  stores within range of that ZIP — showing all stores." This avoids a dead-end screen, consistent
  with the principle of never blocking the user's path forward.
- A store with zero reports ever: still lists, freshness indicator reads "no reports yet" (neutral
  tone, not treated as an error) — this is itself useful information (an opportunity for the user
  to be the first reporter there).

### Error state

- ZIP/city lookup fails to resolve to coordinates (bad input, or no static ZIP-centroid match):
  don't block the page — fall back to the alphabetical/state list and show an inline message
  ("Couldn't find that ZIP — showing all stores") rather than a form error, same non-blocking
  posture as the empty-state fallback above.
- "Set as my store" write fails (DB/cookie error): show an inline error near that row's button
  ("Couldn't save — try again") without losing the user's place in the list.

### MVP version

Usable with **no real device geolocation** — this is the deliberate MVP-vs-future line:
- Location comes from `user.homeZip` (already on the schema) or a manual ZIP/city text entry per
  visit.
- Distance uses `haversineMiles` (already implemented in `lib/geo.ts`) against a first-party
  ZIP-centroid table or the coordinates already on seeded `Store` rows — no live geolocation API,
  no browser `navigator.geolocation` prompt required to ship this screen.
- "My store" persistence via cookie or a simple `User` field, consistent with the existing mock-
  auth pattern (`pf_user_id` cookie) rather than building new session infrastructure.
- List view only — no map.

### Future version

- Live geolocation via `@capacitor/geolocation`, already earmarked in `docs/mobile-readiness.md`
  ("iOS plan: `@capacitor/geolocation` for 'use my current location' in the route planner and
  [store selection]") — replaces/augments the manual ZIP entry with a one-tap "use my current
  location," falling back to manual entry if permission is denied (never a hard requirement, since
  `docs/mobile-readiness.md` also notes precise location is "Only if geolocation feature ships").
- Map view of nearby stores (pins colored/sized by freshness tier), consistent with the feed's
  Future map-view toggle in section 2 — same underlying `store.lat`/`lng` data, no new source.
- Multiple saved stores ("my stores" list, not just one) with per-store freshness in the dashboard
  strip from section 1, once a user regularly checks more than one location (e.g. home + work).
- Push-style freshness nudges ("your store hasn't had a report in 5 days — go check it") once real
  push notifications ship — explicitly deferred per `CLAUDE.md`/`docs/product-spec.md`, not part
  of MVP.
