# PennyForge

**Waze for hidden clearance: receipt-verified local deal intelligence, not random Discord chaos.**

PennyForge is a compliant, community-verified deal-finder for penny items and hidden clearance.
It wins on trust, proof, routing, and community — not on scraping or private retailer endpoints.
See `docs/product-spec.md` for the full product spec and `docs/compliance.md` for the hard
boundaries this project operates inside.

## Stack

Next.js (App Router) + TypeScript + Tailwind + Prisma + SQLite. See `CLAUDE.md` for the full
architecture rundown and coding standards.

## Quick start

```bash
npm run setup   # installs deps, creates .env, runs migrations, seeds demo data
npm run dev     # http://localhost:3000
npm test        # runs the vitest unit suite
```

`npm run setup` runs `scripts/setup.sh`, which:
1. `npm install`
2. copies `.env.example` → `.env` (if `.env` doesn't already exist)
3. `npx prisma generate`
4. `npx prisma migrate dev --name init`
5. `npx prisma db seed`

If you've already run setup once and just want fresh demo data: `npm run db:seed`.

## What's in the MVP

- **Feed** (`/`) — local leads filterable by state / retailer / store / min confidence.
- **Search** (`/search`) — manual UPC/SKU/name lookup (camera scanning is a later phase).
- **Report a find** (`/report/new`) — submit price, store, evidence type, and source type.
  Compliance guardrails reject unsafe source types before anything touches the DB.
- **Lead detail** (`/leads/[id]`) — full confidence-score breakdown + confirm/dead voting.
- **Alerts** (`/alerts`) — mock high-signal alert inbox, deduped per product+store per 24h.
- **Route planner** (`/route`) — ranks stores by expected value (est. value × confidence) minus
  round-trip gas cost.
- **Leaderboard** (`/leaderboard`) — contributor trust and track record.
- **Admin** (`/admin`) — moderation queue (switch to `forge_admin` or `atl_captain` via the header
  user switcher to access it).

There's no real authentication in the MVP — the header "Acting as" dropdown swaps between seeded
demo users via a cookie. See `docs/product-spec.md` for the roadmap to real auth.

## Docs

- `CLAUDE.md` — mission, hard boundaries, stack, coding standards, test commands.
- `docs/product-spec.md` — personas, user flows, MVP scope, roadmap.
- `docs/compliance.md` — allowed/forbidden data sources, UGC policy, privacy constraints.
- `docs/scoring.md` — confidence algorithm, evidence weights, decay, route score formula.
- `docs/testing.md` — acceptance tests, unit tests, manual QA script.

### iOS / App Store & tooling

- `docs/recommended-app-store-path.md` — **start here**: the sequenced plan from web MVP to App Store.
- `docs/tooling-options.md` — full audit of Capacitor, Fastlane, Codemagic, Bitrise, Xcode Cloud, Vercel, Supabase, Sentry, RevenueCat.
- `docs/mobile-automation-stack.md` — Capacitor + Fastlane pipeline and how the staged scaffolding activates.
- `docs/ios-ci-cd-options.md` — which cloud runs the iOS build (Codemagic vs GitHub Actions vs Bitrise vs Xcode Cloud).
- `docs/ios-roadmap.md` — distribution-path rationale (Capacitor vs React Native vs SwiftUI).
- `docs/app-store-checklist.md` — Apple Developer, privacy labels, permissions, TestFlight, review-risk checklist.
