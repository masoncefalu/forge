---
name: run-pennyforge
description: Build, run, and drive PennyForge (Next.js + Prisma/SQLite web app). Use when asked to start the app, run its tests, take a screenshot of a page, or verify a change works in the running app (feed, voting, report form, compliance guardrail).
---

PennyForge is a Next.js (App Router) + Prisma/SQLite web app. Start the dev
server on `:3000`, then drive it headlessly with
`.claude/skills/run-pennyforge/driver.mjs` — a Playwright script that uses the
container's pre-installed Chromium (no browser download, no xvfb needed).

All paths are relative to the repo root.

## Prerequisites

Nothing to `apt-get`. The container already has Node 22 and Playwright
browsers at `/opt/pw-browsers` (`PLAYWRIGHT_BROWSERS_PATH` is preset).
Do NOT run `npx playwright install` — downloads are disabled
(`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`) and the browser is already there.

## Setup

```bash
cp .env.example .env      # DATABASE_URL="file:./dev.db" — Prisma fails without it
npm install               # includes playwright-core (devDependency) for the driver
npx prisma migrate dev    # applies migrations AND auto-runs the seed (demo users/leads)
```

No separate build step for dev — `next dev` compiles on demand.

## Run (agent path)

Start the server, wait for it, then use the driver:

```bash
npm run dev > /tmp/pennyforge-dev.log 2>&1 &
for i in $(seq 1 30); do curl -sf -o /dev/null http://localhost:3000 && break; sleep 1; done
```

```bash
node .claude/skills/run-pennyforge/driver.mjs smoke          # full core-loop flow, exits 0/1
node .claude/skills/run-pennyforge/driver.mjs ss / feed.png  # screenshot any page
```

| command | what it does |
|---|---|
| `smoke` | Feed renders → switch mock user to `@rey_resells` → CONFIRMED vote on a lead → submit a new-product penny report → verify the compliance guardrail rejects a `SCRAPED_SITE` source → new report visible in feed. Screenshots at every step; prints ✅/❌ per check; exits non-zero on any failure. Idempotent — safe to rerun. |
| `ss <path> [name.png]` | Screenshot one page, e.g. `ss /route route.png`, `ss /admin admin.png` |

Screenshots → `/tmp/pennyforge-shots/` (override with `PF_SHOTS_DIR`).
Server log → `/tmp/pennyforge-dev.log`. Other env knobs: `PF_BASE_URL`
(default `http://localhost:3000`), `PF_CHROMIUM` (default
`/opt/pw-browsers/chromium`).

Expected smoke output ends with `SMOKE PASSED`. **Look at the screenshots** —
`01-feed.png` should show lead cards with confidence badges, `04-compliance-blocked.png`
the red "Blocked source type" message.

To stop: `pkill -f "[n]ext dev"` — the `[n]` bracket matters, see Gotchas.

## Run (human path)

```bash
npm run dev   # → http://localhost:3000, Ctrl-C to stop
```

Mock auth: the "Acting as" select in the header switches users by setting the
`pf_user_id` cookie via `POST /api/user`. Seeded users include `@casey_hunts`,
`@rey_resells`, `@atl_captain` (captain), `@forge_admin` (admin — needed for `/admin`).

## Test

```bash
npm test        # vitest — 5 files, 46 tests, all pass in ~1s
npm run lint    # next lint
```

Unit tests are pure-function tests (`lib/*`); they don't need the server or the DB seed.

## Gotchas

- **No `chromium-cli` in this container** — the driver uses `playwright-core`
  with `executablePath: /opt/pw-browsers/chromium` instead. `playwright-core`
  has no postinstall download, so it's safe as a devDependency.
- **`--no-sandbox` is required** — the container runs as root; Chromium
  refuses to start its sandbox and exits immediately without it. The driver
  passes it already.
- **You can't vote on your own report** (API returns 403). The smoke switches
  to `@rey_resells` and skips lead cards authored by that handle before voting.
- **Don't text-match "vote"/"Recorded" loosely on the lead page** — the static
  page copy already contains "Votes update the reporter's trust…", which
  matches `/vote/i` before any vote fires. The driver waits for the
  `/api/reports/:id/vote` response, then anchors on `/^Recorded/`.
- **Same-day duplicate reports are rejected** (`@@unique([productId, storeId,
  userId, reportDate])` — see CLAUDE.md). The smoke stays idempotent by
  submitting a *new* product with a timestamped name each run.
- **Votes are upserts** — re-running the smoke re-records the same CONFIRMED
  vote as a no-op rather than double-counting; expect "1 confirmed" every run.
- **First page load after boot takes ~6s** (dev-mode compile of 600+ modules).
  The driver's `networkidle` waits cover it; a bare `curl` right after "Ready"
  can still be slow.
- **`pkill -f "next dev"` kills your own shell** (exit 144, rest of the
  compound command never runs) — the harness wraps commands in a bash whose
  command line contains the literal text `next dev`, so pkill self-matches.
  Use `pkill -f "[n]ext dev"`; the bracket keeps the pattern from matching
  the shell that carries it.

## Troubleshooting

- **`Error: Cannot find module 'playwright-core'`**: `npm install` hasn't run
  (it's in devDependencies).
- **`Environment variable not found: DATABASE_URL`** from any Prisma command:
  `.env` is missing — `cp .env.example .env`.
- **Smoke fails at "feed shows 0 lead cards"**: DB exists but is empty —
  `npx prisma db seed`.
