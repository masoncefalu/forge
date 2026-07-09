# Screens: Alerts & Route planner

Agent 6 (UX and Frontend Flow) unit. Covers two screens in the "after you've found or reported a
lead, what do you do with it" loop: the alerts inbox (`app/alerts/page.tsx`) and the route planner
(`app/route/page.tsx`). Both are built and live today — this doc specs them faithfully as MVP,
flags one real gap (`MarkReadButton` has no error state), and proposes MVP-polish and Future work
that stays inside the model these screens already use. Store-selection UX ("my store") is designed
in the sibling doc `screens-discovery.md` (section 3) — this doc cross-references it by filename
for the route-planner default-region polish below, it does not redesign it.

Every proposal below stays inside `CLAUDE.md`'s hard boundaries: no scraping, no private
endpoints, no automated checkout, first-hand in-store reports only. Nothing here introduces a new
data-acquisition path — Alerts fan out from `Report` rows already created by users, and the Route
planner ranks stores using `Report`/`Product` data already in the DB. "Offline mode future-ready"
below is a data-model argument (today's schema doesn't need to change to support it later), not a
claim that offline mode ships in this MVP — it explicitly does not, per
`docs/product-spec.md`'s deferred list ("Quiet hours / digest mode, offline in-store mode").

---

## 8. Alerts

**MVP (built).** This section specs `app/alerts/page.tsx`, `components/MarkReadButton.tsx`, and
`POST /api/alerts/[id]/read` faithfully as they exist today.

### Purpose

Give a user a single place to see the high-confidence leads that fired for them — leads at or
above `ALERT_THRESHOLD` (60, from `lib/scoring.ts`, re-exported by `lib/alerts.ts`) at a store
within `ALERT_RADIUS_MILES` (75) of their home coordinates. It is explicitly framed in-product as
a **mock inbox**, not a notification system: the page subhead says so directly ("Mock inbox —
push/email arrive in a later phase"). The purpose is to prove the alert-worthiness logic
(threshold + 24h dedupe + radius fan-out) end-to-end without building notification infrastructure
prematurely.

### Main components

- `<h1>` "Alerts" + subhead explaining the two quality gates in plain language (score threshold,
  one alert per product+store pair per 24h) and the mock-inbox caveat.
- Alert row (`div` per `Alert`, one per row, newest first via `orderBy: { createdAt: "desc" }`):
  - `ConfidenceBadge score={a.score}` — the score captured **at alert-creation time** (`Alert.score`
    is a stored snapshot, not a live join to the report's current score — so a row keeps showing
    the confidence that earned the alert even if the underlying report's score later drifts from
    new votes).
  - `timeAgo(a.createdAt)`.
  - A "new" pill (`bg-forge-100`, uppercase, bold) shown only when `!a.readAt`.
  - `a.message` — a plain-text description generated server-side at alert-creation time (in
    `app/api/reports/route.ts`'s fan-out step, not shown to this doc's scope in full, but it is the
    only descriptive content on the row today — see "evidence + freshness inline" polish below for
    why that is thin).
  - Optional "View lead" link to `/leads/{a.reportId}` when `reportId` is set (it can be null if
    the underlying report is later deleted/reassigned — link is conditionally rendered, not a
    broken href).
  - `MarkReadButton` — rendered only when `!a.readAt` (read rows have nothing to click).
- Read/unread visual treatment: unread rows get `border-forge-500 bg-white` (visually "hot"); read
  rows get `border-stone-200 bg-stone-50 opacity-70` (visually receded) — the dimming is the
  primary "I've dealt with this" signal, separate from the "new" pill's presence/absence.

### User actions

- Land on `/alerts`, scan the list (newest first, unread visually prioritized by border color and
  the "new" pill).
- Click "View lead" on a row with a `reportId` → navigate to `/leads/{reportId}` for full detail
  (evidence, voting, etc. — out of scope here, see `screens-search-and-lead.md`).
- Click "Mark read" on an unread row → `POST /api/alerts/{id}/read`, then `router.refresh()`; the
  row loses its "new" pill, its border, and the button itself on the next render (no optimistic
  update — the button just disables (`disabled={pending}`) while the request is in flight).

### Data needed

- `getCurrentUser()` (`lib/currentUser.ts`) — no user means `alerts = []` (page still renders, see
  Empty state).
- `prisma.alert.findMany({ where: { userId: user.id }, include: { product: true, store: true },
  orderBy: { createdAt: "desc" } })` — note `product`/`store` are included but not currently
  rendered in the row markup beyond what's baked into `a.message`; **`report` is not currently
  included**, which matters for the "evidence type inline" polish below (needs `include: { ...,
  report: true }` to read `report.evidenceType`).
- `POST /api/alerts/{id}/read` (`app/api/alerts/[id]/read/route.ts`) — 401 if no current user, 404
  if the alert doesn't exist or `alert.userId !== user.id` (ownership check prevents marking
  someone else's alert read), otherwise sets `readAt: new Date()` and returns `{ ok: true }`.

### Empty state

Built and exact: `"No alerts for @{user?.handle ?? "…"} yet. Submit a strong report to trigger the
fan-out."` in a dashed-border card — same visual language as the feed's empty state
(`screens-discovery.md` section 2), and it nudges the user toward the action (submitting a report)
that produces alerts for *other* nearby users, which doubles as a soft explainer of how the fan-out
works.

### Error state

**Current gap:** `MarkReadButton` has no error handling at all — `await fetch(...)` result is never
checked; a 401/404/500 from the route is silently swallowed, `router.refresh()` still fires via
`startTransition`, and the button simply re-renders in its prior (still-unread) state with no
explanation to the user of why nothing changed. This is inconsistent with the rest of the app:
`components/ModerationActions.tsx` already has the pattern to copy — a local `error` state,
checking `res.ok` before treating the call as success, and rendering `{error && <p role="alert"
className="text-xs text-red-700">{error}</p>}` next to the action buttons.

**Proposed fix (MVP polish, small/consistent change):**

```tsx
const [error, setError] = useState<string | null>(null);

async function markRead() {
  setError(null);
  try {
    const res = await fetch(`/api/alerts/${alertId}/read`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? `Failed (${res.status})`);
      return;
    }
    startTransition(() => router.refresh());
  } catch {
    setError("Network error — please try again.");
  }
}
```

Render `{error && <p role="alert" className="text-xs text-red-700">{error}</p>}` beneath the
button. This is the same shape already proven in `ModerationActions`, so it costs no new pattern —
just applying an existing one to a component that was missed.

### MVP version

Exactly the built behavior above: a pull-based, DB-backed list rendered on full page load/refresh
(`export const dynamic = "force-dynamic"`), no live/websocket updates, no client-side polling. The
user must navigate to `/alerts` (or refresh it) to see new alerts — there is no push, no toast, no
badge anywhere else in the app today indicating unread alerts exist.

Proposed MVP polish (small, not yet built, still inside the mock-inbox model — no new
infrastructure):

- **Unread count badge in nav.** `prisma.alert.count({ where: { userId, readAt: null } })` next to
  the "Alerts" nav item (same query shape the dashboard strip in `screens-discovery.md` section 1
  already proposes for its own unread-count stat — this would be the second consumer of that exact
  count, worth extracting to one shared query, e.g. `lib/alerts.ts#getUnreadAlertCount(userId)`, if
  both land).
- **Evidence type + store freshness inline**, not just `a.message` text. Add `report:true` to the
  `include` and render `EVIDENCE_LABELS[a.report?.evidenceType]` (from `lib/constants.ts`, same
  labels the feed and lead-detail cards already use — see `screens-discovery.md` section 2 and
  `screens-search-and-lead.md`) plus a freshness cue for `a.store` reusing the same "last verified"
  computation proposed for the store selector (`screens-discovery.md` section 3's
  `getStoresWithFreshness` idea) so a user can judge "is this alert still hot" without leaving the
  inbox. Today `a.message` is the only descriptive text on the row, so this is additive, not a
  replacement.
- **`MarkReadButton` error state** — see above, this is the one outright gap in the built code,
  not a net-new feature.

### Future version

- **Real push delivery (APNs/FCM) — explicitly deferred** per `docs/product-spec.md` ("Real push
  notifications / email / SMS... Swap point: `lib/alerts.ts` + a notification-delivery service
  behind the same `shouldCreateAlert` gate") and `CLAUDE.md` ("no real push notifications in the
  MVP"). The key design point worth recording here: **the alert-eligibility model itself requires
  no rework** — but push *delivery* is not schema-free, and the claim below should not be
  overstated to "nothing to add." The fan-out step that already runs in `app/api/reports/route.ts`
  (`pickNearbyRecipients` → `shouldCreateAlert` → `prisma.alert.create`) is exactly the point where
  a push send would be added as a second side-effect alongside the existing DB write — same
  trigger, same dedupe gate, same recipient *list*. `Alert.readAt` already models exactly the
  state a push notification needs ("has the user seen/opened this") — a tapped push notification
  would just call the same `POST /api/alerts/{id}/read` endpoint that `MarkReadButton` calls
  today, or set `readAt` directly. **What genuinely is missing, and does need schema:** there is
  currently no per-user/per-device push token or delivery opt-in target anywhere in the schema —
  `pickNearbyRecipients` returns `User` rows, not addressable push endpoints. `docs/mobile-readiness.md`
  already calls this out (storing device tokens on `User` as part of the iOS push plan). So the
  accurate framing is: no new *dedupe/eligibility/recipient-selection* logic is needed (that part
  really is reuse), but shipping push at all requires adding token/preference storage (e.g. a
  `DeviceToken` table or fields on `User`) before a delivery adapter has anywhere to send to — the
  fan-out logic and the token storage are two separate additions, and only the first is "already
  built."
- **Offline-future-ready framing, specifically:** because Alerts are already a pull-based,
  server-persisted list rather than an ephemeral in-memory toast, a user who is offline when an
  alert would have fired does not lose it — it is sitting in the `Alert` table waiting for their
  next `/alerts` visit or (once push ships) their next reconnect. That is the "offline mode
  future-ready" property this screen already has for free, purely from choosing a DB-row model over
  a fire-and-forget notification model. True offline *rendering* (viewing previously-fetched alerts
  with zero connectivity, e.g. via a service worker cache) is separately deferred
  ("offline in-store mode" per `docs/product-spec.md`) and would layer a client cache on top of
  this same data — it does not need the data model itself to change.
- Quiet hours / digest mode (batch alerts into a daily/weekly summary instead of one row per
  event) — explicitly deferred per `docs/product-spec.md`.
- Alert-level actions beyond "mark read" — e.g. "snooze," "not interested" (tune future
  recommendations) — no current data model support, would need new fields; not scoped here.

---

## 9. Route planner

**MVP (built).** This section specs `app/route/page.tsx`, `lib/route.ts`, `lib/routePlanner.ts`,
and `components/SaveRoutePlanButton.tsx` faithfully as they exist today.

### Purpose

Answer one question fast: **"which of the stores near me is actually worth the gas to visit right
now?"** Every store with at least one active (`PENDING`/`APPROVED`, non-suppressed) lead is scored
by expected haul value versus round-trip driving cost, and only stores where the trip pays for
itself are shown. This is confidence-clarity applied at the *route* level rather than the
individual-lead level: the same score that colors a `ConfidenceBadge` on a single `LeadCard`
(`screens-discovery.md` section 2) is exactly what discounts a store's `expectedValue` here (a
store full of low-confidence leads ranks low even with a high raw lead count), so a user who
already trusts the per-lead confidence signal gets the same trust carried through into "which trip
is worth taking."

### Main components

- `<h1>` "Route planner" + subhead naming the exact math in plain language: "Stores ranked for
  @{user.handle} (home {user.homeZip ?? "unset"}) by expected value of active leads minus
  round-trip gas at ${DEFAULT_COST_PER_MILE}/mile. Trips that cost more than the expected haul are
  hidden." — this single sentence is the screen's entire trust argument: nothing is hidden about
  *why* a store made the cut.
- Ranked table, one row per store that cleared `routeScore > 0`, columns:
  - `#` — rank (1-indexed, array order).
  - `Store` — `"{name} ({city}, {state})"`.
  - `Distance` — one-way miles from the user's origin (`distanceMiles`).
  - `Leads` — count of active (non-suppressed) leads at that store (`leadCount`).
  - `Expected value` — Σ over active leads of `estValue × (confidence / 100)` (`expectedValue`),
    i.e. confidence-discounted, not face-value MSRP total.
  - `Trip cost` — round-trip miles × `$0.15`/mile gas-only estimate (`tripCost`), shown as a
    negative (`−$X.XX`) to read visually as a deduction.
  - `Route score` — `expectedValue − tripCost` (`routeScore`), bold/branded (`text-forge-600`) as
    the column the table is sorted by (descending) and the number that ultimately answers the
    screen's purpose question.
  - Together these four numeric columns (Distance/Leads/Expected value/Trip cost) are the "show
    your work" behind Route score — a user can see *why* a store ranks #1 (e.g. fewer, higher-value
    leads close by beating more, lower-value leads far away) instead of trusting an opaque single
    number, the same transparency principle `ConfidenceBadge`'s tooltip ("Confidence score (0–100)")
    applies at the individual-lead level.
- `SaveRoutePlanButton` — rendered only when `ranked.length > 0` (nothing to save if the table is
  empty). Text input (plan name, defaults to "My route" server-side if left blank) + "Save this
  route" button.
- "Saved plans" section: one card per `RoutePlan` (newest first), showing plan name, `timeAgo`,
  total score (`p.totalScore.toFixed(1)`), and the store sequence as `storeName → storeName → ...`
  parsed from `stopsJson` (a JSON snapshot of the ranked list *at save time* — saved plans do not
  live-update if scores change afterward, they're a point-in-time snapshot).

### User actions

- Land on `/route`, scan the ranked table (already sorted, no interaction needed to see the
  top-ranked trip).
- Optionally type a plan name and click "Save this route" → `POST /api/route-plans`, inline success
  ("Plan saved.") or error message appears next to the button, input clears, page refreshes to show
  the new plan in "Saved plans" below.
- Scroll to "Saved plans" to review past-saved trips (read-only today — no delete/edit action
  exists yet).

### Data needed

- `getCurrentUser()` — no user renders a plain-text seed-data nudge instead of the table (see Empty
  state).
- `getRankedStoresForUser(user)` (`lib/routePlanner.ts`): origin = `user.homeLat`/`homeLng` or
  `DEFAULT_ORIGIN` (downtown Atlanta) if unset; pulls all `Store` rows with their `PENDING`/
  `APPROVED` reports (`product`, `store`, `user`, `votes` included for `toLeadView` scoring);
  builds `RouteStoreInput[]` (`estValue = (product.msrpCents ?? report.priceCents) / 100`,
  `confidence = toLeadView(r).score`); delegates to `rankStores` (`lib/route.ts`) which filters to
  `routeScore > 0` and sorts descending.
- `prisma.routePlan.findMany({ where: { userId }, orderBy: { createdAt: "desc" } })` for the Saved
  plans section.
- `POST /api/route-plans` (`app/api/route-plans/route.ts`): 401 if no user; re-runs
  `getRankedStoresForUser` server-side (not trusting client-sent scores), sums `routeScore` into
  `totalScore`, stores the full ranked array as `stopsJson`, returns `{ id }` on 201.

### Empty state

- No current user at all: built and exact — `"No users seeded yet — run npm run prisma:seed."`
  (plain text, no styled card; this is a dev/seed-state message rather than a real end-user empty
  state, since mock auth means there should always be a current user in normal use).
- No store currently clears `routeScore > 0`: built and exact — table renders one full-width row,
  `"No trips currently beat their gas cost."` This is an honest, expected outcome (not an error) —
  worth pairing conceptually with the feed's empty-state pattern of explaining *why* rather than
  looking broken (`screens-discovery.md` section 2).
- No saved plans yet: built and exact — `"No saved plans yet."` in the Saved plans section.

### Error state

`SaveRoutePlanButton` already handles this correctly and can be the model for other components
(including the `MarkReadButton` fix proposed above): it checks `res.ok`, reads `data.error` from
the JSON body on failure, and renders it inline (`{message && <span
className="text-sm text-stone-600">{message}</span>}`) next to the Save button — no separate
`role="alert"` styling today (uses neutral `text-stone-600` for both success and error text rather
than a red error color), which is a minor inconsistency worth flagging: a future pass could split
`message` into distinct success/error state with `role="alert"` + red text on failure, matching
`ModerationActions`'s convention, so a failed save doesn't read as visually identical to a
successful one.

The table itself has no explicit error handling for a `getRankedStoresForUser` failure (DB error)
— same posture as the feed (`screens-discovery.md` section 2's Error state note): would fall
through to Next.js's default error boundary. Not a new gap specific to this screen, but consistent
enough with the rest of the app that it's not treated as a blocker here.

### MVP version

Exactly the built behavior above: single-store ranking (not multi-stop), gas-only cost estimate
at a fixed `$0.15`/mile, straight-line (haversine) distance rather than real driving distance,
manual "save a snapshot" rather than live-updating saved plans.

Proposed MVP polish (small, not yet built):

- **Default to the user's "my store" region.** Once the store selector in `screens-discovery.md`
  (section 3) ships a settable "my store" (proposed there as a `pf_store_id` cookie or a
  `homeStoreId` field), the route planner's origin could prefer that store's coordinates over raw
  `user.homeLat`/`homeLng`/`DEFAULT_ORIGIN` when set — e.g. someone whose home ZIP is far from
  where they actually shop (a work address, a family member's town) gets a more relevant ranked
  list without re-entering a ZIP. This is a small change to `getRankedStoresForUser`'s origin
  resolution (`lib/routePlanner.ts` lines 16-19) — try `homeStoreId` coordinates first, fall back
  to `homeLat`/`homeLng`, then `DEFAULT_ORIGIN`, unchanged otherwise. Not redesigning the store
  selector itself here — see `screens-discovery.md` for that screen's full spec.
- Minor visual polish: a small "distance & cost use straight-line estimates, not driving routes"
  disclaimer near the subhead, so the MVP's known simplification (haversine, not road distance) is
  stated rather than silently assumed — consistent with this screen's existing "show your work"
  ethos in the ranked-table columns.

### Future version

- **Multi-stop TSP-optimized route — explicitly deferred.** `lib/route.ts`'s own header comment
  states this directly: "This is deliberately a single-store ranking for the MVP — multi-stop TSP
  ordering is a later phase," and `docs/product-spec.md` lists "Multi-stop route optimization
  (TSP)" under Phase 3. Today's `scoreStore`/`rankStores` treat every store independently; a
  multi-stop version would need genuine route-ordering logic (e.g. nearest-neighbor or a real TSP
  solver) layered on top of, not replacing, the existing per-store `expectedValue`/`tripCost` math
  — the current single-store scores would likely become the per-stop building blocks for a
  future multi-stop total.
- **Live traffic / real driving distance via a mapping API**, replacing the current haversine
  straight-line `distanceMiles`. Must stay compliant with `CLAUDE.md`'s allowlist-first sourcing
  posture for any external service added (a legitimate mapping/directions API is a service call for
  computing distance, not a source of *product/deal* data, so it does not conflict with the
  no-scraping / first-hand-report boundary — but any such integration should still go through
  `lib/compliance.ts`'s allowlist review before being wired in, consistent with "allowlist, not
  denylist" for any new external data source).
- **Offline-cached saved route plans.** A saved `RoutePlan` is already a self-contained JSON
  snapshot (`stopsJson`) written at save time — it does not need a live DB query to redisplay, only
  to be *shown*. That makes it a natural first candidate for the offline-future-ready principle: a
  future client-side cache (e.g. service worker or local storage keyed by plan id) could let a
  user pull up a previously-saved route with zero connectivity, since the data it needs
  (store names, order, scores) is already fully denormalized into `stopsJson` rather than requiring
  fresh joins. This pairs with the "offline in-store mode" item already on
  `docs/product-spec.md`'s deferred list — not built now, but the saved-plan data shape already
  supports it without a schema change.
