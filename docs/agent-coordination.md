# PennyForge — Multi-Agent Coordinator Packet

Paste this packet above or alongside every research/design agent prompt (Agents 1–10) and the
synthesis agent (Agent 11). It is the single shared contract for scope, evidence format,
labeling, handoff, merge, and conflict resolution. The Coordinator (Agent 0) does **not** do the
research; it validates handoffs against this packet and runs the merge.

Working principle: **interpolate, do not extrapolate.** Agents may only claim what their evidence
(or this repo) supports. Gaps are reported as `Not Found`, never filled with plausible guesses.
Raw search dumps never enter shared context — findings are compressed into evidence cards and
decision-ledger entries.

## 1. Mission anchors (immutable — no agent may override these)

- **Codename:** PennyForge.
- **Positioning:** "Waze for hidden clearance: receipt-verified local deal intelligence, not
  random Discord chaos."
- **Product wedge:** trust, proof, route planning, reseller ROI, community, compliance — not
  out-scraping anyone.
- **Stack target:** Next.js (App Router) + TypeScript + Tailwind + Prisma + SQLite (`file:` URL;
  later Postgres via a schema-compatible `datasource` swap — never design around SQLite-only
  features).
- **First output target:** a Claude Code handoff packet, not a full build in chat.
- **Schema anchor:** same-day duplicate prevention uses a real `reportDate` column (UTC midnight,
  `lib/reports.ts#toReportDate`) with `@@unique([productId, storeId, userId, reportDate])`.
  SQLite prohibits expressions in UNIQUE constraints — never propose `date(createdAt)` there.
- **GitHub rules:** never brute-force GitHub access; never request pasted tokens in chat.
- **Repo reality:** the first vertical slice is already built (feed → UPC/SKU search → report
  submission with compliance guardrail → confidence scoring → confirm/dead voting → alerts →
  admin moderation → route planner). Agents interpolate from `lib/*.ts`, `docs/*.md`, and
  `prisma/schema.prisma` before proposing anything new.

## 2. Hard boundaries (compliance gate for every card)

No cloning proprietary code. No scraping competitors or retailers. No bypassing paywalls. No
reverse engineering private APIs. No impersonating retailer apps. No accessing internal retailer
systems. No automated checkout. No rate-limit bypassing. No GitHub token requests in chat.

Design only around: user reports, receipts, shelf-tag photos, community confirmations, manually
curated lists, user-entered UPC/SKU/product URLs, official APIs, licensed affiliate feeds, public
product metadata where permitted, and compliant monitoring where allowed. This mirrors the
enforced allowlist in `lib/compliance.ts` (`assertSafeSource` — unknown sources are rejected by
default; safety is opt-in). A feature that requires crossing a boundary is flagged, not worked
around.

## 3. Shared definitions

| Term | Meaning |
|---|---|
| Penny item | Item marked down to $0.01 in a retailer's system, typically slated for removal. |
| Hidden clearance | Unadvertised markdown: shelf price higher than system price. |
| Lead | A product+store claim that a deal exists, backed by ≥1 report. |
| Report | One user's first-hand, in-store submission (price, store, evidence, source type). |
| Evidence | `RECEIPT`, `SHELF_TAG_PHOTO`, `PRODUCT_PHOTO`, or `TEXT_ONLY` (`lib/constants.ts`). |
| Confirmation / dead vote | Community `CONFIRMED`/`DEAD` votes; a lead is suppressed when it has ≥2 dead votes AND more deads than confirms (`lib/scoring.ts#isSuppressed`). |
| Trust score | Per-user reputation earned via confirmed reports, lost via dead votes (`lib/scoring.ts`). |
| Confidence score | Per-lead score from evidence strength, reporter trust, votes, freshness decay. |
| Route ROI | Expected value of visiting a store minus travel cost (`lib/route.ts`). |
| Evidence card | The compressed unit of research findings (format in §4). |
| Decision ledger | Append-only list of decisions made during merge, with rationale and card IDs. |

## 4. Evidence-card format (the only way findings enter shared context)

```yaml
card: A{agent}-{seq}            # e.g. A3-04 — stable ID, never reused
agent: 3
topic: short noun phrase        # e.g. "receipt-photo trust weighting"
claim: >                        # ONE falsifiable sentence
  ...
evidence:                       # citations only — no raw dumps, no full-page quotes
  - source: name/URL/repo-path
    date: YYYY-MM-DD            # when observed, not when published, if different
    note: <=25 words
confidence: Verified | Likely | Uncertain | Unverified | Not Found
compliance: Low | Medium | High | Unknown
implication: >                  # <=40 words — what PennyForge should do differently if true
  ...
supports: [card IDs]            # optional
contradicts: [card IDs]         # optional — MUST be filled if the agent knows of one
expires: YYYY-MM-DD | none      # when this claim likely goes stale
superseded-by: card ID          # Coordinator-set only, during merge (§10) — agents leave unset
provisional: true               # Coordinator-set only, freshness tiebreaks (§10) — agents leave unset
```

Caps: one claim per card, ≤120 words per card, ≤12 cards per agent handoff. If an agent has more
than 12 findings, it keeps the 12 with the highest decision impact and lists the rest as one-line
"parked" bullets.

## 5. Confidence labels

| Label | Criterion | Merge weight |
|---|---|---|
| Verified | ≥2 independent sources, or direct observation in this repo / an official primary source. | Can anchor decisions. |
| Likely | 1 credible source, consistent with Verified cards, no contradiction found. | Can support decisions; cannot be the sole basis for irreversible ones. |
| Uncertain | Conflicting sources, or a credible source with known gaps. | Recorded; triggers an open question, not a decision. |
| Unverified | Single unvetted source (forum post, hearsay, marketing copy). | Never cited in the final handoff except as "signal to investigate". |
| Not Found | Searched competently, nothing usable found. | Valuable — logged so agents/synthesis don't fabricate or re-search. |

Rule: a claim's confidence never exceeds its weakest required source. Interpolation between two
Verified cards may be labeled Likely at most.

## 6. Compliance labels

Labels the risk of the **method or data source a card depends on**, judged against §2:

| Label | Meaning | Merge rule |
|---|---|---|
| Low | Clearly within the allowlist (user-generated, official API, licensed feed, public metadata). | Eligible for the roadmap. |
| Medium | Permissible but with conditions (ToS review needed, attribution/licensing required, privacy handling). | Eligible only with the condition stated in the implication. |
| High | Requires crossing a §2 boundary. | Never enters the roadmap; card is kept only as a "what competitors do that we won't" marker. |
| Unknown | Not yet assessed. | Treated as High until an agent or the Coordinator resolves it. |

## 7. Handoff format (every agent, verbatim structure)

```markdown
# Handoff — Agent {n}: {scope title}
Scope: one sentence restating the assigned lane.
Compliance attestation: "No scraping, private endpoints, paywall bypass, reverse
engineering, or competitor data ingestion was used or is proposed."

## Evidence cards
{<=12 cards in §4 format}

## Not Found
- {what was searched and not found — one line each}

## Proposed ledger entries
- D-A{n}-{seq}: {decision the agent recommends} — basis: {card IDs}

## Open questions
- Q-A{n}-{seq}: {question} — blocking: {yes/no} — suggested owner: {agent # or Coordinator}

## Parked (optional)
- one-line bullets for findings beyond the 12-card cap
```

Total handoff ≤900 words excluding cards. Anything longer is returned for compression before it
enters the merge. Handoffs contain **no raw transcripts, no scraped content, no pasted pages.**

## 8. Suggested agent roster and lanes

| # | Scope | Merge lane |
|---|---|---|
| 1 | Competitor & community landscape (public info only — positioning, pricing, failure modes) | Product |
| 2 | Compliance & legal posture (ToS norms, receipt/photo rights, disclaimers, privacy) | Compliance |
| 3 | Trust & scoring model (evidence weighting, decay, anti-gaming, Sybil resistance) | Core logic |
| 4 | Data-source inventory (official APIs, licensed affiliate feeds, public metadata — what actually exists) | Compliance |
| 5 | Route planning & ROI math (EV per stop, gas cost, multi-store ordering) | Core logic |
| 6 | Reseller workflows (comps, profit math, export needs) | Product |
| 7 | Community & moderation design (captains, karma, abuse handling) | Product |
| 8 | Schema & architecture deltas vs. current `prisma/schema.prisma` and `lib/*.ts` | Core logic |
| 9 | Onboarding, UX, and mobile posture (given existing Capacitor scaffolding) | Product |
| 10 | Monetization & growth loops (pro tier, alerts, referral) | Product |

Agents read this repo first; external research fills gaps the repo doesn't answer.

## 9. Merge plan (Coordinator, after all handoffs arrive)

1. **Intake validation** — reject any handoff missing the attestation, exceeding caps, or with
   unlabeled cards. Return for fix; do not partially merge.
2. **Compliance gate** — quarantine every High/Unknown card out of the decision pool first.
3. **Dedupe** — key cards by normalized `topic`; same-key cards whose `claim`s assert the same
   thing are duplicates — merge them into the highest-confidence card, unioning `evidence` and
   `supports`. Same-key cards with incompatible `claim`s are conflicts, not duplicates (§10).
4. **Conflict detection** — build the contradiction graph from `contradicts` plus any same-key
   cards with incompatible claims; resolve per §10 before lane merges.
5. **Lane merges** — combine cards per lane (Product / Compliance / Core logic) into one lane
   brief each: decisions taken, cards cited, open questions surviving.
6. **Ledger update** — accept/reject each proposed `D-*` entry with a one-line rationale; the
   ledger is append-only (reversals are new entries referencing the old).
7. **Gap list** — union of all `Not Found` sections plus questions no lane answered; this becomes
   Agent 11's "known unknowns" appendix, and the re-research queue if any gap is blocking.

## 10. Conflict-resolution rules (applied in order)

1. **Compliance trumps everything.** If resolving a conflict either way would require a High
   compliance path, that branch is eliminated regardless of confidence.
2. **Repo reality beats external speculation.** A claim contradicted by working code or the
   schema in this repo is downgraded to Uncertain and the card must cite the repo path it
   conflicts with.
3. **Higher confidence wins** (Verified > Likely > Uncertain > Unverified). The losing card is
   not deleted — it is annotated `superseded-by: {card}`.
4. **Equal confidence, contradictory claims** → both downgrade to Uncertain, a blocking open
   question is created, and one agent (or the Coordinator) is assigned a tie-break with a named
   primary source. No decision is taken on the contested point meanwhile.
5. **Freshness tiebreak** — if still tied, the card with the later observation date and earlier
   `expires` wins provisionally, marked `provisional: true`.
6. Every resolution is a `CONFLICT-{seq}` ledger entry naming both cards and the rule applied.
   Conflicts are never silently dropped.

## 11. Final synthesis checklist (Agent 11)

- [ ] All 10 handoffs received, validated, and merged; none partially ingested.
- [ ] Every cited card carries a confidence and compliance label; nothing High/Unknown is load-bearing.
- [ ] All `CONFLICT-*` entries resolved or explicitly surfaced as open risks.
- [ ] Mission anchors (§1) restated verbatim and uncontradicted by any recommendation.
- [ ] Hard boundaries (§2) restated; every recommended data source maps to the allowlist.
- [ ] Output is a **Claude Code handoff**: ordered build tasks referencing concrete repo paths
      (`lib/*.ts`, `app/**`, `prisma/schema.prisma`), each task citing the ledger entries that
      justify it.
- [ ] Any schema change respects the `reportDate` rule and SQLite constraint limits, and stays
      Postgres-swap compatible.
- [ ] New business logic is specified as framework-free `lib/*.ts` functions with named unit
      tests, per repo convention.
- [ ] Enum-like values extend `lib/constants.ts` arrays rather than introducing new literals.
- [ ] Known-unknowns appendix included (merged `Not Found` + surviving open questions).
- [ ] Total handoff fits one Claude Code session's working context: cards and ledger only — no
      raw research payloads.
- [ ] Final pass: no GitHub tokens, credentials, or personal data anywhere in the packet.
