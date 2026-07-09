# PennyForge — Screen Map & User Flows

Part of the MVP UX packet (Agent 6: UX and Frontend Flow). Covers the screen inventory, the core
step-by-step user flows, and a proposed mobile navigation structure for PennyForge's first local
MVP. Grounded in the routes and components that exist today in this repo; every screen below is
tagged with its real status.

Status legend:

- **MVP (built)** — the route exists and works today.
- **MVP (net-new, to build)** — in the original 12-screen brief, not yet built; route below is a
  proposal, not an existing path.
- **Future (post-MVP)** — explicitly deferred per `docs/product-spec.md`; described here only to
  show where it would slot in later.

UX principles that recur through this document (see `docs/product-spec.md` positioning and
`docs/compliance.md`): show confidence clearly, explain *why* a lead is trusted, surface
"last verified" / freshness, show evidence type, show store-level freshness, make dead-voting
low-friction, keep report submission under 30 seconds, never nudge users toward confronting store
employees, bake in ethical nudges, and design alerts/report-entry so an offline-friendly mode can
be added later without a rewrite.

## 1. Screen map

| # | Screen | Status | Route | Purpose (one line) |
|---|---|---|---|---|
| 1 | Home / Dashboard | MVP (built, merged with Feed) | `/` | Entry point on load; today this is literally the same screen as Local feed — see note below. |
| 2 | Local feed | MVP (built) | `/` | Filterable list of active leads (state / retailer / store / min confidence), sorted by confidence score descending. |
| 3 | Store selector | MVP (net-new, to build) | proposed `/stores` (list) + `/stores/[id]` (store-scoped feed) | Browse or search stores directly and jump to everything currently live at one store. Today "store" is only a `<select>` embedded inside the Feed filter form and the Report form — there is no place to browse stores as a first-class object. |
| 4 | UPC / SKU search | MVP (built) | `/search` | Manual lookup by UPC, SKU, or product name (`contains` match); the same input contract a future barcode scanner will feed. |
| 5 | Lead detail | MVP (built) | `/leads/[id]` | Full confidence-score breakdown table, evidence link, reporter trust, and confirm/dead voting for one report. |
| 6 | Submit report | MVP (built) | `/report/new` | Fast-path report form (store, product, price, deal type, evidence, source, notes) gated by the compliance allowlist at the API layer. |
| 7 | Confirm / dead vote UI | MVP (built, embedded only) | embedded in `/leads/[id]` via `VoteButtons`; **no standalone route** | One-tap "still there" confirm or "dead / gone" vote. Currently only reachable after opening the full lead detail page — not exposed on the feed card itself (gap noted in flow 2.4). |
| 8 | Alerts | MVP (built) | `/alerts` | Mock inbox of threshold-gated, deduped alerts with read/unread state; real push/email is a later phase. |
| 9 | Route planner | MVP (built) | `/route` | Ranks stores by expected lead value minus round-trip gas cost from the user's home point; save named plans. |
| 10 | Admin moderation | MVP (built) | `/admin` | Role-gated (ADMIN/CAPTAIN) queue of pending, suppressed, and rejected reports with approve/reject actions. |
| 11 | Compliance / About | MVP (net-new, to build) | proposed `/about` | Dedicated explanation of the allowlist policy ("why we don't scrape"), evidence-type hierarchy, and community norms. Today this only exists as one line in the page footer (`app/layout.tsx`) plus `docs/compliance.md`, which no end user ever sees. |
| 12 | Settings / Profile | MVP (net-new, to build) | proposed `/settings` | Edit home ZIP/location (used by the Route planner, currently seed-data only with no edit UI), locale (schema field `User.locale` exists but is unused — see below), and view own trust score / report history. |
| 13 | Leaderboard *(bonus — outside the original 12-screen scope)* | MVP (built) | `/leaderboard` | Contributor trust ranking (trust score, reports, approvals, confirms received) — the visible face of the reputation system. Worth keeping in the packet since it's already built and reinforces the community/trust pillar, but it wasn't one of the 12 target screens. |

**Note on #1/#2 (Home vs. Feed):** there is currently one route, `/page.tsx`, serving both. That's
a reasonable MVP simplification — don't split it just for the sake of matching the 12-screen list
literally. The natural future split (Phase 1+) is: `/` becomes a lighter dashboard (a "your alerts"
strip, "leads near your saved stores" teaser, trust score, quick links) and the full filterable
list moves to its own `/feed` route once the dashboard needs room for more than one widget. Until
then, keeping them merged is the right call — an MVP with 13 nav destinations is already a lot.

**Note on Settings/Profile and locale:** `User.locale` (`en` | `es`) is seeded in the schema but no
i18n framework is wired up (`docs/product-spec.md` "Explicitly deferred"). The proposed
`/settings` screen should still show a locale field once i18n ships, but do not wire up actual
translation in the MVP — this is a placeholder, not a call to build bilingual UX now.

## 2. User flows

### 2.1 First-run / onboarding (mock-auth aware)

There is no real signup in the MVP — `lib/currentUser.ts` reads a `pf_user_id` cookie set by
`POST /api/user`, and falls back to the first seeded `USER`-role account if the cookie is unset.
"Onboarding" today means *picking who you're acting as*, not creating an account.

1. User lands on `/` (Feed/Home). `getCurrentUser()` has already resolved a default identity
   server-side — there is no blocking login screen.
2. The header's "Acting as" control (`UserSwitcher`, top-right of `app/layout.tsx`) shows the
   current mock identity (e.g. `@atl_deals (user)`).
3. *(Optional)* User opens the dropdown and picks a different seeded identity → client `POST
   /api/user` sets the `pf_user_id` cookie → `router.refresh()` re-renders the whole app as that
   user (their trust score, their alerts, their route-planner origin all change immediately).
4. *(Optional, recommended first stop)* User visits the proposed Compliance/About screen
   (`/about`, net-new) to understand the "first-hand, in-store reports only" rule and the
   confirm/dead voting norms before submitting anything.
5. User's first real action is almost always either browsing the Feed filters or jumping straight
   to Search (flow 2.2) — there's no forced tutorial step.

Future (Phase 1, per `docs/product-spec.md`): real auth (NextAuth or similar) replaces steps 1–3
behind the same `getCurrentUser(): Promise<User | null>` interface, so this flow's screens don't
change — only the identity-resolution mechanism does.

### 2.2 Find-a-lead (browse feed OR search → lead detail)

Two entry paths that converge on the same destination screen.

**Path A — browse:**
1. Land on `/` (Feed).
2. *(Optional)* Set filters — State, Retailer, Store, Min confidence — via the GET-param filter
   form and submit ("Filter" button). Results re-render server-side, sorted by score descending.
3. Tap any `LeadCard` → navigates to `/leads/[id]`.

**Path B — search:**
1. Tap "Search" in the nav → `/search`.
2. Type a UPC, SKU, or product-name fragment into the single text input and submit.
3. Results render grouped by matching product, each with its own set of `LeadCard`s (one card per
   active report at a store for that product).
4. Tap a `LeadCard` → navigates to `/leads/[id]`.

**Convergence — Lead detail (`/leads/[id]`):**
- Headline price (struck-through MSRP if known), product/store/location metadata, evidence link.
- "Why this lead scores `<ConfidenceBadge>`" section: a full breakdown table (evidence base,
  reporter trust bonus, confirm bonus, dead penalty, freshness decay factor, final score) — this
  is the "explain why a lead is trusted" principle made literal, not just a badge.
- "reported `<timeAgo>` by `@handle`" gives last-verified/freshness at a glance; the decay-factor
  row spells out the half-life (7 days for PENNY, 14 for CLEARANCE) and that confirmations refresh
  it.
- Confirm/dead voting (flow 2.4) is directly below.

### 2.3 Submit-a-report-in-30-seconds

Screen: `/report/new` → `ReportForm` (client component) → `POST /api/reports`. This is the
critical fast path, so the field list matters — every default is chosen to minimize taps for the
common case (an existing product, at a known store, with a receipt, seen in-store).

| Field | Required? | Default on load | Taps needed in the common case |
|---|---|---|---|
| Store | Required | First store alphabetically, pre-selected | 0 (already correct) or 1 (pick a different store) |
| Product | Required | "Existing" mode; dropdown pre-filtered to the selected store's retailer | 1 (pick the right product) — switching to "New product" adds a required name field and ~10s more |
| Price | Required | Placeholder `0.01`, must be edited to the real value | A few keystrokes (numeric input) |
| Deal type | Required | "Penny item" (PENNY) selected | 0, or 1 to switch to "Hidden clearance" |
| Evidence | Required | "Receipt (strongest)" selected — the highest-scoring option is the default, nudging toward the best evidence rather than making users hunt for it | 0, or 1 if no receipt |
| Source (how found) | Required | "Saw it in store" (`IN_STORE_OBSERVATION`) selected — a compliant, allowlisted default | 0 in the common case |
| Evidence URL | **Optional** | blank | 0 — MVP has no file upload, just an optional link placeholder (real photo/receipt upload is deferred, see `docs/product-spec.md`) |
| Notes | **Optional** | blank | 0 |

**Fast path, step by step:**
1. Tap "Report a find" in the nav → `/report/new`.
2. (Store already defaulted — skip, or 1 tap.)
3. Tap the Product dropdown, pick the item (1 tap).
4. Tap Price, type the digits.
5. (Deal type / Evidence / Source already correct via smart defaults — skip.)
6. Tap "Submit report."

That's roughly 3 required interactions (product, price, submit) plus one optional store
confirmation — no file upload, no second screen, no navigation away to attach a photo. The result
renders inline on the same page: "Report submitted — confidence `N`. `M` nearby user(s) alerted"
(or "No alert fired"), so the loop closes without a page transition. This is why the flow is
realistically achievable in well under 30 seconds for a repeat contributor, and only pushed past
that when the product doesn't exist yet and has to be typed in (`newName` free-text field).

Compliance is enforced server-side regardless of form input: `sourceType` is checked against the
allowlist in `lib/compliance.ts` on every submit (HTTP 422 if blocked/unknown), so the form's
"Blocked by compliance policy (demo)" optgroup exists to *demonstrate* the guardrail, not as a
client-side gate a user could rely on instead.

### 2.4 Verify / dead-vote a lead

**From Lead detail (`/leads/[id]`) — built today:**
1. Scroll to "Been to this store?" under the score breakdown.
2. Tap "✓ Still there" (`CONFIRMED`) or "✗ Dead / gone" (`DEAD`) — `VoteButtons` posts to
   `POST /api/reports/[id]/vote`.
3. Inline confirmation message appears ("Recorded — N confirmed, M dead" or "Recorded. This lead
   is now suppressed as dead."), then the page refreshes with the updated score.
4. A user cannot vote on their own report (enforced server-side); votes are one-per-user but
   changeable, so re-voting updates rather than duplicates.

**From the feed card — gap today, proposed for MVP:** `LeadCard` (used on `/` and `/search`) is
currently just a `<Link>` wrapper with no vote affordance — voting always requires opening the
full lead detail page first. Given "make dead-voting easy" is an explicit product principle, the
recommended net-new addition is a compact confirm/dead icon pair in the card footer (next to the
existing `✓ confirms · ✗ deads` counts) that posts directly to the same `/api/reports/[id]/vote`
endpoint without navigating away — `event.stopPropagation()` on the icons so the rest of the card
remains a normal link to the detail page. This turns a 3-tap flow (open card → scroll → tap vote)
into a 1-tap flow directly from the feed, which matters most for the highest-frequency action in
the app.

**Principle callout:** nothing in this flow asks a user to approach, question, or photograph a
store employee — voting is purely "I was there and it matched" / "I was there and it didn't,"
framed as self-reported observation, not confrontation. Suppression (2+ dead votes outnumbering
confirms, `lib/scoring.ts#isSuppressed`) is fully community-driven and automatic — see the
moderation-vs-suppression distinction in flow 2.6.

### 2.5 Plan-a-route

Screen: `/route` (`getRankedStoresForUser` + `SaveRoutePlanButton`).

1. Tap "Route" in the nav → `/route`.
2. Server ranks every store by `routeScore = expectedValue − tripCost`, where `expectedValue` sums
   each active lead's estimated dollar value weighted by its confidence score, and `tripCost` is
   round-trip miles from the user's home point × $0.15/mile. Distance is computed from
   `User.homeLat/homeLng` if set, or a default Atlanta origin as a fallback — so the screen is
   never empty just because a user hasn't set a home location yet (reinforces why Settings/Profile
   is still useful, just not blocking).
3. Trips that cost more than their expected haul are excluded entirely — the table only ever shows
   worthwhile trips, ranked best-first.
4. *(Optional)* Type a plan name and tap "Save this route" → `POST /api/route-plans` → the plan
   appears immediately under "Saved plans" below the table (store sequence joined with `→`).
5. Saved plans persist across sessions for that user and are listed newest-first.

Note: this is deliberately a single-store ranking, not multi-stop trip ordering — multi-stop TSP
optimization is an explicitly deferred Phase 3 feature (`docs/product-spec.md`).

### 2.6 Admin-moderate

Screen: `/admin`, gated to `ADMIN`/`CAPTAIN` roles via mock auth. This flow depends on flow 2.1's
identity switch, since most seeded demo users are plain `USER` role.

1. Via the header's "Acting as" `UserSwitcher`, switch to `forge_admin` or `atl_captain`. (If the
   current user isn't ADMIN/CAPTAIN, `/admin` shows an inline notice telling them to switch,
   instead of a hard 403 — the page is discoverable, not hidden.)
2. Nav to "Admin" → `/admin`.
3. `getModerationQueue()` shows every report with status `PENDING`, `SUPPRESSED`, or `REJECTED` —
   `APPROVED` reports leave the queue entirely once approved and live only in the Feed.
4. Tap "Approve" or "Reject" on any queued item → `ModerationActions` posts to
   `POST /api/reports/[id]/moderate` → page refreshes; the item either drops out of the queue
   (now APPROVED) or stays with its new status.

**Moderation vs. suppression — an explicit distinction to preserve in any future UI work:**
`SUPPRESSED` is never something a moderator sets directly — `MODERATABLE_STATUSES` in
`lib/constants.ts` only contains `APPROVED` and `REJECTED`. Suppression is entirely automatic and
community-driven: `isSuppressed()` in `lib/scoring.ts` fires when a report gets 2+ dead votes that
outnumber its confirms, hiding it from the Feed, Search, Alerts, and the Route planner without any
human review. The `Report.previousStatus` column exists so that if later confirms flip the
suppression back off, the report is restored to whatever it was before (e.g. `APPROVED`) rather
than being reset and losing prior moderator review. A `SUPPRESSED` row still shows up in the admin
queue — purely for auditability, so a moderator can see what the community silenced — and Approve/
Reject still work on it, but suppression itself is a vote-driven gate that sits *below* and
independent of the manual editorial layer.

## 3. Suggested navigation

**Desktop (current, keep as-is):** the existing single horizontal top bar in `app/layout.tsx`
(`max-w-5xl`, `flex-wrap`, brand mark + `NAV` links + `UserSwitcher` pinned right) works fine at
wider viewports and needs no structural change — it already has room for every destination as
plain text links.

**Mobile-first (proposed): 5-item bottom tab bar + overflow "More."**

| Placement | Screen | Route | Why |
|---|---|---|---|
| Tab 1 | Feed / Home | `/` | Highest-frequency destination — the default landing screen and the core browse loop. |
| Tab 2 | Search | `/search` | Frequent, task-driven: "does this specific UPC/SKU have a live lead." |
| Tab 3 (center, primary) | Report | `/report/new` | The core value-creation action (flow 2.3). Center position + distinct/filled styling treats it like a camera-app shutter button — it's the one action worth a visually privileged slot even though it's not necessarily the single most-frequent tap, because every other screen's data depends on people taking it. |
| Tab 4 | Route | `/route` | Frequent for the serious-shopper and reseller personas (`docs/product-spec.md`); a recurring "where do I go today" check, not a one-time setup step. |
| Tab 5 | Alerts | `/alerts` | Needs to be glanceable and interrupt-driven (unread badge count on the tab icon), same reason notifications get a dedicated tab in most apps rather than living in an overflow menu. |
| Overflow "More" (or profile/avatar menu) | Leaderboard | `/leaderboard` | Gamification check-in, not a core loop — occasional, not daily. |
| Overflow "More" | Admin | `/admin` | Role-gated to ADMIN/CAPTAIN, a small fraction of users; already self-guards with an inline notice for everyone else. |
| Overflow "More" | Settings / Profile | `/settings` (net-new) | Infrequent — set once, revisit rarely (home ZIP, locale). |
| Overflow "More" | Compliance / About | `/about` (net-new) | Read-once reference material, not a repeat destination. |
| Overflow "More" | Store selector | `/stores` (net-new) | Lower frequency than Search for most users since store choice is already reachable inline from the Feed filter and the Report form; a dedicated browse-by-store view is a secondary path, not a primary one. |
| Overflow "More" | "Acting as" identity switcher | n/a (mock auth) | Kept out of the primary tab bar because it's explicitly a placeholder — `docs/product-spec.md` marks real auth as Phase 1. Fold it into the top of the "More" sheet for the MVP demo; don't invest further mobile chrome in it. |

This mirrors the brief's suggested five (Feed, Search, Report, Route, Alerts) exactly, and keeps
role-gated (Admin), read-once (Compliance), low-frequency (Settings), and secondary-path (Store
selector, Leaderboard) screens one tap deeper rather than crowding the primary bar. The desktop top
bar can keep listing all of them flat, since horizontal space isn't the constraint there that it is
on a 375px-wide screen.

**Offline-readiness note (future-facing, not built now):** because Report submission is a single
form → single API call with no multi-step wizard, and Alerts/Feed are read-then-cache-friendly
server-rendered lists, both are reasonable future candidates for an offline queue (e.g. hold a
submitted report locally and retry `POST /api/reports` on reconnect) without restructuring these
flows — worth keeping in mind when a real offline mode is scoped later, but no offline behavior
should be built in this MVP phase.
