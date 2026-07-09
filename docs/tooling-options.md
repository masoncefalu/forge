# PennyForge — Tooling & Automation Options (GitHub → build → App Store)

The audit of third-party tools for driving PennyForge from **GitHub → build →
TestFlight/App Store** with minimal manual work. This is the **hub doc**; three
companions go deeper:

- `docs/mobile-automation-stack.md` — Capacitor + Fastlane, the mobile pipeline,
  and how the staged scaffolding in this repo activates.
- `docs/ios-ci-cd-options.md` — who runs the iOS build: Codemagic vs Bitrise vs
  Xcode Cloud vs GitHub Actions macOS runners.
- `docs/recommended-app-store-path.md` — the single recommended path, sequenced.

It also builds on existing planning that already made some of these calls:
`docs/ios-roadmap.md` (Capacitor chosen over Expo/SwiftUI),
`docs/app-store-checklist.md` (submission requirements), and `docs/connectors.md`
(GitHub Actions automation + current repo state). Read those before executing.

> **Compliance guardrail (from `CLAUDE.md`):** none of these tools change the
> hard boundaries. No scraping, no private retailer endpoints, no competitor
> feeds, no automated checkout. Everything below is CI/CD, hosting, backend,
> monitoring, and monetization plumbing — data sourcing stays first-hand and
> user-generated. Any tool that tempted us to cross a boundary is out.

---

## TL;DR verdict matrix

| Tool | Use? | Role | Setup | Staged in repo? |
|---|---|---|---|---|
| **GitHub** | ✅ Now | Source control, CI, PR automation | Done | `.github/workflows/ci.yml` |
| **Claude Code + Copilot** | ✅ Now | Coding/review automation | Active | (Copilot reviewer/agent already on repo) |
| **Vercel** | ✅ Now | Host the Next.js web app + API | Easy | env placeholders in `.env.example` |
| **Supabase / Postgres** | ✅ Phase 1 | Prod DB + auth + receipt storage | Medium | `DATABASE_URL`/`DIRECT_URL` placeholders |
| **Sentry** | ✅ Soon | Error/crash monitoring | Easy | `SENTRY_*` placeholders |
| **Capacitor** | 🟡 Stage now, activate next | iOS app wrapper | Medium | `capacitor.config.ts`, `npm run ios:bootstrap` |
| **Fastlane** | 🟡 Stage now, activate with Capacitor | iOS release automation | Medium | `tooling/ios/fastlane/*` |
| **Codemagic** | 🟡 When iOS build starts | Managed iOS CI/CD (**recommended runner**) | Easy | `codemagic.yaml` |
| **GitHub Actions (macOS)** | 🟡 Alternative runner | iOS CI/CD in-repo | Medium | `.github/workflows/ios-release.yml` |
| **Bitrise** | ⚪ Not yet | Managed iOS CI/CD (alt to Codemagic) | Easy | — |
| **Xcode Cloud** | ⚪ Later | Apple-native CI/CD | Medium | — |
| **RevenueCat** | ⚪ Defer (Phase 4) | Subscriptions / paid plans | Medium | — |

✅ = do it now/soon · 🟡 = staged, activate on trigger · ⚪ = defer

---

## 1. Capacitor — iOS app wrapper

**What it does.** Wraps the built web app in a native WKWebView shell, ships a
real `.ipa`, and bridges native APIs (camera, geolocation, push) to the web
layer. Because PennyForge is server-rendered (server components + `/api` routes +
Prisma), the shell points at the **hosted** deployment via `server.url` rather
than embedding a static export — the "native shell pointed at the hosted Next.js
app" model from `docs/ios-roadmap.md`.

- **Use it: NOW (stage) / activate when iOS work starts.** It's the chosen path
  (`docs/ios-roadmap.md`, `docs/status.md`). Scaffolding is already in the repo.
- **Why.** ~90%+ code reuse, ~1–2 weeks to a first TestFlight build, no rewrite.
  The framework-free `lib/*.ts` logic stays untouched.
- **Setup difficulty: Medium.** One-time `npm run ios:bootstrap` on a Mac, then
  Xcode config (Team, bundle ID, Info.plist permission strings). The real cost is
  Apple Developer signing/provisioning, not app code.
- **GitHub integration.** Indirect — Capacitor is a build step (`npx cap sync
  ios`) that runs inside whichever CI runner you choose.
- **Claude/Copilot compatibility.** High. `capacitor.config.ts`, the bootstrap
  script, and plugin wiring are plain TS/JS/shell — fully agent-editable. Native
  Xcode `.pbxproj` edits are the one area agents handle poorly; keep those manual.
- **Required secrets.** None for Capacitor itself. `CAPACITOR_SERVER_URL` (the
  Vercel URL) is config, not a secret, but is stored as one in CI for convenience.
- **Scripts/workflows needed.** ✅ Added: `capacitor.config.ts`,
  `scripts/ios-bootstrap.sh`, and `cap:sync`/`cap:copy`/`cap:open`/`ios:bootstrap`
  npm scripts. See `docs/mobile-automation-stack.md`.
- **Risks/tradeoffs.** App Store Guideline 4.2 ("repackaged website") is the main
  risk — mitigated by wiring real native camera (receipt evidence) and native
  chrome, per `docs/app-store-checklist.md` §12. Webview performance ceiling is
  the long-term tradeoff vs. React Native, deferred per `docs/ios-roadmap.md`.

## 2. Fastlane — iOS release automation

**What it does.** Automates signing, build-number bumping, IPA build, TestFlight
upload, App Store metadata/screenshots, and release submission via declarative
"lanes." The de-facto standard that Codemagic/Bitrise/GitHub Actions all wrap or
interoperate with.

- **Use it: NOW (stage) / activate with Capacitor.** Staged in `tooling/ios/`.
- **Why.** It makes "GitHub → TestFlight" a single command (`fastlane beta`) that
  runs identically on a laptop and in CI, so you're not locked into one CI vendor.
- **Setup difficulty: Medium.** Mostly credential plumbing (App Store Connect API
  key, team IDs). The lanes themselves are written (`tooling/ios/fastlane/Fastfile`).
- **GitHub integration.** Runs as a step in `.github/workflows/ios-release.yml`
  (or in Codemagic). Not GitHub-specific.
- **Claude/Copilot compatibility.** High — the `Fastfile`/`Appfile`/`Matchfile`
  are Ruby DSL/config that agents edit comfortably.
- **Required secrets.** `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8` (base64 of the
  `.p8`), `DEVELOPER_TEAM_ID`, `FASTLANE_APPLE_ID`; optionally `MATCH_GIT_URL` +
  `MATCH_PASSWORD` if you use `match` for signing.
- **Scripts/workflows needed.** ✅ Added: `tooling/ios/fastlane/{Fastfile,Appfile,
  Matchfile}`, `tooling/ios/Gemfile`, `tooling/ios/ExportOptions.plist`, and
  `ios:beta`/`ios:release` npm scripts. `ios-bootstrap.sh` copies them into
  `ios/App/` on activation.
- **Risks/tradeoffs.** Signing is the perennial pain point; the API-key path
  avoids interactive 2FA in CI. `match` adds a private git repo to maintain — the
  Fastfile falls back to automatic signing if you skip it.

## 3. Codemagic — managed mobile CI/CD (recommended runner)

**What it does.** Managed macOS build cloud purpose-built for mobile. Reads a
`codemagic.yaml`, handles code signing (its own ASC integration + `app-store-connect`
CLI), builds the IPA, and publishes to TestFlight/App Store.

- **Use it: WHEN iOS build automation starts.** `codemagic.yaml` is staged and
  inert until you connect the repo at codemagic.io.
- **Why (recommended over the alternatives).** Lowest-friction managed signing,
  a genuinely usable free tier (500 macOS build-minutes/month), a native App
  Store Connect integration that removes most Fastlane-secret plumbing, and
  first-class Capacitor/Ionic support. Best "activate later with least work" fit.
- **Setup difficulty: Easy–Medium.** Connect GitHub via the Codemagic GitHub App,
  add the ASC integration + an env group, push an `ios-v*` tag.
- **GitHub integration.** Strong — GitHub App connection, builds on push/tag/PR,
  status back to the PR.
- **Claude/Copilot compatibility.** High for `codemagic.yaml` (agents edit it
  freely); the dashboard steps (integration + env group) are manual, one-time.
- **Required secrets.** Stored in **Codemagic** (env group + ASC integration),
  **not** GitHub Secrets: App Store Connect API key, `BUNDLE_ID`,
  `APP_STORE_APPLE_ID`. See `docs/ios-ci-cd-options.md`.
- **Scripts/workflows needed.** ✅ Added: `codemagic.yaml`.
- **Risks/tradeoffs.** A second vendor dashboard to manage. Free minutes are
  finite (an IPA build is ~10–20 min). Some config lives outside git (integrations).

## 4. Bitrise — managed mobile CI/CD (alternative)

**What it does.** Same category as Codemagic — managed mobile CI with a visual
workflow editor and a large step marketplace, plus a `bitrise.yml`.

- **Use it: NOT YET (documented alternative).** Only if you specifically prefer
  its visual editor or need a marketplace step Codemagic lacks.
- **Why not the default.** Functionally overlapping with Codemagic but a heavier
  UI-first model and a less generous free tier for solo/MVP use. Picking one
  managed runner is enough; two is redundant.
- **Setup difficulty: Easy** (visual editor), but the visual-first model is less
  git-native/agent-friendly than a single YAML file.
- **GitHub integration.** Strong (GitHub App, PR status checks).
- **Claude/Copilot compatibility.** Medium — the visual editor stores config in
  `bitrise.yml`, but the intended authoring surface is the web UI, which agents
  can't drive. Codemagic's single YAML is a cleaner agent target.
- **Required secrets.** Same Apple credentials as Codemagic, stored in Bitrise's
  secret store + code-signing tab.
- **Scripts/workflows needed.** None staged (not the default). A `bitrise.yml`
  would be the equivalent of the staged `codemagic.yaml` if chosen.
- **Risks/tradeoffs.** Vendor lock-in to the visual model; pricing scales up
  faster than Codemagic for low-volume use.

## 5. Xcode Cloud — Apple-native CI/CD

**What it does.** Apple's own CI/CD, configured in Xcode/App Store Connect,
tightly integrated with TestFlight. Builds trigger from git and publish natively.

- **Use it: LATER (revisit once the Xcode project exists).** Cannot be set up
  before there's a real Xcode project (which Capacitor generates).
- **Why later.** It only becomes attractive *after* `ios/App` exists, and its
  value is highest if you've committed to Apple's ecosystem. Before the project
  exists there's nothing to point it at. It also can't build the Next.js web
  layer, so you'd still need the `npx cap sync` step handled elsewhere or via a
  custom `ci_post_clone` script.
- **Setup difficulty: Medium.** Configured in Xcode; requires the Apple Developer
  account and the project. 25 free compute-hours/month.
- **GitHub integration.** Works with GitHub, but the config lives in App Store
  Connect, not the repo — less git-native than `codemagic.yaml` or Actions.
- **Claude/Copilot compatibility.** Low — configured through Apple's GUI; the only
  agent-editable surface is optional `ci_scripts/*.sh` hooks.
- **Required secrets.** Managed by Apple (no exported API keys needed for the
  common path) — a plus. Custom scripts may need env vars set in App Store Connect.
- **Scripts/workflows needed.** Optional `ios/App/ci_scripts/ci_post_clone.sh` to
  run `npm ci && npm run build && npx cap sync ios` before the Xcode build.
- **Risks/tradeoffs.** Apple-only (no Android future), GUI-configured (poor for
  agent automation and for git history), and needs the web build shimmed in via a
  script hook. Best considered as a *simplification* once the project stabilizes.

## 6. Vercel — host the Next.js web app

**What it does.** Zero-config hosting for Next.js (the framework's first-party
platform): server components, API routes, edge/serverless, preview deploys per PR.

- **Use it: NOW.** It's the immediate hosting need and doubles as the URL the
  Capacitor shell points at.
- **Why.** Made by the Next.js team; App Router/server components/`/api` routes
  work with no adapter. Per-PR preview URLs pair well with Copilot/Claude review.
- **Setup difficulty: Easy.** Import the GitHub repo; set env vars; deploy. Native
  Git integration means **no GitHub Secrets required** for deploys.
- **GitHub integration.** Excellent — Vercel GitHub App auto-deploys `main` to
  production and every PR to a preview URL, posting the link back on the PR.
- **Claude/Copilot compatibility.** High — preview URLs give agents a live
  environment to verify against; config is in the dashboard or `vercel.json`.
- **Required secrets.** None in GitHub if using the native Git integration. In
  Vercel project settings: `DATABASE_URL`/`DIRECT_URL` (Supabase), `SENTRY_*`,
  and any auth provider keys. Placeholders documented in `.env.example`.
- **Scripts/workflows needed.** None — Git integration handles it. (Optional:
  `VERCEL_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` only if you deploy from
  GitHub Actions instead, which is not recommended here.)
- **Risks/tradeoffs.** Serverless functions are stateless (fine — no background
  workers per `CLAUDE.md`). SQLite cannot run on Vercel; production **requires**
  the Postgres migration (§7). Vendor pricing at scale, but free/hobby covers MVP.

## 7. Supabase / Postgres — production DB, auth, storage

**What it does.** Managed Postgres plus auth, file storage (receipt photos), and
autogenerated APIs. The production backend that replaces local SQLite.

- **Use it: PHASE 1 (early, before public App Store).** A hosted backend + real
  auth is a **hard blocker** for a public submission (`docs/app-store-checklist.md`
  §11). Not needed for a TestFlight *internal* build against the current stack.
- **Why Supabase specifically.** It bundles the three things Phase 1 needs —
  Postgres (the `datasource` swap `CLAUDE.md` already anticipates), auth (the
  `lib/currentUser.ts` swap point), and storage (receipt evidence upload) — under
  one account, minimizing vendor sprawl. Plain Postgres (Neon/RDS) is fine too but
  leaves auth + storage for you to assemble separately.
- **Setup difficulty: Medium.** Provision the project, run `prisma migrate` against
  Postgres, swap the `datasource` provider, wire auth + a storage bucket. The
  schema was written to avoid SQLite-only constructs (see the `reportDate` note in
  `CLAUDE.md`), so the migration should be mechanical — but verify on staging.
- **GitHub integration.** Indirect — connection strings live in Vercel + CI env,
  not GitHub. Supabase has GitHub-linked branching/preview DBs (optional).
- **Claude/Copilot compatibility.** High for the Prisma/schema/migration code;
  the dashboard (bucket creation, auth providers, RLS policies) is manual.
- **Required secrets.** `DATABASE_URL` (pooled, `pgbouncer=true`), `DIRECT_URL`
  (direct, for migrations), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  and server-only `SUPABASE_SERVICE_ROLE_KEY`. Placeholders in `.env.example`.
- **Scripts/workflows needed.** The `datasource` provider swap in
  `prisma/schema.prisma` + a Postgres migration run. No new workflow file; CI
  already runs `prisma migrate deploy`.
- **Risks/tradeoffs.** The `reportDate` unique-constraint workaround must be
  re-verified under Postgres (it should behave identically). Receipt storage adds
  privacy obligations (signed URLs, retention/deletion — `docs/app-store-checklist.md`
  §7). Row-Level Security must be configured or the service key must never reach
  the client. Connection pooling (pgbouncer) is required for serverless on Vercel.

## 8. Sentry — error/crash monitoring

**What it does.** Captures unhandled errors, stack traces, performance traces, and
(with the native SDK) iOS crashes, with release/source-map tracking.

- **Use it: SOON (cheap, high value).** Wire it into the web/backend early; add the
  Capacitor/native layer when the iOS shell exists.
- **Why.** Once real users hit a hosted backend, you need to *see* failures. The
  `@sentry/nextjs` SDK instruments server components, API routes, and the client in
  one install. Low effort, high signal.
- **Setup difficulty: Easy.** `npx @sentry/wizard@latest -i nextjs` scaffolds the
  config; add the DSN. Native iOS capture is a Capacitor plugin later.
- **GitHub integration.** Good — the Sentry GitHub App links stack traces to
  commits/PRs and can comment on suspect commits; release tracking ties errors to
  deploys.
- **Claude/Copilot compatibility.** High — the SDK config is code; a Sentry issue
  link is a great input for an agent to triage/fix.
- **Required secrets.** `NEXT_PUBLIC_SENTRY_DSN` (public), and build-time
  `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT` for source-map upload.
  Placeholders in `.env.example`.
- **Scripts/workflows needed.** Wizard-generated config files; optional source-map
  upload step in the build. Add `SENTRY_AUTH_TOKEN` to Vercel (and CI if uploading
  maps there).
- **Risks/tradeoffs.** PII scrubbing must be configured so receipt/location data
  never lands in error payloads (ties to the privacy posture in
  `docs/app-store-checklist.md` §4). Free tier has event quotas; sampling controls
  cost. Adds a small client bundle.

## 9. RevenueCat — subscriptions / paid plans

**What it does.** Cross-platform in-app purchase + subscription infrastructure:
wraps StoreKit/Play Billing, handles receipt validation, entitlements, and
subscriber analytics.

- **Use it: DEFER (Phase 4).** Paid tier is explicitly Phase 4 in
  `docs/product-spec.md`. Building it now is premature.
- **Why defer.** No monetization exists yet, and adding IAP triggers App Store
  Connect Agreements/Tax/Banking setup (`docs/app-store-checklist.md` §3) and a
  heavier review. It also gates nothing on the path to a *free* v1 launch.
- **Setup difficulty: Medium** when the time comes — configure subscription
  products in App Store Connect, add the SDK, model entitlements server-side.
- **GitHub integration.** Minimal/indirect (SDK + webhooks to your backend).
- **Claude/Copilot compatibility.** High for SDK/backend glue; the App Store
  Connect product setup is manual.
- **Required secrets.** RevenueCat API keys (public SDK key + secret webhook key),
  App Store Connect shared secret — **none needed until monetizing.**
- **Scripts/workflows needed.** None now.
- **Risks/tradeoffs.** Adds a revenue-critical dependency; only worth it once
  there's a paid plan to sell. Until then it's pure scope creep. When you do
  monetize, RevenueCat is still preferable to hand-rolling StoreKit receipt
  validation.

---

## Recommended default stack

The audit **confirms** the proposed default, with one refinement (a specific
primary iOS runner rather than "Codemagic or GitHub Actions"):

| Layer | Choice | Notes |
|---|---|---|
| Source control + PR automation | **GitHub** | Already in place (`ci.yml`) |
| Coding/review automation | **Claude Code + GitHub Copilot** | Copilot reviewer/agent already active on the repo |
| Web/API hosting | **Vercel** | Native Git integration, per-PR previews |
| Prod DB + auth + storage | **Supabase (Postgres)** | Phase 1; the `datasource` swap + auth + receipt storage |
| iOS app wrapper | **Capacitor** | Staged; `npm run ios:bootstrap` |
| iOS release automation | **Fastlane** | Staged; `beta`/`release` lanes |
| iOS CI/CD runner | **Codemagic** (primary) · **GitHub Actions macOS** (in-repo fallback) | Both staged; pick one to activate |
| Error/crash monitoring | **Sentry** | Web now, native later |
| Apple-native CI/CD | **Xcode Cloud** — *later, only if cleaner* | Revisit once `ios/App` exists |
| Subscriptions | **RevenueCat** — *defer to Phase 4* | No monetization yet |
| Managed CI alt | **Bitrise** — *not needed* | Documented alternative only |

**Why Codemagic over GitHub Actions as the primary runner:** managed signing +
the free macOS minutes tier + the native App Store Connect integration make it the
lowest-friction "flip it on later" option. The GitHub Actions `ios-release.yml` is
kept in-repo as a zero-lock-in fallback that keeps everything in one place if you'd
rather not add a vendor. See `docs/ios-ci-cd-options.md` for the full comparison.

## Tools to set up first (in order)

1. **Vercel** — deploy the current app; get a production URL. (No new blockers.)
2. **Sentry** — web/backend error monitoring; ~30 min, high value.
3. **Supabase/Postgres** — Phase 1 backend: migrate `datasource`, wire real auth
   (`lib/currentUser.ts` swap) + receipt storage. **Hard blocker for public iOS.**
4. **Apple Developer Program enrollment** — schedule-critical if org/D-U-N-S
   (`docs/app-store-checklist.md` §1). Start early even though code isn't ready.
5. **Capacitor + Fastlane** (`npm run ios:bootstrap` on a Mac) — once there's a
   hosted URL and an Apple account, generate `ios/App` and do a first manual
   TestFlight upload.
6. **Codemagic** — connect the repo and automate the release once the manual
   upload has worked once end-to-end.

## Tools to defer

- **Bitrise** — redundant with Codemagic; only if you dislike Codemagic.
- **Xcode Cloud** — revisit after `ios/App` exists and the flow is stable.
- **RevenueCat** — Phase 4, when a paid tier is real.
- **Real push notifications (APNs)** — additive later via `@capacitor/push-
  notifications` at the `lib/alerts.ts` swap point; not needed for v1.

## Exact credentials Mason needs

Accounts/keys to create (independent of GitHub Secrets, which are downstream):

- [ ] **Apple Developer Program** membership ($99/yr). Decide Individual vs
  Organization first — org needs a D-U-N-S number (1–3 wk lead time).
- [ ] **Registered bundle ID** `com.pennyforge.app` in the Developer portal.
- [ ] **App Store Connect API key** — download the `.p8`; note the **Key ID** and
  **Issuer ID** (App Store Connect → Users and Access → Integrations → Keys).
- [ ] **Apple Developer Team ID** (10-char, Membership page).
- [ ] **Vercel account** (log in with GitHub) + a project importing this repo.
- [ ] **Supabase account** + project → Postgres connection strings (pooled +
  direct), anon key, service-role key.
- [ ] **Sentry account** + a `pennyforge-web` project → DSN + auth token.
- [ ] **Codemagic account** (if chosen) — connect via the GitHub App; create the
  App Store Connect integration + `pennyforge_ios` env group.
- [ ] *(Optional)* a **private git repo** for Fastlane `match` + a `MATCH_PASSWORD`.
- [ ] *(Phase 4)* **RevenueCat account** + App Store Connect subscription products.

## Exact GitHub Secrets needed

Only required if you run the **GitHub Actions** iOS path
(`.github/workflows/ios-release.yml`). If you use Codemagic, these live in a
Codemagic env group instead, and GitHub needs none of them.

| Secret | For | Notes |
|---|---|---|
| `ASC_KEY_ID` | Fastlane | App Store Connect API key ID |
| `ASC_ISSUER_ID` | Fastlane | ASC API issuer ID |
| `ASC_KEY_P8` | Fastlane | **base64** of the `.p8` key contents |
| `DEVELOPER_TEAM_ID` | Fastlane | 10-char Apple team ID |
| `FASTLANE_APPLE_ID` | Fastlane | Apple ID email (fallback auth) |
| `CAPACITOR_SERVER_URL` | Capacitor build | The Vercel production URL |
| `MATCH_GIT_URL` | Fastlane `match` | *Optional* — private certs repo |
| `MATCH_PASSWORD` | Fastlane `match` | *Optional* — encrypts match repo |

- **Web deploy (Vercel):** none — use Vercel's native Git integration. (Only if
  you insist on deploying from Actions: `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
  `VERCEL_PROJECT_ID`.)
- **Sentry source maps from CI:** `SENTRY_AUTH_TOKEN` (else set it in Vercel only).
- Runtime app secrets (`DATABASE_URL`, `SUPABASE_*`, `NEXT_PUBLIC_SENTRY_DSN`) live
  in **Vercel** project env, not GitHub Secrets — they're needed at deploy/runtime,
  not in CI. Follow `docs/connectors.md` §4–5 for secret hygiene.

## Multiple-choice decisions for Mason

Each has a **recommended** answer; several align with open items already in
`docs/status.md` "Decisions needed from Mason."

1. **iOS CI/CD runner?**
   - **(a) Codemagic — recommended.** Lowest-friction managed signing + free
     macOS minutes; `codemagic.yaml` already staged.
   - (b) GitHub Actions macOS — everything in one repo, no new vendor, but you
     manage signing secrets yourself; `ios-release.yml` already staged.
   - (c) Bitrise — only if you prefer its visual editor.
   - (d) Xcode Cloud — revisit later, after `ios/App` exists.

2. **Apple Developer enrollment type?**
   - **(a) Individual — recommended for a solo MVP.** Near-instant, fastest to
     TestFlight. (Matches `docs/app-store-checklist.md` §1.)
   - (b) Organization — if PennyForge is incorporated and you want the company as
     seller now; needs D-U-N-S (start immediately, 1–3 wk lead time).

3. **Backend timing vs. first iOS build?**
   - **(a) Ship a TestFlight *internal* build against the current stack first —
     recommended.** De-risks the whole native pipeline fast; internal testers
     don't need the hosted backend/real auth.
   - (b) Front-load Phase 1 (Supabase + real auth) before any iOS build — required
     before *public* submission regardless, but slower to a first build.

4. **iOS code-signing method?**
   - **(a) App Store Connect API key + Xcode automatic signing — recommended.**
     Simplest; no extra repo. The Fastfile defaults to this.
   - (b) Fastlane `match` (git-stored certs) — better once there are multiple
     machines/CI runners; adds a private repo + `MATCH_PASSWORD`.

5. **Web hosting?**
   - **(a) Vercel — recommended.** First-party Next.js, Git-integrated previews.
   - (b) Self-host / other (Fly, Render, AWS) — only if a specific need demands it.

6. **Production DB + auth + storage?**
   - **(a) Supabase — recommended.** DB + auth + receipt storage in one account.
   - (b) Plain Postgres (Neon/RDS) + separate auth/storage — more control, more
     assembly.

7. **Vercel deploy trigger?**
   - **(a) Vercel native Git integration — recommended.** No GitHub Secrets.
   - (b) Deploy from GitHub Actions — only if you want deploy gated behind custom
     CI logic; needs Vercel tokens as secrets.

8. **Error monitoring now or later?**
   - **(a) Sentry now — recommended.** Cheap, high value once hosted.
   - (b) Defer until after launch — riskier; you fly blind on early failures.

9. **Monetization / RevenueCat?**
   - **(a) Defer to Phase 4 — recommended.** No paid tier yet; avoids ASC
     banking/tax setup and heavier review.
   - (b) Build now — only if a paid plan is imminent.

See `docs/recommended-app-store-path.md` for these decisions folded into a single
sequenced execution plan.
