# PennyForge — Privacy Policy Outline

> **Not legal advice.** This is a practical risk framework and set of product guardrails, written
> for counsel to review before launch.

This document is a **skeleton for counsel to turn into the published privacy policy** — it is not
the policy itself and must not be published as-is. Every claim below is grounded in what the code
and schema actually do today (`prisma/schema.prisma`, `lib/currentUser.ts`,
`app/api/user/route.ts`), with Phase 1+ items explicitly marked **FUTURE** per the roadmap in
`docs/product-spec.md`. The design stance is data minimization: PennyForge collects only the
fields in the schema, and nothing speculative. This outline extends, and never contradicts, the
"Privacy constraints" section of `docs/compliance.md` and the Apple privacy-label mapping in
`docs/app-store-checklist.md` section 4.

## 1. Data we collect

Grounded field-by-field in `prisma/schema.prisma`. If a field is not in this table, PennyForge
does not collect it.

| Category | Field(s) / source | Collected today? | Notes |
|---|---|---|---|
| Account identifiers | `User.email`, `User.handle`, `User.id` (cuid) | Yes | Email is unique per account and never shown to other users. Handle is the public identity. |
| Session cookie | `pf_user_id` (set by `POST /api/user`, read by `lib/currentUser.ts`) | Yes | First-party, functional-only cookie holding the user's cuid. `httpOnly`, `sameSite=lax`, `secure` in production. Mock auth in the MVP; replaced by real auth sessions in Phase 1. |
| Role & reputation | `User.role`, `User.trustScore` | Yes (derived) | Trust score (0–100) is computed from report/vote history, not user-supplied. Role is USER / CAPTAIN / ADMIN. |
| Coarse home location | `User.homeZip`, `User.homeLat`, `User.homeLng` | Yes (optional) | **User-entered, not device GPS, in the MVP.** Used only for route-planner distance math (`lib/route.ts`); never displayed to other users (`docs/compliance.md`). Nullable — the account works without it. |
| Language preference | `User.locale` | Yes | `en` / `es`; no i18n UX is wired up yet. |
| User-generated reports | `Report`: `priceCents`, `dealType`, `evidenceType`, `evidenceUrl`, `sourceType`, `notes`, `reportDate`, `status` | Yes | The product's core content. `notes` is free text — users should be told not to include personal information in it. `evidenceUrl` is a placeholder URL string in the MVP (no file upload exists). |
| Votes | `ReportVote`: `vote` (CONFIRMED / DEAD), one per user per report | Yes | Community verification signal feeding `lib/scoring.ts`. |
| Alerts | `Alert`: `message`, `score`, `readAt`, recipient `userId` | Yes (derived) | In-app notification rows only; no push/email/SMS delivery exists in the MVP. |
| Route plans | `RoutePlan`: `name`, `stopsJson`, `totalScore` | Yes (derived) | `stopsJson` contains store stops and distances derived from the user's home location. |
| Derived scores | Trust score, per-lead confidence score (computed by `lib/scoring.ts`; snapshotted in `Alert.score`) | Yes (derived) | Computed from UGC and votes; not collected from the user. |
| Receipt / evidence photo uploads | Real file upload | **FUTURE — Phase 1** | Receipts can incidentally contain card fragments, loyalty IDs, and purchase patterns. Handling and redaction rules: `docs/compliance/receipt-photo-privacy.md`. Add to the published policy *before* the feature ships, not after. |
| OAuth / real-auth identity | Provider account ID, verified email | **FUTURE — Phase 1** | Real auth replaces the mock cookie switcher (`lib/currentUser.ts` swap point). May add a Contact Info row to the Apple privacy label per `docs/app-store-checklist.md` section 4. |
| Age attestation | Signup checkbox / birth-year gate | **FUTURE — Phase 1** | See Children section below. |

**Not collected, by design:** device GPS or background location, contacts, photos (MVP), payment
or card data, government IDs, browsing history, advertising identifiers, biometrics, precise
in-store movement. No analytics or crash-reporting SDK exists in the MVP
(`docs/product-spec.md` defers these); if one is ever added, this outline and the Apple privacy
label must be revised first.

## 2. How we use data (purposes)

| Purpose | What it uses | Where in code |
|---|---|---|
| Operate the service: feed, search, lead detail | Reports, votes, stores, products | `app/page.tsx`, `app/search/page.tsx` |
| Confidence scoring & freshness decay | Reports, votes, reporter trust score | `lib/scoring.ts` |
| Alerts | High-signal leads, recipient user ID | `lib/alerts.ts` |
| Route planning & ROI ranking | Home location, store locations, lead scores | `lib/route.ts` |
| Community trust & recognition | Trust score, handle, report/approval counts | `/leaderboard` |
| Moderation | Reports, reporter identity, roles | `/admin`, ADMIN/CAPTAIN gating |
| Fraud & abuse prevention | Vote patterns, duplicate-report keys, trust score | `lib/reports.ts` dedupe, dead-vote suppression |

State plainly in the published policy: **PennyForge does not sell personal data, does not broker
or license data to third parties, and does not track users across other apps or websites.** This
matches the "Data Used to Track You = No" posture in `docs/app-store-checklist.md` section 4 —
if that ever changes, both documents change together.

## 3. Sharing and disclosure

| Audience | What they see | What they never see |
|---|---|---|
| Other PennyForge users | Handle, trust score, reports (price, store, product, notes, evidence type), votes, leaderboard stats | **Email. Home location (ZIP or lat/lng). Alert inbox. Route plans.** Per `docs/compliance.md`, home location is used only for route math and is never displayed to other users. |
| Service providers | Hosting and database infrastructure only in the MVP (local SQLite today; hosted Postgres in Phase 1). **FUTURE:** Phase 1 adds a file-storage provider (evidence images) and an auth provider. | No analytics, ad, or marketing vendors exist. |
| Legal process | Data produced in response to valid legal process, subject to the legal-hold rules in `docs/compliance/data-retention.md` | — |
| Business transfer | Placeholder clause **for counsel**: data may transfer in a merger/acquisition/asset sale, with notice and continuity-of-policy commitments to be drafted by counsel. | — |

No "sale" or "sharing" of personal information in the CCPA/CPRA sense occurs; counsel should
confirm this characterization holds and draft the corresponding "we do not sell or share"
statement.

## 4. Cookies

| Cookie | Type | Purpose | Attributes |
|---|---|---|---|
| `pf_user_id` | First-party, functional | Identifies the signed-in account (`lib/currentUser.ts`) | `httpOnly`, `path=/`, `sameSite=lax`, `secure` in production (`app/api/user/route.ts`) |

That is the entire cookie inventory. No third-party cookies, no advertising cookies, no
cross-site tracking pixels. A functional-only first-party cookie generally does not require a
consent banner in the US; **for counsel:** revisit the consent-banner question only if analytics
or marketing tooling is ever added (currently deferred per `docs/product-spec.md`), or if
non-US markets (GDPR/ePrivacy) are entered.

## 5. Your rights

Offer to all users, regardless of state of residence, as an operational simplification (one code
path, no residency gating):

- **Access** — a copy of the account's data (User row, reports, votes, alerts, route plans).
- **Correction** — fix email, handle, home location, and report content the user authored.
- **Deletion** — full account deletion per the cascade and SLA in
  `docs/compliance/data-retention.md`.
- **Export** — machine-readable export (JSON is sufficient; every model above serializes
  trivially).

**For counsel:** map these against CCPA/CPRA and the Virginia/Colorado/Connecticut-style state
privacy laws. Each has revenue/volume applicability thresholds (e.g., CCPA's $25M revenue or
100k+ consumers) that the MVP is almost certainly under — but the product is designed as if
covered, so crossing a threshold later changes disclosures, not architecture. Counsel should
also specify the request-verification procedure (authenticated in-app action once Phase 1 real
auth lands; email confirmation loop before then) and the appeal mechanics some state laws
require.

## 6. Children

- PennyForge is for users **13 and older**. No knowing collection from children under 13
  (COPPA). No feature targets children.
- **FUTURE — Phase 1:** age attestation at signup is a real-auth requirement (the MVP's mock
  user switcher has no signup flow to attach it to). Until then this is a stated policy, not an
  enforced gate — counsel should confirm that posture is acceptable for any public launch.
- If an under-13 account is discovered, delete it promptly under the deletion cascade in
  `docs/compliance/data-retention.md`.

## 7. Security

- Transport encryption (HTTPS/TLS) for all traffic in any hosted deployment; the session cookie
  is `httpOnly` and `secure` in production.
- Access controls: moderation is gated to ADMIN/CAPTAIN roles; email and home location are never
  exposed through user-facing surfaces.
- **FUTURE — Phase 1:** evidence images must live behind auth-gated storage or signed URLs, never
  a publicly enumerable bucket (`docs/app-store-checklist.md` section 7).
- **For counsel:** state breach-notification obligations vary by state (timing, thresholds,
  AG-notice requirements). Draft the breach-response commitment and internal runbook before
  launch.

## 8. Retention

Retention periods, the account-deletion cascade, backup-window caveats, and legal-hold rules are
specified in `docs/compliance/data-retention.md`. The published policy should summarize that
schedule rather than restate it.

## 9. Contact, changes, and notice

- **Contact:** a monitored privacy contact (e.g., `privacy@` on a PennyForge-controlled domain)
  — placeholder for counsel; Apple also requires published developer contact info for UGC apps
  (Guideline 1.2, per `docs/app-store-checklist.md`).
- **Changes:** post the revised policy with an updated effective date; for material changes,
  provide in-app notice (and email once Phase 1 real auth makes email delivery meaningful)
  before the changes take effect.
- Keep prior versions archived so users and counsel can diff what changed.

## Counsel worklist (summary of "for counsel" items)

1. State-law applicability analysis (CCPA/CPRA, VA/CO/CT-style) and threshold monitoring.
2. Business-transfer clause drafting.
3. "No sale/share" characterization under CCPA/CPRA definitions.
4. Consent-banner analysis if analytics land or non-US markets open.
5. Rights-request verification and appeal procedure.
6. COPPA posture pre-Phase-1 (policy-only vs. enforced age gate).
7. State breach-notification matrix and response runbook.
