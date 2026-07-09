# Build Plan — First MVP Vertical Slice

This document is the canonical execution plan for how PennyForge's first local MVP vertical
slice (`CLAUDE.md`'s "First vertical slice (already built)") was constructed, in dependency
order, with the exact commands used. It exists for two purposes:

1. **Onboarding** — a new contributor or Claude Code session can read this top to bottom and
   understand how the pieces fit together, without re-deriving the dependency graph from scratch.
2. **Rebuild reference** — every command below was verified against this repo directly (either
   read from the actual config/script/source files, or run end-to-end against a fresh clone). If
   this repo's local setup ever needs to be reproduced elsewhere, this is the sequence to follow.

The slice itself is **already built and green** — this is not a to-do list. It does not duplicate
`docs/product-spec.md` (positioning/roadmap), `docs/compliance.md` (source-policy rationale),
`docs/scoring.md` (scoring-formula spec), or `docs/testing.md` (acceptance-test checklist/manual
QA script); it cross-references them instead.

## 1. Exact Project Initialization Commands

The generated config in this repo pins down exactly how `create-next-app` must have been
invoked. Evidence, file by file:

- `app/layout.tsx`, `app/page.tsx` at the **repo root** (not `src/app/`) → the src-directory
  prompt was declined.
- `tsconfig.json` has `"paths": { "@/*": ["./*"] }` (not `"./src/*"`) → confirms no `src/` dir,
  using the stock `@/*` import alias.
- `tailwind.config.ts` + `postcss.config.mjs` exist, `content` globs are `./app/**/*.{ts,tsx}` and
  `./components/**/*.{ts,tsx}` → Tailwind was enabled at scaffold time.
- `.eslintrc.json` is exactly `{ "extends": "next/core-web-vitals" }` and `eslint-config-next` is a
  devDependency → ESLint was enabled at scaffold time, untouched from the default output.
- `tsconfig.json` (`strict: true`, `.tsx` files throughout) → TypeScript was enabled.
- `package.json`'s `"dev"` script is plain `"next dev"` (no `--turbopack` flag) → Turbopack dev was
  declined/not used.
- No `next.config.mjs` App Router opt-out, and `app/` (not `pages/`) holds all routes → App Router.

That maps to this literal sequence, starting from an empty directory:

```bash
# 1. Scaffold Next.js with the exact flags this repo's config implies
npx create-next-app@15.3.0 pennyforge \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --no-turbopack \
  --use-npm
cd pennyforge

# 2. Prisma + SQLite ORM layer — pin the major version explicitly (see the gotcha
#    below: an unpinned install pulls the latest Prisma, and past major version 7
#    the CLI drops the datasource { url } field this schema relies on)
npm install @prisma/client@^6.7.0
npm install -D prisma@^6.7.0
npx prisma init --datasource-provider sqlite
# generates prisma/schema.prisma (datasource db { provider = "sqlite" }) and a starter .env

# 3. Author the schema (models: User, Retailer, Store, Product, Report, ReportVote,
#    Alert, RoutePlan) in prisma/schema.prisma, including the reportDate column
#    and @@unique([productId, storeId, userId, reportDate]) — see CLAUDE.md's
#    "Schema note" for why this can't be a date(created_at) expression on SQLite.

# 4. First migration
npx prisma migrate dev --name init
# later, a second schema change was migrated the same way:
# npx prisma migrate dev --name add_report_previous_status

# 5. Seed script — tsx runs the TS seed file directly, no separate build step
npm install -D tsx
# add to package.json:
#   "prisma": { "seed": "tsx prisma/seed.ts" }
# then author prisma/seed.ts (demo users, retailers, stores, products, reports, votes, alerts)
npx prisma db seed

# 6. Vitest for the framework-free lib/*.ts unit tests
npm install -D vitest
# author vitest.config.ts (environment: "node", include: ["tests/**/*.test.ts"])
# — no jsdom/happy-dom needed since lib/ is pure functions, not component tests

# 7. Wire up the npm scripts actually present in package.json
#    (dev, build, start, lint, test, typecheck, verify, prisma:generate,
#     prisma:migrate, prisma:seed, db:generate, db:migrate, db:migrate:dev,
#     db:seed, setup, ios:bootstrap, cap:sync, cap:copy, cap:open, ios:beta, ios:release)

# 8. .env.example checked in (DATABASE_URL="file:./dev.db" plus commented-out
#    Phase 1+ placeholders for Postgres/Supabase, Sentry, Capacitor) — real .env is gitignored

# 9. One-shot bootstrap script for anyone cloning the repo fresh
chmod +x scripts/setup.sh
npm run setup   # == bash scripts/setup.sh
```

Note: `next` is `^15.3.0` and `eslint-config-next` is also `^15.3.0` in `package.json` — the
`create-next-app` version above is chosen to match, since Next scaffolds itself at the version
you invoke.

### Cross-check: `scripts/setup.sh` (verbatim)

This is the actual one-shot bootstrap script in the repo, run via `npm run setup`:

```bash
#!/usr/bin/env bash
# PennyForge local setup — installs deps, prepares SQLite DB, seeds demo data.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> [1/5] Installing dependencies (npm install)"
npm install

if [ ! -f .env ]; then
  cp .env.example .env
  echo "==> [2/5] Created .env from .env.example"
else
  echo "==> [2/5] .env already exists — leaving it alone"
fi

echo "==> [3/5] Generating Prisma client"
npx prisma generate

echo "==> [4/5] Running migrations (SQLite)"
npx prisma migrate dev --name init

echo "==> [5/5] Seeding demo data"
npx prisma db seed

echo ""
echo "✅ PennyForge setup complete."
echo "   Run the app locally with:  npm run dev"
echo "   Then open:                 http://localhost:3000"
echo "   Run the test suite with:   npm test"
```

Note this script always passes `--name init` to `prisma migrate dev`, even though the repo's
actual migration history has two migrations (`20260708200333_init` and
`20260708201618_add_report_previous_status`), both already committed under `prisma/migrations/`.
On a from-scratch run against a fresh checkout — migration files present, but no `prisma/dev.db`
yet — Prisma applies whatever migration files already exist in the repo and only prompts for a new
one if the schema has pending changes beyond what's already migrated — so this line is safe to
rerun as-is for a fresh clone; it does not attempt to recreate history that's already committed.
This was confirmed directly in this repo: running the sequence below against a clean checkout (no
`prisma/dev.db`, no `.env`) applied both existing migrations, regenerated the client, and seeded
successfully with no manual intervention.

### Cross-check: README's "Getting Started (Local MVP)" (verbatim)

The README documents the same flow, minimized for someone who wants to run rather than fully
provision the DB by hand:

```bash
git clone https://github.com/masoncefalu/forge.git pennyforge
cd pennyforge
npm install
npx prisma migrate dev
npx prisma db seed    # demo users, retailers, stores, products, reports, votes, alerts
npm run dev           # http://localhost:3000
npm test              # scoring · duplicates · decay · dead votes · alert dedupe · guardrails
```

`README.md` states plainly: "No external paid services required. SQLite locally; `DATABASE_URL`
swap migrates to Postgres." — `scripts/setup.sh` is the fuller/safer version of this same sequence
(it also handles `.env` creation and generates the Prisma client explicitly before migrating).

**Gotcha verified while testing this plan:** if `node_modules` isn't installed yet, `npx prisma`
falls back to fetching the latest published Prisma CLI instead of the repo-pinned `^6.7.0` —
which, past major version 7, removed the `url` field from the `datasource` block and will fail
schema validation against this repo's schema. Always run `npm install` (or `npm run setup`, which
does this first) before any other `npx prisma` command.

## 2. Folder Structure

Root listing, annotated:

```
.
├── .env.example              # DATABASE_URL="file:./dev.db" + commented Phase 1+ placeholders
├── .eslintrc.json             # { "extends": "next/core-web-vitals" }
├── .github/workflows/         # ci.yml (lint/typecheck/test/build) + ios-release.yml (Phase 3+)
├── CLAUDE.md                  # durable architecture/compliance context for Claude Code sessions
├── README.md                  # product spec, architecture, roadmap, getting-started
├── app/                       # Next.js App Router — pages + API route handlers
├── capacitor.config.ts        # native iOS shell config (Phase 3+, not part of the MVP slice)
├── codemagic.yaml             # iOS CI/CD pipeline config (Phase 3+)
├── components/                # shared React components (client + presentational)
├── docs/                      # product/compliance/mobile/deployment reference docs
├── lib/                       # framework-free business logic (scoring, compliance, alerts, ...)
├── next.config.mjs            # reactStrictMode: true, otherwise default Next config
├── package-lock.json
├── package.json
├── postcss.config.mjs         # tailwindcss + autoprefixer plugins
├── prisma/                    # schema, migrations, seed script
├── scripts/                   # setup.sh (MVP bootstrap) + ios-bootstrap.sh (Phase 3+, opt-in)
├── tailwind.config.ts         # content globs over app/ + components/, custom "forge" color scale
├── tests/                     # Vitest unit tests, one file per lib/*.ts module
├── tooling/                   # staged Fastlane/iOS release tooling (Phase 4/5, not MVP)
├── tsconfig.json               # strict TS, "@/*" → "./*" alias, excludes capacitor/ios/tooling
└── vitest.config.ts            # environment: "node", include: tests/**/*.test.ts
```

The repo carries a substantial amount of Phase 3+ iOS/Capacitor/Fastlane scaffolding
(`capacitor.config.ts`, `codemagic.yaml`, `tooling/ios/`, `scripts/ios-bootstrap.sh`,
`.github/workflows/ios-release.yml`) alongside the Phase 0 local MVP. `tsconfig.json` explicitly
excludes `capacitor.config.ts`, `ios`, and `tooling` from the TypeScript project, and
`scripts/ios-bootstrap.sh` is documented in its own header as "intentionally NOT run in CI" and
installs nothing until manually invoked — so none of this affects `npm run dev` / `npm test` /
`npm run build` for the MVP slice described here.

### `app/` — Next.js App Router (pages + API routes)

```
app/
├── layout.tsx                          # root layout
├── page.tsx                            # home / local feed
├── globals.css                         # Tailwind directives + base styles
├── admin/page.tsx                      # admin moderation queue UI
├── alerts/page.tsx                     # user alerts inbox
├── leaderboard/page.tsx                # contributor leaderboard
├── leads/[id]/page.tsx                 # single lead detail page
├── report/new/page.tsx                # new report submission form
├── route/page.tsx                      # route planner page
├── search/page.tsx                     # manual UPC/SKU search
└── api/                                 # route handlers backing client components
    ├── user/route.ts                    # sets pf_user_id cookie (mock auth / user switcher)
    ├── reports/route.ts                 # POST — submit a report (compliance check + scoring)
    ├── reports/[id]/vote/route.ts       # POST — confirm/dead vote on a report
    ├── reports/[id]/moderate/route.ts   # POST — admin approve/reject a report
    ├── alerts/[id]/read/route.ts        # POST — mark an alert read
    └── route-plans/route.ts             # POST — generate/save a route plan
```

### `components/` — shared React components

```
components/
├── ConfidenceBadge.tsx        # renders the "Receipt-verified · N reports · ..." badge
├── LeadCard.tsx                # feed/search result card for a lead
├── MarkReadButton.tsx          # client button hitting the alerts read API
├── ModerationActions.tsx       # admin approve/reject controls
├── ReportForm.tsx              # client form for submitting a new report
├── SaveRoutePlanButton.tsx      # client button hitting the route-plans API
├── UserSwitcher.tsx            # mock-auth user picker (sets pf_user_id cookie)
└── VoteButtons.tsx              # confirm/dead vote client controls
```

### `lib/` — framework-free business logic (directly unit-testable)

```
lib/
├── db.ts                # Prisma client singleton, imported by server components/route handlers
├── currentUser.ts        # getCurrentUser(): Promise<User | null>, reads pf_user_id cookie
├── constants.ts          # enum-like string arrays (roles, evidence types, etc.) validated app-side
├── compliance.ts         # source-type allowlist guardrail (CLAUDE.md hard boundary #6)
├── scoring.ts            # confidence score: evidence weight, trust, decay, dead-vote suppression
├── route.ts              # pure route-ranking/ROI math
├── routePlanner.ts       # builds a route plan on top of lib/route.ts + lib/geo.ts
├── geo.ts                # distance/geo helper functions used by route ranking
├── reports.ts            # report creation logic incl. toReportDate() (see CLAUDE.md schema note)
├── leads.ts              # feed/lead query and shaping logic for the local feed + search
├── alerts.ts             # mock alert generation + dedupe logic
└── format.ts              # display formatting helpers
```

### `prisma/` — schema, migrations, seed

```
prisma/
├── schema.prisma                                              # SQLite datasource + full data model
├── seed.ts                                                     # demo data (run via `tsx`, see package.json "prisma.seed")
└── migrations/
    ├── migration_lock.toml
    ├── 20260708200333_init/migration.sql                       # initial schema
    └── 20260708201618_add_report_previous_status/migration.sql # adds report previous-status tracking
```

### `tests/` — Vitest unit tests (one file per `lib/*.ts` module under test)

```
tests/
├── scoring.test.ts        # confidence scoring, decay, dead-vote suppression
├── reports.test.ts        # duplicate-date key / reportDate logic
├── route.test.ts          # route ranking math
├── alerts.test.ts         # alert dedupe
└── compliance.test.ts     # source-type allowlist guardrails
```

### `scripts/` — operational shell scripts

```
scripts/
├── setup.sh          # MVP bootstrap: npm install → .env → prisma generate → migrate → seed
└── ios-bootstrap.sh  # opt-in, not run in CI — one-time Capacitor iOS shell activation (Phase 3+)
```

### `tooling/` — staged native/release tooling (not exercised by the MVP)

```
tooling/
└── ios/
    ├── ExportOptions.plist   # Xcode export options for IPA builds
    ├── Gemfile               # Fastlane's Ruby deps
    ├── README.md
    └── fastlane/
        ├── Appfile
        ├── Fastfile
        └── Matchfile
```

### `docs/` — reference documentation

```
docs/
├── build-plan.md                 # this file
├── product-spec.md               # full product spec / roadmap phases
├── compliance.md                 # compliance guardrail rationale (referenced by CLAUDE.md)
├── scoring.md                     # trust scoring engine details
├── testing.md                     # acceptance-test checklist + manual QA script
├── status.md                      # point-in-time build/PR/CI status snapshot
├── backend-readiness.md
├── connectors.md
├── tooling-options.md
├── credentials-needed.md
├── github-secrets.md
├── mobile-readiness.md
├── mobile-automation-stack.md
├── ios-roadmap.md
├── ios-deployment.md
├── ios-ci-cd-options.md
├── app-store-checklist.md
└── recommended-app-store-path.md
```

## 3. File Creation Order

This is the dependency-respecting order the first vertical slice was (and should be) built in,
derived from the actual `import` statements in each file — not from the PR list in
`docs/status.md` (which is consistent with this order but is a chronological record, not a
dependency graph; the bulk of it landed in one bootstrap commit).

1. **Top-level config** — `package.json`, `tsconfig.json` (sets the `@/*` path alias every later
   file relies on), `tailwind.config.ts` (`content` globs `./app/**/*.{ts,tsx}` and
   `./components/**/*.{ts,tsx}`, so it only needs to exist before those directories are linted/built,
   not before they're authored), `next.config.mjs`, `postcss.config.*`, `.env.example`
   (`DATABASE_URL` as a `file:` URL), `vitest.config.ts`.
2. **`prisma/schema.prisma`** — the `datasource`/`generator` blocks and all six models (`User`,
   `Retailer`, `Store`, `Product`, `Report`, `ReportVote`, `Alert`, `RoutePlan`). Nothing else in
   the repo compiles without the generated `@prisma/client` types this produces.
3. **`prisma/migrations/`** — `20260708200333_init`, then `20260708201618_add_report_previous_status`
   (adds `Report.previousStatus`, used later by the vote route's suppress/restore logic).
   `prisma/migration_lock.toml` pins the `sqlite` provider.
4. **`lib/db.ts`** — the Prisma client singleton (`globalForPrisma` pattern). Imports only
   `@prisma/client`; every other DB-touching module imports `{ prisma }` from here.
5. **Framework-free pure `lib/` modules** (verified zero Next/Prisma imports — only relative
   imports among themselves or none at all):
   - `lib/constants.ts` — no imports at all. The single source of truth for the enum-like arrays
     (`ROLES`, `DEAL_TYPES`, `EVIDENCE_TYPES`, `REPORT_STATUSES`, `MODERATABLE_STATUSES`,
     `VOTE_TYPES`) since SQLite/Prisma has no native enum. Build this first among the pure
     modules — several of the others reference its types.
   - `lib/compliance.ts` — no imports. Allowlist (`ALLOWED_SOURCE_TYPES`) vs blocklist
     (`BLOCKED_SOURCE_TYPES`), `ComplianceError`, `assertSafeSource`, `validateReportInput`.
   - `lib/geo.ts` — no imports. `haversineMiles` only.
   - `lib/format.ts` — no imports. `centsToUSD`, `timeAgo`.
   - `lib/scoring.ts` — imports only `type { DealType, EvidenceType }` from `./constants`.
     `scoreBreakdown`/`confidenceScore`, `isSuppressed`, `applyTrustDelta`/`voteTrustDelta`/`applyVoteChange`.
   - `lib/reports.ts` — no imports. `toReportDate`, `makeDupKey`, `isUniqueViolation` (duck-types
     Prisma's `P2002` error code without importing `@prisma/client`, on purpose, to stay pure).
   - `lib/alerts.ts` — imports `{ ALERT_THRESHOLD }` from `./scoring` and `{ haversineMiles }`
     from `./geo`. `shouldCreateAlert`, `pickNearbyRecipients`.
   - `lib/route.ts` — no imports. `expectedStoreValue`, `scoreStore`, `rankStores`.
   Build order within this group: `constants.ts` → `compliance.ts`/`geo.ts`/`format.ts`/`route.ts`
   (mutually independent) → `scoring.ts` (needs `constants`) → `reports.ts` (independent, but
   logically grouped here since it's the other half of the compliance/dedupe story) → `alerts.ts`
   (needs `scoring` + `geo`).
6. **`prisma/seed.ts`** — imports `PrismaClient` directly (not `lib/db.ts`, since it's a standalone
   script run via `tsx`) and `{ toReportDate }` from `../lib/reports`. Can only be written once the
   schema and `lib/reports.ts` exist. Produces the 5 users / 4 retailers / 8 stores / 12 products /
   10 reports demo dataset every page renders against.
7. **DB-touching `lib/` modules** (import `lib/db.ts` and/or `next/headers`, so they need both the
   schema and the pure modules above):
   - `lib/currentUser.ts` — imports `cookies` from `next/headers` and `{ prisma }`. Defines
     `USER_COOKIE` and `getCurrentUser()`.
   - `lib/leads.ts` — imports `{ prisma }`, types from `./constants`, and
     `{ ageInDays, scoreBreakdown }` from `./scoring`. Defines `LeadView`, `toLeadView`,
     `getFeedLeads`, `getLeadById`, `getModerationQueue`.
   - `lib/routePlanner.ts` — imports `{ prisma }`, `{ haversineMiles }` from `./geo`,
     `{ toLeadView }` from `./leads`, and `{ rankStores }` from `./route`. Defines
     `getRankedStoresForUser`. Depends on `lib/leads.ts`, so it comes after it.
8. **`app/api/**` route handlers** — depend on the DB-touching lib modules above. Real inventory
   (6 files): `app/api/user/route.ts`, `app/api/reports/route.ts`,
   `app/api/reports/[id]/vote/route.ts`, `app/api/reports/[id]/moderate/route.ts`,
   `app/api/alerts/[id]/read/route.ts`, `app/api/route-plans/route.ts`. Natural build order:
   `api/user` (needed by the header user switcher before anything else is demoable) →
   `api/reports` (needs `compliance.ts`, `reports.ts`, `scoring.ts`, `alerts.ts`, `currentUser.ts`) →
   `api/reports/[id]/vote` (needs `scoring.ts`'s suppression/trust-delta helpers) →
   `api/reports/[id]/moderate` (needs `constants.ts#MODERATABLE_STATUSES`, `scoring.ts#isSuppressed`) →
   `api/alerts/[id]/read` → `api/route-plans` (needs `lib/routePlanner.ts`, so it's last).
9. **`app/layout.tsx` + `components/**`** — the layout imports `{ prisma }`, `getCurrentUser`, and
   `UserSwitcher`, so `components/UserSwitcher.tsx` (client component, posts to `/api/user`) must
   exist first. The rest of `components/` — `ConfidenceBadge.tsx`, `LeadCard.tsx` (server,
   composes `ConfidenceBadge` + `lib/leads.ts#LeadView` + `lib/format.ts` + `lib/constants.ts`),
   `ReportForm.tsx` (client, posts to `/api/reports`), `VoteButtons.tsx` (client, posts to
   `/api/reports/[id]/vote`), `ModerationActions.tsx` (client, posts to
   `/api/reports/[id]/moderate`), `MarkReadButton.tsx` (client, posts to `/api/alerts/[id]/read`),
   `SaveRoutePlanButton.tsx` (client, posts to `/api/route-plans`) — are each built alongside the
   page that first uses them (see below), since they have no cross-component dependencies on each
   other.
10. **`app/**/page.tsx` pages** — each depends on its API route(s) + lib module(s) + component(s)
    already existing. Real inventory (8 pages): `app/page.tsx` (feed), `app/search/page.tsx`,
    `app/report/new/page.tsx`, `app/leads/[id]/page.tsx`, `app/route/page.tsx`,
    `app/alerts/page.tsx`, `app/leaderboard/page.tsx`, `app/admin/page.tsx`. Build order mirrors
    the user's first-touch path through the product: feed → search → report/new → leads/[id]
    (the report just submitted needs somewhere to link to) → route → alerts → leaderboard → admin
    (moderation is last since it depends on there being pending reports to moderate).
11. **`tests/*.test.ts`** — one per pure `lib/` module with real logic:
    `tests/scoring.test.ts`, `tests/compliance.test.ts`, `tests/reports.test.ts`,
    `tests/alerts.test.ts`, `tests/route.test.ts`. (`lib/constants.ts`, `lib/geo.ts`,
    `lib/format.ts` have no dedicated test files — they're either pure data or trivial enough to be
    covered indirectly through the modules that consume them.)
12. **Docs** — `docs/product-spec.md`, `docs/compliance.md`, `docs/scoring.md`, `docs/testing.md`,
    and this file, `docs/build-plan.md`, written last since they describe what's already built
    rather than gating it.

## 4. Dependency List

From `package.json` (`pennyforge@0.1.0`). Nothing here was guessed — versions are the exact
semver ranges in the file.

### `dependencies`

| Package | Version | Why it's here |
|---|---|---|
| `next` | `^15.3.0` | The App Router framework itself — `app/`, route handlers, server components. |
| `react` | `^19.0.0` | Required peer for Next 15's App Router / server + client component model. |
| `react-dom` | `^19.0.0` | DOM renderer paired with `react` for client components. |
| `@prisma/client` | `^6.7.0` | Generated, type-safe DB client used at runtime by `lib/db.ts` and every server component/route handler that touches the DB. |

### `devDependencies`

**ORM / database tooling**

| Package | Version | Why it's here |
|---|---|---|
| `prisma` | `^6.7.0` | The Prisma CLI — `generate`, `migrate dev`, `migrate deploy`, `db seed`, matches `@prisma/client`'s version exactly. Pin this explicitly: past major version 7 the CLI drops the `datasource { url }` field this schema relies on (see §1's gotcha). |

**Styling**

| Package | Version | Why it's here |
|---|---|---|
| `tailwindcss` | `^3.4.17` | Utility CSS framework configured in `tailwind.config.ts` (custom `forge` color scale) and consumed via `app/globals.css`. |
| `postcss` | `^8.4.47` | Required build pipeline underneath Tailwind; driven by `postcss.config.mjs`. |
| `autoprefixer` | `^10.4.20` | PostCSS plugin for vendor-prefixing, wired into `postcss.config.mjs` alongside `tailwindcss`. |

**Testing**

| Package | Version | Why it's here |
|---|---|---|
| `vitest` | `^3.0.0` | Unit test runner for `tests/**/*.test.ts`, covering `lib/*.ts` (scoring, dedupe, decay, dead-vote suppression, alert dedupe, compliance guardrails per `npm test`). |

**TypeScript / linting / tooling**

| Package | Version | Why it's here |
|---|---|---|
| `typescript` | `^5.7.0` | Compiler/type-checker; backs `tsc --noEmit` (`npm run typecheck`) and all `.ts`/`.tsx` authoring. |
| `@types/node` | `^22.10.0` | Type defs for Node APIs used in `scripts/`, `prisma/seed.ts`, and config files. |
| `@types/react` | `^19.0.0` | Type defs matching the `react@^19` runtime dependency. |
| `@types/react-dom` | `^19.0.0` | Type defs matching the `react-dom@^19` runtime dependency. |
| `eslint` | `^8.57.0` | Lint engine driven by `next lint` (`npm run lint`). |
| `eslint-config-next` | `^15.3.0` | Next's recommended rule set (`next/core-web-vitals`), the sole entry in `.eslintrc.json`, version-matched to the `next` dependency. |
| `tsx` | `^4.19.0` | Executes TypeScript directly without a separate build step; used by `package.json`'s `"prisma": { "seed": "tsx prisma/seed.ts" }` field so `prisma db seed` runs the seed script as-authored. |

`npm run verify` chains four of the scripts these packages back — `lint && typecheck && test &&
build` — as a fast local code-health check. It does not run the Prisma steps (`generate`/`migrate
deploy`/`seed`) that CI also runs — see §11 for the full CI-equivalent sequence. Verified directly
against this repo's `package.json`.

## 5. Prisma Setup Steps

### 5.1 Bootstrapping (the `prisma init` equivalent)

1. Add `prisma` (CLI, devDependency) and `@prisma/client` (runtime dependency) — both pinned to
   `^6.7.0` in `package.json`.
2. Create `prisma/schema.prisma` with a `generator` and `datasource` block instead of relying on
   `prisma init`'s scaffolded template, since the target was SQLite from day one:

   ```prisma
   generator client {
     provider = "prisma-client-js"
   }

   datasource db {
     provider = "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

3. Point `DATABASE_URL` at a local SQLite file via a `file:` URL, documented in `.env.example`:

   ```
   DATABASE_URL="file:./dev.db"
   ```

   The comment in `.env.example` calls out that the path is relative to the `prisma/` directory
   (Prisma resolves SQLite `file:` URLs relative to `schema.prisma`'s location), and the same file
   documents the Phase-1 swap: change the `datasource` provider to `postgresql` and point
   `DATABASE_URL`/`DIRECT_URL` at Supabase — no model changes required.

### 5.2 Writing the models, in dependency order

The models in `prisma/schema.prisma` are declared in the order they're introduced below. This
order isn't cosmetic — each model after `User` and `Retailer` has a real foreign key into a model
already defined above it, which is verified directly against the FK constraints emitted in
`prisma/migrations/20260708200333_init/migration.sql`:

1. **`User`** — no foreign keys. `id String @id @default(cuid())`, unique `email` and `handle`,
   `role` and `locale` as plain `String` columns with defaults (`"USER"`, `"en"`) since Prisma has
   no native enum on SQLite, `trustScore Int @default(50)`, optional `homeZip`/`homeLat`/`homeLng`.
2. **`Retailer`** — no foreign keys. Just `id`, unique `name`, unique `slug`.
3. **`Store`** — first model with an FK: `retailerId String` + `retailer Retailer @relation(fields: [retailerId], references: [id])`.
   Has `@@index([state, zip])` for route-planner lookups by region.
4. **`Product`** — FK to `Retailer` (`retailerId`), same pattern as `Store`. Indexed on `@@index([upc])`
   and `@@index([sku])` for the manual UPC/SKU search flow.
5. **`Report`** — FKs to `Product` (`productId`), `Store` (`storeId`), and `User` (`userId`). This is
   the widest model: `priceCents Int`, `dealType`/`evidenceType`/`sourceType`/`status` as validated
   `String` enums (`lib/constants.ts`), `previousStatus String?` (added in the second migration —
   see 5.3), and the `reportDate`/`createdAt` pair covered in the callout below.
6. **`ReportVote`** — FKs to `Report` (`reportId`) and `User` (`userId`), with
   `@@unique([reportId, userId])` so a user has exactly one (mutable) vote per report.
7. **`Alert`** — FKs to `Product`, `Store`, `User` (all required), and `Report` (optional —
   `reportId String?` / `report Report? @relation(...)`, since a suppressed/deleted report
   shouldn't take its alerts down with it). Indexed on `@@index([userId, createdAt])` for the
   inbox view and `@@index([productId, storeId, createdAt])` for alert-dedupe window lookups
   (`lib/alerts.ts`).
8. **`RoutePlan`** — FK to `User` only. `stopsJson String` holds a serialized JSON array of
   `{storeId, storeName, distanceMiles, expectedValue, routeScore}`, kept as a string rather than a
   relation table since SQLite has no native JSON column type and the MVP has no need to query
   inside it.

Every FK in the generated SQL uses `ON DELETE RESTRICT ON UPDATE CASCADE`, except
`Alert_reportId_fkey`, which is `ON DELETE SET NULL ON UPDATE CASCADE` — consistent with `reportId`
being optional on `Alert`.

### 5.3 Migrations

Two migrations exist under `prisma/migrations/`, both applied with `npx prisma migrate dev`
(aliased as `npm run prisma:migrate` / `npm run db:migrate:dev` in `package.json`; `npm run db:migrate`
maps to `prisma migrate deploy` for non-interactive/CI application of already-generated migrations):

1. **`20260708200333_init`** — `npx prisma migrate dev --name init`. Emits all 8 `CREATE TABLE`
   statements in the order above, plus every `@@index`/`@@unique` as a separate `CREATE INDEX` /
   `CREATE UNIQUE INDEX` statement, including the composite one from the callout below:
   `CREATE UNIQUE INDEX "Report_productId_storeId_userId_reportDate_key" ON "Report"("productId", "storeId", "userId", "reportDate");`.
2. **`20260708201618_add_report_previous_status`** — `npx prisma migrate dev --name add_report_previous_status`,
   run after adding `previousStatus String?` to the `Report` model (to preserve a report's prior
   `status` across an auto-suppression/reversal cycle without losing moderation history). The whole
   migration is one line: `ALTER TABLE "Report" ADD COLUMN "previousStatus" TEXT;`.

`prisma/migrations/migration_lock.toml` records `provider = "sqlite"` and is generated/maintained
by the CLI, not hand-edited. Each `migrate dev` invocation also regenerates the Prisma Client
(equivalent to `npm run prisma:generate` / `npm run db:generate`, i.e. `prisma generate`), so
`@prisma/client` types stay in sync with the schema without a separate step in normal dev flow.

> **Callout — why `reportDate` exists as a real column, not `date(createdAt)`**
>
> The natural way to prevent a user from reporting the same product at the same store twice in one
> day is a composite unique constraint keyed partly on the calendar date of `createdAt`. On SQLite,
> `UNIQUE(product_id, store_id, user_id, date(created_at))` is rejected outright — SQLite prohibits
> expressions inside table-level `UNIQUE` constraints ("expressions prohibited in PRIMARY KEY and
> UNIQUE constraints"), and this was confirmed directly against `sqlite3` before it shaped the
> schema (see `CLAUDE.md`, "Schema note: `reportDate`, not `date(createdAt)`").
>
> The fix, as built: `Report` stores `reportDate DateTime` as a genuine column alongside
> `createdAt DateTime @default(now())`, and the constraint is a plain composite unique over columns —
> no expressions:
>
> ```prisma
> @@unique([productId, storeId, userId, reportDate])
> ```
>
> `reportDate` is never set by the database — it's computed at the application layer by
> `toReportDate()` in `lib/reports.ts`, which truncates a timestamp to its UTC calendar date at
> midnight:
>
> ```ts
> export function toReportDate(d: Date = new Date()): Date {
>   return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
> }
> ```
>
> Every write path that creates a `Report` (the seed script's `mkReport` helper, and the
> report-submission route handler) must pass `reportDate: toReportDate(createdAt-or-now)` explicitly.
> `lib/reports.ts` also exports `makeDupKey()`, an app-layer mirror of the same composite key for
> pre-flight duplicate checks, and `isUniqueViolation()`, which detects Prisma's `P2002` unique-
> constraint-violation error code without importing Prisma's error types into that module. Do not
> revert this to a `date(createdAt)` expression — it does not compile under SQLite.

## 6. Seed Script Steps

`prisma/seed.ts` is a single `main()` async function, run end-to-end, that wipes the local DB and
recreates a fixed demo dataset so every MVP screen (feed, search, report detail, voting, alerts,
admin moderation, route planner) has real data to render against.

### 6.1 Wipe (FK-safe order)

The script deletes in child-before-parent order so no `RESTRICT` foreign key ever blocks a delete:

```ts
await prisma.alert.deleteMany();
await prisma.reportVote.deleteMany();
await prisma.routePlan.deleteMany();
await prisma.report.deleteMany();
await prisma.product.deleteMany();
await prisma.store.deleteMany();
await prisma.retailer.deleteMany();
await prisma.user.deleteMany();
```

`Alert` and `ReportVote` both reference `Report` (and `User`), so they're cleared first; `RoutePlan`
only references `User` so it can go any time before the final `user.deleteMany()`; `Report` itself
(referencing `Product`, `Store`, `User`) goes before those three; `Product` and `Store` (each
referencing `Retailer`) go before `Retailer`; `User` — depended on by everything else — is deleted
last. Because every table is fully cleared before anything is recreated, re-running the script
produces the same shaped dataset every time (record `id`s are fresh `cuid()`s each run, but counts,
relationships, and field values are identical) — safe to run repeatedly against a dev database.

### 6.2 Create (exact counts, verified from source and from a live seed run)

In creation order:

- **5 users** — `casey` (`USER`, trustScore 55), `rey` (`USER`, trustScore 72), `lena` (`USER`,
  trustScore 40, `locale: "es"`), `captain` (`CAPTAIN`, trustScore 85), `admin`
  (`ADMIN`, trustScore 90).
- **4 retailers** — Home Depot (`home-depot`), Lowe's (`lowes`), Dollar General (`dollar-general`),
  Walmart (`walmart`).
- **8 stores** — HD Midtown Atlanta, HD Cumberland, Lowe's Edgewood, DG East Atlanta, DG Marietta,
  Walmart Supercenter Decatur, HD Jacksonville Southside, Lowe's NW Dallas. Six are in the Atlanta,
  GA metro; two (`hdJax` in FL, `lowesDallas` in TX) are deliberately out-of-region to exercise
  distance/route-ranking logic against non-local stores.
- **12 products** across the 4 retailers' categories (Tools, Lighting, Power Tools, Paint, Outdoor,
  Smart Home, Home, Toys, Seasonal, Electronics, Kitchen) — e.g. `Husky 10-Piece Screwdriver Set`,
  `DEWALT 20V MAX Drill/Driver Kit`, `onn. 50" 4K Roku TV (open box)`. Two of the twelve (`holiday`,
  `airFryer`) are seeded only for search/browse and intentionally have no reports attached
  (explicitly voided with `void holiday; void airFryer;` to satisfy unused-variable lint since
  they're referenced by nothing else).
- **10 reports**, created through a local `mkReport` helper that wraps `prisma.report.create` and
  always supplies `reportDate: toReportDate(data.createdAt)` (see the reportDate callout in §5) so
  every seeded report satisfies the same-day composite unique constraint. The 10 cover a
  deliberate spread of states for UI coverage: high-confidence receipt-verified penny find
  (`status: "APPROVED"`, 2 confirms), a shelf-tag lead, a hidden-clearance find with no shelf tag,
  a fresh `PENDING` photo-only report, a plain approved clearance report, a `SUPPRESSED` dead lead
  (2 dead votes, `TEXT_ONLY` evidence), a 20-day-old stale-but-real clearance report (to exercise
  score decay), an out-of-state `PENDING` text-only lead (TX), and two more approved reports
  (Walmart open-box TV, DG penny toys).
- **7 report votes**, created in one `prisma.reportVote.createMany({ data: [...] })` call: 5
  `CONFIRMED` votes spread across three of the approved reports, and 2 `DEAD` votes on the same
  report (the paint report, driving its `SUPPRESSED` status above the dead-vote threshold).
- **3 alerts**, created in one `prisma.alert.createMany({ data: [...] })` call: two alerts fanned out
  to different recipients (`casey`, `captain`) for the same high-confidence screwdriver report, and
  one alert to `casey` for the DG penny-toys report — modeling the mock alert fan-out with no real
  push/notification infrastructure, per `CLAUDE.md`'s "no real push notifications in the MVP" rule.
- **1 route plan** — `rey`'s "Saturday Atlanta run", a `stopsJson` array of two stops (HD Midtown
  Atlanta, Walmart Supercenter Decatur) with per-stop `distanceMiles`/`expectedValue`/`routeScore`
  and a `totalScore` of `314.3`.

The script's own header comment states the same shape: "5 users, 4 retailers, 8 stores, 12
products, 10 reports with realistic vote/alert patterns" — and a live `npx prisma migrate dev`
run against this repo (see §11) printed the matching post-seed counts:
`{ users: 5, retailers: 4, stores: 8, products: 12, reports: 10, votes: 7, alerts: 3, routePlans: 1 }`.

### 6.3 Wiring and invocation

`package.json` declares the seed entry point in the top-level `"prisma"` block (this is what makes
`prisma db seed` know what to run — it's not inferred):

```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

Run it directly with:

```bash
npx prisma db seed
```

or via either of the two equivalent npm script aliases defined in `package.json`'s `"scripts"`
block:

```bash
npm run prisma:seed   # -> prisma db seed
npm run db:seed        # -> prisma db seed
```

`prisma migrate dev` also runs the seed automatically after applying pending migrations against a
fresh/reset database, so in the common case (`npm run prisma:migrate` / `npm run db:migrate:dev`)
there's no separate seed step to remember — but any of the three commands above can be re-run
standalone at any time to reset the demo data back to its known-good state, since the wipe step in
6.1 makes the whole script idempotent.

## 7. Core App Routes/Pages

All 8 pages live under `app/` and are server components (none has a `"use client"` directive);
each sets `export const dynamic = "force-dynamic"` since every page reads live DB state via
`lib/db.ts#prisma` and none can be statically prerendered. Interactivity is delegated to client
components in `components/`.

| Route | File | Purpose | Key dependencies | Component type |
|---|---|---|---|---|
| `/` | `app/page.tsx` | Local deal feed, filterable by state/retailer/store/min-confidence | `lib/db.ts`, `lib/leads.ts#getFeedLeads`, `components/LeadCard.tsx` | Server |
| `/search` | `app/search/page.tsx` | Manual UPC/SKU/name search (the input a future barcode scanner would feed) | `lib/db.ts` (`prisma.product.findMany` with `contains` filters), `lib/leads.ts#toLeadView`, `components/LeadCard.tsx`, `lib/format.ts#centsToUSD` | Server |
| `/report/new` | `app/report/new/page.tsx` | Submit a first-hand find (store, product, price, evidence, source type, notes) | `lib/db.ts` (stores + products for the form), `components/ReportForm.tsx` (client, `POST /api/reports`) | Server (renders a client form) |
| `/leads/[id]` | `app/leads/[id]/page.tsx` | Lead detail — full confidence-score breakdown ("why is this trusted?"), evidence, confirm/dead voting | `lib/leads.ts#getLeadById`, `lib/format.ts`, `lib/constants.ts#EVIDENCE_LABELS`, `components/ConfidenceBadge.tsx`, `components/VoteButtons.tsx` (client, `POST /api/reports/[id]/vote`) | Server (renders a client vote widget) |
| `/route` | `app/route/page.tsx` | Route ROI planner — ranks stores by expected value minus round-trip gas cost, hides negative-ROI trips, lists saved plans | `lib/currentUser.ts#getCurrentUser`, `lib/routePlanner.ts#getRankedStoresForUser`, `lib/route.ts#DEFAULT_COST_PER_MILE`, `lib/db.ts` (saved `RoutePlan`s), `components/SaveRoutePlanButton.tsx` (client, `POST /api/route-plans`) | Server (renders a client save button) |
| `/alerts` | `app/alerts/page.tsx` | Mock alerts inbox (read/unread), deduped fan-out from report submission | `lib/currentUser.ts`, `lib/db.ts` (`prisma.alert.findMany`), `lib/format.ts#timeAgo`, `components/ConfidenceBadge.tsx`, `components/MarkReadButton.tsx` (client, `POST /api/alerts/[id]/read`) | Server (renders a client mark-read button) |
| `/leaderboard` | `app/leaderboard/page.tsx` | Contributor leaderboard — trust score, reports, approvals, confirmations received | `lib/db.ts` (`prisma.user.findMany` with nested `reports`/`votes`, aggregated in-page) | Server, no client components |
| `/admin` | `app/admin/page.tsx` | Moderation queue (pending/suppressed/rejected), gated to `ADMIN`/`CAPTAIN` roles | `lib/leads.ts#getModerationQueue`, `lib/currentUser.ts`, `lib/format.ts`, `lib/constants.ts#EVIDENCE_LABELS`, `components/ConfidenceBadge.tsx`, `components/ModerationActions.tsx` (client, `POST /api/reports/[id]/moderate`) | Server (renders client approve/reject buttons) |

`app/layout.tsx` (the root layout, not counted among the 8) is also a server component: it fetches
`prisma.user.findMany()` and `getCurrentUser()` to render the nav bar and
`components/UserSwitcher.tsx` (client, `POST /api/user`), which is how the mock-auth `pf_user_id`
cookie gets set.

## 8. Server Actions/API Routes

All mutation goes through route handlers under `app/api/**` — there are no Next.js Server Actions
in this codebase, only `route.ts` files. Real inventory (6 files), each calling `getCurrentUser()`
from `lib/currentUser.ts` for mock auth except where noted:

### `POST /api/user` — `app/api/user/route.ts`
- **Request:** `{ userId: string }`.
- **Logic:** looks up the user by id, then sets the `pf_user_id` cookie (`httpOnly`, `sameSite: "lax"`,
  `secure` in production) via `next/headers`'s `cookies()`. This is the only route that doesn't
  call `getCurrentUser()` — it's what establishes the identity `getCurrentUser()` later reads.
- **Responses:** `404` `{ error: "Unknown user" }` if the id doesn't resolve; `200`
  `{ ok: true }` on success.

### `POST /api/reports` — `app/api/reports/route.ts`
- **Request:** `{ storeId, productId?, newProduct?: { name, upc?, sku? }, priceCents, dealType,
  evidenceType, evidenceUrl?, sourceType, notes? }`.
- **Logic, in enforced order:** (1) `getCurrentUser()` — `401` `{ error: "No current user" }` if
  none. (2) `storeId` presence, `dealType` in `lib/constants.ts#DEAL_TYPES`, `evidenceType` in
  `EVIDENCE_TYPES` — `400` on any miss. (3) `lib/compliance.ts#validateReportInput` (source-type
  allowlist, price-cents sanity range, evidence-URL scheme) — catches `ComplianceError` and
  returns `422` with the compliance message; this runs **before any DB write**. (4) resolves the
  `Store` (`404` `{ error: "Unknown store" }` if missing). (5) resolves the product: an existing
  `productId` must belong to the same retailer as the store (`404` `{ error: "Unknown product" }`
  if it doesn't exist, `400` `{ error: "Product does not belong to this store's retailer" }` if
  the retailer mismatches) — this is the "trust boundary" check the code comments call out, since
  a client-supplied `productId` could otherwise be forged; a `newProduct.name` is deduped against
  existing products by UPC/SKU/name for the same retailer before minting a new `Product` row, so
  same-day duplicate prevention (keyed by `productId`) can't be bypassed by resubmitting under a
  "new" product. Missing both `productId` and `newProduct.name` → `400`
  `{ error: "productId or newProduct.name is required" }`. (6) inserts the `Report` with
  `reportDate = toReportDate(now)` (`lib/reports.ts`); catches Prisma's `P2002` via
  `isUniqueViolation` and turns it into `409`
  `{ error: "You already reported this product at this store today. Confirm the existing lead instead." }`.
  (7) computes `confidenceScore` (`lib/scoring.ts`) for the fresh report (confirms/deads = 0,
  ageDays = 0) and fans out mock `Alert` rows to nearby users via
  `lib/alerts.ts#pickNearbyRecipients` + `shouldCreateAlert`, excluding the reporter and any user
  missing home coordinates, deduped per recipient over the `ALERT_DEDUPE_WINDOW_MS` (24h) window.
- **Success response:** `201` `{ id: report.id, score, alertsCreated }`.

### `POST /api/reports/[id]/vote` — `app/api/reports/[id]/vote/route.ts`
- **Request:** `{ vote: "CONFIRMED" | "DEAD" }` (`lib/constants.ts#VOTE_TYPES`).
- **Logic:** `401` if no current user. `400` `{ error: "vote must be one of CONFIRMED, DEAD" }` on
  an invalid vote value. The whole read-modify-write runs inside a single `prisma.$transaction`:
  looks up the `Report` (`404` `{ error: "Unknown report" }` if missing); rejects self-voting with
  `403` `{ error: "You can't vote on your own report" }`; upserts the one-per-`(report, user)`
  `ReportVote`; computes the net trust delta via `lib/scoring.ts#voteTrustDelta` (so toggling a
  vote back and forth can't repeatedly inflate/crater trust) and applies it as a single atomic
  `UPDATE ... SET "trustScore" = CASE WHEN ... END` raw SQL statement (chosen over SQLite's scalar
  `MAX`/`MIN` specifically because Postgres's `MAX`/`MIN` are aggregate-only, per the file's own
  comment about staying Postgres-portable); recomputes `confirms`/`deads` and
  `lib/scoring.ts#isSuppressed`, flipping `Report.status` to `SUPPRESSED` (saving `previousStatus`)
  or restoring `previousStatus` when suppression reverses.
- **Success response:** `200` `{ confirms, deads, suppressed }`.

### `POST /api/reports/[id]/moderate` — `app/api/reports/[id]/moderate/route.ts`
- **Request:** `{ status: "APPROVED" | "REJECTED" }` (`lib/constants.ts#MODERATABLE_STATUSES` —
  `PENDING` and `SUPPRESSED` are deliberately excluded since those are system/vote-driven states,
  never moderator-set).
- **Logic:** `403` `{ error: "Moderator role required" }` unless the current user's role is
  `ADMIN` or `CAPTAIN`. `400` if `status` isn't a moderatable value. `404`
  `{ error: "Unknown report" }` if the report doesn't exist. If approving, re-checks
  `lib/scoring.ts#isSuppressed` against the report's live votes and blocks the transition with
  `409` `{ error: "This report is community-suppressed by dead votes and can't be approved until votes change." }`
  if it's still dead-vote-suppressed (rejecting is always allowed, since it can't misrepresent a
  dead lead as live). On success, updates `status` and clears `previousStatus`.
- **Success response:** `200` `{ id: report.id, status: report.status }`.

### `POST /api/alerts/[id]/read` — `app/api/alerts/[id]/read/route.ts`
- **Request:** no body.
- **Logic:** `401` if no current user. Looks up the `Alert`; `404` `{ error: "Unknown alert" }` if
  it doesn't exist **or** doesn't belong to the current user (ownership check folded into the same
  404 so as not to leak existence of other users' alerts). Sets `readAt`.
- **Success response:** `200` `{ ok: true }`.

### `POST /api/route-plans` — `app/api/route-plans/route.ts`
- **Request:** `{ name?: string }`.
- **Logic:** `401` if no current user. Calls `lib/routePlanner.ts#getRankedStoresForUser`, sums
  `routeScore` across ranked stores, and persists a `RoutePlan` row with `stopsJson` (the ranked
  stores serialized) and `totalScore`. `name` defaults to `"My route"` if omitted/falsy.
- **Success response:** `201` `{ id: plan.id }`.

## 9. Test Setup

### Vitest configuration

`vitest.config.ts` at the repo root is intentionally minimal:

```ts
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

- **`environment: "node"`** — no jsdom/browser environment is configured. This is a direct
  consequence of the CLAUDE.md coding standard that pure business logic lives in framework-free
  `lib/*.ts` functions: every current test imports only from `lib/*`, never from a React component
  or a Next.js route handler, so a DOM environment is unnecessary overhead the config correctly
  omits.
- **`include: ["tests/**/*.test.ts"]`** — tests live in a top-level `tests/` directory (not
  colocated `__tests__` folders under `lib/` or `app/`), and only `.test.ts` files match.
- **`@` path alias** resolves to the repo root, mirroring `tsconfig.json`'s path mapping, so test
  files import via `@/lib/scoring` etc. rather than relative `../../lib/scoring` paths.
- There is no `setupFiles`, no coverage config, and no `@testing-library/react` dependency — there
  is currently no component-testing environment in this repo. Anything that needs DOM rendering or
  route-handler/DB integration testing is out of scope for the vitest suite as configured; it's
  covered instead by the manual QA script in `docs/testing.md`.

### Test inventory (`tests/*.test.ts`, 5 files)

- **`tests/scoring.test.ts`** (`@/lib/scoring`) — evidence-type ordering (receipt > shelf tag >
  product photo > text-only), confirmation bonus capped at 3 confirms, reporter-trust bonus,
  score clamping to `[0, 100]`, exponential decay (7-day penny half-life, near-zero by 30 days,
  clearance decaying slower than penny at the same age, a confirmation refreshing freshness),
  dead-vote penalty and the confirm/dead suppression rule, and `applyTrustDelta`/`applyVoteChange`
  trust-score arithmetic including switch-vote and boundary-clamp cases so a user can't inflate
  trust by resubmitting the same vote.
- **`tests/reports.test.ts`** (`@/lib/reports`) — `toReportDate` UTC-midnight truncation,
  `makeDupKey` stability within the same calendar day vs. divergence across a day boundary and
  across different users, and `isUniqueViolation` correctly recognizing Prisma's `P2002`
  unique-constraint error shape (and rejecting non-`P2002` errors, arbitrary `Error`s, and `null`).
- **`tests/alerts.test.ts`** (`@/lib/alerts`) — `shouldCreateAlert` threshold gating, 24-hour dedupe
  for the same product+store, re-alert once the 24h window passes, no dedupe across different
  products/stores; plus `pickNearbyRecipients` radius-based fan-out (includes near users, excludes
  far users and the reporter themself, excludes users with no home coordinates, respects a custom
  radius override).
- **`tests/route.test.ts`** (`@/lib/route`) — `scoreStore`/`rankStores` confidence-weighted expected
  value, suppressed leads contributing zero, round-trip gas-cost subtraction, a far-but-high-value
  store outranking a close-but-low-value one, and negative-ROI trips being excluded entirely from
  the ranked list.
- **`tests/compliance.test.ts`** (`@/lib/compliance`) — every `ALLOWED_SOURCE_TYPES` entry passes
  `assertSafeSource`, every `BLOCKED_SOURCE_TYPES` entry throws `ComplianceError`, unknown/novel
  source strings (and the empty string) are rejected by default — proving the allowlist-not-denylist
  posture required by CLAUDE.md — plus `validateReportInput` price-bound checks (zero, non-integer,
  and over-max cents all rejected), non-`http(s)` evidence-URL scheme rejection, and one
  fully-compliant submission that passes end-to-end.

### Actual run, verified against this branch

```
$ npm test
> pennyforge@0.1.0 test
> vitest run

 ✓ tests/compliance.test.ts (7 tests) 5ms
 ✓ tests/scoring.test.ts (18 tests) 6ms
 ✓ tests/alerts.test.ts (11 tests) 6ms
 ✓ tests/reports.test.ts (5 tests) 4ms
 ✓ tests/route.test.ts (5 tests) 5ms

 Test Files  5 passed (5)
      Tests  46 passed (46)
   Duration  769ms
```

**46/46 tests passing across the 5 files**, no flakiness, no skips. This matches the per-file test
count implied by reading each spec file directly (7 + 18 + 11 + 5 + 5 = 46), so the number is
corroborated two ways, not just asserted from a single run, and matches `docs/status.md`'s
recorded CI result.

### Acceptance tests and manual QA

`docs/testing.md` is the source of truth for everything beyond the unit suite — do not duplicate it
here, only summarize: it lists 16 numbered **acceptance tests** (setup completes clean; `/`,
`/search`, `/leaderboard`, `/alerts`, and `/admin` each render seeded data instead of an empty
state; search/filter correctness; duplicate-report 409; blocked-source 422; dead-vote suppression
flipping a report to `SUPPRESSED`; alert dedupe; moderation gating; route-planner
ranking/exclusion; self-vote 403; and "unit suite all green") plus a **5-minute manual QA script**
(11 steps: run setup → dev, browse the feed, read a score breakdown, vote as `casey_hunts`, submit
as `lena_finds` with a low-evidence report, trigger the duplicate-report error, trigger a blocked-
source compliance error, check `/alerts`, check `/route`, moderate as `forge_admin`, check
`/leaderboard`). Anyone validating a change to `lib/scoring.ts`, `lib/compliance.ts`, `lib/route.ts`,
or `lib/alerts.ts` should run `npm test` first, then walk `docs/testing.md`'s manual QA script
against `npm run dev` before considering the change verified — the unit suite proves the pure
functions are correct in isolation, the manual script proves they're wired correctly through the
API routes and pages.

## 10. Git Checkpoint Plan

### What actually landed (per `docs/status.md` and `git log`)

The bulk of the vertical slice (schema, compliance/scoring/route/alerts/reports libs, all pages
and API routes, seed data, and all 5 vitest suites) landed as one large bootstrap commit, with the
CI workflow and review-feedback fixes following as separate commits in the same PR. That's a
defensible way to ship a from-scratch MVP fast, but it's not how a reviewer would want to review
it, and it's not a good template for future feature work on this repo. The plan below is the
**forward-looking checkpoint structure** a builder should follow next time — logically ordered,
independently reviewable, each one buildable and (where applicable) testable on its own.

### Recommended checkpoint sequence

1. **`chore: project init + tooling`**
   Next.js (App Router) + TypeScript scaffold, Tailwind config, `tsconfig.json` path alias (`@/*`),
   ESLint config, `package.json` scripts (`dev`/`build`/`lint`/`test`), `.env.example`,
   `scripts/setup.sh`. No app code yet. Reviewable purely as "does this repo boot."
   *Depends on: nothing.*

2. **`feat: prisma schema + migrations + seed`**
   `prisma/schema.prisma` (`User`, `Retailer`, `Store`, `Product`, `Report`, `ReportVote`, `Alert`,
   `RoutePlan`), the SQLite-safe `reportDate` column + `@@unique([productId, storeId, userId,
   reportDate])` (see CLAUDE.md's schema note — this constraint shape has to be right before any
   report-writing code is built on top of it), `lib/db.ts` (Prisma client singleton), initial
   migration, `prisma/seed.ts` with demo users/retailers/stores/products. No UI, no business logic
   yet — this checkpoint is reviewable as "does the data model hold together and seed cleanly."
   *Depends on: (1).*

3. **`feat: compliance + scoring + alerts + route lib`**
   `lib/constants.ts` (enum-like string arrays), `lib/compliance.ts` (allowlist/denylist,
   `ComplianceError`, `validateReportInput`), `lib/scoring.ts` (`confidenceScore`, `isSuppressed`,
   `applyTrustDelta`, `applyVoteChange`), `lib/reports.ts` (`toReportDate`, `makeDupKey`,
   `isUniqueViolation`), `lib/alerts.ts` (`shouldCreateAlert`, `pickNearbyRecipients`), `lib/route.ts`
   (`scoreStore`, `rankStores`). This is the highest-risk, highest-value checkpoint — it's pure
   TypeScript with zero framework surface, so it's the natural place to land alongside its own tests
   rather than after the UI. In practice pairing this with checkpoint 6 (tests) as two reviewable
   commits on the same PR, rather than one combined commit, keeps "here is the algorithm" separate
   from "here is the proof it's correct."
   *Depends on: (1) for `lib/constants.ts` conventions; independent of (2) — none of these functions
   touch Prisma directly (by design, per CLAUDE.md's framework-free rule).*

4. **`feat: feed/search/report pages + API routes`**
   `app/page.tsx` (feed, filterable by state/retailer/store/min-confidence), `app/search/page.tsx`,
   `app/report/new/page.tsx`, `app/leads/[id]/page.tsx`, `lib/currentUser.ts` + `POST /api/user`
   (mock-auth cookie), `POST /api/reports` wiring `lib/compliance.ts` + `lib/scoring.ts` +
   `lib/reports.ts` dedupe together, `GET` routes backing the feed/search pages. This is where the
   compliance guardrail becomes an enforced 422 and the duplicate-report 409 becomes real, because
   both depend on (2)'s schema and (3)'s pure functions.
   *Depends on: (2), (3).*

5. **`feat: voting + moderation + route planner UI`**
   `POST /api/reports/[id]/vote` (confirm/dead, self-vote 403, wired to `lib/scoring.ts`'s
   trust/vote-change functions), `app/admin/page.tsx` + moderation API routes (approve/reject, role
   -gated via `lib/currentUser.ts`), `app/route/page.tsx` + its API route (wired to `lib/route.ts`),
   `app/alerts/page.tsx` (wired to `lib/alerts.ts`), `app/leaderboard/page.tsx`. This is the largest
   UI checkpoint because voting, moderation, and route planning all read/write the same `Report`
   rows and are easiest to review together for consistency (e.g., a suppressed report must
   disappear from both the feed and the route planner in the same commit).
   *Depends on: (3), (4).*

6. **`test: vitest suites for scoring/compliance/alerts/route/reports`**
   `vitest.config.ts` + the 5 files under `tests/`. Reviewable purely against (3)'s function
   signatures — this checkpoint should be small and fast to review precisely because it's testing
   already-isolated pure functions.
   *Depends on: (3) only, not (4)/(5) — proof that keeping business logic framework-free paid off:
   the test suite never needed the pages or API routes to exist first.*

7. **`chore: CI workflow`**
   `.github/workflows/ci.yml` — checkout → `setup-node` → `npm ci` → `prisma generate` → `prisma
   migrate deploy` → `prisma db seed` → `lint` → `test` → `build`, against a scratch SQLite file.
   Landed for real as its own commit after the MVP bootstrap, which is the right call — CI should
   be added once there's something for it to run.
   *Depends on: (1)–(6) all needing to pass for the workflow to be meaningful.*

8. **`docs: product-spec/compliance/scoring/testing`**
   `docs/product-spec.md`, `docs/compliance.md`, `docs/scoring.md`, `docs/testing.md`, and the
   README's Getting Started section. Written last so they describe what was actually built rather
   than what was planned, while staying close enough in time to the code that they don't drift.
   *Depends on: (1)–(7) — can't accurately document behavior that doesn't exist yet.*

### Why this ordering, not another

- **Schema before libs before pages** is load-bearing, not stylistic: `lib/compliance.ts` and
  `lib/scoring.ts` are pure functions with no Prisma import, so they genuinely don't need the schema
  to exist first — but the *pages and API routes* (4)–(5) do need both, so schema-then-libs-then-
  pages is the only order where nothing in a later checkpoint blocks on something not yet reviewed.
- **Tests as their own checkpoint (6), decoupled from pages (4)/(5)** reflects a real, verifiable
  property of this codebase: all 46 tests import only from `lib/*.ts` (confirmed by reading every
  `tests/*.test.ts` import line), never from `app/**` or a route handler. A reviewer could approve
  checkpoint 6 the moment checkpoint 3 lands, without waiting on the UI — that's the payoff of the
  CLAUDE.md rule to keep business logic framework-free.
- **CI after the code it runs, docs last** matches what the real history did (the CI workflow
  commit came after the MVP bootstrap commit) and is the only order that avoids a red pipeline on
  day one.
- Real history compressed (2)–(6) into a single commit for speed; that's a reasonable call for a
  solo from-scratch bootstrap under time pressure, but the 8-checkpoint plan above is what to
  follow for the *next* feature of comparable size, where independent reviewability matters more
  than raw speed.

## 11. Local Run Instructions

### From a fresh clone

```bash
git clone <repo-url> pennyforge
cd pennyforge

npm install

cp .env.example .env       # DATABASE_URL="file:./dev.db" — no edits needed for local dev

npx prisma generate        # regenerates the Prisma client into node_modules
npx prisma migrate dev --name init   # creates prisma/dev.db and applies the schema
npx prisma db seed         # tsx prisma/seed.ts — demo users/retailers/stores/products/reports

npm run dev                # http://localhost:3000
```

All of the above is exactly what `scripts/setup.sh` automates — `npm run setup` (→ `bash
scripts/setup.sh`) runs, in order: `npm install`; copy `.env.example` → `.env` only if `.env`
doesn't already exist (it will not clobber a `.env` you've customized); `npx prisma generate`;
`npx prisma migrate dev --name init`; `npx prisma db seed`. So `npm run setup && npm run dev` is
the two-command path from a bare clone to a running app.

**Verified end-to-end against this branch**, from a checkout with no `node_modules`, no `.env`,
and no `prisma/dev.db`: `npm install` → `npx prisma generate` → `npx prisma migrate dev --name
init` (applied both committed migrations and auto-ran the seed, printing the exact counts in §6.2)
→ `npm test` (46/46 green) → `npm run dev` → `curl http://localhost:3000/` and `curl
http://localhost:3000/search` both returned `200` with seeded lead content ("Confidence", "Penny",
"clearance" strings present in the rendered HTML). One environment gotcha surfaced and is captured
in §1: skipping `npm install` before any `npx prisma` command lets `npx` fetch the latest
(currently v7) Prisma CLI instead of this repo's pinned `^6.7.0`, and Prisma 7 removed the
`datasource { url }` field this schema uses — always `npm install` first.

Re-seeding later without redoing setup: `npm run prisma:seed` or `npm run db:seed` (both alias
`prisma db seed`, per `package.json`).

### Verifying it's up

- Visit `http://localhost:3000` — the feed (`/`) should render seeded leads sorted by confidence,
  not an empty state. If it's empty, seeding didn't run or `.env`'s `DATABASE_URL` doesn't point at
  the seeded file.
- Then check, in order (mirrors `docs/testing.md`'s acceptance test #3 and manual QA step 2–11):
  `/search` (manual UPC/SKU lookup), `/leads/[id]` for any seeded lead (score breakdown table),
  `/alerts`, `/route`, `/leaderboard`, and `/admin` (switch the header "Acting as" user to
  `forge_admin` or `atl_captain` first — it's gated by `lib/currentUser.ts`'s mock-auth cookie, set
  via `POST /api/user`).
- A quick non-browser smoke check: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000`
  should print `200` once `npm run dev` is up.

### Running the test suite, verifying, and inspecting the DB

```bash
npm test              # vitest run — see §9 for the current 46/46 pass breakdown
npm run lint           # next lint
npm run typecheck      # tsc --noEmit
npm run verify         # lint && typecheck && test && build
npx prisma studio      # opens a local GUI (default http://localhost:5555) against dev.db
```

`npm run verify` (confirmed directly in `package.json`) chains exactly `lint && typecheck && test
&& build` — the code-level checks, but **not** the Prisma steps. `.github/workflows/ci.yml` runs a
superset: `npm ci` → `npm run db:generate` (`prisma generate`) → `npm run db:migrate` (`prisma
migrate deploy`, against a scratch SQLite file) → `npm run db:seed` (`prisma db seed`, "regression
check for schema/seed script") → `npm run lint` → `npm run typecheck` → `npm test` → `npm run
build`. `npm run verify` alone can pass while CI fails on a schema, migration, or seed change — for
changes to `prisma/schema.prisma`, `prisma/migrations/`, or `prisma/seed.ts`, also run `npx prisma
generate && npx prisma migrate deploy && npx prisma db seed` against a scratch DB (or just
`npm run setup` again) before considering the change done, not `npm run verify` alone.

## 12. Final "Next Prompt to Paste into Claude Code"

The first vertical slice is already built and merged (per `CLAUDE.md`'s "First vertical slice
(already built)" section and `docs/status.md`'s "What works" section) — this is deliberately
**not** a from-scratch build prompt. It is grounded directly in `docs/status.md`'s own "What is
unfinished" and "Current build status" sections, plus `CLAUDE.md`'s "Hard boundaries" and "Coding
standards" sections. It picks the next-increment items that are concrete, code-actionable, and
don't require a business/vendor decision from Mason first (real auth provider choice, Postgres
host, iOS distribution path, branch-protection style, and open-PR duplication are all called out
in `docs/status.md`'s "Decisions needed from Mason" section and are intentionally left for Mason,
not handed to this prompt).

```
Hi Claude — PennyForge's first vertical slice is already built on `main` and green: local feed,
manual UPC/SKU search, report submission with the compliance guardrail, confidence scoring,
confirm/dead voting, mock alerts, admin moderation, and the route planner are all live and seeded
(see CLAUDE.md's "First vertical slice" section). Per docs/status.md's last status pass, the full
CI pipeline (install, prisma generate/migrate/seed, lint, test, build) is passing, including
`npm test` at 46/46 tests green across 5 files (compliance.test.ts 7, scoring.test.ts 18,
alerts.test.ts 11, reports.test.ts 5, route.test.ts 5). Do not rebuild or restructure any of that
— this is the next increment on top of it, not a rewrite.

Please work through these three items, straight from docs/status.md's "What is unfinished" and
"Current build status" sections:

1. Extract the vote route's status-transition logic (currently inline in
   `app/api/reports/[id]/vote/route.ts`, which also wraps the trust-score/status read-modify-write
   in a `prisma.$transaction` to fix a prior race condition) into a pure, framework-free function
   in a new or existing `lib/*.ts` module, following the same pattern as `lib/scoring.ts` and
   `lib/route.ts`. Then add the regression tests docs/status.md flags as missing for the two bugs
   already fixed this session: the vote-route race condition, and the `ModerationActions.tsx`
   silent-failure bug (a blocked moderation action, e.g. approving a community-suppressed report,
   previously failed silently — a `res.ok` check was added but has no test coverage). This is
   docs/status.md's own recommended "cheapest path to real coverage."

2. Add a minimal user-facing report/block affordance for user-generated content. Today, per
   docs/status.md, moderation is admin/captain-only via `/admin` — there's no way for an ordinary
   user to report or block a bad report/user themselves. Keep it small: a report action on a
   lead/report detail view that a signed-in (mock-auth) user can trigger, landing in the existing
   admin moderation queue rather than a new parallel system.

3. Triage the two moderate `npm audit` advisories docs/status.md notes as "not investigated
   further" — determine whether they're fixable via a safe, non-breaking dependency bump, and fix
   or explicitly document why not. Don't take on the larger `next lint` → ESLint CLI or
   `package.json#prisma` → `prisma.config.ts` migrations docs/status.md also flags — those are
   future-Next-16/Prisma-7 migrations, not urgent, just note current status if relevant.

Explicitly out of scope for this pass — these are flagged in docs/status.md's "Decisions needed
from Mason" section and need Mason's call, not a unilateral implementation: real auth provider
choice, Postgres/hosting choice, the iOS distribution path (Capacitor vs. Expo vs. native),
resolving the duplicate open PRs, and branch-protection configuration. Don't start any of those.

Hard boundaries from CLAUDE.md (these apply to every change, not just new features) — see
CLAUDE.md's "Hard boundaries" section for the full text: no scraping of retailer or competitor
sites; no calling private/undocumented retailer endpoints; no ingesting competitor data feeds; no
reverse-engineering retailer systems; no automated checkout/purchase-bot behavior; and sourcing
stays allowlist-based, not denylist-based (`lib/compliance.ts` — unknown source types are rejected
by default). If anything in these three items would require crossing one of those lines, stop and
flag it instead of building a workaround.

Per CLAUDE.md's coding standards: keep new business logic (the extracted vote-transition function)
framework-free in `lib/*.ts`, not inline in the route handler or a component. If you touch any
enum-like string field, validate against and extend the arrays in `lib/constants.ts` rather than
hardcoding new string literals elsewhere. Only comment code to explain *why*, for non-obvious
constraints, not *what* the code does. Before considering any of this done, run `npm test` (and
`npm run verify`) and confirm everything is still green — per CLAUDE.md's "Test commands" section.
```
