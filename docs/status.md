# PennyForge — Status Snapshot

_Single source-of-truth status doc for Mason. Last updated: 2026-07-08 (agent-team pass on
`claude/forge-agent-team-ios-readiness`)._

> **Process note:** the `TaskList`/`TaskUpdate`/`TaskGet` task-board tools referenced in this
> agent team's task briefings were not actually present in the teammates' toolsets (`status-doc`
> and `ios-roadmap` both confirmed this independently). Task status for this pass is tracked via
> `SendMessage` coordination between teammates instead of the task board — worth fixing in the
> team setup for future passes.

## Current repo state

- **Branch:** `claude/forge-agent-team-ios-readiness`, based on `main` at `1079cfa` (no commits
  added yet by this pass at time of writing — teammates' work lands as it completes).
- **`main`** already contains the full first vertical slice (see "What works" below): local feed,
  manual UPC/SKU search, report submission with compliance guardrail, confidence scoring,
  confirm/dead voting, mock alerts, admin moderation, route planner, leaderboard, seed data, and a
  GitHub Actions CI workflow (`.github/workflows/`) running install → prisma generate/migrate/seed
  → lint → test → build.
- **This pass adds:** a coordinated round of iOS-readiness work split across teammates — CI/build
  verification (`ci-build`), code review passes over `app/api/**`+Prisma+`lib/*.ts` and over
  pages/components (`code-api`, `code-ui`, zero bugs found in either), a GitHub repo configuration
  audit (`github-config`), a connectors reference doc (`docs/connectors.md`), an iOS App Store
  roadmap (`docs/ios-roadmap.md`), an App Store submission checklist
  (`docs/app-store-checklist.md`), and this status doc. All contributing teammates have reported —
  see the section-by-section detail below.
- **Important:** there are two **open, unmerged PRs already on GitHub** proposing near-identical
  work from what appears to be a prior/parallel run of this same exercise:
  - **PR #4** — "Stabilize MVP, fix two bugs, add iOS/App Store roadmap docs" (branch
    `claude/pennyforge-ios-parallel-setup-kqodg7`) — adds `docs/ios-roadmap.md`,
    `docs/app-store-checklist.md`, `docs/connectors.md`, `docs/status.md`, plus two bug fixes
    (vote-route race condition, moderation-action error surfacing).
  - **PR #5** — "Add iOS roadmap docs and fix vote race condition" (branch
    `claude/intelligent-shannon-ndmfh6`) — same shape of change, same head commit SHA as PR #4.
  - Neither is merged. Both target `main` and both duplicate the doc set this branch is producing.
    **Mason needs to pick one line of work and close out the others** — see "Decisions needed"
    below.

## What was merged (PR history on `main`)

- **PR #1 — "Add placeholder CLAUDE.md"** (merged): bootstrap commit for an empty repo, added a
  placeholder `CLAUDE.md` before any real code existed.
- **PR #2 — "Bootstrap PennyForge local MVP"** (merged): the actual MVP. Full first vertical slice
  built from scratch — Next.js/TypeScript/Tailwind/Prisma/SQLite stack, compliance guardrails
  (`lib/compliance.ts`), the `reportDate`-column workaround for SQLite's `UNIQUE` constraint
  limitation, confidence scoring (`lib/scoring.ts`), route planner (`lib/route.ts`),
  `scripts/setup.sh`, and the durable docs (`CLAUDE.md`, `docs/product-spec.md`,
  `docs/compliance.md`, `docs/scoring.md`, `docs/testing.md`). 34/34 unit tests passing at merge
  time; manually verified end-to-end (all 7 pages, duplicate-report 409, blocked source-type 422,
  self-vote 403, moderation gating, route-plan save).
- **PR #3 — "Bootstrap PennyForge MVP with CLAUDE.md and CI workflow"** (closed, **not actually
  merged into `main`**): its head/base were backwards (head `main`, base
  `copilot/pennyforge-deal-finder`), so despite GitHub showing a `merged_at` timestamp it never
  brought any commits into `main`. The GitHub Actions CI workflow that now lives in `main`
  (`.github/workflows/`) traces back to this PR's branch content, but landed via the direct commits
  on `main` (`ab1423f Add GitHub Actions CI workflow`, etc.), not via PR #3 itself. Treat PR #3 as
  historical noise, not a real merge.
- **PR #4 and PR #5** (open, not merged) — see "Current repo state" above.

## What works (first vertical slice, per CLAUDE.md)

All of the following are live on `main` and exercised by the seed data:

- **Local feed** (`/`) — filterable by state / retailer / store / min-confidence
  (`app/page.tsx`).
- **Manual UPC/SKU/name search** (`/search`) — same input a future barcode scanner would feed
  (`app/search/page.tsx`).
- **Submit report with compliance guardrail** (`/report/new` → `POST /api/reports`) — price,
  store, evidence type, source type; `lib/compliance.ts` enforces an **allowlist** of first-hand,
  in-store, user-generated source types and rejects everything else (scraped sites, private APIs,
  competitor reposts, automated tools) server-side before any DB write, covered by
  `tests/compliance.test.ts`.
- **Same-day duplicate prevention** — `@@unique([productId, storeId, userId, reportDate])`, using
  the real `reportDate` column (not a `date()` expression — SQLite disallows expressions in
  `UNIQUE` constraints; see `CLAUDE.md` and `lib/reports.ts#toReportDate`).
- **Confidence score** (`lib/scoring.ts`) — evidence-type weight, reporter trust, capped
  confirmations, dead-vote penalty, exponential freshness decay (7-day half-life penny items /
  14-day clearance), full breakdown shown on the lead detail page.
- **Confirm/dead voting** — one vote per user per report, changeable, with dead-vote suppression
  of low-trust leads.
- **Mock alerts** (`/alerts`) — deduped per (product, store) per 24h window, read/unread inbox,
  DB-backed (no real push/email/SMS, by design — see "What is unfinished").
- **Admin moderation queue** (`/admin`) — approve/reject, gated to `ADMIN`/`CAPTAIN` roles via
  mock auth (`pf_user_id` cookie / `lib/currentUser.ts`).
- **Route planner** (`/route`) — ranks stores by expected value (est. value × confidence) minus
  round-trip gas cost, excludes negative-ROI trips; saved route plans.
- **Leaderboard** (`/leaderboard`) — trust score, reports, approvals, confirmations received.
- **Seed data** — GA/FL/TX stores across Home Depot, Lowe's, Dollar General, Walmart.
- **Unit tests** — Vitest coverage for scoring, dedupe, decay, dead-vote suppression, alert
  dedupe, and compliance guardrails (`npm test`).

## What is unfinished (deferred roadmap, per `docs/product-spec.md`)

Explicitly out of scope for the MVP — do not build prematurely without a phase decision from
Mason:

- **Real authentication** — mock cookie-based user switcher stands in for NextAuth/Clerk/etc.
  Swap point: `lib/currentUser.ts`. **This is the #1 blocker for any real (non-TestFlight-internal)
  distribution**, including iOS App Store submission — see the iOS roadmap doc.
- **Camera barcode scanning** — search page accepts the right input shape already; needs a
  client-side scanning library wired to the same input.
- **Receipt OCR** — evidence is a placeholder URL today; needs real file upload first.
- **Real push notifications / email / SMS** — alerts are DB rows rendered on `/alerts` only.
- **Postgres/Supabase migration** — currently local SQLite (`file:` `DATABASE_URL`); schema was
  written to be provider-swap-compatible except for the documented `reportDate` workaround. Needed
  before any multi-device / hosted deployment (including a real iOS app talking to a real
  backend).
- **Multi-stop route optimization (TSP)** — single-store trips only today.
- **Native mobile app** — web-first MVP; PWA wrap or native shell is a later phase (see iOS
  roadmap/App Store checklist docs for the staged plan). No native/wrapper iOS project exists in
  the repo yet.
- **User-facing UGC report/block affordances** — moderation today is admin/captain-only via the
  `/admin` queue; Apple Guideline 1.2 (for any App Store submission) expects end users to be able
  to report or block content/users themselves. Flagged by `app-store` teammate as a pre-launch
  backlog item.
- **Bilingual UX** — `User.locale` exists in schema (en/es seeded), no i18n framework wired up.
- **Fraud/poisoned-submission detection beyond dead-vote suppression** — rate limiting, photo dedupe
  via image hashing, trust-graph anomaly detection.
- **Quiet hours / digest mode, offline in-store mode** — alert UX refinements.
- Roadmap phases (0–4) are laid out in `docs/product-spec.md`; Phase 0 (this repo) is done, Phase
  1 (real auth, file upload, Postgres) is the next real milestone.

## Current build status

`ci-build` teammate ran the full pipeline on `claude/forge-agent-team-ios-readiness` and reports
**fully green, nothing flaky or broken**:

- **Environment:** Node v22.22.2, npm 10.9.7, Next.js 15.5.20, Prisma 6.19.3, Vitest 3.2.7.
- `npm ci` — **PASS** (448 packages). Noise only: standard deprecation warnings (`rimraf@3`,
  `inflight@1`, `glob@7`, `eslint@8.57.1` EOL) and 2 moderate `npm audit` advisories (pre-existing
  transitive deps, not investigated further, not blocking).
- `npx prisma generate` — **PASS**. Only a deprecation notice that `package.json#prisma` config
  should move to `prisma.config.ts` ahead of Prisma 7 — not urgent.
- `npx prisma migrate deploy` — **PASS**, 2 migrations applied cleanly (`20260708200333_init`,
  `20260708201618_add_report_previous_status`), no drift.
- `npx prisma db seed` — **PASS**. Seed counts: 5 users, 4 retailers, 8 stores, 12 products,
  10 reports, 7 votes, 3 alerts, 1 route plan.
- `npm run lint` — **PASS**, no warnings or errors. (`next lint` itself is being removed in
  Next 16 in favor of the ESLint CLI directly — future migration heads-up, not a bug.)
- `npm test` — **PASS**, 46/46 tests across 5 files (`compliance.test.ts` 7,
  `scoring.test.ts` 18, `alerts.test.ts` 11, `reports.test.ts` 5, `route.test.ts` 5), ~811ms
  total, no flakiness observed.
- `npx next build` — **PASS**, compiled in 6.3s, type-checked clean, all 15 routes generated.

**Non-blocking tech debt worth tracking:** (a) `next lint` and `package.json#prisma` config are
both flagged for migration ahead of Next 16 / Prisma 7 respectively; (b) 2 moderate `npm audit`
advisories exist but haven't been triaged. Neither required a handoff to a code-fix teammate — no
failures occurred this run.

**Code review pass (this branch):** two additional review lanes ran alongside the pipeline check —
`code-api` reviewed `app/api/**`, the Prisma schema, and `lib/*.ts`; `code-ui` reviewed
pages/components. **Both came back clean: zero bugs found, no code changes made**, with
`tsc`/lint/test/build re-verified passing in both lanes. A follow-up `tests` pass confirmed no new
regression tests were needed since nothing was fixed. Net result: this branch's code is a clean
pass on top of `main` — no known correctness bugs beyond what's already tracked as tech debt above.

## GitHub config status

`github-config` teammate audited `masoncefalu/forge` directly (task #1):

- **Branch protection on `main`: NONE.** `protected: false`, `/rulesets` returns empty. No
  required PR reviews, no required status checks, force-push/deletion both currently unrestricted.
  Low risk in practice today since there is only one collaborator (`masoncefalu`, admin), but this
  is a real gap once more people (or more automation) touch the repo.
- **Required status checks:** none configured (follows from no branch protection). If/when added,
  the check to require is the `build-and-test` job id from `.github/workflows/ci.yml` (the job has
  no explicit `name:`).
- **CI (`ci.yml`):** triggers on `pull_request→main`, `push→main`, `workflow_dispatch`; one job —
  checkout → `setup-node@20` → `npm ci` → prisma generate/migrate deploy/db seed → lint → test →
  build. All 4 historical runs green.
- **Auto-merge:** repo-level prerequisite is satisfied (`allow_auto_merge: true`), but **without
  branch protection, enabling auto-merge on a PR won't actually wait for CI** — GitHub only gates
  auto-merge on checks/reviews declared in branch protection, so today it would merge as soon as
  there's no conflict. Auto-merge needs branch protection + a required status check to be
  meaningful.
- **Actions permissions / secrets / variables: unknown.** Every relevant REST path
  (`/actions/permissions*`, `/actions/secrets`, `/actions/variables`) is blocked by this session's
  agent proxy (403), and the GitHub MCP toolset has no method for them either. Default
  `GITHUB_TOKEN` scope, the "Actions can approve PRs" toggle, and any existing secrets are
  **unknown from any agent session — genuinely requires Mason to check in the GitHub UI.**
- **Unexpected finding:** the repo already has 3 GitHub-managed dynamic workflows beyond `ci.yml`
  — Copilot PR-review, Copilot coding agent, and Dependabot Updates — active even though no
  `.github/dependabot.yml` exists locally. Scope/state unconfirmed (same proxy block).
- **PR-state confirmation:** matches this doc's "What was merged" section — PR #3 shows
  closed/`merged:false` with head/base reversed and never actually merged into `main`; the real
  MVP base came from PR #2; PRs #4 and #5 are open/unmerged as of this audit.

Full detail (exact manual click-paths for each toggle) is available from `github-config` directly
if needed — this is a summary.

## Connector setup status

`connectors` teammate finished task #3 (`docs/connectors.md`), covering 7 areas:

1. **Scheduled triggers** (`on:schedule`) — min 5-minute interval, best-effort under load, only
   fires from workflow files on the default branch.
2. **Event/webhook triggers** — `push`/`pull_request` (already used in `ci.yml`),
   `issue_comment` (PR slash-commands), `check_suite`/`workflow_run` (react to another workflow's
   outcome), `pull_request_review`; includes a security note on `pull_request` vs.
   `pull_request_target` for fork PRs.
3. **API POST runtime triggers** — `workflow_dispatch` (named workflow + typed inputs) vs.
   `repository_dispatch` (custom event type + free-form payload); ties external-API callbacks back
   to CLAUDE.md's no-scraping/no-private-endpoint boundaries.
4. **Secrets** — repo/environment/org-scoped, referenced via `${{ secrets.X }}`, never exposed to
   fork-PR `pull_request` runs, 90-day rotation guidance (immediate on suspected exposure),
   least-privilege `permissions:` block recommended per workflow.
5. **Runtime token storage** — Actions secrets only, never in workflow YAML or committed `.env`
   (this repo's `.env.example` is explicitly local-dev-only, not a CI-secrets model).
6. **Notification behavior** — PR comments / check runs / issues recommended for automation
   results; email/Slack explicitly ruled **out**, matching CLAUDE.md's MVP stance (no Redis, no
   background workers, no real push notifications) — a deliberate scope boundary, not an
   oversight.
7. **Auto-merge** — mechanics (merges once required checks + reviews pass), UI vs. GraphQL API
   enabling, respects (does not bypass) branch protection; notes the
   `enable_pr_auto_merge`/`disable_pr_auto_merge` MCP tools available in this environment.

**Secrets posture in one line:** nothing sensitive currently lives outside Actions secrets in this
repo — `ci.yml`'s only "credential" is a scratch SQLite `file:` URL, not a real secret. Live audit
of what secrets actually exist in repo settings is blocked for agent sessions (see "GitHub config
status" above) — that's a manual Mason action, not an open item on `connectors`'/`github-config`'s
side.

## Decisions needed from Mason

**Repo / process**

- **Duplicate open PRs (#4, #5):** both propose the same doc set (`docs/ios-roadmap.md`,
  `docs/app-store-checklist.md`, `docs/connectors.md`, `docs/status.md`) and the same two bug
  fixes (vote-route race, moderation-action error surfacing), from what looks like a
  prior/parallel run of this same exercise. Pick one to carry forward (or this branch's version,
  once complete) and close the others to avoid merge conflicts and duplicated review effort.
- **Branch protection style** — classic "Branch protection rules" vs. the newer "Rulesets" UI;
  functionally similar, but pick one so the repo doesn't end up half-configured on both.
- **Required-approvals count for `main`** — Mason is the sole collaborator today, so "require 1
  approval" would block him from merging his own work unless he adds an admin bypass or a second
  reviewer (human or Copilot). Needs a call: solo-dev flow (no required reviews, rely on required
  CI checks) vs. gated-by-Copilot-review.
- **How much automation to turn on now** — `main` currently has **no branch protection at all**
  (no required reviews, no required status checks, force-push/delete both unrestricted), and
  repo-level auto-merge is technically enabled but **toothless without branch protection** (it'll
  merge on zero conflicts, not on green CI). Minimum recommended fix: add branch protection +
  require the `build-and-test` check (see "Next 5 steps"); then decide separately whether
  auto-merge-on-green is wanted on top of that.
- **Actions→external-API automation** — mechanically feasible (`workflow_dispatch` or
  `repository_dispatch` triggering an external endpoint, e.g. to kick off a Claude Code run from a
  PR comment), nothing built yet. Needs a decided target endpoint + a repo secret before it's worth
  building — purely a "do we want this" call, not a technical blocker.
- **Confirm the already-active GitHub-managed automation** — Copilot PR-review, Copilot coding
  agent, and Dependabot Updates all show as active on the repo even though no
  `.github/dependabot.yml` exists locally, and their scope/config can't be read via any available
  API/MCP path (proxy blocks `/actions/permissions*`, `/actions/secrets`, `/actions/variables`).
  Mason needs to eyeball Settings → Copilot and Settings → Code security and analysis directly to
  confirm these are configured the way he wants.

**iOS / App Store**

- **iOS distribution path** — `ios-roadmap` teammate (`docs/ios-roadmap.md`) compared three paths:
  (1) **Next.js + Capacitor** — wrap the existing app in a native shell, ~1-2 weeks to TestFlight,
  ~90%+ code reuse; main risk is Apple's "repackaged website" review guideline (4.2), mitigated
  with real native camera access + native chrome. (2) **React Native/Expo** — UI rewrite (~4-8
  weeks), but `lib/scoring.ts`, `route.ts`, `compliance.ts`, `alerts.ts`, `reports.ts` are
  framework-free and port over unchanged (~55% of `lib/` reusable). (3) **Native SwiftUI** — full
  rewrite (~10-16+ weeks), 0% reuse, only justified later by a specific native-only requirement.
  Their recommendation: **Capacitor is the fastest realistic path to TestFlight/App Store** for
  PennyForge as it stands. Push notifications are not required for a v1 native ship — the existing
  DB-backed alert inbox works unchanged inside a native shell; real APNs push is additive later via
  the swap point already documented in `lib/alerts.ts`. **Mason needs to sign off on Capacitor (or
  override it)** before App Store prep work proceeds on a fixed target.
- **Backend migration timing** — `app-store` teammate (`docs/app-store-checklist.md`) confirms
  this is a **hard blocker, not just a nice-to-have**: a hosted backend + real auth are required
  before any *public* App Store submission — the current SQLite/mock-auth MVP cannot back a
  shipped app. Needs a decision on whether to front-load Phase 1 (auth/Postgres/file upload)
  before iOS work, or ship a TestFlight-only internal build against the current stack first (which
  does not require solving this). Related: no native/wrapper iOS project exists in the repo yet —
  the checklist assumes one gets created (Capacitor, per the recommendation above).
- **Individual vs. org Apple Developer enrollment** — depends on whether PennyForge is
  incorporated and whether Mason wants the store listing under a company name now vs. later. Org
  enrollment requires a D-U-N-S number (1-3 week lead time), so this is **schedule-critical** —
  needs an early decision if org enrollment is likely.
- **App name availability** — "PennyForge" may not be available on the App Store; need 2-3 backup
  names from Mason to check before creating the App Store Connect record.
- **Monetization timing for v1** — `docs/product-spec.md` defers a paid tier to Phase 4; confirm
  that's still the plan, since Agreements/Tax/Banking setup in App Store Connect needs lead time if
  monetization moves earlier.
- **UGC moderation gap (Guideline 1.2)** — moderation today is admin/captain-only, no user-facing
  report/block affordance. Decide whether to close this gap before v1 submission or accept the
  rejection risk and iterate post-launch.
- **iPhone-only vs. also iPad for v1** — affects screenshot scope and testing surface;
  `app-store` teammate recommends iPhone-only for v1 unless Mason wants iPad support from day one.

## Next 5 steps

1. **Add branch protection to `main` with `build-and-test` as a required status check** — the
   single most impactful GitHub-config gap per `github-config`'s audit: `main` is currently
   completely unprotected (no required reviews, no required checks, force-push/delete both
   allowed), and repo-level auto-merge is enabled but toothless until this is in place. Cheap,
   high-value, purely a manual GitHub-settings action.
2. Resolve the PR #4/#5 duplication — confirm with Mason which line of work (or this branch) is
   canonical, close the redundant PR(s) to unblock a clean merge path.
3. Decide the iOS distribution path (Capacitor / Expo / native) based on the `ios-roadmap` doc, so
   App Store prep work has a fixed target — and resolve the schedule-critical Apple Developer
   enrollment type (individual vs. org) alongside it given the D-U-N-S lead time.
4. Scope and schedule Phase 1 (real auth via `lib/currentUser.ts` swap, Postgres/Supabase
   migration, real file upload for evidence) — this unblocks both a real hosted iOS backend and
   receipt OCR later, and is a hard prerequisite for any public App Store submission.
5. Land the two correctness bug fixes already identified upstream (vote-route race condition in
   `app/api/reports/[id]/vote/route.ts`, missing `res.ok` check in
   `components/ModerationActions.tsx`) — cheap, low-risk, already diagnosed in PR #4/#5; this
   branch's own `code-api`/`code-ui` review passes found no additional bugs.
