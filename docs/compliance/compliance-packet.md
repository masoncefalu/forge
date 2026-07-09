# PennyForge — Compressed Compliance Packet

> **Not legal advice.** This is a practical risk framework and set of product guardrails, written
> for counsel to review before launch.

Condensed reference for other agents/workstreams (e.g. downstream design, marketing, or mobile
work) that need the compliance posture without reading all eleven documents in
`docs/compliance/`. Each section links to its full source. If this packet and a full document ever
disagree, the full document wins — update this packet, not the other way around.

## Hard boundaries (never cross)

No scraping retailer/competitor sites · no private/undocumented retailer endpoints · no reverse
engineering retailer apps or POS/inventory tooling · no credentialed scraping of any site · no
competitor data ingestion · no automated checkout or purchase bots · no rate-limit bypass · no
"hidden exploit"/"glitch"/"loophole" framing anywhere (product, marketing, or support copy) · no
instructions for deceiving or confronting store employees. Enforced in code by
`assertSafeSource()` in `lib/compliance.ts` (allowlist, not denylist) and covered by
`tests/compliance.test.ts`. Full detail: `CLAUDE.md`, `docs/compliance.md`.

## Data sources — allowed vs. forbidden

**Allowed today (code allowlist, 4 enums):** `IN_STORE_OBSERVATION`, `RECEIPT_PURCHASE`,
`SHELF_TAG`, `STORE_FLYER_PUBLIC`.
**Allowed with conditions (policy layer, not yet built):** official retailer APIs under published
terms, licensed affiliate feeds, open-licensed public product metadata, ToS-explicit monitoring —
each requires archived terms + counsel sign-off + a new code enum before use.
**Forbidden, always:** scraped sites, private APIs, reverse-engineered systems, credentialed
scraping, competitor reposts, employee-internal-system data, automated bots, automated checkout,
rate-limit bypass, gray-market UPC/inventory databases of unclear provenance.
New source process: terms on file → counsel sign-off → add to `ALLOWED_SOURCE_TYPES` + tests →
document. Full detail: `docs/compliance/data-sources.md`.

## Top risks (highest severity first)

Community spillover (tag swapping, harassment) · home-location/receipt PII exposure · state
privacy statutes (CCPA/CPRA) + COPPA threshold crossing · CFAA/unauthorized-access claims (why the
allowlist keeps this Low) · retailer ToS claims · competitor-list IP claims · defamation in
free-text notes · retailer C&D/PR pressure despite full compliance · trademark/implied-affiliation
· app store rejection · UGC accuracy harms (mitigated by confidence scoring + dead-vote
suppression + disclaimers). Full detail: `docs/compliance/risk-matrix.md`.

## UGC policy essentials

Prohibited, immediate-ban tier: fraud instructions/advocacy (tag swapping, barcode tricks, price
tampering), doxxing, stolen-goods resale coordination. Standard ladder: warn → remove → suspend →
ban. Enforcement rides existing mechanisms: server-side 422 rejection, `PENDING`→
`APPROVED`/`REJECTED` moderation queue, dead-vote auto-suppression, trust-score consequences.
Two-person appeals path. Pre-launch counsel items: DMCA agent registration, § 230 posture,
UGC license grant, 13+ age gate. Full detail: `docs/compliance/ugc-policy.md`.

## Moderator safety essentials

ADMIN/CAPTAIN only. Never copy/share submission contents outside mod tooling. No front-running
pending deals (shop only after a report is `APPROVED`). No content edits — remove only. Never
direct users toward confrontation. Illegal-activity reports: reject from public view, retain the
record, escalate to ADMIN — no vigilante action. Moderation-audit table (moderator ID + reason) is
a flagged Phase 1 gap. CAPTAINs scope to their region (policy-only today). Full detail:
`docs/compliance/moderator-safety.md`.

## Trademarks & disclaimers essentials

Retailer names: plain text, descriptive/nominative use only — never logos, brand colors, or
implied endorsement. Required disclaimers: not-affiliated, price-accuracy, and be-kind-to-employees
ship today in the `app/layout.tsx` footer; store-discretion and YMMV copy are drafted but **not yet
shipped** anywhere — they still need to land on the lead-detail and report-submission surfaces.
User photos incidentally showing retailer marks are acceptable UGC but must never be lifted into
PennyForge's own marketing. Product images must be licensed/user-submitted, never hotlinked. Full
detail: `docs/compliance/trademarks-and-disclaimers.md`.

## Privacy & retention essentials

**Collected:** email, handle, optional home ZIP/lat-lng (user-entered, never device GPS in MVP,
never shown to other users), reports/votes/alerts/route plans, derived trust/confidence scores.
**Never collected:** device GPS, payment data, biometrics, browsing history, ad identifiers.
**Retention:** reports/votes kept while account active (community value); alerts purged 90–180
days; receipt originals (Phase 1+) purged 30–90 days post-verification, keeping only structured
price/date/store fields; backups rolling ~35 days (disclosed). **Deletion:** anonymize reports to
a per-account tombstone user (never a shared tombstone — breaks the `Report` unique constraint),
hard-delete votes/alerts/route plans, 30-day SLA. Full detail:
`docs/compliance/privacy-policy-outline.md`, `docs/compliance/data-retention.md`.

## Location privacy essentials

Home location is user-entered, server-side-only, used solely for route-planner distance math —
never rendered to another user. Standing rules: no "users near you," no location history, reports
attribute to a store not a person. Any future contributor-activity map must aggregate to
ZIP-centroid or coarser, jitter (500m–1km), enforce k≥5 anonymity, and time-bucket to day
granularity. Future device GPS: opt-in, coarse-by-default, purpose-limited, never stored as a
trail. Full detail: `docs/compliance/location-privacy.md`.

## Receipt & photo privacy essentials

Before Phase 1 file upload ships: mask card digits, cardholder name, loyalty numbers, receipt
barcodes/QR codes, and cashier names/IDs; store name/date/item/price stay visible. No identifiable
faces or employee name tags in any photo. Strip EXIF (GPS) server-side on ingest; originals in a
private bucket behind signed URLs; public pages serve only redacted derivatives. Phase 3 OCR:
extract only price/date/store/line-item, discard raw OCR text, no biometric processing. Full
detail: `docs/compliance/receipt-photo-privacy.md`.

## App store risk essentials

Two build gaps before any store submission: a dedicated report-abuse control (dead-vote ≠ abuse
report) and a block-user capability. Account deletion binds the moment Phase 1 real auth ships
(Apple 5.1.1(v)). Never use exploit/glitch/loophole language in listing copy — position as
community deal-sharing with receipt-verified proof. A bare Phase 4 webview shell risks Apple 4.2;
plan native value-add (camera scan, push, offline mode) before building it. Full detail:
`docs/compliance/app-store-risk.md` (complements `docs/app-store-checklist.md`).

## Ethical shopping essentials (community-facing)

Be kind to store employees; accept a declined sale politely and walk away. Shelf-only: no back
rooms, no opening sealed packaging, no destructive digging. Never swap/alter tags or barcodes —
that's fraud. Don't hide items for later; don't clear shelves of essentials (formula, medicine,
food staples). Reselling is welcome; reselling recalled goods is a CPSA violation. Full detail:
`docs/compliance/ethical-shopping.md`.

## Suite map

| Doc | Deliverable |
|---|---|
| `data-sources.md` | Allowed vs. forbidden data source table |
| `risk-matrix.md` | Compliance risk matrix |
| `ugc-policy.md` | User-generated content policy |
| `trademarks-and-disclaimers.md` | Retailer trademark/disclaimer guidance |
| `privacy-policy-outline.md` | Privacy policy outline |
| `data-retention.md` | Data retention suggestions |
| `location-privacy.md` | Location privacy and fuzzing plan |
| `receipt-photo-privacy.md` | Receipt/photo privacy rules |
| `moderator-safety.md` | Moderator safety rules |
| `app-store-risk.md` | App store risk notes |
| `ethical-shopping.md` | Ethical shopping guidelines |
| `compliance-packet.md` (this file) | Compressed packet for downstream agents |
