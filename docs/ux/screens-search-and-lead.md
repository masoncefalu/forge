# Screens: UPC/SKU Search & Lead Detail

Agent 6 (UX and Frontend Flow) unit. Covers two screens in the core "find a deal" path:
manual UPC/SKU search (`app/search/page.tsx`) and lead detail (`app/leads/[id]/page.tsx`).
Both are built and live today. Voting UI *mechanics* (button states, suppression copy, the
full vote-flow spec) belong to the sibling doc `screens-reporting-and-voting.md` — this doc
only covers how confirm/dead voting *surfaces* within the lead detail page.

---

## 4. UPC / SKU Search

### Purpose

Let a shopper standing in an aisle (or planning a trip) look up a specific product by the
number printed on the shelf tag or box, and see every active lead reported for it — so they
can decide "is this actually here, and can I trust it" before walking over or driving out.
This is the manual, typed entry point into PennyForge's lead data; per `CLAUDE.md`'s no-scraping
/ first-hand-only boundary, everything returned here traces back to a user-submitted `Report`,
never a scraped or third-party feed.

### Main components

- Page header: "UPC / SKU search" + one-line explainer that camera scanning is a later phase
  (`app/search/page.tsx` line 47: "Type or paste a UPC, SKU, or product name. Camera barcode
  scanning lands in a later phase.").
- Search form: single text input (`name="q"`, placeholder `"e.g. 192115000101 or 1001-483-392"`)
  + "Search" submit button. Query round-trips through the `q` search param (`GET /search?q=...`),
  so results are a plain server render, not client-side fetch — shareable/bookmarkable URLs for
  free.
- Per-matched-product section: product name, retailer name, UPC, SKU, and retail price
  (`centsToUSD(msrpCents)` when present) as a compact metadata line.
- `LeadCard` (`components/LeadCard.tsx`) per active report under that product, showing: deal-type
  badge (PENNY/CLEARANCE), "pending review" badge when `status === PENDING`, product name, store +
  city/state/zip, price (struck-through MSRP alongside), `ConfidenceBadge`, evidence type label,
  confirm/dead counts (`✓ N · ✗ N`), reporter handle + trust score, and `timeAgo(createdAt)`. The
  whole card is a `Link` to `/leads/{id}`.

### User actions

- Type/paste a UPC, SKU, or partial product name and submit the form (matches via `contains` on
  `upc`, `sku`, and `name` — case-sensitive substring per Prisma/SQLite default, so "penny" and
  "Penny" may not both match; this is a known MVP limitation worth flagging, not fixing here).
- Tap/click a `LeadCard` to navigate to that lead's detail page.
- Re-submit the form with a different query at any time (no clear/reset button beyond editing the
  input directly).

### Data needed

- `prisma.product.findMany` with `OR` on `upc`/`sku`/`name` `contains: query`, including
  `retailer` and `reports` filtered to `status IN (PENDING, APPROVED)` with `product.retailer`,
  `store`, `user`, `votes` — exactly the join `toLeadView` needs to compute `LeadView` per report
  (`lib/leads.ts`).
- No pagination, no result-count cap in the current implementation — every matching product and
  every one of its active reports renders in a single page load. Fine at MVP seed-data scale;
  flag for revisit once real usage grows a store's report volume.

### Empty state

Two-tier, both already built:
- No query yet: search results grid doesn't render at all (`{query && (...)}`) — just the form,
  no "type something" placeholder copy.
- Query with zero matching products: `"No products match "{query}". Try a partial UPC or the
  product name."` (stone-500, sits where results would be).
- Query matches a product but it has zero active leads: per-product line `"No active leads for
  this product yet."` — this is the state that should nudge toward "be the first to report it"
  (no such CTA exists in the current build; worth a future addition — see below).

### Error state

No explicit error UI exists in `app/search/page.tsx` today — it's a server component with a
direct Prisma query and no try/catch, so a DB error currently surfaces as Next.js's generic error
boundary/500 page rather than an in-page message. For MVP this is acceptable (local SQLite, no
network hop to fail), but if a future revision adds a network-backed data source, wrap the query
and render a "Search is temporarily unavailable — try again" message consistent with the
network-error copy pattern already used in `VoteButtons.tsx` (`"Network error — please try
again."`).

### MVP version (built)

Exactly as described above: plain text input, substring match across UPC/SKU/name, full
server-rendered result list grouped by product, `LeadCard` per report, two-tier empty state, no
pagination, no debounce, no client JS required at all for the search itself (only `LeadCard`'s
link is client-navigable, and even that works as a plain anchor).

### Future version (post-MVP)

- **Camera barcode scan as the primary entry point**, manual UPC/SKU typing demoted to a "type it
  instead" fallback link/toggle on the same screen — per `docs/product-spec.md` this is explicitly
  deferred, and the code comment in `app/search/page.tsx` line 1-2 already notes manual search
  "is the same code path a scanner will feed into," meaning a scanner result should populate the
  same `q` param and hit the identical query path, not a parallel one.
  - Scan target: shelf-tag or product barcode only, decoded client-side via the device camera.
    This does not conflict with the no-private-APIs boundary since it never touches a retailer's
    systems — it purely extracts the number already printed on the label the user is standing in
    front of.
- **Search-as-you-type**: debounced client-side query as the user types, replacing the current
  submit-button round trip, with a lightweight loading indicator between keystrokes and result
  refresh.
- **Recent searches**: a small local list (most-recent-first, client-stored) of the last N queries
  the user ran, surfaced under the input when it's empty/focused, to speed up repeat look-ups of
  the same hot items.
- **Scan history**: distinct from recent *text* searches — a log of barcodes actually scanned via
  camera, including ones that returned zero results, so a user can revisit "I scanned this in the
  clearance aisle last week and nothing came up" without re-typing the UPC.
- **Zero-lead CTA**: when a product exists but has no active leads (today's "No active leads for
  this product yet." dead end), add a direct "Report this product" action that pre-fills the
  report form's product field — closing the loop from "I looked it up and found nothing" to "so I
  reported it myself," which is the flywheel the whole product depends on.

---

## 5. Lead Detail

### Purpose

Give a shopper everything they need to decide "is this deal real, and is it worth the trip" for
one specific report — and, critically, make the *reasoning* behind the confidence score fully
visible and legible to someone who has never seen a scoring algorithm before. This page is where
PennyForge's "trust, proof" positioning against Discord-chaos communities has to be made concrete:
a Discord post gives you a screenshot and a vibe; this page gives you a receipt-or-not, a reporter
track record, a community-verification count, and a freshness clock, laid out as an itemized
receipt of its own.

### Main components

(All from `app/leads/[id]/page.tsx`, backed by `getLeadById` / `toLeadView` in `lib/leads.ts`.)

- Header block: product name (`h1`), retailer · store · city/state/zip line, then a small
  metadata line — UPC, SKU, "reported {timeAgo(createdAt)} by @{handle}", and report `status`
  (PENDING/APPROVED/etc).
- Price block (right-aligned): large price (`centsToUSD(priceCents)`) with struck-through MSRP
  underneath when known.
- Optional notes box: reporter's free-text notes, rendered only when present, in a bordered card.
- **"Why this lead scores" section** — the trust centerpiece:
  - `ConfidenceBadge` next to the heading (color-coded: emerald ≥75, amber ≥50, orange ≥25, red
    <25 — see `components/ConfidenceBadge.tsx`).
  - A full breakdown table, one row per scoring component from `ScoreBreakdown`
    (`lib/scoring.ts`), each showing the plain-language label and the exact point contribution:
    1. **Evidence** — `EVIDENCE_LABELS[evidenceType]` (Receipt / Shelf tag photo / Product photo
       / Text only) plus a "view" link to `evidenceUrl` when the reporter attached one. Points:
       `+{base}` (45/32/22/10).
    2. **Reporter trust** — "(@handle, {trustScore}/100)" — `+{trustBonus}` (0–15).
    3. **Community confirmations** — "({confirms}, capped at 3)" — `+{confirmBonus}` (0–36).
    4. **Dead votes** — "({deads})" — `−{deadPenalty}` (uncapped).
    5. **Freshness decay** — "({effectiveAgeDays}d old, {7 or 14}-day half-life; confirmations
       refresh it)" — `×{decayFactor}`.
    6. **Confidence** (bold, final row) — the resulting `0–100` score, matching the badge.
- "Been to this store?" section: one sentence of guidance ("Confirm if it rang up at this price,
  or mark it dead if it's gone. Votes update the reporter's trust and can suppress dead leads. You
  can't vote on your own report.") followed by `VoteButtons`.

### User actions

- Read the score breakdown to understand *why* the badge says what it says (primary "action" —
  this page's whole job is comprehension, not just data display).
- Click the evidence "view" link to see the actual photo/receipt, when attached.
- Tap "✓ Still there" or "✗ Dead / gone" in `VoteButtons` — see the "Trust-first: score breakdown
  in plain language" section below and `screens-reporting-and-voting.md` for full vote-UI detail.
- Navigate back (browser back / nav) — no in-page "back to search" link currently exists on this
  page, which is a minor gap worth a future fix (a simple "← back to results" link would close the
  loop cleanly).

### Data needed

- `getLeadById(id)` → single `Report` row joined with `product.retailer`, `store`, `user`, `votes`
  (`lib/leads.ts` `fetchReports`), scored via `toLeadView` → `scoreBreakdown`
  (`lib/scoring.ts`). Every field on the page — evidence label, trust, confirms, deads,
  `effectiveAgeDays`, `decayFactor`, `final` — comes directly off that one `LeadView` object; no
  separate fetch is needed for the breakdown table.

### Empty state

Not applicable in the "no results" sense (single record by ID, not a list) — see Error state for
the not-found case, which is this screen's equivalent.

### Error state

`getLeadById` returning `null` (bad/stale ID, or a report that's since been deleted) triggers
Next.js's `notFound()` → a real 404 response (`app/leads/[id]/page.tsx` line 20). There is no
custom "this lead may have been removed" copy today; a future pass could add a `not-found.tsx` in
the same route segment with friendlier language pointing back to search, but the underlying
behavior (a genuine 404, not a silent blank page) is already the right instinct for a proof-based
app — a missing lead should never be dressed up as an empty result.

Vote submission errors (network failure, server-side rejection e.g. voting on your own report) are
handled inside `VoteButtons` itself — see `screens-reporting-and-voting.md`.

### MVP version (built)

Exactly the layout above: header + price block, optional notes, full scoring breakdown table,
two-button vote row with inline status message. Server-rendered on load; `VoteButtons` is the only
client-interactive piece, and a successful vote triggers `router.refresh()` so the whole page
(including the breakdown table's confirm/dead counts and recalculated decay) re-renders with fresh
numbers rather than the client patching numbers in locally — the breakdown table the user sees
after voting is always the server's real computed truth, not an optimistic guess.

**Trust-first: score breakdown in plain language.** The table already leads with words, not just
math — "Evidence: Receipt" reads before "+45" — but the design intent going forward should push
further toward a shopper-facing narration rather than an accountant's ledger:
- Row 1 (Evidence) should read as *"Evidence: Receipt photo — the strongest kind of proof, because
  it shows the item actually rang up at this price"* rather than a bare "+45". The four evidence
  tiers map to a plain-English trust ladder that's worth stating once, near the table or in a
  tooltip/`title` attribute on `ConfidenceBadge` (which already carries `title="Confidence score
  (0–100)"` — extend this pattern): Receipt = "proof of purchase," Shelf tag photo = "verified
  in-store, not yet rung up," Product photo = "confirmed on shelf, price unverified," Text only =
  "reported with no photo."
- Row 2 (Reporter trust) should read as *"Reporter @handle has a strong track record (87/100)"* —
  i.e., translate the raw `/100` into a qualitative band (e.g., new/building/established/highly
  trusted) alongside the number, so a first-time visitor doesn't have to guess whether 50/100 is
  good or bad.
  - Row 3 (Community confirmations) as *"3 shoppers confirmed this is still there"* — count-first,
  point-value secondary.
- Row 4 (Dead votes) as *"1 shopper reported this is gone"* — same count-first framing, phrased
  neutrally rather than punitively (it's information, not a penalty on the *reporter's* character —
  reports go dead because stores restock/correct pricing, not necessarily because someone lied).
- Row 5 (Freshness decay) as *"Reported 2 days ago — confidence fades over 7 days for penny deals
  unless someone confirms it's still there"* — this is the row most likely to confuse a
  non-technical reader as raw `×0.87`, so leading with the half-life *story* (why it decays, and
  that confirming resets the clock) matters more here than anywhere else in the table.
- The final "Confidence" row and `ConfidenceBadge` are already the right synthesis point — a single
  0–100 number with a color band is the correct amount of math to surface at a glance; the table
  above it is what lets a skeptical user audit that number instead of taking it on faith. That
  audit-ability, not the number itself, is the actual trust feature.

**"Last verified" and evidence-type badges as freshness/trust signals.** `timeAgo(createdAt)` in
the header ("reported 2h ago by @handle") is the first freshness signal a reader hits, before they
even reach the breakdown table — it should stay above the fold exactly as it is now. Inside the
breakdown table, `effectiveAgeDays` (which is `min(ageDays, lastConfirmAgeDays)`) is the more
precise "last verified" signal: when a lead has a recent confirm, the decay row is effectively
saying "someone confirmed this recently, so treat it as fresher than the original report date" —
that causal link (confirmation → freshness reset) is currently implicit in the parenthetical
"(confirmations refresh it)" and would benefit from being stated plainly the first time a user
hits a lead with confirms, e.g. a one-line note *"Last confirmed {timeAgo}"* sitting next to the
reported-date line whenever `lastConfirmAgeDays` is not null. The evidence-type label (Receipt /
Shelf tag / Product photo / Text only), shown both on `LeadCard` in search results and as row 1
here, is the other half of the trust-at-a-glance pair: freshness answers "is this still true,"
evidence type answers "was this ever verified in the first place" — the two together are what
let a user triage a list of leads without opening every one.

**Dead-voting is two-tap, and that's the design goal, not an accident.** From this page: tap
"✗ Dead / gone" → done. No confirmation dialog, no required comment/reason field, no navigation
away from the page. `VoteButtons` disables both buttons during submission and shows an inline
result message ("Recorded — N confirmed, N dead." or the suppression notice) without a page
reload beyond the `router.refresh()` that updates the breakdown table in place. This is
deliberately friction-free by design: forcing a reason on a dead-vote would (a) slow down the
single highest-leverage anti-chaos signal in the whole scoring model — a fast, unbiased "gone" —
and (b) risk turning a neutral inventory observation into a written complaint, which cuts against
the "avoid encouraging confrontation with employees" principle (a free-text "why is it dead"
field invites shoppers to write things like "employee refused to sell it," which has no good home
in this product). Keep it a tap, not a form. Full button states, suppression messaging, and
self-vote rejection handling are `screens-reporting-and-voting.md`'s to spec in depth — this page
just needs to host the two buttons and their inline result line, which it already does.

### Future version (post-MVP)

- **Photo gallery for multiple evidence submissions**: today a report carries at most one
  `evidenceUrl`; a future version could let multiple shoppers attach corroborating photos to the
  same lead (or let the original reporter add follow-ups), surfaced as a small thumbnail strip
  above or beside the breakdown table rather than a single "view" link.
- **"Report a price change" quick action**: a lightweight variant of the full report-submission
  flow, pre-filled with this lead's product/store, for the common case where a shopper finds the
  same item at a different price rather than confirming/denying the exact one shown — currently
  the only path is the full separate report form with no pre-fill from a lead page.
- **Share-to-friend deep link**: a "share this lead" action producing a direct `/leads/{id}` link
  (already a stable, bookmarkable URL today) with a share-sheet/copy-link affordance and possibly
  a lightweight OG-preview (price + confidence badge) so a shared link previews as more than a bare
  URL in a text thread — this is a natural complement to the "less chaotic than Discord" promise:
  a single trustworthy link with a visible confidence score, instead of a screenshot dropped into
  a channel with no provenance.
