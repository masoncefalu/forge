# PennyForge — Recommended App Store Path (the plan)

If you read one doc, read this. It folds the tool audit
(`docs/tooling-options.md`), the mobile pipeline (`docs/mobile-automation-stack.md`),
and the CI/CD runner choice (`docs/ios-ci-cd-options.md`) into a single, sequenced
plan to get PennyForge from where it is today (local SQLite Next.js MVP, no native
project) to TestFlight and the App Store with the least manual work.

It assumes the distribution-path decision already made in `docs/ios-roadmap.md`
(**Capacitor**) and the submission requirements in `docs/app-store-checklist.md`.

---

## The recommended stack (one line each)

- **GitHub** — source, CI (`ci.yml`), PR automation. *(in place)*
- **Claude Code + Copilot** — coding/review automation. *(active)*
- **Vercel** — host the Next.js app + API; the URL the iOS shell loads.
- **Supabase (Postgres)** — production DB + real auth + receipt storage (Phase 1).
- **Capacitor** — wrap the hosted web app as a native iOS shell.
- **Fastlane** — one-command signed build + TestFlight/App Store upload.
- **Codemagic** — managed iOS CI/CD (GitHub Actions `ios-release.yml` as fallback).
- **Sentry** — error/crash monitoring for web/backend (native later).
- *Later:* **Xcode Cloud** (only if cleaner post-project). *Deferred:* **RevenueCat**
  (Phase 4), **Bitrise** (redundant alt), **APNs push** (additive later).

Why this and not something else: the full per-tool reasoning is in
`docs/tooling-options.md`. The short version — every choice maximizes code reuse
and "flip it on later" ease while respecting `CLAUDE.md`'s no-scraping / no-private-
endpoint / no-background-worker boundaries.

---

## Sequenced execution

### Stage A — Ship the web app (no iOS yet, low risk)

1. **Vercel**: import the repo, deploy `main` to production, get the URL. Preview
   deploys per PR come free and pair well with Copilot/Claude review.
2. **Sentry**: `npx @sentry/wizard@latest -i nextjs`, add the DSN in Vercel. ~30 min,
   and now you can see failures the moment real traffic arrives.

*Exit criteria:* a public HTTPS URL serving the app, with error monitoring.

### Stage B — Production backend (the hard blocker for public iOS)

3. **Supabase**: provision a project. Swap `prisma/schema.prisma` `datasource`
   provider `sqlite → postgresql`, set `DATABASE_URL` (pooled) + `DIRECT_URL`
   (direct) in Vercel, run `prisma migrate deploy` against Postgres on a staging
   project first. Re-verify the `reportDate` unique constraint behaves under
   Postgres (it should — see `CLAUDE.md`).
4. **Real auth**: replace the mock `pf_user_id` cookie at the `lib/currentUser.ts`
   swap point (Supabase Auth or NextAuth). Keep `getCurrentUser()` signature stable.
5. **Receipt storage**: a Supabase Storage bucket with signed URLs; wire the
   evidence-upload flow (also completes a chunk of Phase 1 and de-risks Guideline
   4.2 by giving the app a real native capability). Mind the privacy obligations in
   `docs/app-store-checklist.md` §7.

*Exit criteria:* the app runs on hosted Postgres with real accounts — the
prerequisite for any **public** App Store build.

> **Shortcut:** a TestFlight *internal* build can happen against the current stack
> **before** Stage B (internal testers don't need the hosted backend/real auth).
> Recommended if you want to de-risk the native pipeline fast — see Decision 3.

### Stage C — Apple account (start early; it's schedule-critical)

6. **Apple Developer Program** enrollment ($99/yr). If Organization, start the
   D-U-N-S lookup **now** (1–3 wk lead). Individual is near-instant (Decision 2).
7. Register bundle ID `com.pennyforge.app`; create the App Store Connect app record;
   generate an **App Store Connect API key** (save `.p8` + Key ID + Issuer ID).

*Exit criteria:* an Apple account, a bundle ID, an app record, and an API key.

### Stage D — Native shell + first manual upload

8. On a Mac: `export CAPACITOR_SERVER_URL=<vercel-url>` then `npm run ios:bootstrap`.
9. `npm run cap:open`; in Xcode set Team + bundle ID, add the Info.plist permission
   strings (`docs/mobile-automation-stack.md` Part 1) and the app icon.
10. **Product → Archive → upload to TestFlight manually, once.** Prove signing +
    provisioning by hand so later CI failures are about CI, not Apple setup.
11. Commit the generated `ios/` project.

*Exit criteria:* a build live in TestFlight, installed on a real device.

### Stage E — Automate the release

12. **Codemagic**: connect the repo, add the ASC integration + `pennyforge_ios` env
    group, push an `ios-v*` tag. (Or use the staged GitHub Actions `ios-release.yml`
    — Decision 1.) Now `git tag ios-vX.Y.Z` ⇒ TestFlight with no manual steps.

*Exit criteria:* tagging a release uploads to TestFlight automatically.

### Stage F — App Store submission

13. Close the UGC-moderation gap (user-facing report/block — `docs/app-store-
    checklist.md` §12), finalize screenshots, privacy labels, and the "not a
    scraper" review notes, then run the Fastlane `release` lane / submit for review.

---

## Tools to set up first

**Vercel → Sentry → Supabase → Apple enrollment**, in that order. The first three
are pure web/backend work with no Apple dependency; Apple enrollment runs in
parallel because its (org) lead time is the long pole. Capacitor/Fastlane/Codemagic
come only after there's a hosted URL + an Apple account.

## Tools to defer

- **Xcode Cloud** — revisit after `ios/App` exists and is stable.
- **RevenueCat** — Phase 4, when there's a paid tier.
- **Bitrise** — only if you dislike Codemagic.
- **APNs push notifications** — additive later at the `lib/alerts.ts` swap point.

---

## Exact credentials Mason needs

- [ ] **Apple Developer Program** membership ($99/yr) — Individual vs Org (D-U-N-S).
- [ ] **Bundle ID** `com.pennyforge.app` registered.
- [ ] **App Store Connect API key**: `.p8` file + **Key ID** + **Issuer ID**.
- [ ] **Apple Developer Team ID** (10-char).
- [ ] **Vercel** account + project (GitHub login).
- [ ] **Supabase** account + project: pooled + direct Postgres URLs, anon key,
      service-role key.
- [ ] **Sentry** account + `pennyforge-web` project: DSN + auth token.
- [ ] **Codemagic** account (if chosen): GitHub App connection + ASC integration.
- [ ] *(optional)* private git repo for Fastlane `match` + `MATCH_PASSWORD`.
- [ ] *(Phase 4)* **RevenueCat** account + ASC subscription products.

## Exact GitHub Secrets needed

Only if using the **GitHub Actions** iOS runner (`ios-release.yml`). With Codemagic,
these live in a Codemagic env group and GitHub needs none.

| Secret | Purpose |
|---|---|
| `ASC_KEY_ID` | ASC API key ID |
| `ASC_ISSUER_ID` | ASC API issuer ID |
| `ASC_KEY_P8` | base64 of the `.p8` |
| `DEVELOPER_TEAM_ID` | Apple team ID |
| `FASTLANE_APPLE_ID` | Apple ID email |
| `CAPACITOR_SERVER_URL` | Vercel production URL |
| `MATCH_GIT_URL` / `MATCH_PASSWORD` | *optional*, only with `match` |

- **Vercel deploy:** no GitHub Secrets — use Vercel's native Git integration.
- **App runtime secrets** (`DATABASE_URL`, `DIRECT_URL`, `SUPABASE_*`,
  `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`): set in **Vercel**, not GitHub.
- Follow `docs/connectors.md` §4–5 for secret hygiene and least privilege.

---

## Decisions for Mason (with recommendations)

Full option details are in `docs/tooling-options.md`; the recommended answers:

| # | Decision | Recommended |
|---|---|---|
| 1 | iOS CI/CD runner | **Codemagic** (GitHub Actions fallback staged) |
| 2 | Apple enrollment | **Individual** for solo MVP (Org only if incorporated → start D-U-N-S now) |
| 3 | Backend timing | **TestFlight internal first** against current stack, then Phase 1 before public |
| 4 | iOS signing | **ASC API key + automatic signing** (`match` later at scale) |
| 5 | Web hosting | **Vercel** |
| 6 | Prod DB/auth/storage | **Supabase** |
| 7 | Vercel deploy trigger | **Native Git integration** (no secrets) |
| 8 | Error monitoring | **Sentry now** |
| 9 | Monetization | **Defer RevenueCat to Phase 4** |

These extend the open items already tracked in `docs/status.md` "Decisions needed
from Mason" (which covers enrollment type and backend timing) with the new tooling
calls (runner, signing, hosting, DB, deploy trigger, monitoring, monetization).

---

## What's already staged in this repo (activate later, safe today)

All CI-safe — no new dependencies, nothing runs in CI until you trigger it:

- `capacitor.config.ts` — appId/appName/server-url shell config (tsconfig-excluded).
- `scripts/ios-bootstrap.sh` + `npm run ios:bootstrap` — one-command activation.
- `cap:sync` / `cap:copy` / `cap:open` / `ios:beta` / `ios:release` npm scripts.
- `tooling/ios/` — Fastlane `Fastfile`/`Appfile`/`Matchfile`, `Gemfile`,
  `ExportOptions.plist`, and a README.
- `codemagic.yaml` — Codemagic workflow (inert until repo connected).
- `.github/workflows/ios-release.yml` — manual/tag-only GitHub Actions release.
- `.env.example` — commented production env placeholders (Supabase, Sentry,
  Capacitor URL).

Verified green with these added: `npm run lint`, `npm test` (46 passing), and
`npx next build` all pass — the existing `build-and-test` CI check is unaffected.
