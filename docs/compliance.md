# PennyForge — Compliance & Data Source Policy

This is a hard boundary, not a guideline. Enforcement lives in `lib/compliance.ts` and is covered
by `tests/compliance.test.ts`.

For the fuller compliance, legal, and privacy guardrail suite — risk matrix, UGC policy, retailer
trademark guidance, privacy policy outline, data retention, location and receipt/photo privacy,
moderator safety, app store risk, and ethical shopping guidelines — see
[`docs/compliance/`](./compliance/README.md).

## Allowed data sources (allowlist)

PennyForge accepts only **first-hand, in-store, user-generated evidence**:

| Source type | Meaning |
|---|---|
| `IN_STORE_OBSERVATION` | Shopper personally saw the item/price in store. |
| `RECEIPT_PURCHASE` | Shopper bought the item and has a receipt. |
| `SHELF_TAG` | Shopper photographed the shelf tag or clearance sticker. |
| `STORE_FLYER_PUBLIC` | Public, store-posted flyer or signage. |

## Forbidden data sources (explicitly blocked)

| Source type | Why it's blocked |
|---|---|
| `SCRAPED_SITE` | Scraping retailer or competitor websites — ToS and legal risk, and it's not the product's wedge. |
| `PRIVATE_API` | Calling undocumented/private retailer endpoints — access-control bypass risk. |
| `COMPETITOR_REPOST` | Reposting paid competitor feeds/lists — IP and ToS risk, plus it's lazy data, not verified data. |
| `AUTOMATED_TOOL` | Bot-generated inventory probes — same risk profile as scraping. |
| `EMPLOYEE_INTERNAL_SYSTEM` | Data pulled from internal retailer systems — likely violates employment agreements and retailer policy. |

**Design principle: allowlist, not denylist.** `assertSafeSource()` in `lib/compliance.ts` rejects
any source string that isn't explicitly on the allowed list — including source types nobody has
thought of yet. Do not change this to "block known-bad, allow everything else."

## User-generated content policy

- Every report requires a `sourceType` from the allowlist; submissions are rejected server-side
  (HTTP 422) before touching the database if the source type is missing, unknown, or blocked.
- Reports carry the reporting user's trust score into the confidence calculation — trust is
  earned through confirmed reports and lost through dead votes (`lib/scoring.ts`).
- The community itself polices freshness and accuracy via confirm/dead voting; 2+ dead votes
  outnumbering confirms auto-suppresses a lead from the feed, alerts, and route planner.
- Moderators (ADMIN/CAPTAIN roles) can approve or reject any pending report via `/admin`.
- Price sanity bounds (1¢–$5,000) and evidence-URL scheme validation (`http`/`https` only) guard
  against obviously malformed or malicious submissions.

## Disclaimers shown to users

The app footer (`app/layout.tsx`) states: prices and availability are community-reported, vary by
store, and change fast; nothing is guaranteed; PennyForge is not affiliated with any retailer; be
kind to store employees. Any production launch should carry this disclaimer on every page that
displays pricing, plus store-specific language noting individual store policy discretion (penny
and clearance handling is known to vary store-by-store and is not uniformly documented by any
retailer — see the market-research audit for what is/isn't publicly confirmed retailer policy).

## Privacy constraints

- User home location (`User.homeLat`/`homeLng`) is used only for route-planner distance
  calculations and is never displayed to other users in the MVP.
- Store locations are public business addresses, not personal data.
- No PII beyond email/handle is collected in the MVP schema.
- Future phases (see `docs/product-spec.md`) that add precise real-time location sharing must
  apply location fuzzing before ever showing a contributor's position to other users.

## What this repo will never do

Scrape retailer or competitor sites, call private/undocumented retailer APIs, ingest competitor
paid data feeds, reverse-engineer retailer inventory systems, or automate checkout/purchase flows.
If a future feature request implies any of these, stop and raise it rather than implementing a
workaround.
