# Backend Readiness — Production Path for the iOS Release

Audit of the current backend and what has to change (or explicitly stay the same) before an iOS
client can point at it in production. Companion docs: `docs/credentials-needed.md`,
`docs/github-secrets.md`, `docs/ios-deployment.md`, `docs/mobile-readiness.md`.

## Current state (audited)

| Area | Today | Production-ready? |
| --- | --- | --- |
| Framework | Next.js 15 App Router + TypeScript; server components read via `lib/db.ts`, clients call `app/api/**` | ✅ Yes — the route handlers under `app/api/{alerts,reports,route-plans,user}` are plain HTTPS JSON endpoints a native/wrapped client can already call |
| Database | Prisma + SQLite (`DATABASE_URL` is a `file:` URL, see `.env.example`) | ❌ No — SQLite file DB is single-writer, local-only; fine for MVP, not for a hosted API |
| Migrations | `prisma/migrations` + `prisma migrate deploy` (run in CI today) | ✅ Yes — schema was designed to port to Postgres (no SQLite-only features, per `CLAUDE.md`) |
| Auth/session | Mock auth: `pf_user_id` cookie set by `POST /api/user`, read by `lib/currentUser.ts#getCurrentUser()`; falls back to first seeded user | ❌ No — anyone can impersonate any user by setting the cookie. Explicitly deferred per `docs/product-spec.md`; the `getCurrentUser(): Promise<User | null>` interface is stable so real auth is a one-file swap |
| Uploads | `Report.evidenceUrl` is a placeholder string (`prisma/schema.prisma`) — no upload endpoint, no storage | ❌ No — iOS receipt/photo capture (see `docs/mobile-readiness.md`) needs a real upload path |
| Alerts/push | Synchronous DB-backed mock alerts (`lib/alerts.ts`), dedupe per recipient per (product, store) per 24h | ⚠️ Logic is production-grade; delivery (APNs push) is the deferred part |
| Business logic | Framework-free `lib/*.ts` (scoring, route, compliance, alerts, reports) with vitest coverage | ✅ Yes — portable as-is |
| CI | `.github/workflows/ci.yml`: install → prisma generate/migrate/seed → lint → test → build | ✅ Yes — now also runs `npm run typecheck` via `npm run verify` scripts |

## Production-readiness gaps (ordered)

1. **Real auth.** Replace the `pf_user_id` cookie with session-token auth. Recommended: Sign in
   with Apple (required by App Review guideline 4.8 if any third-party login is offered) via
   NextAuth/Auth.js, keeping `getCurrentUser()`'s signature.
2. **Hosted Postgres.** Swap the Prisma `datasource` block from `sqlite` to `postgresql` and
   regenerate migrations against the hosted DB. No schema redesign needed.
3. **Uploads.** Add a `POST /api/uploads` handler that issues signed upload URLs to object storage
   (S3-compatible or Vercel Blob) and stores the resulting URL in `Report.evidenceUrl`.
4. **APNs delivery.** Keep `lib/alerts.ts` dedupe untouched; add a delivery adapter that sends
   APNs pushes for new `Alert` rows (Capacitor push plugin on the client side).
5. **Rate limiting / abuse controls** on report submission and voting endpoints once auth is real.

## Recommended production backend path

**Recommended (default): Vercel + Neon Postgres + Vercel Blob.**

- Vercel is the native Next.js host — zero build-config changes, preview deploys per PR.
- Neon (or Supabase) Postgres is a schema-compatible swap of the Prisma `datasource` block, exactly
  the migration path `CLAUDE.md` planned for.
- Vercel Blob (or S3) covers receipt/photo uploads with signed URLs.

Alternatives, if Mason prefers:

- **B. Supabase (DB + auth + storage in one)** — fewer vendors; Supabase Auth would replace the
  NextAuth layer; slightly more lock-in.
- **C. Fly.io/Railway + managed Postgres + S3** — more control, more ops work.

## Required environment variables (production)

| Variable | Purpose | Needed when |
| --- | --- | --- |
| `DATABASE_URL` | Postgres connection string (today: SQLite `file:` URL) | Now (already used everywhere via `lib/db.ts`) |
| `NEXTAUTH_URL` / `AUTH_URL` | Canonical app URL for auth callbacks | When real auth lands |
| `NEXTAUTH_SECRET` / `AUTH_SECRET` | Session/JWT signing secret | When real auth lands |
| `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET` (generated from the Sign in with Apple key) | Sign in with Apple OAuth | When real auth lands |
| `BLOB_READ_WRITE_TOKEN` (Vercel Blob) or `S3_BUCKET`/`S3_REGION`/`S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` | Receipt/photo uploads | When uploads land |
| `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`, `APNS_BUNDLE_ID` | Push notification delivery | When real push lands |
| `NEXT_PUBLIC_API_BASE_URL` | Base URL the iOS shell points at | When the iOS shell lands |

None of these are required to keep the current local MVP running — `DATABASE_URL="file:./dev.db"`
remains the only variable for local dev and CI.
