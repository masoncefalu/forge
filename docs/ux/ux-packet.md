# PennyForge UX Packet — Compressed (for Agent 11)

Deliverable 7. This is the condensed version of the full 8-document UX packet in `docs/ux/` —
everything a downstream implementation agent needs to start building, without reading all eight
source docs first. Each section links back to its full doc for exact prop shapes, Tailwind
classes, field-by-field time budgets, and error-state tables. Produced by Agent 6 (UX and Frontend
Flow), grounded in the real PennyForge codebase (Next.js App Router + TypeScript + Tailwind +
Prisma/SQLite) as it exists today — not a speculative redesign.

Product feel: fast, local, trust-first, proof-first — less chaotic than Discord, more actionable
than a spreadsheet.

---

## 1. Screen map

| # | Screen | Status | Route | One-line purpose |
|---|---|---|---|---|
| 1 | Home / Dashboard | Built, merged with Feed | `/` | Entry point; today identical to Local feed |
| 2 | Local feed | Built | `/` | Filterable, confidence-sorted list of active leads |
| 3 | Store selector | **Net-new** | `/stores` | Distance-sorted store browser with per-store freshness; set "my store" |
| 4 | UPC/SKU search | Built | `/search` | Manual lookup by UPC/SKU/name; same input contract a future scanner will feed |
| 5 | Lead detail | Built | `/leads/[id]` | Full confidence-score breakdown, evidence, voting — the trust centerpiece |
| 6 | Submit report | Built | `/report/new` | <30s report form, compliance-gated at the API layer |
| 7 | Confirm/dead vote UI | Built, embedded only | in `/leads/[id]` via `VoteButtons` | One-tap confirm/dead; no standalone route or feed-card affordance yet |
| 8 | Alerts | Built | `/alerts` | Mock inbox, threshold + radius + dedupe gated |
| 9 | Route planner | Built (single-store) | `/route` | Ranks stores by expected value minus round-trip gas cost |
| 10 | Admin moderation | Built | `/admin` | Role-gated queue; backstop behind automatic community suppression |
| 11 | Compliance/About | **Net-new** | `/trust` | Plain-language sourcing rules, "what we'll never do," trust model |
| 12 | Settings/Profile | **Net-new** | `/settings` | Identity, contribution stats, home location, locale stub, notification stub, real account deletion |
| 13 | Leaderboard *(bonus, outside original 12)* | Built | `/leaderboard` | Contributor trust ranking |

Full detail: [screen-map-and-flows.md](./screen-map-and-flows.md) §1. Per-screen Purpose/Main
components/User actions/Data needed/Empty state/Error state/MVP/Future breakdowns live in the
five `screens-*.md` docs (see [README.md](./README.md) for the index).

---

## 2. Core user flows (condensed)

1. **First-run** — no real signup; `getCurrentUser()` resolves a default identity server-side via
   the `pf_user_id` cookie, switchable through the header `UserSwitcher`. Real auth (Phase 1) slots
   in behind the same `getCurrentUser(): Promise<User | null>` interface without changing this flow.
2. **Find-a-lead** — browse (`/` with filters) or search (`/search` by UPC/SKU/name) both converge
   on `/leads/[id]`, which leads with the score-breakdown table as the "why trust this" proof.
3. **Submit-a-report-in-30s** — `/report/new`: store/deal-type/evidence/source all pre-defaulted to
   sane values; only product + price force real interaction. ~19s existing-product path, ~26–27s
   worst-case new-product path. See [screens-reporting-and-voting.md](./screens-reporting-and-voting.md) §6.
4. **Verify/dead-vote** — two-tap, no required reason, from `/leads/[id]`. Not yet available
   directly from feed cards (proposed: `OneTapVoteButtons`, see §5 below).
5. **Plan-a-route** — `/route` ranks stores by `expectedValue − tripCost`, only shows trips that
   pay for themselves; optional named "save this route."
6. **Admin-moderate** — `/admin`, role-gated. **Two independent gates**: automatic community
   suppression (`deads≥2 && deads>confirms`, no human involved) vs. manual APPROVED/REJECTED
   moderation. Suppression is the primary defense; moderation is a backstop — this framing must
   show up in the UI copy, not just be true underneath it.

Full flow diagrams: [screen-map-and-flows.md](./screen-map-and-flows.md) §2.

---

## 3. Suggested navigation

**Desktop:** keep the existing single top bar (`app/layout.tsx`) as-is — plenty of room for flat
links at `≥1024px`.

**Mobile: 5-item bottom tab bar + "More" overflow.**

| Tab bar (primary) | Overflow "More" |
|---|---|
| Feed / Home (`/`) | Leaderboard (`/leaderboard`) |
| Search (`/search`) | Admin (`/admin`, role-gated) |
| **Report** (`/report/new`) — center, visually privileged like a camera shutter | Settings/Profile (`/settings`) |
| Route (`/route`) | Compliance/About (`/trust`) |
| Alerts (`/alerts`) — needs unread badge | Store selector (`/stores`) |
| | "Acting as" identity switcher (mock-auth placeholder) |

Rationale: matches the brief's suggested five exactly; role-gated, read-once, low-frequency, and
secondary-path screens go one tap deeper rather than crowding the primary bar. Full table with
justifications: [screen-map-and-flows.md](./screen-map-and-flows.md) §3.

---

## 4. Mobile-first layout notes (condensed)

- **Breakpoints:** base (mobile, stacked/full-width) → `sm:` 640–1023px (two-column, matches
  `ReportForm`'s existing pattern) → `lg:` 1024px+ (current desktop layout, no change needed).
  Deliberately skip `md:` as a distinct tier.
- **Known breakage today:** feed filter form's 4 selects cramp on narrow viewports (fix:
  `flex-col sm:flex-row`); route/leaderboard tables lack `min-w-*` so columns can crush before
  `overflow-x-auto` kicks in; the 7-link nav row wraps to 2–3 lines on phones (the bottom-tab-bar
  proposal above exists specifically to relieve this).
- **Touch targets:** `ModerationActions` (`px-3 py-1.5`) and `MarkReadButton` (`px-2 py-1`) are
  under the 44px floor today. Proposal: `py-2.5` minimum below `sm:`. `VoteButtons` on lead detail
  should become `sticky bottom-0` on mobile (thumb-reach for the highest-value action on a long page).
- **Card density:** `LeadCard`'s meta row must never let `ConfidenceBadge`, evidence label, or
  confirm/dead counts wrap away first — those three are load-bearing trust signals. Reporter
  handle/trust and `timeAgo` are the first things to drop to their own line or truncate.
- **Offline-ready seams (nothing ships now, but bake these in):** server components already return
  clean serializable `LeadView`/`RankedStore` shapes (the future cache key); every client mutation
  already isolates to one `fetch()` per component (the future queue-interception point); `reportDate`
  is always server-computed, never client-sent, which is exactly what makes a future offline-queued
  `POST /api/reports` replay safely idempotent against the existing
  `@@unique([productId, storeId, userId, reportDate])` constraint — no API contract change needed
  later. Full detail: [screens-settings-and-mobile.md](./screens-settings-and-mobile.md)
  "Mobile-first layout notes" section.

---

## 5. Component list (condensed)

**Existing (Part A of [component-library.md](./component-library.md)):** `ConfidenceBadge`,
`LeadCard`, `ReportForm`, `VoteButtons`, `MarkReadButton`, `ModerationActions`,
`SaveRoutePlanButton`, `UserSwitcher`. Notable inconsistency to fix going forward:
`VoteButtons`/`SaveRoutePlanButton`/`MarkReadButton` show success/error in the same neutral gray
with no error surface or accessible markup; `ModerationActions` is the one component with a real
`role="alert"` red-text error pattern — **standardize new components on `ModerationActions`'s
convention, not the others'.**

**Proposed shared components (Part B):**

| Component | Purpose | Needed by |
|---|---|---|
| `FreshnessIndicator` | "last verified: {timeAgo}" with fresh/aging/stale tiers, visually distinct from confidence | store selector, feed, lead detail, alerts |
| `EvidenceChip` | Evidence-type badge, receipt visually strongest | everywhere a lead/report is listed |
| `EmptyState` | Standardizes 5 currently-duplicated ad-hoc empty states | feed, search, alerts, route, admin, store selector |
| `ScoreBreakdown` | Extracts the lead-detail score table into full/compact reusable modes | lead detail, admin queue cards |
| `StorePicker` | Distance + freshness aware store picker, dropdown or list variant | store selector, ReportForm, feed filter |
| `NudgeBanner` | Ethical-nudge microcopy + compliance-rejection messaging | ReportForm, compliance page |
| `OneTapVoteButtons` | Compact inline vote pair for `LeadCard` in the feed | feed-inline voting proposal |
| `StatusPill` *(bonus)* | Consolidates 2+ ad-hoc status pill implementations | admin queue, LeadCard |

Full prop shapes and Tailwind classes: [component-library.md](./component-library.md) Part B.

---

## 6. Admin UX notes (condensed)

- **Queue ergonomics:** add status filter tabs (default `PENDING`) and an oldest/newest sort
  toggle — both pure presentation filters on data already fetched, no new queries.
- **Priority signal:** flag reports at `deads:1, confirms:0` (one vote from auto-suppression) so
  moderators can get ahead of borderline cases before the community mechanism fires.
- **Abuse signals buildable now (no schema change):** in-queue report velocity per reporter
  (`groupBy userId` on the already-fetched queue), same-visit trust-direction proxy (how many of a
  reporter's *other* queued reports are suppressed vs. clean). **Needs schema:** true trust-score
  history and a moderation audit log — scope these together later, they're the same
  who/what/when-changed-this problem.
- **Avoid "you're the only line of defense":** rewrite the queue subhead to state upfront that
  automatic community suppression already handles most bad reports — moderation is a backstop, not
  the primary mechanism. A near-empty queue is a *positive* signal, not "nothing to do."
- **Suppressed-card framing:** show the two-gate asymmetry *before* a click, not just as a reactive
  409 error — leaving a suppressed report alone can let it self-resolve if votes swing; clicking
  Reject is a one-way door that clears the auto-restore state.

Full detail: [screens-admin-and-compliance.md](./screens-admin-and-compliance.md) "Admin UX notes."

---

## 7. Design tokens (canonical)

| System | Tiers | Classes |
|---|---|---|
| **Confidence tier** | ≥75 high · ≥50 medium · ≥25 low · <25 very low | emerald-100/800 · amber-100/800 · orange-100/800 · red-100/800 (all with matching `-300` border) |
| **Freshness tier** *(new)* | <24h fresh · 1–7d aging · >7d/never stale | emerald-700/50 · amber-700/50 · stone-500/100 — lighter, inline-text, never a pill (must not be visually confused with confidence) |
| **Deal type** | PENNY · CLEARANCE | forge-100/900 · sky-100/900 |
| **Semantic action** | positive/confirm/approve · negative/dead/reject/error | emerald-600/700 · red-600/700 |
| **Caution / gate** | admin-gated, pending-review | amber-300/50/900 (banner) · stone-200/600 (pill) |
| **Brand / primary** | buttons, links, price | forge-600 |

Three rules that keep these signals from colliding: confidence uses saturated pill tones,
freshness uses lighter inline text; status pills stay neutral stone by default so "pending" never
visually implies low confidence; `forge` (brand amber) and semantic `amber` (caution) are kept as
separate token families even though they share a hue. Full table and rationale:
[component-library.md](./component-library.md) "Design tokens."

---

## 8. Cross-cutting UX principles — where each one lives

| Principle | Primary screen(s) | Mechanism |
|---|---|---|
| Show confidence clearly | Feed, lead detail, search | `ConfidenceBadge` 4-tier color system everywhere a score appears |
| Explain why a lead is trusted | Lead detail | Full score-breakdown table, narrated in plain language (not raw math) |
| Show "last verified" | Lead detail, store selector, alerts | `timeAgo()` + `lastConfirmAgeDays`; proposed `FreshnessIndicator` |
| Show evidence type | Feed, search, lead detail, admin | `EVIDENCE_LABELS`; proposed `EvidenceChip` |
| Show store-level freshness | Store selector (net-new) | Per-store "last verified report" via `FreshnessIndicator` |
| Make dead-voting easy | Lead detail (embedded) | Two-tap, zero required justification, `VoteButtons` |
| Report submission <30s | Submit report | Smart defaults collapse the happy path to ~3 real interactions |
| Avoid employee confrontation | Submit report | Source-type microcopy: "help other shoppers, don't put staff on the spot" |
| Ethical nudges | Submit report, compliance page | Inline helper copy near source-type + evidence-strength fields |
| Offline-ready future design | Alerts, route planner, mobile layout | DB-persisted (not ephemeral) alert/vote model; server-computed timestamps make future queued replay idempotent with zero API changes |

---

## 9. What's explicitly out of scope for this MVP packet

Per `CLAUDE.md` / `docs/product-spec.md`: real auth (current mock-auth interface is the documented
swap point), camera barcode scanning, receipt OCR, real push/email/SMS notifications, Postgres
migration, multi-stop TSP routing, native app shell, i18n/bilingual UI (the `User.locale` field
exists but nothing renders translated), true offline mode. Every "Future" section across the eight
screen docs defers to this same list — nothing in this packet proposes building around it early.
