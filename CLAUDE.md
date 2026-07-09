# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mission

PennyForge is "Waze for hidden clearance": receipt-verified, community-scored local deal
intelligence for penny items and hidden clearance, competing with Discord-chaos communities and
gray-data lookup tools by winning on **trust, proof, routing, ROI, community, and compliance** —
not on out-scraping anyone. `README.md` holds the full product roadmap and vision;
`docs/product-spec.md` defines what's in the MVP vs deferred; `docs/status.md` is the
source-of-truth status snapshot.

## Hard boundaries (do not cross these)

1. **No scraping.** Never ingest data by scraping retailer or competitor websites.
2. **No private/undocumented endpoints.** Never call retailer-internal or reverse-engineered APIs.
3. **No competitor data ingestion.** Never repost or ingest paid competitor feeds/lists.
4. **No reverse engineering** of retailer systems, apps, or POS/inventory tooling.
5. **No automated checkout** or purchase-bot behavior of any kind.
6. **Allowlist, not denylist**, for data sources — see `lib/compliance.ts`. Unknown source types
   are rejected by default; safety is opt-in, not opt-out.
7. All product data comes from **first-hand, in-store, user-generated reports** — see
   `docs/compliance.md`.

If a feature request would require crossing one of these lines, stop and flag it instead of
building a workaround.

## Commands

```bash
npm run setup          # one-shot bootstrap: install deps, create .env, prisma
                       # generate + migrate + seed (scripts/setup.sh)
npm run dev            # dev server at http://localhost:3000

npm test               # vitest run — full unit suite
npx vitest run tests/scoring.test.ts   # single test file
npx vitest run -t "decay"              # tests matching a name pattern
npm run lint           # next lint
npm run typecheck      # tsc --noEmit
npm run verify         # lint + typecheck + test + build (CI's check steps; run before pushing)

npm run db:migrate:dev # prisma migrate dev (new migration against local SQLite)
npm run db:seed        # reseed demo data
npx prisma studio      # inspect the local SQLite DB visually
```

CI (`.github/workflows/ci.yml`) runs `npm ci` → `db:generate` → `db:migrate` (deploy) →
`db:seed` → lint → typecheck → test → build on every PR to `main`, with `DATABASE_URL` set
directly in the workflow env (no `.env` file). Locally, `DATABASE_URL` comes from `.env` (a
`file:` URL — see `.env.example`); the setup script copies `.env.example` to `.env`.

## Architecture

**Stack:** Next.js (App Router) + TypeScript, Tailwind CSS, Prisma + SQLite, Vitest. Migration
path to Postgres/Supabase is a schema-compatible swap of the `datasource` block later; don't
design around SQLite-only features. No Redis, no background workers, no real OCR, and no real
push notifications in the MVP — alerts and route planning are synchronous and DB-backed. Don't
add these prematurely; see `docs/product-spec.md` for when they're justified.

**Three layers, two data paths:**

1. **Pure business logic** in `lib/*.ts` — framework-free, no Prisma imports, directly
   unit-tested in `tests/`. This is where scoring (`scoring.ts`), route ROI ranking (`route.ts`),
   alert threshold/radius/dedupe rules (`alerts.ts`), the compliance allowlist (`compliance.ts`),
   and same-day dupe keys (`reports.ts`) live. **New business logic goes here**, not inline in
   route handlers or components.
2. **DB-coupled composition** — `lib/leads.ts` (joins reports+votes into scored `LeadView`s) and
   `lib/routePlanner.ts` (loads stores/leads, delegates ranking to pure `route.ts`). `lib/db.ts`
   exports the singleton `prisma` client.
3. **UI**: server components (`app/**/page.tsx`) fetch via the lib layer directly; client
   components (`components/*.tsx` — forms, voting, user switcher) call the route handlers under
   `app/api/**`, which validate then delegate to the same lib layer.

**Domain flow:** report submitted (compliance-checked against the `sourceType` allowlist) →
confidence score = `(evidenceBase + trustBonus + confirmBonus − deadPenalty) × freshnessDecay`,
clamped 0–100 (constants and rationale in `lib/scoring.ts` + `docs/scoring.md`) → leads at/above
`ALERT_THRESHOLD` fan out Alert rows to users within radius, deduped per recipient per
(product, store) per 24h → route planner ranks stores by `expectedValue − tripCost`. Community
votes (`CONFIRMED`/`DEAD`, one per user per report) feed the score; 2+ dead votes with deads >
confirms auto-suppresses a lead, and `Report.previousStatus` restores its pre-suppression status
if later confirms reverse it.

**Mock auth:** `lib/currentUser.ts` reads a `pf_user_id` cookie set by `POST /api/user` (header
UserSwitcher). Keep the `getCurrentUser(): Promise<User | null>` interface stable so swapping in
real auth later is a one-file change.

**Enum-like fields** are plain `String` columns (Prisma/SQLite has no native enum) validated
against the arrays in `lib/constants.ts`. Extend those arrays; don't hardcode new string literals
elsewhere.

## Schema note: `reportDate`, not `date(createdAt)`

SQLite does **not** allow expressions inside table-level `UNIQUE` constraints —
`UNIQUE(product_id, store_id, user_id, date(created_at))` fails with "expressions prohibited in
PRIMARY KEY and UNIQUE constraints". `prisma/schema.prisma` instead stores a real `reportDate`
column (UTC midnight, set by `lib/reports.ts#toReportDate`) and enforces same-day duplicate
prevention with:

```prisma
@@unique([productId, storeId, userId, reportDate])
```

This was verified directly against `sqlite3` before being added to the schema. Do not "simplify"
this back to a `date()` expression — it will break the build.

## Staged iOS layer (inert — do not "activate" or "fix" it)

The repo carries a **dormant** Capacitor iOS shell that installs and runs nothing until
`npm run ios:bootstrap` is executed on a Mac:

- `capacitor.config.ts` imports `@capacitor/cli`, which is **not installed**. It is deliberately
  in `tsconfig.json`'s `exclude` list (along with `ios/` and `tooling/`) so `next build` passes.
  Do not add it back to the typecheck graph, and do not add Capacitor packages to `package.json`
  by hand — the bootstrap script installs them when activation is actually intended.
- The native shell points at the **hosted** deployment via `CAPACITOR_SERVER_URL` (the app is
  server-rendered; there is no static export to embed).
- `codemagic.yaml` and `.github/workflows/ios-release.yml` are release pipelines that only run on
  manual dispatch or `ios-v*` tags — they cost nothing and cannot break CI. `tooling/ios/` holds
  Fastlane templates that the bootstrap script copies into `ios/App/`.
- The iOS docs (`docs/ios-roadmap.md`, `docs/mobile-automation-stack.md`,
  `docs/app-store-checklist.md`, and related) describe this path; keep them in sync if you
  touch it.

## Coding standards

- Keep pure logic framework-free in `lib/*.ts` so it stays directly unit-testable; every module
  there with business rules has a matching suite in `tests/`.
- No comments explaining *what* code does — only *why*, for non-obvious constraints (see the
  `reportDate` example above).
- `docs/testing.md` has the acceptance-test checklist and manual QA script; update it when
  behavior changes.
- `docs/build-plan.md` has the dependency-ordered build plan behind the first vertical slice:
  exact init commands, file creation order, Prisma/seed steps, route/page inventory, test setup,
  and local run instructions.
