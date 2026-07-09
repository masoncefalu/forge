# PennyForge — User-Generated Content Policy

> **Not legal advice.** This is a practical risk framework and set of product guardrails, written for counsel to review before launch.

This policy extends the top-level compliance policy in `docs/compliance.md` and never overrides
it. The data-source allowlist enforced by `lib/compliance.ts` is the floor; this document covers
everything else a user can put into PennyForge. PennyForge surfaces community-reported clearance
prices found in stores. It does not teach, host, or tolerate techniques for manipulating retailer
systems, pricing, or staff.

## Scope: what counts as UGC

| UGC surface | Where it lives | Status |
|---|---|---|
| Reports (price, deal type, evidence type, source type) | `Report` model, `POST /api/reports` | MVP (built) |
| Free-text notes on a report | `Report.notes` | MVP (built) |
| Evidence URL | `Report.evidenceUrl` (placeholder link today) | MVP (built) |
| Evidence photos and receipt uploads | Phase 1 file upload per `docs/product-spec.md` roadmap | Phase 1+ |
| Confirm/dead votes | `ReportVote` model | MVP (built) |
| User handles | `User.handle` (visible on feed, lead detail, `/leaderboard`) | MVP (built) |
| New product entries (name, UPC/SKU, category) | `Product` model via report submission | MVP (built) |

Route plan names (`RoutePlan.name`) are visible only to their owner in the MVP but should be
treated as UGC the moment any sharing feature exists.

## Allowed content

Everything PennyForge accepts is **first-hand, in-store, user-generated evidence** — the four
allowlisted source types in `lib/compliance.ts` (`IN_STORE_OBSERVATION`, `RECEIPT_PURCHASE`,
`SHELF_TAG`, `STORE_FLYER_PUBLIC`). In practice:

- First-hand in-store finds: an item and price the reporter personally saw or bought.
- Receipt photos (Phase 1+), **redacted before display** per the sibling document
  `docs/compliance/receipt-photo-privacy.md` — payment details, loyalty numbers, and anything
  identifying the shopper or cashier must be handled as described there.
- Shelf-tag and clearance-sticker photos, and photos of public store-posted flyers/signage.
- Factual store, price, quantity, and availability notes ("aisle 12 endcap, 3 left, rang up
  $0.01 at self-checkout").

## Prohibited content

Anything below is removed regardless of which field it appears in (notes, handles, product names,
Phase 1 photo uploads). "Fraud instructions" and "doxxing" rows skip the enforcement ladder — see
the next section.

| Prohibited content | Rationale |
|---|---|
| Instructions or advocacy for tag swapping, barcode manipulation, or price-tag tampering | This is fraud/theft, not deal hunting. Advocating or explaining it is bannable, full stop. |
| Instructions for deceiving, pressuring, or confronting store employees | Product tone is "be kind to store employees" (`app/layout.tsx` footer). Confrontation content also creates physical-safety risk. |
| Photos of identifiable employees, customers, or bystanders | Privacy risk and (state-dependent) right-of-publicity/recording exposure — for counsel. Evidence photos must show the item/tag/receipt, not people. |
| Employee names, schedules, or any store-staff PII | Enables harassment of workers; zero product value. |
| Doxxing any person (users, employees, moderators) | Severe, targeted harm. Immediate ban. |
| Harassment, threats, or hateful content targeting protected classes | Community safety; standard platform baseline. |
| Content from forbidden data sources: scraped data, competitor list/feed reposts, private-API output, employee internal-system leaks | Hard boundary in `CLAUDE.md` and `docs/compliance.md`; enforced server-side by `assertSafeSource()` in `lib/compliance.ts`. |
| Spam, affiliate-link abuse, or off-platform sales funnels in notes/evidence URLs | Degrades trust, the product's core asset. |
| Coordination of stolen-goods resale | Illegal; also an ORC (organized retail crime) liability magnet — for counsel. |
| Deliberately false reports (data poisoning), including coordinated fake confirms | Attacks the confidence-score system directly (`lib/scoring.ts`); treated as bad-faith abuse, not a mistake. |

Honest mistakes — a mis-read tag, a deal that died an hour later — are **not** violations. The
confirm/dead vote loop and freshness decay exist precisely to handle good-faith staleness.

## Enforcement ladder

1. **Warn** — first minor offense (spam, off-topic notes). Documented privately.
2. **Content removal** — the report is moved to `REJECTED` via the moderation queue; the record
   is retained, not deleted (see `docs/compliance/moderator-safety.md` on evidence retention).
3. **Temporary suspension** — repeat offenses. *Phase 1 item:* the MVP schema has no account
   suspension field; add one (e.g. `User.status`) alongside real auth.
4. **Permanent ban** — sustained or severe abuse.

**Severity shortcuts:** fraud/theft instructions (tag swapping, barcode tricks, price tampering)
and doxxing skip straight to permanent ban on first offense. Stolen-goods resale coordination
likewise.

Enforcement is layered on mechanisms that already exist in the repo:

| Layer | Mechanism | Where |
|---|---|---|
| Pre-write rejection | Blocked/unknown source types, malformed prices, bad evidence URLs rejected with HTTP 422 before any DB write | `lib/compliance.ts` via `app/api/reports/route.ts` |
| Human review | Every report starts `PENDING`; moderators move it to `APPROVED` or `REJECTED` only (never `SUPPRESSED`, which is vote-driven) | `app/api/reports/[id]/moderate/route.ts`, `MODERATABLE_STATUSES` in `lib/constants.ts` |
| Community suppression | 2+ dead votes outnumbering confirms auto-hides a lead from feed, alerts, and route planner | `lib/scoring.ts#isSuppressed` |
| Reputation consequences | Dead votes cost the reporter trust (−3 each vs. +2 per confirm, clamped 0–100); trust feeds confidence scoring and moderator eligibility | `lib/scoring.ts` (`TRUST_DELTA`, `applyVoteChange`) |

## Appeals

Simple, documented, two-person path:

1. User contacts support (or the in-app report flow once Phase 1 auth lands) citing the removed
   content or sanction.
2. A **second moderator** — never the one who took the original action — reviews the content and
   the original decision. Appeals of bans and suspensions go to an ADMIN, not a CAPTAIN (see
   role scope in `docs/compliance/moderator-safety.md`).
3. The decision (upheld or reversed) is logged with reviewer, timestamp, and one-line reason.
   *Phase 1 item:* this log should live in the same moderation-audit table recommended in the
   moderator-safety doc.

## Notice-and-takedown (copyright)

- **Pre-launch task for counsel:** register a DMCA designated agent with the U.S. Copyright
  Office and publish the agent's contact info in the site footer/terms. Safe harbor under
  17 U.S.C. § 512 is unavailable without it.
- Copyright complaints about user-submitted photos (Phase 1+ uploads): on receipt of a compliant
  notice, expeditiously remove or disable access to the photo, notify the uploader, and accept
  counter-notices per the statutory process.
- Adopt and enforce a **repeat-infringer policy** (fold into the enforcement ladder above) —
  required to keep safe harbor.
- Shelf tags, store signage, and receipts are low-risk subjects, but user photos can incidentally
  capture copyrighted packaging art or in-store media; treat those as ordinary § 512 matters, not
  policy violations by the user.

## Legal posture notes for counsel

- **CDA Section 230.** PennyForge hosts third-party reports; it does not create price content.
  Moderation (the `PENDING → APPROVED/REJECTED` queue, dead-vote suppression, this policy) is
  classic "Good Samaritan" filtering under § 230(c)(2) and does not forfeit § 230(c)(1)
  protection. Confidence scoring and ranking of user reports (`lib/scoring.ts`) is presentation
  of third-party content, not authorship — but have counsel confirm current case law on
  algorithmic ranking before launch. State social-media moderation statutes (e.g. Texas and
  Florida) are a "for counsel" watch item, though PennyForge is likely below their user
  thresholds at launch.
- **User license grant.** Terms of service must include a non-exclusive, royalty-free, worldwide
  license from users to PennyForge for submitted content (reports, notes, photos), scoped to
  **operating and moderating the service** (in-product display, moderation, and content-policy
  enforcement) — not marketing or promotional reuse, consistent with the no-marketing-reuse rule
  in `docs/compliance/trademarks-and-disclaimers.md`. The user warrants they took the photo and it
  doesn't violate this policy. Users retain ownership.
- **Age gate (COPPA).** 13+ minimum age, asserted at signup when Phase 1 real auth lands
  (`lib/currentUser.ts` is the swap point). No under-13 data collection; no age-targeting.
- **No exploitation framing anywhere.** Marketing, UI copy, and community messaging must describe
  PennyForge as surfacing community-reported clearance prices. Never "hidden exploit," "glitch
  hunting," or "loophole" framing — that language misstates the product and invites both retailer
  hostility and liability theories the product does not deserve.
