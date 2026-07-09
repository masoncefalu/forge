# PennyForge — Competitive Displacement

This is deliverable 6–7 of the product strategy packet: why the two dominant incumbent patterns —
Discord-style deal groups and BrickSeek-style gray-data lookup — get *structurally* weaker as
PennyForge's loops mature, not just out-marketed. See [`positioning.md`](./positioning.md) for the
canonical line and [`differentiators.md`](./differentiators.md) for the full pillar breakdown; this
doc is scoped to head-to-head displacement mechanics only.

Every competitor-specific claim below is hedged per the README's own caveat: its competitive-
landscape table is partly reviewer-cited and explicitly unverified. Every PennyForge counter-claim
is grounded in a real file path or a named roadmap phase from `docs/product-spec.md`.

## Why Discord-style deal groups become less useful

Discord communities (`Deal Soldier` per the README's competitive-landscape table, plus countless
unaffiliated regional servers) are a real jobs-to-be-done fit today — real-time, low-friction,
zero-setup. The weaknesses below aren't a claim that chat is bad; they're a claim that chat's
plumbing (an unstructured, unscored, ephemeral message stream) caps how well it can ever serve
those jobs, and that fixing any one of them requires building the thing PennyForge already is.

| Structural weakness | Job Discord partially serves | PennyForge mechanic (file) | Why chat can't retrofit this |
|---|---|---|---|
| No persistent memory/search across scroll history | "Is this SKU still pennying near me?" | Queryable feed and UPC/SKU/name search against a real `Product` table (`app/page.tsx` → `lib/leads.ts#getFeedLeads`; `app/search/page.tsx` → `prisma.product.findMany`) | A bot that indexes every message into a queryable, filterable store *is* a database with a chat front-end — at that point it has rebuilt PennyForge's schema, not patched Discord. |
| No verification step — any claim is taken at face value | "Is this find real?" | Evidence-tier scoring (`lib/scoring.ts` `EVIDENCE_BASE`: receipt 45 > shelf-tag photo 32 > product photo 22 > text-only 10) enforced at submission by the compliance guardrail (`lib/compliance.ts#validateReportInput`, `assertSafeSource`) before any DB write | "Please attach a photo" is a norm, not an assertion. Without a persisted evidence-type field feeding a scoring function, there's no rejection path, no weighting, no audit trail — just a request people ignore. |
| No geo-ranking — a find posted in one server has no notion of "near me" | "Is this worth a trip from where I live?" | Feed filters scoped to state/store/retailer (`lib/leads.ts#getFeedLeads`) and haversine-distance route ranking against the user's home coordinates (`lib/route.ts#rankStores`, `lib/routePlanner.ts#getRankedStoresForUser`, `lib/geo.ts#haversineMiles`) | A "GA server" is a coarse regional bucket, not per-user distance math. Computing distance-weighted expected value against gas cost requires a coordinate system and a scoring pipeline — i.e., `lib/route.ts`. |
| No reputation carried across posts | "Can I trust this specific poster?" | Persisted trust score updated per confirm/dead vote (`lib/scoring.ts#applyTrustDelta`, `applyVoteChange`), feeding the confidence score's `trustBonus` and surfaced on `/leaderboard` (`app/leaderboard/page.tsx`) | "Known trusted regular" in a Discord server is a moderator's memory, not a persisted, portable number. Making it real requires a per-user ledger of outcomes tied into a formula — a trust graph, not a vibe. |
| Moderator burnout at scale | "Keep the channel free of spam/dead deals" | Automatic dead-deal suppression requires no moderator action (`lib/scoring.ts#isSuppressed`, below), plus a bounded, structured moderation queue (`app/admin/page.tsx` → `lib/leads.ts#getModerationQueue`, scoped to `PENDING`/`SUPPRESSED`/`REJECTED`) instead of an unbounded live stream | Auto-deleting flagged messages still requires a human watching a live firehose. A bounded work queue that the community has already triaged via voting is a different shape of work entirely — it needs the vote-and-score pipeline underneath it. |
| Signal decays to noise within hours | "Is this deal still live?" | Explicit, visible freshness decay with deal-type half-life, shown on every lead detail page (`app/leads/[id]/page.tsx` "why this lead scores X") | In chat, decay is real but invisible and unmanaged — a live find and a three-day-stale one are visually identical text, and the only "decay" is falling off-screen. A computed staleness indicator needs timestamped, structured records feeding a formula. |

```
isSuppressed = deads >= 2 && deads > confirms   // lib/scoring.ts
decayFactor  = 0.5 ^ (effectiveAgeDays / halfLifeDays)   // lib/scoring.ts
```

Framed as jobs-to-be-done: Discord currently serves "tell people fast," "feel like a community,"
and "get help right now" reasonably well, and still does (see "Where they still win today" below).
But "find this specific SKU again," "trust this specific claim," "is this worth the drive," "does
this poster have a track record," "keep the queue sane at 10x the members," and "know if this is
still true" are jobs Discord serves only by accident of members' goodwill — PennyForge's find →
verify → prove → rank → alert → route → reward loop serves each of them as a designed mechanic.

## Why BrickSeek-style gray-data lookup becomes less useful

BrickSeek-style tools (per the README's table: BrickSeek itself, `Endless`, and `Hidden
Clearances`/`RebelSavings`, which states outright that it queries "retailer pricing systems") win
on a real job: instant SKU/ZIP lookup with no community bootstrapping required. The README
explicitly flags BrickSeek's data-source status as **unverified whether licensed** — every claim
about their internals below is stated as a structural inference from the lookup-tool model, not a
confirmed fact about any named company.

| Structural weakness | PennyForge counter-mechanic (file) |
|---|---|
| Fragility — reportedly breaks whenever the source system changes, the exact reverse-engineering risk PennyForge avoids by design | Allowlist-only ingestion (`lib/compliance.ts`: `ALLOWED_SOURCE_TYPES` vs. `BLOCKED_SOURCE_TYPES`, `assertSafeSource` rejects anything not explicitly allowed, including source types nobody has thought of yet). There is no private endpoint to break because none is ever called. |
| Staleness — reportedly no real-time in-store ground truth, and structurally no mechanism to catch a dead deal once found | Confirm/dead voting with automatic suppression (`lib/scoring.ts#isSuppressed`) and continuous freshness decay (`scoreBreakdown`'s `decayFactor`, reset by a fresh confirmation) — staleness is measured and shown, not assumed away. |
| No community/trust layer — reportedly a raw number with no evidence and no reporter history | Full confidence breakdown on every lead ("why this lead scores X," `app/leads/[id]/page.tsx`) plus a persistent per-reporter trust score (`lib/scoring.ts`) and public leaderboard (`app/leaderboard/page.tsx`). A number alone can't explain itself; a scored report can. |
| Legal/ToS exposure for the tool operator — a risk profile that, by design, follows from depending on retailer-side systems the operator doesn't control | Allowlist model means the operator never depends on a retailer endpoint's continued goodwill (`lib/compliance.ts`); the README's own risk section states this plainly rather than assuming immunity: "we accept the compliance ceiling ... we're still standing after their C&D letters arrive" (a statement about PennyForge's own posture, not a claim about any competitor's legal exposure). |
| No local color — reportedly no store-specific nuance a human notices, and no route ROI math at all | Free-text notes carried on every report and rendered in the lead and moderation views (`lib/leads.ts` `LeadView.notes`, `app/leads/[id]/page.tsx`), plus the route planner's expected-value-minus-gas ranking (`lib/route.ts#rankStores`, `lib/routePlanner.ts`) — a capability no SKU-lookup tool has any reason to build, since it only answers "does a number exist," never "is the trip worth it." |

## Comparison

| Dimension | Discord-style | BrickSeek-style (gray-data lookup) | PennyForge |
|---|---|---|---|
| Memory/search | Ephemeral scroll history; manual channel search at best | Structured but shallow — a live number, no evidence trail per find | Persistent, filterable feed + UPC/SKU/name search (`lib/leads.ts`, `app/search/page.tsx`) |
| Verification | None structural; screenshots taken at face value | None; raw availability/price with no evidence tier | Evidence-hierarchy scoring enforced at submission (`lib/scoring.ts`, `lib/compliance.ts`) |
| Geo-ranking | Coarse (server/channel = region), no per-user distance | ZIP/store lookup, but no distance-cost-weighted ranking | State/store filters + haversine route ranking (`lib/leads.ts`, `lib/route.ts`, `lib/geo.ts`) |
| Reputation | Informal, held in moderators' memory, not portable | None — no reporter concept exists | Persisted trust score feeding the score formula and `/leaderboard` (`lib/scoring.ts`) |
| Freshness/decay | Invisible; decays only by scrolling off-screen | Reportedly point-in-time; no confirm/dead signal to catch dead deals | Explicit half-life decay + confirm/dead suppression, shown on every lead (`lib/scoring.ts`) |
| Legal/ToS risk | Low for the platform itself; unclear for servers running gray scan tooling (reportedly, per Deal Soldier's proprietary tools) | Reportedly high/unclear — dependent on retailer endpoints of unverified licensing status | Structurally low — allowlist-only ingestion never touches a retailer system (`lib/compliance.ts`) |
| Community | High energy, real-time, but unscored and non-persistent | Effectively none | Confirm/dead voting, notes, trust economy, leaderboard (`lib/scoring.ts`, `app/leaderboard/page.tsx`) |
| ROI/routing | None | None | Expected-value-minus-gas route ranking (`lib/route.ts`, `lib/routePlanner.ts`) |

## Where they still win today

Being honest about the current gap matters more than winning the comparison table on paper.

**Discord still wins on:**

- **Real-time human chatter/banter** — jokes, encouragement, "who's headed out tonight," instant
  back-and-forth. A scored-report schema doesn't want to become a chat client, and shouldn't.
- **Hyper-local tribal knowledge** — which specific cashier or store manager is lenient, unwritten
  store-by-store norms that never get written down as a structured field.

**BrickSeek-style lookup still wins on:**

- **Raw speed/coverage on already-known SKUs before any local PennyForge community exists.** A
  cold-started region has zero reports on day one; a lookup tool with retailer-side data (however
  it sourced it) has coverage immediately. This is a real cold-start disadvantage, not a strawman.

**Closing the gap, without crossing the hard boundaries:**

- PennyForge does not try to out-chat chat. Per the README's future-proofing decisions, "chat
  platforms are delivery only" — Discord and Telegram become outbound notification channels fed by
  PennyForge's own verified data, never an ingestion source. `docs/product-spec.md` Phase 2 lists
  "push notification delivery" as in scope; the README's parallel roadmap section names Discord
  webhook and Telegram bot as delivery channels specifically. This is outbound delivery, not
  competitor-data ingestion, so it does not cross the no-ingestion boundary.
- Hyper-local tribal knowledge is the job regional captains are built for. `docs/product-spec.md`
  Phase 2 ships "captain moderation tools": the highest-trust local contributors become the
  structured, persistent equivalent of a server's "trusted regular," and the free-text notes field
  already shipped on every report (`lib/leads.ts` `LeadView.notes`) carries exactly this kind of
  color today, just attached to a verified report instead of floating in chat. `docs/product-spec.md`
  Phase 3's fraud-detection hardening protects this local trust layer as a region scales past the
  size where a captain personally knows every contributor — which is exactly where Discord-style
  mod burnout sets in.
- Cold-start SKU coverage is what bounty missions are for: `docs/product-spec.md` Phase 2 lists
  "bounty missions for stale high-value leads," directly incentivizing contributors to fill the
  coverage gaps a newly-launched region has on day one, using first-hand in-store reports — not a
  licensed or scraped data backfill. The README's separate roadmap section additionally plans
  affiliate catalog enrichment (product names/images/MSRP via Impact and official retailer APIs,
  never scraped) to seed product metadata ahead of report density; that closes "do we even know
  this SKU exists" faster without touching a retailer's private systems.
