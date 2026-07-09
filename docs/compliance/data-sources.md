# PennyForge — Data Source Policy: Allowed vs. Forbidden Sources

> **Not legal advice.** This is a practical risk framework and set of product guardrails, written for counsel to review before launch.

This is the canonical, exhaustive data-source policy for PennyForge. It extends (and never
contradicts) the top-level policy in `docs/compliance.md`. If a source is not listed here as
Allowed or Allowed with conditions, it is forbidden by default — the same allowlist-not-denylist
principle that `assertSafeSource()` in `lib/compliance.ts` enforces in code.

## The two-layer model: policy allowlist vs. code allowlist

PennyForge's source policy has two deliberately different layers:

1. **Policy layer (this document).** The full set of sources the business is *willing* to accept,
   including several that are conditionally allowed but not yet built (official retailer APIs,
   licensed affiliate feeds, open-licensed product metadata).
2. **Code layer (`lib/compliance.ts`).** The set of sources the running product *actually*
   accepts today. The MVP implements exactly four enum values in `ALLOWED_SOURCE_TYPES` — all
   first-hand, in-store, user-generated evidence. Anything else, including sources this policy
   conditionally allows, is rejected server-side (HTTP 422) before any database write, and that
   behavior is covered by `tests/compliance.test.ts`.

The policy layer is **broader** than the code layer on purpose. A source being "Allowed with
conditions" below does **not** mean the product may ingest it today. Any new source type must be
deliberately added to `ALLOWED_SOURCE_TYPES` with counsel sign-off, following the process at the
end of this document. The default-deny posture means forgetting to update the code can never
accidentally open a source; it can only keep one closed.

## Master source table

| Source | Policy status | Conditions or reason | Enforcement layer |
|---|---|---|---|
| First-hand in-store observation reports | Allowed | Reporter personally saw the item/price in a store they visited as an ordinary shopper. | Code allowlist (`IN_STORE_OBSERVATION`) |
| User-submitted receipts | Allowed with conditions | Reporter's own purchase, their own receipt. Phase 1 file upload must strip/redact receipt PII (card digits, loyalty IDs) before display — see `docs/compliance/receipt-photo-privacy.md`. | Code allowlist (`RECEIPT_PURCHASE`); upload handling is Phase 1 |
| User-submitted shelf-tag photos | Allowed with conditions | Photo taken personally, of customer-facing shelf tags/clearance stickers only — never back-room, employee-only, or POS screens (that is `EMPLOYEE_INTERNAL_SYSTEM`, forbidden). | Code allowlist (`SHELF_TAG`) |
| Public store flyers / posted signage | Allowed | Store-published, customer-facing material. | Code allowlist (`STORE_FLYER_PUBLIC`) |
| Community confirmations (CONFIRMED votes) | Allowed | Voter personally re-verified the lead in store. One vote per user per report (`ReportVote` unique constraint in `prisma/schema.prisma`). | Policy + schema constraint |
| Dead-deal votes (DEAD) | Allowed | First-hand "no longer there" signal; 2+ dead votes outnumbering confirms auto-suppresses the lead (`lib/scoring.ts`). | Policy + schema constraint |
| Manually curated lists (staff/captain curated) | Allowed with conditions | Must be assembled exclusively from allowlisted first-hand reports already in the system, with provenance recorded per item. Curation must never be used to launder competitor lists or scraped data into the feed. | Manual review (ADMIN/CAPTAIN moderation via `/admin`) + policy |
| User-entered UPC / SKU / product URLs | Allowed with conditions | Manual entry by the user only. Evidence URLs are scheme-validated (`http`/`https`) by `validateReportInput()` in `lib/compliance.ts`. PennyForge stores the URL as a pointer; it must never automatically fetch, crawl, or scrape the target. | Code (URL validation) + policy (no automated fetch) |
| Official retailer APIs (where offered) | Allowed with conditions | Only under the retailer's published developer terms, reviewed by counsel; our own registered credentials; published rate limits respected; terms archived on file. No enum exists yet — future per the process below. | N/A — future; counsel sign-off required before an enum is added |
| Licensed affiliate feeds | Allowed with conditions | Signed license/affiliate agreement on file; attribution and usage per contract; feed data clearly labeled as retailer-provided, not community-verified. | N/A — future; counsel sign-off required before an enum is added |
| Public product metadata (open-licensed catalogs) | Allowed with conditions | Metadata only (names, images, category, MSRP — cf. `Product` in `prisma/schema.prisma`), never price/inventory claims; license explicitly permits commercial use; license and provenance on file. | N/A — future; counsel sign-off required before an enum is added |
| ToS-compliant monitoring, only where explicitly allowed | Allowed with conditions | Only where a site's published terms *explicitly* permit programmatic access for this use; counsel confirms in writing; robots directives and rate limits respected. Silence or ambiguity in terms means **forbidden** — this row is not a scraping backdoor. | N/A — future; counsel sign-off required before an enum is added |
| Scraping retailer or competitor sites | Forbidden | ToS breach and legal exposure; contradicts the product wedge (trust and proof, not data volume). | Code (`SCRAPED_SITE` blocked) + default-deny |
| Private/undocumented retailer endpoints | Forbidden | Unauthorized-access exposure; no published terms authorize the access. | Code (`PRIVATE_API` blocked) + default-deny |
| Reverse-engineered retailer apps or POS/inventory tooling | Forbidden | Same exposure as private endpoints, plus DMCA/anti-circumvention concerns. Output of reverse engineering has no allowlisted enum and is rejected. | Policy + default-deny (unknown source strings rejected by `assertSafeSource()`) |
| Credentialed scraping (logged-in scraping of any site) | Forbidden | Authenticating and then scraping aggravates ToS and unauthorized-access exposure; forbidden against every site, not just retailers. | Policy + default-deny |
| Competitor paid feed/list reposts | Forbidden | IP and contract risk; also unverified data that undermines the trust model. | Code (`COMPETITOR_REPOST` blocked) + default-deny |
| Employee-sourced internal system data | Forbidden | Likely breaches employment agreements and retailer policy; exposes the employee and PennyForge. Includes photos of POS/inventory screens. | Code (`EMPLOYEE_INTERNAL_SYSTEM` blocked) + default-deny |
| Automated inventory probes / bots | Forbidden | Same risk profile as scraping regardless of transport (app automation, headless browsers, request replay). | Code (`AUTOMATED_TOOL` blocked) + default-deny |
| Automated checkout / purchase bots | Forbidden | Hard boundary in `CLAUDE.md`; PennyForge surfaces community-reported prices, it never transacts. No such feature exists or will be built. | Policy (no feature surface exists) |
| Rate-limit bypass of any service | Forbidden | Bypassing published limits (rotating IPs/keys, header spoofing, throttle evasion) converts permitted access into unauthorized access. Applies to every service PennyForge touches, including future official APIs. | Policy |
| Gray-market UPC/inventory lookup databases of unclear provenance | Forbidden | Provenance cannot be established, so the licensing condition above can never be satisfied; commonly derived from scraped or leaked internal data. | Policy + default-deny |

## Mapping policy sources to code enums

`lib/compliance.ts` is the single point of enforcement. Its current state:

| Enum value | Status | Policy row |
|---|---|---|
| `IN_STORE_OBSERVATION` | Implemented (allowed) | First-hand in-store observation reports |
| `RECEIPT_PURCHASE` | Implemented (allowed) | User-submitted receipts |
| `SHELF_TAG` | Implemented (allowed) | User-submitted shelf-tag photos |
| `STORE_FLYER_PUBLIC` | Implemented (allowed) | Public store flyers / posted signage |
| `SCRAPED_SITE` | Implemented (blocked with specific error) | Scraping retailer or competitor sites |
| `PRIVATE_API` | Implemented (blocked with specific error) | Private/undocumented retailer endpoints |
| `COMPETITOR_REPOST` | Implemented (blocked with specific error) | Competitor paid feed/list reposts |
| `AUTOMATED_TOOL` | Implemented (blocked with specific error) | Automated inventory probes / bots |
| `EMPLOYEE_INTERNAL_SYSTEM` | Implemented (blocked with specific error) | Employee-sourced internal system data |

Notes on the mapping:

- Community confirmations and dead votes are not source enums; they are `ReportVote` rows attached
  to an already-allowlisted report, so they inherit its provenance.
- Manually curated lists and user-entered UPC/SKU/URLs are workflows over allowlisted data, not new
  ingestion paths, so they need no enum — but they remain subject to the conditions in the master
  table.
- The four "Allowed with conditions — future" rows (official retailer APIs, licensed affiliate
  feeds, open-licensed product metadata, explicitly-permitted ToS-compliant monitoring) have **no
  enum value** today. Preconditions before any of them may be added:
  - Official retailer API: developer terms archived on file, counsel written sign-off that the
    intended use fits those terms, credentials registered to PennyForge, rate-limit handling built.
  - Licensed affiliate feed: executed license on file, counsel sign-off, contractual attribution
    implemented, feed data visually distinguished from community-verified reports.
  - Public product metadata: license text on file, counsel confirmation it permits commercial use,
    scope limited to `Product`-table metadata (never price/availability claims).
  - ToS-compliant monitoring: written counsel confirmation that the specific site's terms
    explicitly allow it; anything less stays forbidden.

## How to propose a new source type

Every step is required, in order. No shortcuts, no "temporary" enum values.

1. **License/terms on file.** Archive the exact published terms, license, or contract that
   authorizes the source, with a retrieval date.
2. **Counsel review.** Counsel reviews the archived terms against the intended use and signs off
   in writing. If counsel declines, the proposal ends here.
3. **Code + tests.** Add the value to `ALLOWED_SOURCE_TYPES` in `lib/compliance.ts` (with a
   `SOURCE_LABELS` entry) and extend `tests/compliance.test.ts` to cover it. Never weaken
   `assertSafeSource()`'s default-deny behavior or remove entries from `BLOCKED_SOURCE_TYPES`.
4. **Document here.** Move the source's row in the master table from "N/A — future" to the code
   allowlist, and record the sign-off date and where the terms are archived.

Removing a source (e.g., a retailer changes its API terms) follows the same path in reverse:
document first, remove the enum and tests, then archive the reason.
