# CLAUDE.md — PennyForge

Durable context for any Claude Code session working on this repo. Read this before making
architectural changes.

## Mission

PennyForge is "Waze for hidden clearance": receipt-verified, community-scored local deal
intelligence for penny items and hidden clearance, competing with Discord-chaos communities and
gray-data lookup tools by winning on **trust, proof, routing, ROI, community, and compliance** —
not on out-scraping anyone.

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

## Stack

- **Next.js (App Router) + TypeScript** — server components for data fetching, client components
  only where interactivity is required (forms, voting, user switcher).
- **Tailwind CSS** for styling.
- **Prisma + SQLite** for the local MVP. `DATABASE_URL` is a `file:` URL — see `.env.example`.
  Migration path to Postgres/Supabase is a schema-compatible swap of the `datasource` block later;
  don't design around SQLite-only features.
- **Vitest** for unit tests.
- No Redis, no background workers, no native mobile app, no real OCR pipeline, and no real push
  notifications in the MVP. Alerts and route planning are synchronous and DB-backed. Don't add
  these prematurely — see `docs/product-spec.md` roadmap for when they're justified.

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

## Coding standards

- Server components fetch data directly via `lib/db.ts` (`prisma`); client components call the
  route handlers under `app/api/**`.
- Pure business logic (scoring, route ranking, compliance checks, alert dedupe, duplicate-date
  keys) lives in `lib/*.ts` as framework-free functions so it's directly unit-testable — see
  `lib/scoring.ts`, `lib/route.ts`, `lib/compliance.ts`, `lib/alerts.ts`, `lib/reports.ts`.
  Keep new business logic in this layer rather than inline in route handlers or components.
- Enum-like fields are plain `String` columns (Prisma/SQLite has no native enum) validated against
  the arrays in `lib/constants.ts`. Extend those arrays, don't hardcode new string literals
  elsewhere.
- Mock auth: `lib/currentUser.ts` reads a `pf_user_id` cookie set by `POST /api/user`. Keep this
  interface (`getCurrentUser(): Promise<User | null>`) stable so swapping in real auth later is a
  one-file change.
- No comments explaining *what* code does — only *why*, for non-obvious constraints (see the
  `reportDate` example above).

## First vertical slice (already built)

Local feed → manual UPC/SKU search → submit report (with compliance guardrail) → confidence
score → confirm/dead voting → mock alerts → admin moderation → route planner. All seeded and
runnable with no external paid services. See `docs/product-spec.md` for what's explicitly
deferred to later phases (real auth, barcode camera scan, receipt OCR, push notifications,
Postgres, native apps).

## Test commands

```bash
npm test              # vitest run — unit tests for scoring, dedupe, decay, dead-vote
                       # suppression, alert dedupe, and compliance guardrails
npm run lint           # next lint
npx prisma studio      # inspect the local SQLite DB visually
```

See `docs/testing.md` for the full acceptance-test checklist and manual QA script.
