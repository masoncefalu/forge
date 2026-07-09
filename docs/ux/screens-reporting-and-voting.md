# Screens: Submit Report & Confirm/Dead Vote

Agent 6 (UX and Frontend Flow) unit. Covers the two most safety- and speed-critical screens in
PennyForge: submitting a find (`app/report/new/page.tsx` + `components/ReportForm.tsx` →
`POST /api/reports`) and confirm/dead voting on an existing lead (`components/VoteButtons.tsx` →
`POST /api/reports/[id]/vote`). Both are built and live today. This doc treats voting as a
reusable UI *pattern*, not just the one embedding in lead detail that's shipped — see §7.

Per `CLAUDE.md`'s hard boundaries, every field and nudge below assumes first-hand, in-store,
user-generated evidence only. Nothing here proposes scraping, private endpoints, competitor
data, or automated submission — the opposite: the whole point of this screen is to make the
*compliant* path also the *fastest* path.

---

## 6. Submit report

### Purpose

Let a shopper standing in an aisle capture a find — price, product, evidence, and how they found
it — in well under 30 seconds, so reporting never loses to "I'll just post it in the Discord."
Speed and the compliance guardrail are not in tension here: the form is designed so the fast path
and the allowed path are the same path.

### Main components

- `app/report/new/page.tsx` — server component. Fetches `prisma.store.findMany` (with `retailer`)
  and `prisma.product.findMany` (with `retailer`), maps to the shapes `ReportForm` expects
  (`{id, label, retailerId, retailerName}` for stores; `{id, label, retailerId}` for products),
  and renders the page header copy: *"First-hand, in-store finds only. Receipts score highest.
  One report per product, store, and day — re-confirm existing leads instead of re-posting them."*
- `components/ReportForm.tsx` ("use client") — the form itself, in this field order:
  1. **Store** — `<select name="storeId">`, pre-selected to `stores[0]?.id`.
  2. **Product** — radio toggle "Existing" / "New product". Existing mode is a `<select
     name="productId">` filtered client-side to `storeProducts` (products whose `retailerId`
     matches the selected store's retailer). New mode is three inputs: `newName` (required),
     `newUpc` (optional), `newSku` (optional).
  3. **Price you saw (USD)** — `<input type="number" step="0.01" min="0.01">`, `defaultValue`
     `"0.01"`, required. Converted client-side to integer cents (`priceCents = round(price*100)`).
  4. **Deal type** — `<select name="dealType">`: Penny item / Hidden clearance.
  5. **Evidence** — `<select name="evidenceType">`, options ordered strongest→weakest: Receipt
     (strongest) / Shelf tag photo / Product photo / Text only (weakest).
  6. **How did you find this?** (source type) — `<select name="sourceType">` with two
     `<optgroup>`s: "Allowed sources" (Saw it in store / Bought it, have receipt / Photographed
     shelf tag / Public store flyer/signage) and "Blocked by compliance policy (demo)" (Scraped
     website / Competitor repost / Private retailer API) — the blocked group exists specifically
     to demonstrate the 422 guardrail live; see the MVP-polish note below on hiding it from real
     users.
  7. **Evidence URL** — optional `<input type="url">`, labeled "placeholder in MVP — uploads come
     later."
  8. **Notes** — optional `<textarea>`, placeholder "Aisle, quantity left, how it rang up…".
  9. **Submit report** button (`bg-forge-600`), disables and reads "Submitting…" while `busy`.
  10. Inline result banner: emerald-700 success text with score + alert count, or red-700 error
      text from `data.error`.

### User actions

- Confirm or change the pre-selected store.
- Pick an existing product from the filtered dropdown, or switch to "New product" and type a
  name (+ optional UPC/SKU).
- Type the price they saw.
- Confirm or change deal type, evidence type, and source type (all default to their first
  option, so a user who agrees with the defaults just needs to check them, not select them).
- Optionally paste an evidence URL or add notes.
- Tap **Submit report**; on success the page shows confidence score + alert count and
  `router.refresh()` updates any server-rendered data on the page; on failure the raw
  `data.error` string renders in place.

### Data needed

- `stores`: `{id, label: "{name} — {city}, {state}", retailerId, retailerName}[]` from
  `prisma.store.findMany({ include: { retailer: true } })`.
- `products`: `{id, label: "{name} ({retailerName})", retailerId}[]` from
  `prisma.product.findMany({ include: { retailer: true } })`, filtered client-side to the
  selected store's retailer.
- Current user via the `pf_user_id` cookie (`lib/currentUser.ts`) — required server-side; a
  missing/invalid session yields a 401 from `POST /api/reports` (see Error state).
- On submit, `POST /api/reports` body: `{storeId, productId?, newProduct?{name, upc?, sku?},
  priceCents, dealType, evidenceType, evidenceUrl?, sourceType, notes?}`.

### Empty state

- **Zero stores seeded**: the store `<select>` renders with no options and no placeholder
  copy — a silent dead end today. MVP-polish gap worth flagging (not fixing in this unit): add a
  "No stores yet — ask an admin to seed one" message when `stores.length === 0`.
- **Store has zero existing products for its retailer**: the "Existing" product dropdown renders
  empty (no `storeProducts`), which silently produces `productId: ""` on submit and a 400/404
  from the API. MVP-polish proposal: when `storeProducts.length === 0`, auto-select "New product"
  mode instead of leaving "Existing" selected with an empty dropdown.

### Error state

All errors surface as a single red-700 string below the submit button (`data.error`), sourced
from `POST /api/reports` (`app/api/reports/route.ts`):

| Status | Trigger | Current message |
|---|---|---|
| 401 | no `pf_user_id` session | `"No current user"` |
| 400 | missing `storeId`, invalid `dealType`/`evidenceType`, or neither `productId` nor `newProduct.name` given | e.g. `"dealType must be one of PENNY, CLEARANCE"` |
| 422 | `validateReportInput` throws `ComplianceError` (blocked/unknown source type, price out of 1–500000¢ range, malformed evidence URL) | raw `ComplianceError.message`, e.g. `Blocked source type "SCRAPED_SITE". PennyForge only accepts first-hand, in-store, user-generated evidence — never scraped sites, private endpoints, competitor feeds, or automated tools.` |
| 404 | unknown `storeId` or `productId` | `"Unknown store"` / `"Unknown product"` |
| 400 | `productId` belongs to a different retailer than the selected store | `"Product does not belong to this store's retailer"` |
| 409 | same product+store+user already reported today (`@@unique([productId, storeId, userId, reportDate])`, `lib/reports.ts#toReportDate`) | `"You already reported this product at this store today. Confirm the existing lead instead."` |

The 409 and 400/404 messages are already reasonably actionable. The 422 compliance message is
the one that reads as a rejection notice rather than product guidance — see the dedicated
proposal below.

### MVP version (built)

Exactly as described above: single-page form, all fields in one scroll, synchronous fetch to
`POST /api/reports`, inline success/error text, `router.refresh()` on success. No file upload
(evidence is a URL text field), no geolocation, no camera, no autocomplete/typeahead — dropdowns
are full `<select>` lists. This is intentionally minimal per `CLAUDE.md` ("no real OCR pipeline
... in the MVP") but the *ordering and defaults* already do a lot of the speed work: store,
deal type, evidence type, and source type all start pre-populated with a sane default so the
happy path is mostly "confirm, confirm, confirm, type price, submit."

### Future version (post-MVP)

- **Geo-default "my store"**: use the browser's coarse location (or a saved "home store" on the
  user profile) to pre-select the nearest/most-recently-used store instead of `stores[0]`, so the
  store step becomes a glance-and-confirm instead of a real decision for repeat visitors.
- **Product search-as-you-type**: replace the giant `<select>` of every product for a retailer
  with a debounced text search (same `contains` match already used by `app/search/page.tsx`) that
  narrows to ~5 results as the user types — the dropdown approach is fine at seed-data scale but
  won't hold up once a retailer has hundreds of products.
- **Camera-first evidence capture**: replace the "Evidence URL" text field with a camera-capture
  button as the primary affordance (upload-behind-the-scenes to object storage, URL field becomes
  a fallback/manual-paste option) — this is explicitly deferred per `docs/product-spec.md`
  ("Receipt OCR ... post-MVP enhancement once real file upload exists") but the *UI placeholder*
  for it can land now so the field's future shape is visible.
- **Hide the blocked-source demo group from real users**: gate the "Blocked by compliance
  policy (demo)" `<optgroup>` behind a `?demo=1` flag or an admin/QA-only build so ordinary
  shoppers never see options they're not meant to pick — today's build intentionally exposes it
  to demonstrate the 422 guardrail, which is correct for this MVP phase but shouldn't ship to
  real users unmodified.
- **Inline field-level validation** (e.g. price range, required product name) before submit,
  instead of round-tripping to the server to learn a field was invalid.

---

### The <30-second time budget

The form's field order and defaults are already tuned so the fields requiring a real decision
are interleaved with fields that just need a glance-and-confirm. Two happy paths, both well
under the 30-second target:

**Path A — existing product already in the catalog (most common case):**

| Step | Field | Required by API? | User action | Est. time |
|---|---|---|---|---|
| 1 | Store | Yes (`storeId`) | Glance at pre-selected default, tap only if wrong | ~2s |
| 2 | Product | Yes (`productId` or `newProduct.name`) | Tap dropdown, pick from filtered list | ~5s |
| 3 | Price | Yes (`priceCents`) | Type price on numeric keypad | ~4s |
| 4 | Deal type | Yes (`dealType`) | Glance at default (Penny), tap only if Clearance | ~1s |
| 5 | Evidence | Yes (`evidenceType`) | Pick the option matching what they actually have | ~2s |
| 6 | Source type | Yes (`sourceType`) | Read the one-line ethical nudge, pick the accurate option | ~3s |
| 7 | Evidence URL | **No** — optional | Skip | 0s |
| 8 | Notes | **No** — optional | Skip | 0s |
| 9 | Submit + see result | — | Tap, wait for response | ~2s |
| **Total** | | | | **~19s** |

**Path B — new product, not yet in the catalog:**

Same as Path A except step 2 becomes: tap "New product" radio (~1s) + type product name
(~6–7s, required) + optionally skip UPC/SKU (0s). That adds roughly 7–8s over Path A's product
step, for a total of **~26–27s** — still under the 30s target, and this is the *worst common
case* (a first-ever report of a product at a store).

**What's truly required vs. skippable**, explicitly:
- Required: store, product (existing selection or new name), price, deal type, evidence type,
  source type.
- Skippable today with zero API-level consequence: evidence URL, notes. (Skipping evidence URL
  does cost the report nothing score-wise beyond what `evidenceType` already implies — the score
  formula in `lib/scoring.ts` keys off `evidenceType`, not whether a URL was attached.)
- Effectively free (pre-defaulted, no action needed unless the user disagrees): store selection,
  deal type, evidence type, source type all start on a value — only *product* and *price* force a
  genuine interaction on every single submission.

**MVP polish proposals to tighten this further** (documented in Future version above, repeated
here for the time-budget context): geo-defaulting store removes step 1 entirely for repeat
visitors at their usual store; product search-as-you-type would likely cut step 2 from ~5s to
~3s once catalogs grow past a handful of items; a numeric keypad hint (`inputMode="decimal"`) on
the price field is a one-line change that speeds up step 3 on mobile.

### Ethical nudge moments (example microcopy)

The single highest-leverage nudge location is the **source-type field**, because it's the one
question most likely to tempt a shopper into asking an employee to look something up "just to be
sure." Proposed copy (drop-in replacements/additions to `ReportForm.tsx`, no field/API changes):

- **Label + inline helper directly above the source-type `<select>`:**
  > "How did you find this? Help other shoppers, don't put staff on the spot."
  > "Only pick what you personally saw, held, or read yourself. Please don't ask an employee to
  > look up a price or check a system for you — it's not fair to them, and PennyForge can't use
  > that answer anyway."

- **Micro-tip under the field, small stone-500 text, always visible (not just on error):**
  > "If you're not sure it'll ring up at this price, jot that in the notes below instead of
  > asking someone at the register to check for you."

- **Near the evidence-strength field, reinforcing the receipt-first hierarchy without shaming
  lower tiers:**
  > "Got a receipt? That's the strongest proof and helps other shoppers trust it fastest. No
  > receipt yet? A shelf-tag photo or even a quick note still helps — post what you have."

- **A one-time, dismissible banner above the form (first-time reporters only), tying the mission
  back to compliance without sounding like legal boilerplate:**
  > "PennyForge only works because everyone here reports what they actually saw in person. No
  > lookups, no scraping, no asking staff to break their own store's rules — just what's in front
  > of you."

These all reinforce the same two things `CLAUDE.md` requires — first-hand-only sourcing and no
staff confrontation — as encouragement ("help other shoppers") rather than as a warning, so the
tone stays consistent with the rest of the product's trust-first framing.

### Friendlier 422 (compliance) messaging

Today, a 422 renders whatever `ComplianceError.message` the server threw, verbatim, in the same
red-700 slot used for every other error — e.g. for a blocked source type:

> `Blocked source type "SCRAPED_SITE". PennyForge only accepts first-hand, in-store,
> user-generated evidence — never scraped sites, private endpoints, competitor feeds, or
> automated tools.`

That message is technically accurate and already explains the allowlist reasoning (good — don't
lose that), but it reads like a system dump ("Blocked source type "X"") rather than product
copy, and it doesn't tell the user what to do next. Proposed client-side remapping — keep the
API contract and `lib/compliance.ts` untouched; just re-word the *display* of a 422 specifically
(400/404/409 can keep their existing messages, which already read fine):

- **Blocked source type** (`BLOCKED_SOURCE_TYPES`) →
  > "That source isn't something we can count — PennyForge only accepts what you personally saw
  > or verified in-store. Try 'Saw it in store' or 'Bought it (have receipt)' instead, and we'll
  > take it from there."
  >
  > Pair with auto-focusing the source-type `<select>` and, if feasible, resetting it to the
  > first allowed option so the very next tap is the fix, not a re-read of the whole form.

- **Unknown/malformed source type** →
  > "We didn't recognize that source. Pick the option that best matches how you found this —
  > every option in the dropdown is fine to use."

- **Price out of range** →
  > "That price doesn't look right — enter what you actually saw on the tag or receipt, between
  > a penny and $5,000."

- **Malformed evidence URL** →
  > "That link doesn't look valid — double check it, or just leave this field blank and add a
  > note instead."

The reframe in all four cases: replace "Blocked ___" / error-code language with "here's what we
need instead," and always pair the message with a concrete next action (which field to revisit,
what value would work) rather than leaving the user to re-parse the form. This still *teaches*
the allowlist — the user learns which source types are acceptable — without the copy sounding
like a violation notice.

---

## 7. Confirm/dead vote UI

### Purpose

Let any other shopper who visits the same store validate a lead with a single tap — confirming
it's still accurate, or marking it dead/gone — so confidence scores stay current without anyone
having to write a review or justify their vote. This is the community-trust loop that keeps
PennyForge's leads fresher than a static spreadsheet or a Discord thread that nobody prunes.
Today it's built as one embedded section on lead detail; this spec treats it as a *reusable UI
pattern* that should also live directly on the feed (see Future version).

### Main components

- `components/VoteButtons.tsx` ("use client") — takes a single `reportId` prop. Renders two
  buttons side by side:
  - **"✓ Still there"** — `bg-emerald-600` / hover `emerald-500`, sends `vote: "CONFIRMED"`.
  - **"✗ Dead / gone"** — `bg-red-600` / hover `red-500`, sends `vote: "DEAD"`.
  - Below the buttons, a single-line status message (`text-stone-600`) that appears after a vote
    resolves.
- Currently embedded only in `app/leads/[id]/page.tsx`, under the heading "Been to this store?"
  with framing copy: *"Confirm if it rang up at this price, or mark it dead if it's gone. Votes
  update the reporter's trust and can suppress dead leads. You can't vote on your own report."*

### User actions

- Tap **"✓ Still there"** or **"✗ Dead / gone"** — that's it. No confirmation dialog, no
  required comment, no multi-step flow.
- Tap the *other* button later to change a prior vote — `ReportVote` is one row per
  `(reportId, userId)` (`@@unique([reportId, userId])`), upserted on every vote, so switching is
  just another tap, not a "delete your vote first" flow.
- Buttons disable while a vote is in flight (`pending || submitting`) so a double-tap can't fire
  two requests.

### Data needed

- `reportId` (prop, already known by the page rendering the buttons).
- Current user via the `pf_user_id` cookie — required; unauthenticated votes are rejected.
- `POST /api/reports/[id]/vote` body `{vote: "CONFIRMED" | "DEAD"}`. Server-side, inside one
  `prisma.$transaction`: loads the report, rejects self-votes, upserts the `ReportVote`, applies
  a net trust delta to the reporter via a single atomic SQL `UPDATE ... SET trustScore =
  trustScore + delta` clamped to [0,100] (`voteTrustDelta` in `lib/scoring.ts`, chosen specifically
  so toggling a vote back and forth can't be used to inflate or crater someone's trust), recounts
  `confirms`/`deads`, and flips `status` to `SUPPRESSED` (saving `previousStatus` for later
  restoration) when `isSuppressed({confirms, deads})` is true.
- Response `{confirms, deads, suppressed}` drives the inline status message.

### Empty state

No votes yet: the lead detail header and `LeadCard` both already render `"✓ 0 · ✗ 0"` — a plain
zero-count rather than a "be the first to vote" prompt. Acceptable for MVP; a future version
could special-case zero-vote leads with something like "No one's confirmed this yet — be the
first" to invite the first vote, but this isn't a blocking gap.

### Error state

`VoteButtons` shows the resolved message in the same `text-stone-600` line used for success,
sourced from `POST /api/reports/[id]/vote` (`app/api/reports/[id]/vote/route.ts`):

| Status | Trigger | Message shown |
|---|---|---|
| 401 | no session | whatever `data?.error` is (`"No current user"`) — falls back to `"Vote failed"` if the body doesn't parse |
| 400 | `vote` not in `VOTE_TYPES` | `"vote must be one of CONFIRMED, DEAD"` |
| 404 | unknown `reportId` | `"Unknown report"` |
| 403 | voting on your own report | `"You can't vote on your own report"` |
| — | `fetch` throws (offline, DNS, etc.) | `"Network error — please try again."` |

The 403 self-vote block is itself a quiet trust/anti-gaming measure worth noting: it stops a
reporter from padding their own lead's confidence by confirming it themselves.

### MVP version (built)

Exactly as described: two buttons embedded in the lead detail page only. Voting requires
navigating into `/leads/[id]` first — there is currently **no way to vote directly from the feed
or search results**; `LeadCard` (`components/LeadCard.tsx`) wraps its entire contents in a
`<Link href="/leads/{id}">` with no vote affordance of its own. The interaction is a plain
`fetch` + `router.refresh()`, not truly optimistic — the button disables, waits for the server
response, then shows the result message and refreshes server data. That round trip is fast
against local SQLite, so it *feels* close to instant today, but it is not an optimistic update in
the strict sense (the UI doesn't flip state before the server confirms).

### Future version (post-MVP)

- **One-tap voting directly on `LeadCard` in the feed**, without opening the lead detail page —
  this is the single most important enhancement to spec here explicitly, since today's build
  requires a full navigation just to cast a vote. Proposed approach: add compact
  emerald/red icon-only buttons (✓ / ✗) into the metadata row of `LeadCard`, using
  `e.preventDefault()` / `e.stopPropagation()` on the button's click handler so the outer `<Link>`
  navigation doesn't also fire. Same `POST /api/reports/[id]/vote` call, same response handling.
- **True optimistic UI**: flip the tapped button's visual state and increment the local
  confirm/dead count immediately on tap, before the network response returns, then reconcile
  (or roll back with a brief "vote failed, reverted" toast) once the response lands. This matters
  more once voting lives in the feed, where a full `router.refresh()` per vote across a list of
  cards would feel heavier than it does on a single lead detail page.
- **A "be the first to confirm" nudge** on zero-vote leads (see Empty state above).

**The suppression cascade, explained in user-facing terms:** the underlying rule
(`isSuppressed` in `lib/scoring.ts`: `deads >= 2 && deads > confirms`) means once at least two
shoppers say a lead is gone *and* dead-votes outnumber confirmations, the lead is automatically
hidden from the feed, alerts, and route planner — no moderator has to step in. The vote route
preserves whatever status the report held right before suppression (`previousStatus`) and
restores it verbatim if confirms later catch back up, so an already-approved lead doesn't get
reset to a pending-review state just because it was briefly marked dead. This is the trust
mechanic worth surfacing in copy near the vote buttons or in a help tooltip, e.g.:

> "When a store consistently reports a find is gone, we automatically hide it so other shoppers
> don't waste a trip. If someone finds it again and confirms it, it comes right back."

That single sentence is the entire mental model a user needs — no mention of vote counts,
thresholds, or status enums required. It also reinforces "make dead-voting easy" from the other
direction: shoppers should feel that marking something dead is *useful* (it protects the next
person from a wasted trip), not that it's a punitive action against the original reporter.
