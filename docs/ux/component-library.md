# PennyForge component library

Definitive reference for the shared component vocabulary: what exists today (Part A) and what the
other UX docs (`screens-discovery.md`, `screens-search-and-lead.md`,
`screen-map-and-flows.md`, and any settings/admin screen specs) should build against instead of
re-inventing (Part B). Every prop and class name below was verified against the component source
in `components/` and the relevant `lib/*.ts` files, not inferred.

Product feel this vocabulary is in service of: fast, local, trust-first, proof-first — show
confidence clearly, explain *why* a lead is trusted, show *when* it was last verified, show *what
kind* of evidence backs it, show store-level freshness, make dead-voting effortless, nudge
ethically, and design as if offline mode is coming even though it isn't built yet.

---

## Part A — Existing components (inventory)

### ConfidenceBadge

- **File:** `components/ConfidenceBadge.tsx`
- **Type:** Server-safe (no `"use client"` directive; pure presentational, no state/effects).
- **Props:** `{ score: number }`
- **Renders:** A rounded-full pill showing the raw numeric score (0–100), `title="Confidence
  score (0–100)"` for hover context.
- **API calls:** None.
- **Visual states:** Four static tone tiers driven purely by `score`, no loading/error/disabled
  states (it's a label, not an action).
- **Tailwind classes (tier system — the canonical confidence-tier palette for the whole app):**
  - `score >= 75` → `bg-emerald-100 text-emerald-800 border-emerald-300`
  - `score >= 50` → `bg-amber-100 text-amber-800 border-amber-300`
  - `score >= 25` → `bg-orange-100 text-orange-800 border-orange-300`
  - `score < 25` → `bg-red-100 text-red-800 border-red-300`
  - Shared shape classes: `inline-flex items-center rounded-full border px-2 py-0.5 text-xs
    font-semibold`
- Treat this as the single source of truth for "confidence tier" anywhere a score needs a color —
  see the [Design tokens](#design-tokens) table below.

### LeadCard

- **File:** `components/LeadCard.tsx`
- **Type:** Server component (no `"use client"`).
- **Props:** `{ lead: LeadView }` — `LeadView` is defined in `lib/leads.ts` (id, productId,
  productName, upc, sku, msrpCents, storeId, storeName, retailerName, city, state, zip,
  priceCents, dealType, evidenceType, evidenceUrl, status, notes, reporterHandle, reporterTrust,
  confirms, deads, createdAt, score, breakdown).
- **Renders:** The entire card is a `next/link` `<Link href="/leads/{id}">` (whole-card tap
  target). Top row: deal-type chip + conditional "pending review" pill. Body: product name
  (`<h3>`), store/city/state/zip line. Right-aligned: price (`centsToUSD`) with struck-through
  MSRP if present. Meta row: `ConfidenceBadge`, evidence label (via `EVIDENCE_LABELS` from
  `lib/constants.ts`), `✓ {confirms} · ✗ {deads}`, `by @{reporterHandle} (trust {reporterTrust})`,
  `timeAgo(createdAt)` (from `lib/format.ts`).
- **API calls:** None — pure display of data passed in as props.
- **Visual states:** No loading/error/disabled states (not interactive beyond the outer link);
  one conditional badge (`status === "PENDING"`); hover state (`hover:border-forge-500`) on the
  card border.
- **Tailwind classes:**
  - Card: `block rounded-lg border border-stone-200 bg-white p-4 shadow-sm transition
    hover:border-forge-500`
  - Deal-type chip: `PENNY` → `bg-forge-100 text-forge-900`; `CLEARANCE` → `bg-sky-100
    text-sky-900`; shared `rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide`
  - Pending pill: `bg-stone-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-stone-600
    rounded`
  - Price: `text-xl font-bold text-forge-600`; struck MSRP: `text-xs text-stone-400 line-through`
  - Meta row text: `text-xs text-stone-500`
- **Note:** today voting is *not* available on this card — it requires navigating to lead detail
  first. `screens-search-and-lead.md`/reporting-and-voting proposals to add inline voting should
  use the new `OneTapVoteButtons` component (Part B), not a copy of `VoteButtons`.

### ReportForm

- **File:** `components/ReportForm.tsx`
- **Type:** Client component (`"use client"`).
- **Props:** `{ stores: { id, label, retailerId, retailerName }[], products: { id, label,
  retailerId }[] }`
- **Local state:** `storeId` (defaults to `stores[0]?.id`), `productMode`
  (`"existing" | "new"`), `result: { ok: boolean; text: string } | null`, `busy: boolean`.
  Product `<select>` is filtered client-side to `products` matching the selected store's
  `retailerId`.
- **Renders:** Store select, existing/new product radio toggle (existing → filtered product
  select; new → name/UPC/SKU inputs), price input (`type="number" step="0.01" min="0.01"`), deal
  type select (`PENNY`/`CLEARANCE`), evidence select (4 options from a local
  `EVIDENCE_OPTIONS` array — same values as `EVIDENCE_TYPES` in `lib/constants.ts`, labeled
  "Receipt (strongest)" → "Text only (weakest)"), source-type select with **two `<optgroup>`s**:
  "Allowed sources" (4 options matching `ALLOWED_SOURCE_TYPES` in `lib/compliance.ts`) and
  "Blocked by compliance policy (demo)" (3 options — `SCRAPED_SITE`, `COMPETITOR_REPOST`,
  `PRIVATE_API` — deliberately selectable so submitting one demonstrates the API's compliance
  rejection), evidence URL text input (placeholder-only, no real upload in MVP), notes textarea.
- **API calls:** `POST /api/reports` with JSON body `{ storeId, productId | newProduct, priceCents,
  dealType, evidenceType, evidenceUrl?, sourceType, notes? }`. On success calls `router.refresh()`.
- **Visual states:**
  - Submitting: button text becomes `"Submitting…"`, `disabled={busy}`.
  - Success: green result text `text-emerald-700` — `"Report submitted — confidence {score}. N
    nearby user(s) alerted."` or `"No alert fired (below threshold or deduped)."`
  - Error: red result text `text-red-700`, message from `data.error` or `Failed ({status})`.
  - Submit button disabled state: `disabled:opacity-50`.
- **Tailwind classes:** Inputs share `w-full rounded border border-stone-300 px-3 py-2 text-sm`;
  labels `block text-xs font-medium text-stone-500 mb-1`; primary submit button `rounded
  bg-forge-600 px-4 py-2 text-sm font-semibold text-white hover:bg-forge-500 disabled:opacity-50`;
  outer form `rounded-lg border border-stone-200 bg-white p-4`.

### VoteButtons

- **File:** `components/VoteButtons.tsx`
- **Type:** Client component (`"use client"`).
- **Props:** `{ reportId: string }`
- **Local state:** `useTransition()` pending flag, `submitting: boolean`, `message: string |
  null`.
- **Renders:** Two full-size buttons: `"✓ Still there"` and `"✗ Dead / gone"`. Optional status
  line below.
- **API calls:** `POST /api/reports/{reportId}/vote` with `{ vote: "CONFIRMED" | "DEAD" }`. On
  success, calls `router.refresh()` inside `startTransition`.
- **Visual states:**
  - Both buttons `disabled={pending || submitting}` during in-flight requests.
  - Success message (neutral `text-stone-600`, not green): suppressed case → `"Recorded. This
    lead is now suppressed as dead."`; normal case → `"Recorded — {confirms} confirmed, {deads}
    dead."`
  - Error message (also `text-stone-600`, not distinctly red — a minor inconsistency vs.
    `ModerationActions`): server error text or `"Vote failed"` or, on thrown network error,
    `"Network error — please try again."`
  - Disabled: `disabled:opacity-50`.
- **Tailwind classes:** Confirm button `rounded bg-emerald-600 px-4 py-2 text-sm font-semibold
  text-white hover:bg-emerald-500 disabled:opacity-50`; dead button same shape with
  `bg-red-600 hover:bg-red-500`.
- **Gap to note for Part B:** the confirm/dead result message does not visually distinguish
  success from error (both `text-stone-600`) — `OneTapVoteButtons` should not repeat this; use the
  `ModerationActions` red/`role="alert"` convention for its error path instead.

### MarkReadButton

- **File:** `components/MarkReadButton.tsx`
- **Type:** Client component (`"use client"`).
- **Props:** `{ alertId: string }`
- **Renders:** A single small outlined "Mark read" button.
- **API calls:** `POST /api/alerts/{alertId}/read` (no body). Always calls `router.refresh()`
  afterward — response status is not checked.
- **Visual states:** `disabled={pending}` while the transition is in flight (`opacity-50`,
  `cursor-not-allowed` implied by `disabled:opacity-50`... actually only `disabled:opacity-50` is
  set, no explicit cursor class). **No error surface at all** — if the fetch fails, the button
  just re-enables silently. This is a known gap; any new "mark read"-style action (e.g. in a
  future alerts redesign) should route through the `ModerationActions` error pattern instead of
  copying this component's silence.
- **Tailwind classes:** `shrink-0 rounded border border-stone-300 px-2 py-1 text-xs text-stone-600
  hover:bg-stone-100 disabled:opacity-50`.

### ModerationActions

- **File:** `components/ModerationActions.tsx`
- **Type:** Client component (`"use client"`).
- **Props:** `{ reportId: string; status: string }`
- **Local state:** `useTransition()` pending flag, `submitting: boolean`, `error: string | null`.
- **Renders:** "Approve" and "Reject" buttons side by side.
- **API calls:** `POST /api/reports/{reportId}/moderate` with `{ status: "APPROVED" | "REJECTED"
  }`. On success, `router.refresh()`.
- **Visual states:**
  - Each button independently disabled when `pending || submitting || status === <that status>`
    (i.e. you can't re-approve an already-approved report) — `disabled:opacity-40` (note: a
    *different* opacity value than the 50% used elsewhere in the app, a minor inconsistency worth
    normalizing if these buttons are ever extracted into a shared "two-state action button").
  - Error text: `text-xs text-red-700`, with **`role="alert"`** — this is the one component in the
    inventory with a real accessible-error pattern and is the convention new components should
    copy (see `EmptyState`/`NudgeBanner`/`OneTapVoteButtons` error states in Part B).
- **Tailwind classes:** Approve `rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold
  text-white hover:bg-emerald-500 disabled:opacity-40`; Reject same shape with `bg-red-600
  hover:bg-red-500`; wrapper `flex shrink-0 flex-col items-end gap-2`.

### SaveRoutePlanButton

- **File:** `components/SaveRoutePlanButton.tsx`
- **Type:** Client component (`"use client"`).
- **Props:** None (self-contained — reads/writes only its own local state).
- **Local state:** `useTransition()` pending flag, `name: string` (controlled text input,
  defaults `""`), `message: string | null`.
- **Renders:** A text input (`placeholder="Plan name (e.g. Saturday run)"`) plus a "Save this
  route" button plus an inline message span.
- **API calls:** `POST /api/route-plans` with `{ name: name || "My route" }`. On success clears
  `name` and calls `router.refresh()`.
- **Visual states:** Button `disabled={pending}` (`disabled:opacity-50`); message text is
  **always neutral** `text-stone-600` for both `"Plan saved."` and any error string — no red/green
  distinction (same gap pattern as `VoteButtons`).
- **Tailwind classes:** Input `rounded border border-stone-300 px-3 py-1.5 text-sm`; button
  `rounded bg-forge-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-forge-500
  disabled:opacity-50`.

### UserSwitcher

- **File:** `components/UserSwitcher.tsx`
- **Type:** Client component (`"use client"`). Mock-auth affordance — sets the `pf_user_id`
  cookie (see `lib/currentUser.ts`).
- **Props:** `{ users: { id, handle, role }[]; currentId: string }`
- **Renders:** A labeled (`"Acting as"`) `<select>` listing `@{handle} ({role.toLowerCase()})` per
  user, rendered in the global header (`app/layout.tsx`).
- **API calls:** `POST /api/user` with `{ userId }`. Always `router.refresh()` afterward
  (no response status check, same pattern as `MarkReadButton`).
- **Visual states:** `disabled={pending}` on the select while switching; no explicit error
  handling.
- **Tailwind classes:** Wrapper `flex items-center gap-2 text-xs text-stone-500`; select
  `rounded border border-stone-300 bg-white px-2 py-1 text-sm text-stone-900`.

---

## Part B — Proposed shared components (design system extension)

These are net-new, framework-light components other screen-spec docs should build against.
Presentational ones (no fetch/state) should stay server-safe like `ConfidenceBadge`/`LeadCard`;
ones that call an API or hold interactive state need `"use client"` like the rest of Part A.
Naming and prop shapes below are chosen to slot into the existing `LeadView` (`lib/leads.ts`) and
constants (`lib/constants.ts`) types with minimal glue.

### FreshnessIndicator

- **Purpose:** Render "last verified: {timeAgo}" with a freshness-tier visual cue, distinct from
  (not a re-skin of) the confidence-tier palette — a lead can be *recent* but *low-confidence*
  (single text-only report) or *aging* but *high-confidence* (many-times-confirmed penny item),
  and the UI must not conflate the two.
- **Props:** `{ lastVerifiedAt: Date | null; label?: string }` — `lastVerifiedAt` is the most
  recent positive signal (most recent `CONFIRMED` vote, falling back to `Report.createdAt` if no
  votes exist yet — mirrors the `lastConfirmAgeDays` logic already in `lib/leads.ts`/
  `lib/scoring.ts`); `label` optionally overrides the default `"last verified"` prefix (e.g.
  `"no reports yet"` when `lastVerifiedAt` is `null`).
- **Tiers (proposed, distinct palette from confidence — see Design tokens):**
  - **Fresh** — `< 24h` → emerald-leaning but *muted* (`text-emerald-700` on `bg-emerald-50`, no
    border-pill treatment) so it reads as "time," not "trust."
  - **Aging** — `1–7 days` → `text-amber-700` on `bg-amber-50`.
  - **Stale** — `> 7 days`, or `null` (no reports/confirms at all) → `text-stone-500` on
    `bg-stone-100`, label reads `"no reports yet"` when `lastVerifiedAt` is `null` instead of a
    bogus "Nd ago."
  - Uses `timeAgo()` from `lib/format.ts` for the actual string so phrasing matches the rest of
    the app.
- **Renders as:** a small inline text label (not a pill/badge like `ConfidenceBadge`) so it reads
  as metadata, not a score — e.g. `"last verified: 2h ago"` in the tier color.
- **Needed by:** the net-new store selector (`screens-discovery.md` section 3, per-store-row
  freshness), the feed and lead detail (store- and lead-level freshness per the UX principles),
  and the alerts inbox (age of the underlying lead, not just the alert's own `createdAt`).

### EvidenceChip

- **Purpose:** Small badge for evidence strength, replacing the plain-text `EVIDENCE_LABELS[...]`
  string currently inlined in `LeadCard` and the admin queue (`app/admin/page.tsx`) with something
  visually scannable, and making the strongest evidence type (`RECEIPT`) stand out at a glance.
- **Props:** `{ evidenceType: EvidenceType }` (the `EvidenceType` union from `lib/constants.ts`).
- **Renders:** A small chip with the `EVIDENCE_LABELS[evidenceType]` text. `RECEIPT` gets a bolder
  treatment (filled `bg-forge-100 text-forge-900` + a leading receipt glyph, e.g. `🧾`, matching
  the app's existing use of plain unicode glyphs like `✓`/`✗` rather than an icon library) to
  visually anchor "this is the strongest kind of proof." The other three evidence types share a
  neutral `bg-stone-100 text-stone-700` treatment, differentiated only by label text — deliberately
  not a 4-color system, to avoid competing with the confidence-tier palette for the user's
  attention.
- **Needed by:** `LeadCard`, lead detail, admin moderation queue, search results — anywhere a
  `LeadView`/report is listed (per the "show evidence type" UX principle, this should replace the
  bare `{EVIDENCE_LABELS[lead.evidenceType]}` text currently duplicated in `LeadCard.tsx` and
  `app/admin/page.tsx`).

### EmptyState

- **Purpose:** Standardize the empty-state pattern currently hand-rolled with slightly different
  markup in four places: `app/page.tsx` (feed, dashed border), `app/alerts/page.tsx` (dashed
  border), `app/admin/page.tsx` (dashed border), `app/route/page.tsx` (plain `<tr>` text, no
  border) and `app/search/page.tsx` (plain `<p>`, no border at all) — three near-identical
  variants and two ad-hoc ones.
- **Props:** `{ icon?: React.ReactNode; heading: string; body?: string; action?: { label: string;
  href: string } }` — `icon` is an optional slot (emoji or small SVG, consistent with the app's
  existing unicode-glyph visual language rather than pulling in an icon library); `action` renders
  a small `forge-600` link/button when a next-step exists (e.g. feed empty state → "Submit a
  report" linking to `/report/new`).
- **Renders:** `rounded-lg border border-dashed border-stone-300 p-6 text-center` container
  (matching the existing feed/alerts/admin convention, promoted to a shared component instead of
  copy-pasted), `heading` in `text-sm font-medium text-stone-700`, `body` in `text-sm
  text-stone-500`, optional action button.
- **Needed by:** feed, search, alerts, route planner, admin queue — every list/table screen in the
  app, plus the net-new store selector once it exists.

### ScoreBreakdown

- **Purpose:** Extract the "why this lead scores" table currently inlined in
  `app/leads/[id]/page.tsx` (lines ~48–95) into a reusable component, so the same explanation can
  appear in a condensed form elsewhere (e.g. an admin moderation card, or a future feed hover/
  expand) without duplicating the table markup and the `EVIDENCE_LABELS`/half-life-day string
  logic.
- **Props:** `{ breakdown: ScoreBreakdown; evidenceType: EvidenceType; evidenceUrl?: string |
  null; reporterHandle: string; reporterTrust: number; confirms: number; deads: number; dealType:
  DealType; mode?: "full" | "compact" }` — `ScoreBreakdown` is the type already exported from
  `lib/scoring.ts` (`{ base, trustBonus, confirmBonus, deadPenalty, decayFactor, effectiveAgeDays,
  final }`), so this component is purely a view over data the scoring layer already produces.
- **`mode: "full"`** (default, current lead-detail behavior): full `<table>` with one row per
  component (evidence base, reporter trust, community confirmations, dead votes, freshness decay,
  final confidence) exactly as today, including the evidence-URL "view" link and the half-life
  string (`dealType === "PENNY" ? "7" : "14"`-day).
- **`mode: "compact"`**: single-line summary for space-constrained contexts (e.g. admin queue
  cards) — something like `"Receipt +45 · trust +12 · confirms +12 · dead −0 · ×0.91 decay = 62"`,
  reusing the same `breakdown` fields without the full table chrome.
- **Needed by:** lead detail (replacing the inline table 1:1), and admin moderation cards
  (`app/admin/page.tsx` currently shows only the final `ConfidenceBadge`, not the "why" — a
  compact `ScoreBreakdown` would let moderators sanity-check a score without leaving the queue).

### StorePicker

- **Purpose:** Replace the three independent plain `<select>` store pickers that exist today
  (feed filter in `app/page.tsx`, `ReportForm`'s store select, and the net-new store-selector
  screen from `screens-discovery.md`) with one distance-aware, freshness-aware component, so all
  three converge on the same sort order and row format instead of three different flat
  alphabetical lists.
- **Props:** `{ stores: StoreOption[]; selectedId?: string; onSelect: (id: string) => void;
  originLat?: number | null; originLng?: number | null; variant?: "dropdown" | "list" }` where
  `StoreOption` is `{ id: string; name: string; retailerName: string; city: string; state: string;
  zip: string; lat: number; lng: number; lastVerifiedAt: Date | null }`. When `originLat`/
  `originLng` are supplied (from `getCurrentUser()`'s `homeLat`/`homeLng`, matching the pattern
  already used by `lib/routePlanner.ts`), rows are sorted by `haversineMiles()` (`lib/geo.ts`)
  ascending and show `"{distance} mi"`; otherwise falls back to alphabetical/state-grouped order
  (same fallback `screens-discovery.md` section 3 already specifies).
- **`variant: "dropdown"`**: renders as a native-feeling `<select>`-like control (drop-in
  replacement for the existing plain selects in `ReportForm`/feed filter, so those two call sites
  can adopt it without a layout rewrite) with each `<option>` label carrying store name + distance
  inline, e.g. `"Target — Midtown (2.3 mi)"`.
- **`variant: "list"`**: renders full rows (name, retailer, address, distance) each including a
  **`FreshnessIndicator`** for that store, per the "show store-level freshness" UX principle — this
  is the variant the net-new store-selector screen uses.
- **Needed by:** `screens-discovery.md`'s store selector (as `variant="list"`), and as the
  suggested upgrade path for `ReportForm`'s store select and the feed filter's store select (as
  `variant="dropdown"`) once distance data is available.

### NudgeBanner

- **Purpose:** One inline banner component for both ethical-nudge microcopy (e.g. near the
  source-type selector in `ReportForm`, reinforcing "be kind to store employees" / "don't clear
  the shelf") and compliance-rejection messaging (surfacing `ComplianceError` messages from
  `lib/compliance.ts` when a blocked source type is submitted), so neither pattern gets
  reinvented ad hoc per screen doc.
- **Props:** `{ tone: "info" | "warning"; message: string; dismissible?: boolean; onDismiss?: () =>
  void }`.
- **Renders:** `tone="info"` → `border-sky-200 bg-sky-50 text-sky-900` (neutral/informational,
  distinct from the app's existing `sky` = clearance-chip association but reused here since no
  other "info" color exists in the palette yet); `tone="warning"` → `border-amber-300 bg-amber-50
  text-amber-900` (matches the existing admin-gate/pending-review amber convention in
  `app/admin/page.tsx`'s "you're not a moderator" notice, promoted into a shared component). An
  optional small dismiss `×` control in the top-right when `dismissible` is set.
- **Needed by:** `ReportForm` (ethical nudge near source-type selection, and displaying
  `ComplianceError` text on rejection instead of the current generic red result line), and any
  net-new compliance/about page.

### OneTapVoteButtons

- **Purpose:** A compact variant of `VoteButtons` sized for inline use directly on `LeadCard` in
  the feed, per the "make dead-voting easy" UX principle and the reporting/voting doc's proposal
  to remove the "must open lead detail first" friction.
- **Props:** `{ reportId: string; size?: "compact" }` (the size prop exists mainly for
  documentation/discoverability — the component *is* the compact variant; `VoteButtons` remains
  the full-size lead-detail version rather than merging the two, since lead detail wants full-width
  buttons with a persistent status line and the feed wants a minimal footprint).
- **Differs from `VoteButtons`:**
  - Smaller tap targets: icon-only or icon+short-label buttons (`✓`/`✗` alone, or `✓`/`✗` with
    `text-xs px-2 py-1` instead of `VoteButtons`' `text-sm px-4 py-2`) sized for sitting inline in
    `LeadCard`'s existing meta row (`flex flex-wrap items-center gap-3 text-xs text-stone-500`)
    without dominating the card.
  - `e.preventDefault()`/`e.stopPropagation()` alone are **not sufficient** here: `LeadCard`
    currently wraps its *entire* contents in a single `<Link>`, and placing interactive `<button>`
    elements inside that `<Link>` nests interactive content inside an anchor, which is invalid
    HTML and can produce real accessibility/focus/keyboard-navigation and browser-inconsistent
    click-target bugs — `stopPropagation` prevents the click from also triggering navigation, but
    it doesn't fix the underlying nested-interactive-content structure. Adding
    `OneTapVoteButtons` to the feed requires restructuring `LeadCard` first: either (a) narrow the
    `<Link>` to wrap only the non-interactive parts of the card (product name, price, store line)
    and place the vote buttons as siblings outside it, or (b) keep the whole card clickable via a
    "stretched link" pattern (an absolutely-positioned `<Link>` overlay with the buttons given a
    higher `z-index` and their own `stopPropagation` handler) — either is a real markup change to
    `LeadCard`, not something `OneTapVoteButtons` can work around unilaterally by itself.
    `VoteButtons` never had to handle this because it only ever lives on the non-link lead-detail
    page.
  - Result feedback should NOT reuse `VoteButtons`' neutral-gray-for-everything message pattern
    (a known gap, see Part A) — the compact "no room for a status line" context makes a bad message
    even more likely to go unnoticed; toast-in-place (e.g. the tapped button briefly shows
    "✓ Recorded" then reverts) is preferable to be verified against whatever toast/feedback pattern
    the reporting-and-voting doc lands on.
  - Same API call as `VoteButtons`: `POST /api/reports/{reportId}/vote` with `{ vote: "CONFIRMED"
    | "DEAD" }`.
- **Needed by:** the reporting-and-voting screen doc's feed-inline-voting proposal.

### StatusPill *(bonus — duplication guard)*

- **Purpose:** `LeadCard`'s `"pending review"` pill, the admin queue's raw `{lead.status}` pill
  (`app/admin/page.tsx`), and any future settings/admin doc's status displays all currently
  hand-roll `rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-stone-600`
  (or a near-variant) inline. Worth consolidating before a third and fourth copy appear (the
  admin-and-compliance doc's "richer moderation-queue signals" proposal is a likely third).
- **Props:** `{ status: ReportStatus | "new" | "read" }` (`ReportStatus` from `lib/constants.ts`:
  `PENDING | APPROVED | REJECTED | SUPPRESSED`, plus the alert-specific `"new"` pill already used
  in `app/alerts/page.tsx`).
- **Renders:** Same neutral uppercase pill shape for `PENDING`/`APPROVED`/`REJECTED` (with
  `REJECTED`/`SUPPRESSED` optionally leaning `bg-red-50 text-red-700` and `APPROVED` leaning
  `bg-emerald-50 text-emerald-700`, keeping `PENDING` neutral stone) — deliberately not reusing the
  emerald/red/amber intensities that `ConfidenceBadge` uses, so a status pill never gets confused
  for a confidence score at a glance.
- **Needed by:** admin queue (replacing the raw `{lead.status}` text), `LeadCard` (replacing the
  bespoke pending pill), and the admin-and-compliance doc's moderation-queue enhancements.

---

## Design tokens

Single canonical reference for color/tier conventions. Every sibling doc and future implementer
should pull from this table rather than re-deriving tone rules.

| System | Source of truth | Tiers / values | Tailwind classes |
|---|---|---|---|
| **Confidence tier** (trust in the deal) | `ConfidenceBadge` (`components/ConfidenceBadge.tsx`) | ≥75 high · ≥50 medium · ≥25 low · <25 very low | `bg-emerald-100 text-emerald-800 border-emerald-300` · `bg-amber-100 text-amber-800 border-amber-300` · `bg-orange-100 text-orange-800 border-orange-300` · `bg-red-100 text-red-800 border-red-300` |
| **Freshness tier** (recency of last verification — new, this doc) | `FreshnessIndicator` (Part B) | <24h fresh · 1–7d aging · >7d or never stale | `text-emerald-700 bg-emerald-50` · `text-amber-700 bg-amber-50` · `text-stone-500 bg-stone-100` |
| **Deal type** | `LeadCard` | PENNY · CLEARANCE | `bg-forge-100 text-forge-900` · `bg-sky-100 text-sky-900` |
| **Semantic action colors** | `VoteButtons`, `ModerationActions` | positive/confirm/approve · negative/dead/reject/error | `emerald-600` (bg) / `emerald-700` (text) · `red-600` (bg) / `red-700` (text) |
| **Caution / pending-gate** | `app/admin/page.tsx` non-moderator notice, `LeadCard` pending pill | admin-gated or pending-review state | `border-amber-300 bg-amber-50 text-amber-900` (banner) · `bg-stone-200 text-stone-600` (pill, deliberately neutral not amber) |
| **Brand / primary action** | forge palette (`tailwind.config.ts`) | primary buttons, links, price display | `forge-600` bg (buttons), `forge-600` text (links/price), `forge-100`/`forge-900` (penny chip) |
| **Neutral surface** | app-wide | cards/sections | `border-stone-200 bg-white rounded-lg`; body `bg-stone-100 text-stone-900` |

Key distinctions to preserve when implementing Part B components:

1. **Confidence ≠ freshness.** `ConfidenceBadge` uses saturated `-100`/`-800` pill tones;
   `FreshnessIndicator` deliberately uses lighter `-50`/`-700` *inline text*, not a pill, so the
   two never look interchangeable even though both happen to use green/amber/red-adjacent hues.
2. **Status ≠ confidence.** `StatusPill` stays in the neutral stone family for its default
   (`PENDING`) state rather than borrowing `ConfidenceBadge`'s amber/orange, since a "pending"
   report can still have a high confidence score — the two signals must not collide visually.
3. **`forge` (amber/brand) vs. semantic `amber` (caution).** The brand's primary color happens to
   sit in the same hue family as the "caution" semantic color; existing code already relies on
   `bg-amber-50`/`border-amber-300` (not `forge-*`) for caution banners specifically to keep this
   separation legible — new components should follow suit rather than using `forge-*` for warnings.
