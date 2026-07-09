# Admin & compliance screens — Moderation queue, Compliance/about page

Author: Agent 6 (UX and Frontend Flow). Scope: the two screens that carry PennyForge's trust
promise to the people enforcing it (moderators) and the people relying on it (everyone else).
Grounded in the real MVP code as of this writing: `app/admin/page.tsx`,
`components/ModerationActions.tsx`, `app/api/reports/[id]/moderate/route.ts`,
`app/api/reports/[id]/vote/route.ts`, `lib/leads.ts`, `lib/scoring.ts`, `lib/compliance.ts`,
`lib/constants.ts`, `prisma/schema.prisma`, `docs/compliance.md`, and `CLAUDE.md`. See sibling docs
in `docs/ux/` for discovery/search/lead-detail flows — this doc does not re-spec those.

Every proposal below stays inside `CLAUDE.md`'s hard boundaries: no scraping, no private/
undocumented endpoints, no competitor data ingestion, no reverse engineering, no automated
checkout, allowlist-not-denylist for sources, first-hand in-store reports only. Section 11 exists
specifically to communicate those boundaries to end users — getting their wording right matters as
much as getting the UI right, so the copy below is written to be lifted close to verbatim from
`lib/compliance.ts` / `docs/compliance.md` rather than paraphrased loosely.

---

## 10. Admin moderation queue

**MVP (built).** This section specs `app/admin/page.tsx` (route `/admin`) and its two
collaborators, `components/ModerationActions.tsx` and `POST /api/reports/[id]/moderate`,
faithfully as they exist today, plus a set of low-cost MVP-level UI additions (no schema changes)
that make the existing two-gate trust model legible instead of just enforced.

### Purpose

Give ADMIN/CAPTAIN users a single place to review reports that need a human decision: brand-new
`PENDING` submissions, `SUPPRESSED` reports the community has already dead-voted down (in case one
is worth a closer look), and `REJECTED` reports (for audit/consistency). Critically, this screen
must never let a moderator *believe* they are the only thing standing between a bad report and the
feed — see "Admin UX notes" below for how that framing should show up in the UI, not just in
internal docs.

### Main components

Built today, read directly from `app/admin/page.tsx`:

- Role gate: `getCurrentUser()` → `canModerate = role === "ADMIN" || role === "CAPTAIN"`. If false,
  an amber (`border-amber-300 bg-amber-50`) notice: "You're acting as @{handle} ({role}). Switch to
  **forge_admin** or **atl_captain** in the header to access moderation." — points at the real
  seeded demo accounts (`prisma/seed.ts`) via the existing `UserSwitcher` mock-auth control, not a
  login form (no real auth in MVP per `CLAUDE.md`).
- `<h1>` "Moderation queue" + subhead "Pending reports awaiting review, plus suppressed (dead-voted)
  and rejected reports."
- One card per report from `getModerationQueue()` (`lib/leads.ts`, reports with
  `status: { in: ["PENDING", "SUPPRESSED", "REJECTED"] }`, joined and scored via `toLeadView`),
  newest first:
  - `ConfidenceBadge` (same emerald/amber/orange/red tiering as the feed) + a status pill
    (currently a flat `bg-stone-200` uppercase tag showing `PENDING`/`SUPPRESSED`/`REJECTED`).
  - Product name; `{store} · {city}, {state} · {price} · {evidence label}` line
    (`centsToUSD`, `EVIDENCE_LABELS[evidenceType]`).
  - `by @{reporterHandle} · {timeAgo(createdAt)} · ✓{confirms} ✗{deads}`.
  - Optional free-text `notes` from the reporter.
  - `<ModerationActions reportId status>` — Approve (emerald) / Reject (red) buttons.
- **Gap in the built version worth flagging:** `lead.evidenceUrl` is fetched by `toLeadView` but is
  **not rendered or linked anywhere on this page**. A moderator deciding whether a `SHELF_TAG_PHOTO`
  or `RECEIPT` report is legitimate currently has no way to open the actual evidence from the queue
  card — they'd have to trust the evidence-type label alone. This is the single highest-value cheap
  fix on this screen (see MVP version below).

**MVP-level additions proposed here** (styling/copy/query changes only — no new tables, no new API
routes beyond what's below):

- **Suppressed-report callout.** Today a `SUPPRESSED` card looks identical to a `PENDING` one
  except for the status pill text — clicking Approve on it produces a 409 whose message only
  appears reactively, after the click, as small red `role="alert"` text below the buttons ("This
  report is community-suppressed by dead votes and can't be approved until votes change."). That
  buries the single most important fact about the card. Instead, a `SUPPRESSED` card should show an
  inline banner **above** the actions, before any click:
  > "Community-suppressed — {deads} dead vote{s} vs {confirms} confirm{s}. Approving is blocked
  > until votes shift back in its favor (this can happen automatically if more confirms come in —
  > see `lib/scoring.ts#isSuppressed`/the vote route's auto-restore). You can Reject to close this
  > out permanently, or leave it as-is and it may resolve itself."
  This directly reflects the real mechanic: `POST /api/reports/[id]/vote` auto-flips a report back
  out of `SUPPRESSED` to its saved `previousStatus` the moment confirms overtake deads again — no
  admin action required — whereas clicking **Reject** on a suppressed card is a genuine one-way
  door (`previousStatus` is cleared to `null` on any moderation write, so a later vote swing can no
  longer auto-restore it). The banner should make that asymmetry legible: "leave it, it might
  self-resolve" vs. "reject it, that's final."
- **Status pill color, not just text.** Reuse the existing amber/red/stone tone convention (amber =
  caution/`PENDING`, red-ish = `SUPPRESSED`/needs-attention, stone/neutral = `REJECTED`/settled)
  instead of the current single flat grey pill for all three — a one-line class change, purely
  visual, no logic change.
- **Evidence link.** Render `lead.evidenceUrl` as a small "View evidence →" link next to the
  evidence-type label whenever present (it's already `http`/`https`-validated at submission time by
  `validateReportInput` in `lib/compliance.ts`, so it's safe to link directly).

### User actions

- Filter/switch identity via the header `UserSwitcher` to `forge_admin`/`atl_captain` if not
  already a moderator (the only "action" available on the gated view).
- Read a card's confidence, status, evidence, and reporter signals.
- Click **Approve** → `POST /api/reports/{id}/moderate {status: "APPROVED"}` — blocked with a 409
  if the report is currently `SUPPRESSED` (see above).
- Click **Reject** → same endpoint, `{status: "REJECTED"}` — always allowed, including on
  `SUPPRESSED` reports, and settles the report permanently (clears `previousStatus`).
- On success, `router.refresh()` re-renders the server component so the queue reflects the new
  state immediately (report leaves the queue on `APPROVED`, since `getModerationQueue` only
  includes `PENDING`/`SUPPRESSED`/`REJECTED`).
- (Proposed, MVP-cheap) Click "View evidence" to open the evidence URL in a new tab before
  deciding.

### Data needed

- `getCurrentUser()` for role gate.
- `getModerationQueue()` (`lib/leads.ts`) → `prisma.report.findMany` with `status: { in: [...] }`,
  `include: { product: { include: { retailer: true } }, store, user, votes }`, mapped through
  `toLeadView` for `score`/`confirms`/`deads`.
- `POST /api/reports/[id]/moderate`: re-reads the report + its `votes` inside the handler to
  compute `confirms`/`deads` and re-check `isSuppressed` at write time (not the possibly-stale
  numbers already on the client) before allowing `APPROVED`.

### Empty state

Built and exact: `"Queue is empty."` in a dashed-border card
(`border-dashed border-stone-300 p-6 text-center text-sm text-stone-500`) when no reports are
`PENDING`/`SUPPRESSED`/`REJECTED`. This is a genuinely good state to reach often — see Admin UX
notes on why an empty (or near-empty) queue should read as "the system is working," not "nothing to
do yet."

### Error state

- Moderate call fails (403 wrong role, 400 bad status, 404 unknown report, 409 suppressed-approve,
  network error): `ModerationActions` shows inline red text with `role="alert"` below the buttons —
  this is the one component in the codebase today with a real accessible error pattern and is worth
  replicating verbatim in other client components that mutate state (report form, vote buttons),
  not just referencing here.
- Buttons are disabled while `pending || submitting`, and the button matching the report's *current*
  status is permanently disabled (can't "Approve" an already-`APPROVED` report — though note
  `APPROVED` reports never actually appear in this queue in the first place, so in practice this
  guards against double-submits mid-flight, not stale-state re-approval).
- Queue fetch itself has no explicit error handling (`export const dynamic = "force-dynamic"`, no
  try/catch) — same gap noted for the feed in `docs/ux/screens-discovery.md`; a DB failure here
  surfaces as Next.js's default error boundary. Lower priority than the feed (far lower traffic,
  moderator-only surface) but worth the same shared error-boundary pass eventually.

### MVP version

Exactly the built queue and moderate endpoint, plus the four low-cost additions above (suppressed
banner, colored status pills, evidence link, no schema/API changes). All four are pure
presentation/copy work on top of data the page already fetches.

### Future version

- **Bulk actions.** Multi-select checkboxes + "Reject selected" for an obvious wave of spam/abuse,
  or "Approve selected" for a batch of clean `PENDING` reports from trusted reporters — would need
  the moderate route to accept an array of report IDs (or a thin wrapper looping the existing
  per-report endpoint) plus a shared 409 summary if some of the batch is suppressed.
- **Abuse-pattern flags.** Surface, per report, a computed signal like "this reporter has 3 other
  reports currently suppressed" or "this reporter's last 5 reports: 1 approved, 4 dead-voted" —
  requires a small aggregate query (e.g. `prisma.report.groupBy` by `userId` scoped to recent
  reports/votes) that doesn't exist today; belongs in a new pure function (e.g.
  `lib/abuseSignals.ts`) per `CLAUDE.md`'s business-logic-in-`lib/*.ts` convention, not inlined in
  the page. See Admin UX notes for the specific signals worth showing first.
- **Audit log of moderation actions.** The schema currently has no moderation-history table — a
  `Report` only stores its *current* `status`/`previousStatus`, not who changed it or when
  (`previousStatus` is a one-slot rollback buffer for auto-suppression, not a log). A real audit
  trail needs a new `ModerationAction` (or similar) table recording `{reportId, moderatorId,
  fromStatus, toStatus, createdAt}` on every write in the moderate route — a real migration, not a
  UI-only change, so this is explicitly Future rather than MVP-cheap.
- Saved queue filters/views per moderator (e.g. "just show me suppressed" as a persisted default) —
  see queue ergonomics in Admin UX notes for the MVP-level version of filtering that doesn't need
  persistence.

---

## 11. Compliance / about page

**MVP (net-new, to build).** No such page or route exists today. The only user-facing compliance
signal currently shipped is the one-line footer disclaimer in `app/layout.tsx` ("Community-reported
deals... PennyForge is not affiliated with any retailer. Be kind to store employees."). The full
policy only lives in `docs/compliance.md`, a repo file no end user will ever see. This section
designs the page that makes PennyForge's sourcing rules and trust model a first-class, linkable part
of the product rather than an internal document — this is the screen that turns "we follow strict
sourcing rules" from a claim into something a skeptical user (or a nervous store employee, or a
retailer's legal team) can actually go read.

### Purpose

Answer, in plain language and in under two minutes of reading, the three questions a new or
skeptical user has about a crowdsourced deals app: "where does this data come from," "what stops
people from spamming/gaming it," and "what will this app never do that a scraping tool or a chaotic
Discord server might." It is the concrete, linkable proof behind the tagline "trust, proof, routing,
ROI, community, compliance" from `CLAUDE.md`'s mission statement — not a legal terms page.

### Main components

Route: `/trust` (proposed — short, positive framing over the more legalistic-sounding
`/compliance`; the page content covers both compliance and general "how this works" ground, so a
non-legalistic URL and nav label matter as much as the copy). Linked from the footer next to the
existing disclaimer in `app/layout.tsx` (e.g. "Community-reported deals... [How we source data →]")
and optionally added to the primary `NAV` array.

Server component, rendered directly from real constants so the page can't silently drift from
enforcement — same principle the codebase already applies to `EVIDENCE_LABELS`/`ROLES` in
`lib/constants.ts`:

1. **Header + one-paragraph positioning statement** (the "why we're different" ask):
   > "PennyForge is Waze for hidden clearance — but only if every driver on the road actually drove
   > the route. We don't scrape retailer websites, call private APIs, or repost paid competitor
   > lists, because that data is unverified by definition: nobody has actually stood in the aisle.
   > Every price on this app comes from someone who was there. That's slower to fill than a
   > scraper, and it's the whole point — a smaller, honest feed beats a big, unverifiable one."
2. **"What we accept" table** — rendered by iterating `ALLOWED_SOURCE_TYPES` and `SOURCE_LABELS`
   from `lib/compliance.ts` directly (not hand-copied prose), so a future new allowed source type
   automatically appears here the moment it's added to the allowlist, and a removed one
   automatically disappears:

   | You saw... | We call it |
   |---|---|
   | *(one row per `ALLOWED_SOURCE_TYPES[i]`, label = `SOURCE_LABELS[type]`)* | |

   e.g. "Saw it in store," "Bought it (have receipt)," "Photographed shelf tag," "Public store
   flyer/signage" — plus one sentence per row on why it counts as first-hand (adapted from
   `docs/compliance.md`'s allowlist table, which the constants file doesn't currently carry
   rationale text for — see the code note below).
3. **"What we'll never do" list** — five items, phrased for a general reader, adapted 1:1 from
   `CLAUDE.md`'s hard boundaries and `docs/compliance.md`'s "What this repo will never do" section:
   no scraping retailer or competitor sites; no calling private/undocumented retailer APIs; no
   reposting paid competitor feeds or lists; no reverse-engineering retailer inventory or POS
   systems; no automated checkout or purchase-bot behavior of any kind. This list should be visually
   the most prominent block on the page (this is the differentiator claim, not fine print).
   **Code note:** `lib/compliance.ts` exports `BLOCKED_SOURCE_TYPES` with inline *code comments*
   explaining why each is blocked, but no exported rationale map analogous to `SOURCE_LABELS` for
   the allowed side. A small follow-up (out of scope for this doc, flagged for whoever picks it up)
   — add a `BLOCKED_SOURCE_RATIONALE: Record<BlockedSourceType, string>` next to
   `BLOCKED_SOURCE_TYPES` — would let this section of the page be driven from real exported data too
   instead of hand-written prose, matching the "can't drift" property the allowed-side table already
   has.
4. **"How trust actually works here"** (plain-language UGC policy, adapted from
   `docs/compliance.md`'s UGC section): every report needs a source type from the list above or it's
   rejected before it ever touches the database (422); your trust score rises when your reports get
   confirmed and falls when they get dead-voted, and that score feeds directly into how visible your
   reports are; the community itself is the first line of defense — enough dead votes
   auto-hide a lead from the feed, alerts, and route planner without anyone from PennyForge doing
   anything; human moderators (the small `ADMIN`/`CAPTAIN` team) are a backstop on top of that, not
   the primary mechanism — see the Admin UX notes section below, this is the same framing.
5. **Privacy note** (adapted from `docs/compliance.md`): your home location is only ever used to
   calculate distances for the route planner and alerts — it is never shown to other users; store
   addresses are public business info, not personal data; PennyForge collects no personal data
   beyond an email and a handle in the MVP.
6. **Contact/report-a-concern line**: a simple mailto or link for "think a report violates this
   policy, or a store asked us to look at something? Tell us" — no ticketing system needed at MVP,
   just an honest channel.

### User actions

- Arrive from the footer link (or nav, if added) at any point — this is a read-only, non-interactive
  page in the MVP.
- Click through to a specific section via in-page anchor links (Sources we accept / What we'll never
  do / How trust works / Privacy / Contact) for scannability, since the full page is longer than a
  typical screen.
- Optionally follow the mailto/contact link.

### Data needed

- `ALLOWED_SOURCE_TYPES` + `SOURCE_LABELS` from `lib/compliance.ts` — already exported, no new code
  needed to render the "what we accept" table live.
- `BLOCKED_SOURCE_TYPES` from `lib/compliance.ts` for the never-do list (labels/rationale currently
  hand-written prose per the code note above, until/unless `BLOCKED_SOURCE_RATIONALE` is added).
- No database reads required for the MVP version — this is intentionally a static-content page
  computed from constants only, not report/user data, so it has no DB-availability dependency at
  all (a meaningful reliability property for a page whose whole job is to be trustworthy and always
  reachable).

### Empty state

Not applicable in the normal sense (the page always has content, since it's driven by hardcoded
constants arrays that are never user-emptyable). The one degenerate case worth guarding in the
component itself: if `ALLOWED_SOURCE_TYPES` were ever accidentally emptied in a future refactor, the
"what we accept" table should not silently render as a blank table with a heading and no rows —
render a loud dev-visible fallback ("no allowed source types configured — this is a bug, not a
policy") rather than letting the page imply "we accept nothing" or, worse, silently doing nothing
and shipping an empty allowlist that would then also block all real report submissions (same
constants back the runtime `assertSafeSource` check).

### Error state

Because the MVP version reads no DB and no request params, there is effectively no runtime error
surface beyond a build-time TypeScript failure (which lint/build already catch) — this page should
be one of the most reliable routes in the app precisely because it makes zero external claims about
live data. Once a Future version adds live counts (see below), that version inherits the same
DB-failure posture recommended for the feed/admin pages: degrade the specific stat, never take down
the whole page.

### MVP version

Single server-rendered page at `/trust`, content sourced from `lib/compliance.ts` constants plus
adapted prose from `docs/compliance.md`/`CLAUDE.md` for the sections without an exported data
source yet (blocked-type rationale, privacy note, positioning paragraph). Linked from the footer.
No forms, no DB reads, no client components.

### Future version

- **FAQ expansion** — common questions ("why was my report rejected," "what counts as a receipt,"
  "can I report from memory") as an expandable section, likely still static/constants-driven where
  possible (e.g. auto-generating a "why was this rejected" FAQ entry per `ComplianceError` message
  in `lib/compliance.ts` rather than hand-duplicating the error text).
- **Per-retailer specific guidance** — e.g. store-by-store notes on penny/clearance handling
  variance, explicitly called out in `docs/compliance.md` as "not uniformly documented by any
  retailer" today; would need a small first-party content table (retailer-level notes authored by
  PennyForge/community, not scraped from the retailer), consistent with the allowlist principle —
  the guidance itself would need the same first-hand-sourcing discipline as report data.
- **Live trust stats** — e.g. "N reports auto-suppressed by the community this week, 0 moderator
  intervention needed" pulled from real `Report`/`Vote` data, to make the "community does most of
  the work" claim in section 4 verifiable rather than asserted. Note: `Report` currently has no
  `updatedAt` column (only `createdAt`), so "suppressed in the last N days" isn't directly
  queryable yet — a real schema addition, not a page-only change, so this is Future not MVP.
- **Links to full legal terms** once a real ToS/Privacy Policy exists — the MVP page is
  plain-language trust copy, not a substitute for actual legal documents when this ships beyond a
  local MVP.

---

## Admin UX notes

Deliverable 6. This section is about how the admin experience *as a whole* should feel, beyond the
two individual screens above — specifically the ergonomics of the queue at realistic volume, what
"abuse" should look like to a moderator before it becomes a suppressed/rejected report, and how the
UI avoids making a small volunteer moderator team feel solely responsible for catching everything.

**Queue ergonomics — sort and filter by status.** The built queue has one fixed order (newest
first, all three statuses interleaved) with no filtering. At any real volume this becomes hard to
scan: a moderator who wants to clear the `PENDING` backlog has to visually skip past `SUPPRESSED`
and `REJECTED` cards mixed in. MVP-cheap fix: simple status tabs/pills above the list
(`?status=PENDING|SUPPRESSED|REJECTED|ALL`, default `PENDING` since that's the actionable queue) —
a query-param filter on the existing `getModerationQueue()` result, no new query logic beyond an
`Array.filter`. Pair with a secondary sort toggle: "oldest first" (fairness — nothing sits forever)
vs. the current newest-first (catches fresh spam fast). Both are presentation-layer changes on data
already fetched.

**Priority signal: "about to auto-suppress."** The most valuable thing this queue could surface
that it doesn't today is reports that are *one dead vote away* from community suppression
(`isSuppressed` in `lib/scoring.ts` triggers at `deads >= 2 && deads > confirms` — so a `PENDING`
report sitting at `deads: 1, confirms: 0` is right at the edge). Flagging these with a small amber
"⚠ 1 dead vote — may self-suppress soon" chip lets a moderator get ahead of a borderline report
(check it, maybe reject it cleanly, maybe leave it) before the community's own mechanism kicks in,
rather than only ever seeing it after it's already `SUPPRESSED`. This is a filter on data the queue
already has (`confirms`/`deads` are already computed per card) — no new query.

**Abuse signals a moderator should see at a glance.** Two are realistic to build on existing data
without a schema change; a third needs one:

- *Report velocity in-queue*: how many other `PENDING`/`SUPPRESSED` reports the same reporter
  currently has sitting in this queue (a `groupBy userId` over the queue result set the page already
  fetched — pure client-side or server-side aggregation, no new query). A reporter with 6 reports in
  the queue at once, several suppressed, is a different review case than someone with one.
- *Trust-score direction, not just current value*: the card already shows `reporterTrust` as a bare
  number (e.g. "trust 42"), which reads as static. Even without a persisted trust-history table, the
  page can compute a same-visit proxy — e.g. "this reporter's other reports in the queue: 1
  approved-then-suppressed, 3 currently dead-voted" — that communicates direction without needing
  new schema.
- *True trust-score trend line* (score over time, not just a same-session snapshot) needs an actual
  history table (`User.trustScore` is a single live int with no log of past values) — Future, not
  MVP, and should be scoped together with the audit-log table proposed in section 10, since both are
  "who/what changed this and when" problems that likely want the same underlying event-log design
  rather than two bespoke tables.

**Avoid "you're the only line of defense."** This is as much a copy/framing problem as a data
problem. The subhead on `/admin` today ("Pending reports awaiting review, plus suppressed... and
rejected reports") is neutral but doesn't say anything about the automatic system already running
underneath it. Two low-cost changes fix this:

- Rewrite the subhead to state the actual mechanism up front, e.g.: "Most bad reports never reach
  this queue — enough dead votes from the community auto-hides a lead before you'd ever need to act.
  This queue is for what's left: new reports awaiting a first look, community-flagged reports worth
  a second opinion, and past rejections for the record." This is the same framing used in section
  10's suppressed-card banner, applied once at the page level so it's read before any individual
  card.
- Treat a near-empty queue as a *positive, explicit signal* rather than a flat "Queue is empty."
  message — e.g. keep the existing empty-state copy, but consider (Future) a small line above it
  drawing on real suppression counts once `Report.updatedAt` exists (see section 11's Future notes):
  "The community auto-suppressed N reports this week without any moderator action." Reinforces, with
  a number instead of just prose, that moderation is the backstop and dead-vote suppression is doing
  the bulk of the work — directly useful for volunteer CAPTAIN morale, and honest about where the
  system's real defense actually lives.
