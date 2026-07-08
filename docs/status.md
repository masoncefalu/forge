# PennyForge — Repo Status

Living status doc for future Claude Code sessions and for Mason. Last updated: 2026-07-08.

## Current repo state

- **Default branch (`main`)** already contains the full first-vertical-slice MVP (merged via PR #2,
  `1079cfa7`). `main` is buildable, tested, and green in CI as of this writing.
- **PR #3** ("Bootstrap PennyForge MVP with CLAUDE.md and CI workflow") is **closed, not an active
  PR**. Its head/base were backwards (it merged `main` *into* a feature branch, not the reverse),
  so it never delivered anything new to `main`, and there is nothing actionable left on it. If any
  earlier instructions reference "PR #3 as the active bootstrap PR," that premise is stale —
  disregard it.
- This session's branch, `claude/pennyforge-ios-parallel-setup-kqodg7`, started at the same commit
  as `main` and has since added:
  - `docs/ios-roadmap.md` — iOS/App Store strategic roadmap
  - `docs/app-store-checklist.md` — tactical App Store submission checklist
  - `docs/connectors.md` — GitHub Actions/webhook/runtime-trigger reference
  - `docs/status.md` — this file
  - A bug fix: `app/api/reports/[id]/vote/route.ts` (lost-update race on concurrent votes) and
    `components/ModerationActions.tsx` (silent failure on blocked moderation actions)
  - A new PR (see below) opens this branch against `main`.

## What works

- Full first vertical slice: local feed, manual UPC/SKU/name search, report submission with
  compliance guardrail, confidence scoring, confirm/dead voting, mock deduped alerts, admin
  moderation queue, contributor leaderboard, gas-cost-aware route planner.
- CI (`.github/workflows/ci.yml`, job `build-and-test`) runs `npm ci` → `prisma generate` →
  `prisma migrate deploy` → `prisma db seed` → `npm run lint` → `npm test` (46/46 passing) →
  `npx next build` — all green, verified twice in this session (once standalone, once after the
  bug-fix commit).
- Compliance guardrails verified end-to-end: `lib/compliance.ts` allowlist enforced server-side
  before any DB write (`app/api/reports/route.ts`), seed data and tests only use allowed source
  types, blocked types (e.g. `SCRAPED_SITE`) are demonstrably rejected. No scraping, private-API,
  or checkout-automation code exists anywhere in `app/**` or `lib/**` — audited directly, not
  assumed.
- Only one repo collaborator (`masoncefalu`, admin) — no team/approval bottleneck on merges.

## What is unfinished

- **Real auth.** `lib/currentUser.ts` is still a mock cookie-based scheme (`pf_user_id`). Kept as a
  stable one-file swap point per `CLAUDE.md` design intent. Needed before any real mobile client
  or public launch — Sign in with Apple specifically required if shipping on iOS with any other
  third-party login (see `docs/ios-roadmap.md` §5).
- **Hosted backend + Postgres.** The MVP's server-components-call-Prisma-directly pattern and local
  SQLite file cannot sit behind a mobile client. This is a hard prerequisite for any iOS work
  beyond documentation/prep — not deferred polish. See `docs/app-store-checklist.md` §6 and
  `docs/ios-roadmap.md` §6.
- **Regression tests for the two bugs just fixed** — investigated and deliberately not added this
  session. The vote-route race fix needs a real DB-integration test harness (spin up scratch
  SQLite, seed two users + a report, fire concurrent requests at the route module) — this repo's
  test harness is currently unit-tests-of-pure-functions only, no `PrismaClient` in any test. The
  moderation-UI fix needs `@testing-library/react` + a `jsdom`/`happy-dom` Vitest environment,
  neither of which is installed (`vitest.config.ts` is `environment: "node"`). Both are reasonable
  follow-ups, deliberately scoped out of this session as infrastructure additions rather than bug
  fixes.
- **Known low-priority `npm audit` finding**: a transitive `postcss < 8.5.10` moderate XSS advisory
  bundled inside `next`'s own internals (not the app's runtime CSS path — Tailwind/PostCSS only
  processes static build-time source, never user input). The only fix `npm` offers is
  `next@9.3.3`, a severe breaking downgrade from Next 15 — not applied. GitHub's Dependabot alert
  for this is visible at Settings → Security → Dependabot on the repo; worth a look next time
  `next` does a routine minor-version bump, not urgent.
- Camera/barcode scanning, receipt OCR, real push notifications — all explicitly deferred per
  `CLAUDE.md`, correctly not started.

## Current PR status

A fresh PR from `claude/pennyforge-ios-parallel-setup-kqodg7` → `main` should exist by the time you
read this (opened immediately after this doc was committed). Check its state directly rather than
trusting this doc to stay current — GitHub is the source of truth, this file is a snapshot.

## Known blockers (need manual owner action)

None of these block merging this session's PR — CI is green and the diff is low-risk (2 bug fixes
+ 4 new docs). They matter for what comes *after* merge:

1. **Branch protection / rulesets on `main`** — no MCP tool in this session's toolset exposes
   reading branch protection or rulesets. Could not verify whether `main` has required reviews or
   required status checks configured. Check GitHub Settings → Branches.
2. **Repo-level "Allow auto-merge" setting** — could not verify via any available tool whether this
   is turned on. If it's off, `enable_pr_auto_merge` will fail cleanly when attempted on the new
   PR; turn it on at Settings → General → Pull Requests → "Allow auto-merge" if you want PRs to
   merge automatically once green.
3. **"Always suggest updating pull request branches"** — same story, not detectable via available
   tools.

## Next 5 technical steps

1. Decide on hosted backend target (Postgres/Supabase vs. other) and do the `datasource` swap in
   `prisma/schema.prisma` — this unblocks everything mobile-related.
2. Turn Next.js route handlers into a versioned, mobile-consumable API surface (or confirm the
   existing `app/api/**` routes are sufficient as-is) — needed before any iOS client, wrapped or
   native, can talk to a real backend.
3. Replace mock auth (`lib/currentUser.ts`) with real auth including Sign in with Apple, ahead of
   any TestFlight submission.
4. Pick the iOS path per `docs/ios-roadmap.md`'s recommendation and do the smallest viable spike
   (not a full rewrite) to validate the choice before committing further.
5. If regression coverage for the two bug fixes in this session is wanted, add the DB-integration
   test harness and `@testing-library/react` setup described above — currently the smallest
   concrete piece of "unfinished" work with a clear, scoped fix.
