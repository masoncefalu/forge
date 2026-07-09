# PennyForge — Moderator Safety Rules

> **Not legal advice.** This is a practical risk framework and set of product guardrails, written for counsel to review before launch.

These rules bind everyone holding the `ADMIN` or `CAPTAIN` role (`ROLES` in `lib/constants.ts`).
Moderation happens in the `/admin` queue (`app/admin/page.tsx`) and lands on
`POST /api/reports/[id]/moderate`, which returns 403 to anyone without one of those roles.
Moderators enforce the content rules in `docs/compliance/ugc-policy.md`; this document is about
how they do it safely — for users, for store employees, and for themselves.

## PII exposure rules

`PENDING` reports are already visible in the public feed, search, and route planner the moment
they're submitted (`lib/leads.ts`) — moderation is not a pre-publication gate for report text,
prices, or the placeholder `evidenceUrl` link. What moderators do see first is **evidence media
before Phase 1 redaction**: once real file upload ships, receipt and evidence photos pass through
the moderation queue before redaction review (`docs/compliance/receipt-photo-privacy.md`). That is
where moderators are the people most likely to see payment fragments, loyalty numbers, names, or
faces before anyone else does.

- Never copy, screenshot, download, or share submission contents outside the moderation tooling.
  Not to personal devices, not to Discord, not to other moderators via DM — discussion of a
  submission happens in mod channels by report ID, not by pasted content.
- If a submission contains PII that redaction should have caught (or that predates redaction
  tooling), reject it from public view and report it to an ADMIN for purge per the
  receipt-photo-privacy doc. Do not describe the PII itself when escalating; the report ID is
  enough.
- Moderator accounts are personal. No shared logins, no lending a `CAPTAIN` session to a friend.

## Prohibited moderator behavior

| Prohibited | Concretely |
|---|---|
| Doxxing | Never reveal a user's identity, location pattern, or store haunts — and never reveal store employees' identities. This is an immediate-removal offense for moderators, same as for users. |
| **Front-running deals** | `PENDING` reports are already visible in the public feed, search, and route planner the instant they're submitted (`lib/leads.ts`) — the moderation queue is not a private preview. The residual conflict is queue *access*, not visibility: a moderator scanning `/admin` can notice a fresh pending lead before it surfaces prominently to an ordinary feed browser. Rule: a moderator may not use queue access to act on a lead materially faster than an ordinary user could, and may not delay approval or reject a valid report to reduce competition for a lead they intend to act on themselves. Moderate on the merits, shop like everyone else. |
| Editing user content | Moderators remove; they never rewrite. The moderation endpoint enforces this today — `app/api/reports/[id]/moderate/route.ts` accepts only a status change to `APPROVED` or `REJECTED` (`MODERATABLE_STATUSES`), with no content-edit path. Keep it that way; a moderator who "fixes" a report becomes its author, which is bad for both trust and the Section 230 posture noted in the UGC policy. |
| Retaliation via rejection | Rejecting reports because of who submitted them (a rival hunter, someone who argued with you) rather than what they contain. Rejections must be grounded in the UGC policy or evidence quality. |
| Vote manipulation | Moderators may vote as ordinary users, but never coordinate votes to suppress or boost a lead (`lib/scoring.ts#isSuppressed` is a community signal, not a mod tool). |

Note the endpoint also refuses to `APPROVE` a community-suppressed report (2+ dead votes
outnumbering confirms) — moderators cannot override dead-vote suppression, by design.

## Physical-safety guidance

Penny and clearance handling varies store-by-store, and some stores refuse penny sales. That is
the store's call. Moderators must never direct or encourage a user to:

- Confront, argue with, or pressure store staff about a price.
- Demand an item be re-rung, or coach phrasing to get past a refusal.
- Return to a store that refused a sale to "try a different cashier" or a different register.

When a community post suggests confrontation, remove or reject it per the UGC policy and respond
with de-escalating language. Templates:

> "Removing this one — store staff decide what they sell, and PennyForge doesn't coach anyone
> past a refusal. If a store says no, mark the lead dead so others don't waste the trip."

> "Reminder from the footer: be kind to store employees. They don't set clearance policy and
> they're not the obstacle — a refused sale just means this store's answer is no."

## Illegal-activity handling

Reports describing theft, tag swapping, barcode tricks, price-tag tampering, or resale of stolen
goods:

1. **Remove from public view** — reject via the moderation queue. Do **not** delete the
   underlying row: `REJECTED` retains the record (reporter, timestamps, content) while keeping it
   out of the feed, route planner, and *future* alert fan-out for this report (all three filter to
   `PENDING`/`APPROVED`). Retention matters if law enforcement or a retailer later sends a lawful
   request.
   **Gap:** alert fan-out happens immediately at submission time, before any moderator sees the
   report (`app/api/reports/route.ts`), and `/alerts` loads a recipient's inbox by `userId` only —
   it does not check the linked report's current status (`app/alerts/page.tsx`). Rejecting a
   report does **not** retract `Alert` rows already sent to nearby users for illegal-activity or
   PII content; there is no recall mechanism today. Treat this as a reason to triage fast, not a
   reason rejection alone is sufficient protection.
2. **Document** — log the report ID, what it described, and the action taken in the mod channel.
3. **Escalate to an ADMIN** when: the content is fraud *instructions or advocacy* (immediate-ban
   territory per the UGC policy), the same user has done it before, it suggests organized
   activity across users or stores, or anything looks like it may warrant preservation for a
   legal request.
4. **No vigilante action.** Moderators do not contact retailers, stores, or law enforcement
   themselves, do not investigate users off-platform, and do not warn stores about users. ADMINs
   own all external contact, with counsel.

## Audit trail

What exists today in `POST /api/reports/[id]/moderate` (`app/api/reports/[id]/moderate/route.ts`):
role gating (403 for non-`ADMIN`/`CAPTAIN`), status restricted to `APPROVED`/`REJECTED`, and a
guard against approving suppressed reports. What it does **not** record: which moderator acted,
when, or why — the handler updates `Report.status` and returns.

**Phase 1 hardening item:** add a `ModerationAction` table written in the same transaction as the
status update, capturing moderator ID, report ID, previous status, new status, timestamp, and a
short reason string. This is the backbone for the appeals log (see the UGC policy), for detecting
retaliation and front-running patterns, and for answering "who approved this?" when a report goes
wrong. Until it exists, moderators self-log removals of illegal-activity content in the mod
channel as described above.

## Moderator wellbeing

- **Rotation:** no moderator should be the sole reviewer of a high-volume queue for extended
  stretches; rotate coverage so exposure to abusive or disturbing content is shared and capped.
- **Escalation for abuse:** a user targeting a moderator (harassment, threats, doxxing attempts)
  is escalated straight to an ADMIN and handled under the UGC policy's severity shortcuts —
  moderators do not have to absorb abuse to keep the queue moving, and never handle their own
  harasser's content.
- **Anonymity by default:** moderation actions are not publicly attributed. Nothing in the app
  today shows which moderator approved or rejected a report — keep it that way. Moderators'
  ordinary user activity (reports, leaderboard) stays under their handle; their moderation
  activity does not.

## Scope limits

| Role | Scope |
|---|---|
| `CAPTAIN` | Moderates their **own region's** queue only (persona 5 in `docs/product-spec.md`: "high-trust users who moderate their area's queue"). Approve/reject within region; escalate everything heavier. |
| `ADMIN` | Full queue. Sole authority for: appeals (second-reviewer role per the UGC policy), suspensions and bans, PII purges, and legal/law-enforcement requests. |

**MVP gap to note:** region scoping is policy-only today — `app/admin/page.tsx` shows the full
queue to any `CAPTAIN` or `ADMIN`, and the moderate endpoint does not check the report's store
region against the captain. Enforced regional gating belongs to the Phase 2 "captain moderation
tools" roadmap item; until then, captains follow the scope rule on the honor system and admins
watch for out-of-region actions.
