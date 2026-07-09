# PennyForge — Compliance, Legal & Privacy Guardrails Suite

> **Not legal advice.** This is a practical risk framework and set of product guardrails, written
> for counsel to review before launch.

This directory is the detailed compliance suite that extends the top-level policy in
`../compliance.md` (data-source allowlist enforced by `lib/compliance.ts`). Start with
`compliance-packet.md` for a compressed overview, or go straight to the document you need:

| Document | Covers |
|---|---|
| [`compliance-packet.md`](./compliance-packet.md) | Compressed summary of the whole suite |
| [`data-sources.md`](./data-sources.md) | Allowed vs. forbidden data source table, code/policy mapping, new-source process |
| [`risk-matrix.md`](./risk-matrix.md) | Legal/privacy/reputational risk matrix with mitigations |
| [`ugc-policy.md`](./ugc-policy.md) | User-generated content policy, enforcement ladder, appeals, DMCA |
| [`trademarks-and-disclaimers.md`](./trademarks-and-disclaimers.md) | Retailer trademark rules and required disclaimers |
| [`privacy-policy-outline.md`](./privacy-policy-outline.md) | Skeleton for counsel to turn into the published privacy policy |
| [`data-retention.md`](./data-retention.md) | Retention schedule and account-deletion cascade |
| [`location-privacy.md`](./location-privacy.md) | Location handling rules and future fuzzing requirements |
| [`receipt-photo-privacy.md`](./receipt-photo-privacy.md) | Redaction and handling rules for receipts/photos (Phase 1+) |
| [`moderator-safety.md`](./moderator-safety.md) | Safety rules for ADMIN/CAPTAIN moderators |
| [`app-store-risk.md`](./app-store-risk.md) | App Store / Play review-risk analysis (complements `../app-store-checklist.md`) |
| [`ethical-shopping.md`](./ethical-shopping.md) | Community-facing ethical shopping guidelines |

All documents share the same posture: allowlist over denylist, first-hand user-generated evidence
only, no exploit/glitch framing, no coaching confrontation with store staff. If any document here
appears to conflict with `../compliance.md` or `CLAUDE.md`, those files win — flag the conflict
rather than resolving it silently.
