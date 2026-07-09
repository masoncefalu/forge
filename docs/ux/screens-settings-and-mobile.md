# Settings/profile screen + mobile-first layout notes

Author: Agent 6 (UX and Frontend Flow). Scope: screen 12 (Settings/profile, net-new) and the
mobile-layout-mechanics deliverable — breakpoints, touch targets, card density, and offline-ready
design patterns. Grounded in the real MVP code (`components/UserSwitcher.tsx`,
`lib/currentUser.ts`, `prisma/schema.prisma`, `app/layout.tsx`, `app/leaderboard/page.tsx`,
`components/LeadCard.tsx`, `components/VoteButtons.tsx`, `components/ModerationActions.tsx`,
`components/MarkReadButton.tsx`, `docs/mobile-readiness.md`, `tailwind.config.ts`) as of this
writing.

This doc does **not** redesign primary navigation — a sibling doc (`screen-map-and-flows.md`)
proposes a bottom-tab-bar IA; the mobile-layout section here is about layout mechanics on top of
whatever nav structure that doc settles on. It also does not redesign alerts (`lib/alerts.ts`,
`app/alerts/page.tsx`) — the notification-preferences item below is a settings-screen toggle only,
covered in flow terms by `screens-alerts-and-routing.md`.

Every proposal below stays inside `CLAUDE.md`'s hard boundaries: no scraping, no private
endpoints, no automated checkout, first-hand in-store reports only, allowlist-based sources.
Nothing here adds a new data-acquisition path.

---

## 12. Settings/profile

**MVP (net-new, to build).** No settings/profile page exists today. The only user-identity UI is
`components/UserSwitcher.tsx` (the "Acting as" `<select>` in the nav, `ml-auto` in
`app/layout.tsx`), which is mock auth, not a profile. This screen sits cleanly on top of that: it
reads via `getCurrentUser()` (`lib/currentUser.ts`) and does not require real auth to exist first,
and it keeps `getCurrentUser(): Promise<User | null>`'s interface untouched, per `CLAUDE.md`'s
note that this is a documented future swap point.

### Purpose

Give the currently-acting mock-auth user (per `pf_user_id` cookie) one place to see who they are,
see their contribution/reputation stats, set the home location that already powers the route
planner and (per `docs/ux/screens-discovery.md` section 3) the store selector, and — critically for
App Store review — actually delete their account. It is the "your own" counterpart to the public
`/leaderboard`, not a duplicate of it.

### Main components

- **Identity card** (read-only, MVP): handle (`@{user.handle}`), email, role
  (`user.role.toLowerCase()`, same casing convention as `UserSwitcher` and `/leaderboard`), and
  trust score. Trust score is rendered as a **plain bold number in `text-forge-600`**, matching how
  `/leaderboard` already shows it (`app/leaderboard/page.tsx` line 61) — deliberately *not* reusing
  `ConfidenceBadge`'s pill styling, since `ConfidenceBadge` communicates a lead's 0–100 confidence
  score and `User.trustScore` is a different 0–100 number (reporter reputation feeding *into*
  scoring, per `lib/scoring.ts`); reusing the same visual component for both would blur two
  distinct trust signals the app otherwise keeps carefully separate.
  - **Role is not editable here.** Self-service role change is intentionally excluded — even under
    mock auth, letting a settings form grant `ADMIN`/`CAPTAIN` would be a bad pattern to normalize
    ahead of real auth. Role changes stay an admin/seed-data operation.
- **Your contribution stats** (read-only, MVP, sourced from real Prisma fields — no new schema):
  total reports, approved count, confirms received — the same three numbers `/leaderboard` computes
  per user, scoped to just this user. **Refactor note:** `/leaderboard`'s page component currently
  computes these inline (`app/leaderboard/page.tsx` lines 16–33: `.map()`/`.filter()`/`.reduce()`
  directly in the server component) rather than in `lib/*.ts`. Per `CLAUDE.md`'s coding standard
  ("keep new business logic in this layer rather than inline in route handlers or components"),
  this screen should be the occasion to extract a shared `lib/leaderboard.ts#getContributorStats`
  (or similar) that both `/leaderboard` and `/settings` call, instead of duplicating the
  filter/reduce logic a second time in the new page.
- **Home location** (MVP, net-new write path): a text input for ZIP, pre-filled from
  `user.homeZip`. On submit, writes `homeZip` and attempts to resolve `homeLat`/`homeLng` — **this
  is the first real UI write path for those two fields**; today they're seed-only
  (`prisma/seed.ts`) and read-only consumers (`lib/routePlanner.ts`'s `getRankedStoresForUser`,
  which falls back to a hardcoded Atlanta origin when they're null).
  - **ZIP resolution approach:** reuse the exact same static ZIP-centroid table proposed in
    `docs/ux/screens-discovery.md` section 3 (the store selector) — a small first-party
    `lib/zipCentroids.ts` lookup (`Record<string, {lat, lng, city, state}>`) covering the seeded
    demo ZIPs already in `prisma/seed.ts` (`30308`, `30035`, `30080`, `30060`, `30301` in metro
    Atlanta, plus the FL/TX store ZIPs `32256`/`75244` if broader coverage is wanted). Both screens
    should share one table rather than building two — this doc doesn't re-propose a different
    mechanism, it reuses that one. No live third-party geocoding API call, consistent with
    `CLAUDE.md`'s "no private/undocumented endpoints" posture and avoiding a new external
    dependency mid-MVP.
  - If the entered ZIP isn't in the table, still save `homeZip` as free text (useful for display
    even if unresolved) but leave `homeLat`/`homeLng` untouched — `getRankedStoresForUser` already
    tolerates null coordinates via its `DEFAULT_ORIGIN` fallback, so an unresolved ZIP degrades
    gracefully rather than breaking the route planner.
- **Locale toggle** (MVP, UI-only stub): an en/es radio or select bound to `User.locale` (schema
  field already exists, default `"en"`, seeded with both values in `prisma/seed.ts`). Saves the
  preference for real. Must carry an explicit, honest inline note — e.g. "Saves your language
  preference. PennyForge's interface isn't translated yet, so you'll still see English." — because
  per `docs/product-spec.md`'s explicit deferral list, "no i18n framework is wired up yet." Do not
  ship copy that implies the UI will actually change language.
- **Notification preferences** (MVP, mock stub): a couple of checkboxes (e.g. "Alert me about new
  nearby leads," "Alert me when my reports get confirmed") with an inline note that this is a
  **preview of a future setting, not yet wired to alert generation** — `lib/alerts.ts`'s
  `shouldCreateAlert`/`pickNearbyRecipients` gate alert fan-out today with no per-user opt-out
  concept at all, and no schema field exists to persist a preference. For MVP, render the toggles
  as local UI state only (or, if persistence is wanted, note it needs a small additive schema
  field — do not build this out or touch `lib/alerts.ts`; that's `screens-alerts-and-routing.md`'s
  territory). The goal here is the settings-screen affordance existing and being honestly labeled,
  not a working preference pipeline.
- **Delete my account** (MVP, net-new, real action): a "Danger zone" section with a confirm-step
  button. Unlike the locale/notification stubs, this is a real, functioning delete — this is a
  local SQLite MVP with no compliance reason to fake it, and `docs/mobile-readiness.md`'s App Store
  review requirements section explicitly flags 5.1.1(v) (in-app account deletion) as needed before
  submission.
  - **Design constraint that shapes this:** none of `User`'s relations
    (`Report`, `ReportVote`, `Alert`, `RoutePlan`) declare `onDelete: Cascade` in
    `prisma/schema.prisma`, and `Report.userId`/`Report.user` is a required (non-nullable)
    relation. A literal `prisma.user.delete()` would either fail on the FK constraint or, if forced,
    would rip a contributor's `Report` rows (community-visible deal data other users rely on, and
    that other users' `Alert.reportId` rows may reference) out of the feed/alert/route history —
    that's a worse outcome than the PII-removal goal 5.1.1(v) is actually after.
  - **Proposed MVP behavior: anonymize in place, not row-delete.** `DELETE` on the existing
    `app/api/user/route.ts` (extends the file that already owns user-session mutation, rather than
    a new route) operates on the *current* `getCurrentUser()` id and, in a transaction:
    1. Hard-deletes this user's own `ReportVote` rows (their votes are personal and lightweight).
       **This step must also revisit every `Report` those votes touched:** `confirms`/`deads` are
       derived by counting rows, but `Report.status`/`previousStatus` are *stored* fields only
       recomputed inside the vote route (`app/api/reports/[id]/vote/route.ts`). If a deleted vote
       was the one holding a report at `SUPPRESSED` (`isSuppressed` in `lib/scoring.ts`), the
       report must be re-evaluated and, if the remaining tally no longer satisfies
       `isSuppressed`, restored to its `previousStatus` — otherwise a lead can stay hidden from
       the feed/search/route planner after the vote that suppressed it is gone. The deletion
       transaction should call the same suppression-check logic the vote route uses, once per
       affected report, not just delete rows and stop.
    2. Hard-deletes this user's own `Alert` rows (their personal inbox; recipient-only, no other
       user depends on them).
    3. Hard-deletes this user's own `RoutePlan` rows (personal saved plans).
    4. Leaves this user's `Report` rows in place (community data other users see in the feed,
       alerts, and route planner) but updates the `User` row itself: `email`/`handle` scrubbed to a
       generated placeholder (e.g. `deleted-{id.slice(0,8)}@pennyforge.invalid` /
       `deleted-{id.slice(0,8)}`, preserving uniqueness), `homeZip`/`homeLat`/`homeLng` cleared.
       `trustScore` and `createdAt` are left as-is (not PII, and zeroing trust score would
       retroactively distort the historic confidence score already shown on this user's past
       reports).
    5. Clears the `pf_user_id` cookie and falls back to the same "first seeded USER" default
       `getCurrentUser()` already uses when no cookie is set.
  - **One small schema addition this requires:** a nullable `User.deletedAt DateTime?` column, so
    (a) an anonymized user can be filtered out of `UserSwitcher`'s "Acting as" list (`app/layout.tsx`
    would add `where: { deletedAt: null }` to its `prisma.user.findMany`) and (b) the anonymization
    is idempotent/detectable. **The same `deletedAt: null` filter must also be added inside
    `getCurrentUser()`** (`lib/currentUser.ts`) — both on the cookie-lookup branch and on its
    fallback query (`prisma.user.findFirst({ where: { role: "USER" }, orderBy: { createdAt: "asc"
    } })`). Without that, deleting the account that happens to be the oldest seeded `USER` breaks
    the flow: clearing the `pf_user_id` cookie makes `getCurrentUser()` fall back to "first seeded
    USER by createdAt," which can immediately re-select the row that was just anonymized. This is
    the one place in this doc that asks for new schema — flagged explicitly because the
    identity/stats section above deliberately does *not* invent schema. It's an additive,
    nullable-column migration, consistent with the existing migration pattern in
    `prisma/migrations/`.
  - Orchestration lives in a new `lib/account.ts#anonymizeAccount(userId)`, called by the route
    handler — consistent with `CLAUDE.md`'s convention of keeping business logic (even
    DB-touching orchestration, as `lib/leads.ts`/`lib/routePlanner.ts`/`lib/alerts.ts` already do)
    out of the route handler body.

### User actions

- View identity card and contribution stats (no action, just glance-and-trust).
- Edit home ZIP, submit → resolves/saves location, used by route planner and (per the store
  selector doc) store distance sorting on next visit.
- Toggle locale preference, submit → saves `User.locale`, shows the "not translated yet" note.
- Toggle notification-preference checkboxes (MVP: local-only or stubbed persistence).
- Click "Delete my account" → confirm step (e.g. a second explicit confirm button/modal, "This
  will permanently remove your personal info. Your past reports stay visible to the community but
  will no longer show your handle.") → account is anonymized, session resets to the default user,
  redirect to `/` with a toast.

### Data needed

- `getCurrentUser()` (`lib/currentUser.ts`) for the full `User` row.
- Contribution stats: shared `getContributorStats(userId)` extracted from `/leaderboard`'s current
  inline computation (see refactor note above) — filters this user's `reports`/`votes` the same way
  `app/leaderboard/page.tsx` does today.
- `lib/zipCentroids.ts` (proposed, shared with `docs/ux/screens-discovery.md` section 3) for ZIP →
  lat/lng resolution.
- `lib/account.ts#anonymizeAccount` (proposed) for the deletion transaction.

### Empty state

- If `getCurrentUser()` returns `null` (no users left in the DB at all — realistically only a
  freshly unseeded DB, or the edge case of the last remaining `USER`-role account having just
  deleted itself): show the same "no active user session" posture the API layer already uses
  elsewhere (`app/api/reports/route.ts` returns 401 "No current user" when this happens) — a
  dashed-border card matching the feed's empty-state visual language, e.g. "No active user. Seed
  or select a user via the switcher in the header."
- A brand-new user with zero reports: show honest zeros in the contribution-stats block ("0
  reports · 0 approved · 0 confirms received — submit your first find") linking to
  `/report/new`, matching the "honest zeros, not hidden" pattern used in the dashboard-strip
  proposal in `docs/ux/screens-discovery.md` section 1.

### Error state

- ZIP doesn't resolve against the centroid table: non-blocking — save `homeZip` as free text.
  **`homeLat`/`homeLng` must be explicitly cleared (set to `null`), not left as whatever they
  were before this save.** A user who already had valid coordinates from a prior successful save,
  then enters a new ZIP that fails to resolve, would otherwise keep silently using the *old*
  coordinates for route/store distance while the UI displays the *new*, unresolved ZIP —
  `getRankedStoresForUser` only falls back to `DEFAULT_ORIGIN` when coordinates are `null`, so
  stale-but-non-null coordinates never trigger that fallback. Clearing them on an unresolved save
  is what makes the documented "degrades gracefully to `DEFAULT_ORIGIN`" behavior actually true.
  Inline note: "Couldn't pinpoint that ZIP yet — your ZIP is saved, but distance-based features
  will use a default location until it's recognized"), same non-blocking posture as the
  store-selector doc's ZIP-lookup failure handling.
- Locale/notification-preference save fails: inline retry message near that control, rest of the
  page unaffected (mirrors `ModerationActions`'/`VoteButtons`' existing pattern of a local `error`
  state string next to the specific control that failed, not a page-level error).
- Account-deletion request fails (DB/transaction error): show a blocking inline error in the danger
  zone ("Couldn't delete your account — try again"), and explicitly do **not** clear the
  `pf_user_id` cookie or otherwise change client-visible session state until the server confirms
  success — a failed delete must leave the user in exactly their prior logged-in state.

### MVP version

Read-only identity + contribution stats (real Prisma fields, shared helper with `/leaderboard`);
real ZIP-based home-location write using a static first-party centroid table; UI-only, honestly
labeled locale toggle; mock/stubbed notification-preference checkboxes; a real, working
account-deletion action that anonymizes PII while preserving community-visible report data and FK
integrity, requiring one small additive `User.deletedAt` column.

### Future version

- Real ZIP/city geocoding (replacing the static centroid table) once a geocoding provider is
  chosen — same swap point as the store selector doc's Future section.
- Editable avatar/display name, once there's a reason for identity beyond `handle`.
- Locale toggle actually changes rendered UI language once an i18n framework is adopted
  (`docs/product-spec.md` Phase 3).
- Real, persisted notification preferences wired into `lib/alerts.ts`'s `shouldCreateAlert` gate,
  and real push delivery per `docs/mobile-readiness.md` section 4 (device token storage on `User`).
- Soft-delete with a grace period: set `deletedAt` immediately (hiding the account and pausing
  alerts) but defer the PII-scrub/anonymization step N days, allowing the user to "undo" by
  logging back in within the window before the scrub becomes permanent — the MVP behavior above
  (immediate anonymize) becomes the terminal step of this flow rather than an instant action.
- Data export ("download my data") alongside deletion, once there's enough personal data volume
  (evidence photos, precise location history) to make that meaningful.

---

## Mobile-first layout notes

The MVP is server-rendered Tailwind with no viewport-driven component swapping and no bottom nav
today (`app/layout.tsx`'s header is a single `flex-wrap` row; responsive touches are limited to
`sm:` in `components/ReportForm.tsx` and `overflow-x-auto` on the route/leaderboard tables). This
section proposes layout mechanics on top of whatever primary nav the sibling IA doc lands on — not
a nav redesign.

### Breakpoint strategy

Tailwind's full default breakpoint set is available (`tailwind.config.ts` only extends the `forge`
color palette, it doesn't restrict breakpoints) but usage today is ad hoc. Propose standardizing on
three deliberate tiers, matching the brief's base/sm/lg framing and the app's existing minimal
`sm:` usage, and **skipping `md:` as a distinct tier** to avoid a four-way breakpoint matrix every
component has to be reasoned about:

- **base (0–639px) — mobile.** Single-column, stacked forms, full-width primary actions.
- **`sm:` (640–1023px) — large phone / small tablet.** Two-column where `ReportForm` already
  applies `sm:grid-cols-2`; this becomes the general "start using horizontal space" tier.
- **`lg:` (1024px+) — desktop.** Current built layout as-is (`max-w-5xl` content width, full
  filter rows, wide tables) — effectively "no change needed," since the app was built desktop-first
  and this tier is where it already looks right.

Known breakage today on narrow viewports, and the proposed treatment:

- **Feed filter form** (`app/page.tsx`, the four `<select>`s in a `flex flex-wrap items-end gap-3`
  row): on a ~375px viewport this wraps into a cramped 2-row grid of half-width selects. Propose
  `flex-col sm:flex-row` — full-width stacked selects with labels above them below `sm:`, matching
  the pattern `ReportForm` already establishes, then reverting to the current inline row at `sm:`
  and up.
- **Route planner and leaderboard tables** (`app/route/page.tsx`, `app/leaderboard/page.tsx`):
  both already wrap in `overflow-x-auto`, which is an acceptable mobile pattern for dense tabular
  data — keep it. The gap: neither `<table>` sets a `min-w-*`, so flex/table auto-sizing can crush
  columns to unreadable widths *before* the scroll affordance kicks in. Propose adding a
  `min-w-[560px]` (or similar, tuned per table's column count) on the `<table>` element itself so
  narrow viewports get a clean horizontal scroll with legible columns instead of squeezed text.
- **Nav row** (`app/layout.tsx`): already `flex-wrap`, which is functional but with 7 links +
  brand + `UserSwitcher` it wraps to 2–3 lines on a narrow phone, pushing page content down before
  the user sees anything. Flagged here as a layout-mechanics symptom, not solved here — it's the
  exact pressure the sibling bottom-tab-bar nav proposal exists to relieve.

### Touch targets and thumb reach

Current interactive components are all sized for desktop pointer precision, not touch:

- `VoteButtons` (`components/VoteButtons.tsx`): `px-4 py-2 text-sm` — closer to the 44px floor but
  worth confirming against actual rendered height.
- `ModerationActions` (`components/ModerationActions.tsx`): `px-3 py-1.5 text-xs` — noticeably
  under 44px tall.
- `MarkReadButton` (`components/MarkReadButton.tsx`): `px-2 py-1 text-xs`, outlined
  (`border-stone-300`) style — the smallest of the three, both in padding and in visual weight,
  despite being a real state-changing action (marks an alert read).

Proposal: introduce a base-tier minimum of roughly `py-2.5` (tuned to clear 44px including
border) on all three below `sm:`, without necessarily changing desktop density above `sm:` where
list scanability and precise pointers make smaller controls fine. Treat 44px as the tap-target
floor for the whole hit area, not just the visible text/border box.

Thumb reach: on mobile, the two actions that matter most per screen should sit low in the
viewport, not wherever they happen to fall in document flow. Concretely, propose `VoteButtons` on
the lead-detail page become `sticky bottom-0` (with safe-area-aware padding) below `sm:`, since a
lead-detail page can be tall (evidence, full score breakdown, existing votes) and today the two
highest-value buttons on that page sit wherever the linear layout places them — burying them above
the fold on mobile would be a real regression versus desktop. This is also the concrete argument
for why a bottom tab bar (proposed in the sibling nav doc) fits this app: the app already has a
pattern of "the important action is a thumb-reach button," this just extends it consistently.

### Card density (`LeadCard` meta row)

`LeadCard`'s meta row (`components/LeadCard.tsx` lines 43–53) is `flex flex-wrap items-center
gap-3 text-xs` with five items in DOM order: `ConfidenceBadge`, evidence-type label, confirm/dead
counts, reporter handle + trust score, relative time. On desktop this is one line; on a ~375px
phone it wraps to 2–3 lines. `flex-wrap` already prevents overflow, so nothing is broken, but two
refinements protect the confidence-clarity principle at narrow widths:

- **`ConfidenceBadge` must never wrap past the first line.** It's already first in DOM order,
  which is the right default — the proposal here is to keep that invariant explicit (a
  "don't reorder this" note for future edits) since it's the single highest-priority trust signal
  in the app's own mission framing ("receipt-verified confidence"). Concretely, apply
  `basis-full sm:basis-auto` to the lowest-priority items in the row (reporter handle + trust,
  `timeAgo`) so they're the ones that deliberately drop to their own line first on narrow widths —
  never the badge, evidence label, or confirm/dead counts, all three of which are direct
  trust/proof signals.
- **Truncate before you hide, and hide the least-critical field first.** If a card still feels
  crowded at very narrow widths, the reporter's trust score is the first thing to compress (e.g.
  `@handle` alone, with `(trust N)` moved into a `title` tooltip or an expand-on-tap), before ever
  touching `ConfidenceBadge` or the confirm/dead counts — those two are load-bearing for the
  "show confidence clearly" principle and shouldn't be sacrificed for a tighter card.

### Offline-ready design

Nothing here ships in MVP — `CLAUDE.md` and `docs/product-spec.md` both explicitly defer offline
mode ("no background workers... Alerts and route planning are synchronous and DB-backed"; "offline
in-store mode" is listed under explicitly-deferred alert UX refinements). This section is about
the forward-compatible seams to bake in *now*, grounded in the actual Next.js App Router
architecture already in place, so a later offline layer is additive rather than a rewrite.

**The architecture already has the right seam.** Server components (`app/page.tsx`, lead detail,
`/leaderboard`, `/route`) fetch via `lib/db.ts`'s `prisma` directly at request time — inherently
server-only, not something a client cache can intercept. But the view-model functions those pages
call (`getFeedLeads`/`toLeadView` in `lib/leads.ts`, `getRankedStoresForUser` in
`lib/routePlanner.ts`) already return clean, serializable shapes (`LeadView`, `RankedStore`) rather
than raw Prisma models. That's the seam a future client cache would key off — the JSON shape
doesn't need to change, only whether it's fetched via server render or via a cached client fetch to
an equivalent API route. Client components, meanwhile, already isolate every mutation behind one
`fetch()` call to one `app/api/**` route handler per component (`VoteButtons` →
`/api/reports/{id}/vote`, `ModerationActions` → `/api/reports/{id}/moderate`, `MarkReadButton` →
`/api/alerts/{id}/read`, `UserSwitcher` → `/api/user`) — that isolation is exactly where a future
offline-queue wrapper would slot in, one component at a time, without touching the route handlers.

**Read-freshness split — safe to serve stale vs. requires freshness:**

- **Safe to serve stale (future cache-first candidates):** the feed listing, lead-detail page
  content, `/leaderboard`, and route-plan results. These are all "browse" reads where a few
  minutes of staleness is already an accepted, disclosed risk — `docs/compliance.md`'s footer
  disclaimer already tells users "prices and availability... vary by store and change fast;
  nothing is guaranteed." A future service-worker or `swr`-style cache-first-then-revalidate layer
  over these reads changes nothing about what the server components currently return.
- **Requires freshness (must always hit the network, never served from a stale cache):**
  submitting a report (`POST /api/reports` — the same-day duplicate check in
  `lib/reports.ts`/`isUniqueViolation` depends on live DB state), voting
  (`POST /api/reports/{id}/vote` — depends on the current tally and the one-vote-per-user
  constraint), moderation (`POST /api/reports/{id}/moderate` — depends on current status and the
  ADMIN/CAPTAIN gate), and the settings writes proposed above (ZIP, locale, account deletion).
  These all mutate shared state under server-side invariants that can't be resolved locally — they
  must be represented as *pending*, never silently optimistic-and-forgotten.

**Concrete future queue pattern for `POST /api/reports` — mostly safe without an API contract
change, with one gap to design around.** `Report`'s `reportDate` is computed server-side at write
time from `now()` (`lib/reports.ts#toReportDate`), never sent by the client, and the composite
unique `@@unique([productId, storeId, userId, reportDate])` means a queued request that has *never*
successfully reached the server is safe to retry indefinitely — every retry either lands cleanly or
hits the same friendly 409 (`isUniqueViolation`) that already handles same-day duplicates today.
This is the property already flagged for the iOS path in `docs/mobile-readiness.md` section 5.

**The gap:** that property assumes the original request never actually succeeded. If a queued
request *does* succeed server-side but the client never observes the response (timeout, connection
drop mid-response, app killed before the response is processed) and the client's retry logic fires
again after a UTC-day boundary has passed, the retry computes a *new* `reportDate` and no longer
collides with the original write's unique key — creating a genuine duplicate report (and a
duplicate alert fan-out), not a caught 409. A client-generated idempotency token kept purely local
(as originally proposed) cannot prevent this, because the server never sees it. A real
implementation needs one of: (a) a server-visible idempotency key accepted by `POST /api/reports`
and checked against a short-lived dedupe table before insert, or (b) the client persisting and
reusing the server's actual observed `reportDate` from a still-pending request rather than letting
a fresh retry recompute one. This is a real, if narrow (multi-hour offline + a boundary-crossing
retry), API-contract consideration for the *report* queue — the "no API change needed" framing
below still holds for mark-read (no duplicate-creation risk) but should not be read as a blanket
claim for reports.

Concretely (Future, not MVP): `ReportForm`'s submit handler, on a failed/offline `fetch` to
`/api/reports`, would write the identical request body to a local queue (IndexedDB) instead of
surfacing today's bare "Network error" message, and show "Saved — will submit when you're back
online." A background sync (service worker `sync` event, or a simpler "flush queue on next app
load if online" check) replays each queued body — subject to the idempotency-key or
observed-report-date fix above, not a same-day-unique-constraint-only assumption.

**Same mechanism, two smaller cases:**

- Votes (`POST /api/reports/{id}/vote`) are duplicate-safe per user (`@@unique([reportId,
  userId])` means a replayed vote upserts the existing row rather than inserting a second one),
  but the unique constraint only prevents *duplicate rows* — it does not make replay *order* safe.
  Concretely: a user queues a `DEAD` vote offline, later changes their mind and votes `CONFIRMED`
  while back online (updating the same row), and then the *original* queued `DEAD` body finally
  replays (e.g. a slow background sync) — it would silently overwrite the newer `CONFIRMED` choice
  and re-apply a trust/status delta computed from whatever the row looks like at replay time, not
  from the state the vote was actually queued against. A real implementation cannot treat this as
  simply idempotent; it needs a server-visible operation timestamp or version so a replay can
  detect and discard a stale queued vote instead of blindly overwriting, or the vote-queue feature
  should be deferred until that ordering mechanism exists. Once that's in place, a synced vote
  should surface the server's actual response (`confirms`/`deads`/`suppressed`) exactly as
  `VoteButtons` already renders it today, rather than assuming the optimistic state held.
- Mark-read (`POST /api/alerts/{id}/read`) is the lowest-risk queue candidate — no invariant beyond
  "this alert is read" — safe to replay whenever, lower priority to build than reports/votes.

**Rules worth preserving now, specifically because they're what makes this cheap later:**

1. Every client component already owns exactly one `fetch()` to one endpoint — keep new client
   mutations following that shape so a future queue wrapper can intercept at a single point per
   component.
2. Mutation endpoints already return the full resulting state the UI needs (`{confirms, deads,
   suppressed}` from the vote route, for example) rather than requiring a follow-up `GET` — keep
   this convention for any new mutation endpoint (including the settings writes above), so a
   replayed-then-synced mutation never needs a second round trip to reconcile the UI.
3. Never let the client generate a timestamp for anything with a server-side invariant
   (`reportDate`/`createdAt` are both server-set today) — this is the specific property that makes
   offline replay safe without an API contract change, and it should stay true for any new
   mutation.
4. When a future stale-cache layer ships for the "safe to serve stale" reads above, surface
   staleness rather than hide it — reuse `timeAgo()` (`lib/format.ts`, already used for report and
   alert ages everywhere) as a "last updated Xm ago" affordance on cached views, consistent with
   the trust-first principle of never presenting possibly-stale availability as guaranteed-fresh.
