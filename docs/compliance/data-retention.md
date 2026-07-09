# PennyForge — Data Retention Suggestions

> **Not legal advice.** This is a practical risk framework and set of product guardrails, written
> for counsel to review before launch.

Suggested retention schedule and deletion mechanics for PennyForge, grounded in the actual models
in `prisma/schema.prisma`. Nothing here is enforced in code yet — the MVP has no retention jobs —
so treat this as the design stance the Phase 1 build (real auth, file upload, Postgres per
`docs/product-spec.md`) implements. The guiding principle matches the rest of the compliance
suite: keep what the community product needs, delete what it doesn't, and never keep personal
data merely because it might be useful someday.

## 1. Retention schedule

| Data class | Where it lives (model/field) | Suggested retention | Rationale |
|---|---|---|---|
| Reports | `Report` (price, deal/evidence/source type, `notes`, `evidenceUrl`, status, `reportDate`) | Keep while account active | Community lead history **is** the product. Stale leads are handled by freshness decay and dead-vote suppression in `lib/scoring.ts` — scoring, not deletion, is the staleness mechanism. On account deletion see the cascade below. |
| Votes | `ReportVote` | Keep while account active | Confirm/dead votes are the trust signal behind every confidence score. Hard-deleted on account deletion (see cascade). |
| Alerts | `Alert` (`readAt` distinguishes read/unread) | Purge read alerts after **90 days**; unread after **180 days** | Alerts are notifications, not records. `Alert.score` is a point-in-time snapshot; nothing else references alert rows, so purging them loses no community value. |
| Route plans | `RoutePlan` (`stopsJson`, `totalScore`) | User-deletable at any time; otherwise keep while account active | Personal convenience data. `stopsJson` embeds distances derived from home location, so it is personal data and must go with the account. |
| Evidence URLs (MVP) | `Report.evidenceUrl` (placeholder string; no real upload exists) | Retained with the report | A URL string the user typed; carries the report's retention. |
| Receipt / evidence images (**Phase 1+**) | Future file storage (no model yet) | Purge originals after a verification window of **30–90 days**; keep only the derived price/date/store facts, which are already structured `Report` columns | Receipts can contain card fragments, loyalty IDs, and purchase patterns. Once a report is verified, the image has served its purpose. Redaction and access rules: `docs/compliance/receipt-photo-privacy.md`. |
| Home location | `User.homeZip`, `User.homeLat`, `User.homeLng` | Keep while account active; user-clearable anytime (fields are nullable); deleted on account deletion | Used only for route-planner math (`docs/compliance.md`); never shown to other users; no reason to survive the account. |
| Account identifiers | `User.email`, `User.handle`, `User.id` | Keep while account active; removed/anonymized on deletion per the cascade | — |
| Server logs | Hosting/app logs (no logging pipeline exists in the MVP) | **30–90 days** (suggest 30 default, 90 max where a security investigation is open) | Debugging and abuse investigation need weeks, not years. Logs may contain IPs and user IDs, so they are in scope for deletion requests where feasible. |
| Backups | Database backups (Phase 1 hosted Postgres) | Rolling window, e.g. **35 days** | **Deleted data persists in backups until the window expires** — the privacy policy must disclose this (see `docs/compliance/privacy-policy-outline.md` §8). Do not restore deleted accounts from backup; if a restore is ever required, re-run pending deletions afterward. |

## 2. Account deletion cascade

The actual relations in `prisma/schema.prisma`:

- `User` → `Report` (`Report.userId`), `ReportVote` (`ReportVote.userId`), `Alert`
  (`Alert.userId`, the recipient), `RoutePlan` (`RoutePlan.userId`).
- `Report` → `ReportVote` (`ReportVote.reportId`) and `Alert` (`Alert.reportId`, nullable) — so
  other users' votes and alerts hang off a deleted user's reports.

**The schema defines no `onDelete` referential actions**, and Prisma's default for required
relations is restrict — a bare `prisma.user.delete()` fails while any dependent row exists.
Deletion today must be an explicit application-layer transaction in the order below. Defining
deliberate `onDelete` behavior is a **Phase 1 work item** to land with the Postgres migration
(choose explicit actions; do not blanket-cascade, because cascading `Report` deletes would rip
out other users' votes and alert provenance).

### Recommended: anonymize reports, hard-delete the rest

Two options for a deleted user's reports:

- **Hard-delete reports** — cleanest for privacy, but it silently degrades the lead history other
  users rely on: confidence scores lose their evidence base, other users' `ReportVote` rows and
  `Alert.reportId` references dangle or vanish, and the feed's past-find record erodes with every
  churned account.
- **Anonymize reports (recommended)** — reassign each report to a tombstone "deleted user" and
  strip the personal fields. Community value (price, store, product, date, votes by others)
  survives; the person is gone.

Recommended transaction, in order:

1. Hard-delete the user's `ReportVote` rows (votes carry no community content beyond the tally;
   affected reports' confirm/dead counts recompute on next scoring pass). Each of those votes
   already applied a trust-score delta to the report's reporter at cast time
   (`app/api/reports/[id]/vote/route.ts`); hard-deleting the vote rows alone does **not** reverse
   that delta. The cascade must also reverse or recompute the affected reporters' `User.trustScore`
   so a surviving reporter's trust isn't left permanently inflated or deflated by a since-deleted
   user's votes.
2. Hard-delete the user's `Alert` rows (their inbox) and `RoutePlan` rows (contain
   home-location-derived data).
3. Reassign the user's `Report` rows to a tombstone user, and scrub `Report.notes` on every
   reassigned report as a standard part of this step, not an opt-in extra. `Report.notes` is free
   text rendered on the public lead detail page (`app/leads/[id]/page.tsx`) and commonly contains
   self-identifying info (name, phone, email, "my neighbor works here," etc.); leaving it attached
   to a tombstoned report indefinitely would defeat the point of anonymizing the account.
4. Delete or blank the original `User` row: email, handle, homeZip/homeLat/homeLng removed;
   trust score not carried over.

Implementation notes:

- **One tombstone per deleted account, not one shared tombstone.** The composite unique
  `@@unique([productId, storeId, userId, reportDate])` on `Report` means reassigning two deleted
  users' same-product/same-store/same-day reports to a single shared tombstone violates the
  constraint. Mint a fresh anonymized `User` row per deletion (placeholder email/handle derived
  from a new cuid — both columns are `@unique` and required), flagged so it can never log in and
  is rendered as "deleted user" in the UI.
- Tombstone rows should carry a neutral default trust score so `lib/scoring.ts` neither boosts
  nor tanks surviving reports on the reporter-trust factor; a small one-time score shift on those
  leads is acceptable and honest.
- Once Phase 1 file upload exists, evidence images belonging to the deleted user's reports are
  deleted with step 3 regardless of the verification window in §1.

## 3. Legal hold exception

The entire schedule above **suspends** for any data subject to a litigation hold or
law-enforcement process: do not purge, anonymize, or deletion-cascade held data until the hold is
released. Track holds explicitly (who imposed, scope, date), resume the normal schedule on
release, and disclose the exception in the published privacy policy ("we may retain data longer
where required by law"). **For counsel:** define the intake and release procedure for holds
before launch.

## 4. Deletion SLA

- Complete verified deletion requests within **30 days** of verification (authenticated in-app
  request once Phase 1 real auth lands; email confirmation loop while the mock
  `pf_user_id`-cookie auth of `lib/currentUser.ts` is still in place — nobody should be able to
  delete an account from a switchable mock session without out-of-band confirmation).
- Backups are exempt during the rolling window in §1 and age out naturally — say so in the
  confirmation message to the user.
- Apple requires an **in-app account deletion path** for apps with account creation (Guideline
  5.1.1(v)) — see `docs/compliance/app-store-risk.md`. The cascade in §2 is the backend that
  in-app affordance calls; build them together in Phase 1.
