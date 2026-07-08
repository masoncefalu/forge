# PennyForge — iOS / TestFlight / App Store Roadmap

Durable reference for taking PennyForge from the current Next.js web MVP to a shipping iPhone
app. Read `CLAUDE.md`, `docs/product-spec.md`, and `docs/compliance.md` first — nothing here
overrides the hard compliance boundaries or the phased deferral of real auth/OCR/push/Postgres;
this doc explains when those deferrals stop being deferrable because of App Store requirements.

## 0. The fact that shapes everything below

Today, `app/page.tsx`, `app/search/page.tsx`, etc. are **server components calling `prisma`
directly** (`lib/db.ts`) — there is no API boundary between frontend and backend. A mobile client
(Capacitor, React Native, or native Swift) can't do this; it needs real HTTP endpoints. **All
three paths below require turning today's server-component data access into a hosted JSON API
first.** This is shared, path-independent work — do it once, regardless of path.

Concretely: audit which read paths (feed filters, search, lead detail, route planner,
leaderboard, admin queue) are still page-component-only Prisma calls, and add matching GET routes
under `app/api/**`, backed by the same `lib/*.ts` functions (no logic duplication). Write routes
mostly already exist (`POST /api/reports`, `/api/user`, vote, moderate, route-plans).

## 1. Path comparison

### (a) Next.js wrapped in Capacitor
- **Code reuse**: ~100% of `app/**` UI and all `lib/*.ts` logic once served over HTTP.
- **Backend**: Client keeps making normal `fetch` calls to the same origin after §0.
- **Dev velocity**: Fastest — one codebase, no new UI framework. Days once the API exists.
- **Review risk**: **Highest.** Apple disfavors bare wrapped-website apps (Guideline 4.2). Mitigate
  by shipping real native work in the wrapper — camera scan, native push, native location prompts,
  Sign in with Apple — not a bare WebView.
- **Native access**: Good via Capacitor plugins (`@capacitor/camera`, `@capacitor/geolocation`,
  `@capacitor/push-notifications`, barcode plugins) — no custom native code needed for MVP scope.
- **Team fit**: Best for a solo/small TypeScript/Next.js team with no existing native experience —
  matches this repo exactly.
- **Time-to-TestFlight**: Fastest of the three.

### (b) React Native / Expo rewrite
- **Code reuse**: Business logic only. `lib/scoring.ts`, `route.ts`, `compliance.ts`, `alerts.ts`,
  `reports.ts` are framework-free by design and port almost unchanged. All UI must be rewritten in
  RN components — no JSX/Tailwind reuse.
- **Backend**: Same API-ification as (a).
- **Dev velocity**: Medium — new UI layer, same React mental model. Expo has first-party
  camera/barcode, location, and push modules.
- **Review risk**: Low — real native app bundle, no wrapped-website perception issue.
- **Native access**: Very good, similar tier to Capacitor, slightly more native feel.
- **Team fit**: Good if the team will invest in a second UI codebase but wants to stay in
  TypeScript; better than (a) if a truly native feel matters from day one.
- **Time-to-TestFlight**: Medium — UI rewrite is the dominant cost; weeks, not days, for parity
  with feed/search/report/alerts/route/leaderboard/admin screens.

### (c) Native Swift/SwiftUI rewrite
- **Code reuse**: None on the client. `lib/*.ts` logic must be reimplemented in Swift — simple
  arithmetic/filtering, but now two implementations of scoring/route/compliance logic to keep in
  sync, which is exactly the duplication `CLAUDE.md`'s "logic lives in `lib/*.ts`" rule avoids.
- **Backend**: Same API-ification as (a)/(b), consumed via `URLSession`.
- **Dev velocity**: Slowest — full second codebase in a language the team has no evidence of using.
- **Review risk**: Lowest — no framework-driven review friction.
- **Native access**: Best — direct VisionKit/AVFoundation/CoreLocation/APNs, most headroom.
- **Team fit**: Only justified with dedicated iOS engineers on the team; poor fit today.
- **Time-to-TestFlight**: Slowest — realistically months, plus ongoing dual-maintenance cost.

## 2. Recommendation

**Path (a), staged so the web MVP is never blocked or broken:**

1. **Stage 1 — API-ification** (web-only, ships unaffected): add GET JSON routes under
   `app/api/**` for every mobile read path, calling the same `lib/*.ts` functions. Existing pages
   keep their direct Prisma calls — pure addition, zero regression risk to the shipped web app.
2. **Stage 2 — Capacitor shell**: wrap the same app in a Capacitor project; add camera, geolocation,
   push plugins incrementally, additive to existing UI, not a rewrite.
3. **Stage 3 — Auth/DB migration** (§5, §6), done once, gating web and mobile together since they
   now share one API.

**Why**: this team's leverage is the existing Next.js/TypeScript/Prisma codebase and the
`lib/*.ts` business-logic layer — Capacitor preserves that leverage at ~100%. The 4.2 rejection
risk is real but manageable by shipping native camera/location/push before first submission (see
§12). Revisit React Native only after validating iOS demand, not before.

## 3. TestFlight path

1. Enroll in the Apple Developer Program (§4).
2. Complete Stage 1 API-ification; deploy the API to a real HTTPS host.
3. Stand up the Postgres/Supabase-backed deployment (§6) — don't point TestFlight builds at local
   SQLite.
4. Wire real auth (§5) — testers can't use the `pf_user_id` cookie switcher.
5. Scaffold Capacitor (`npx cap init`, `npx cap add ios`); point `webDir` at the built app or
   hosted URL; add camera/geolocation/push plugins.
6. Add `NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription`, and push entitlements to
   `ios/App/App/Info.plist` (§7, §8, §10).
7. Open the Xcode project (`npx cap open ios`); set bundle ID, signing team, app icon.
8. Archive and upload via Xcode Organizer or `fastlane pilot upload`.
9. Add internal testers in App Store Connect (up to 100, no review needed, immediate).
10. For external testers (up to 10,000), submit for Beta App Review (lighter than full review).

## 4. App Store requirements checklist

- [ ] Developer Program enrollment — $99/yr. Org accounts need a **D-U-N-S number** (free, can
      take days–weeks — start early, usually the critical path).
- [ ] App Store Connect: app record, bundle ID matching Capacitor's `appId`, SKU.
- [ ] App icons: 1024×1024 marketing icon (asset catalog generates the rest).
- [ ] Screenshots: at least a 6.7" iPhone set — feed, search, report submission, route planner.
- [ ] Metadata: name, subtitle, description, keywords, support URL, category (Shopping/Lifestyle).
- [ ] App Privacy nutrition label: declare **Location** (route planner), **User Content** (reports,
      photos once upload exists), **Account Info** (email/handle) — mark as "App Functionality,"
      not tracking, since there's no ad-tracking in the MVP.
- [ ] Age rating questionnaire; export compliance (standard HTTPS exemption).
- [ ] Privacy Policy URL (§11) and Support URL — both required fields.

## 5. Auth requirements

`lib/currentUser.ts` reads a `pf_user_id` cookie with no password or verification — fine for the
local MVP but unshippable: TestFlight testers can't "become" a seeded user, and Apple requires
real accounts for UGC apps (Guideline 5.1.1).

**Recommendation**: Sign in with Apple, as primary or sole method. Apple **requires** it as an
option whenever any other third-party login is offered — so either ship Apple-only, or Apple plus
email/password, never third-party-without-Apple. Pair with NextAuth.js (or Clerk) so the same
identity works for web and mobile against the shared API.

Per `CLAUDE.md`'s design intent, this is a swap behind the existing
`getCurrentUser(): Promise<User | null>` in `lib/currentUser.ts` — keep the signature stable,
replace the cookie lookup with a real session lookup, keep `User` role/trust fields as-is.

Also required alongside real auth: **self-service account deletion** (§12, Guideline 5.1.1(v)),
not just a support-email request.

## 6. Database/backend plan

Today: SQLite via `file:` `DATABASE_URL`, read in-process. `CLAUDE.md` confirms the schema is
provider-agnostic aside from the documented `reportDate` workaround, and `docs/product-spec.md`
already flags Postgres/Supabase as deferred-until-justified.

**A mobile client is that justification.** A `file:` DB lives on one process's local disk; a phone
talks to a hosted API over the network — there's no local disk to share. Concurrent writes from
many simultaneous mobile clients are SQLite's known weak point. Hosted targets (Vercel, Fly.io,
Railway) generally lack persistent local filesystem for SQLite across deploys anyway.

**Do this concurrently with §0's API-ification, not after**: point the new API routes at Postgres
(Supabase, the named target) from the start. Mechanics: swap `datasource` `provider` to
`"postgresql"`, update `DATABASE_URL`, `prisma migrate deploy`, re-seed or migrate existing data.

## 7. Location permissions

Needed for the route planner's distance ranking (`lib/route.ts`, `User.homeLat`/`homeLng`) and any
future "nearby stores" filter.

- Requires `NSLocationWhenInUseUsageDescription` in `Info.plist` with a human-readable reason
  (e.g. "PennyForge uses your location to rank nearby stores by drive time and trip value."). "When
  in use" is sufficient — no background tracking need exists, so don't request Always-location
  (heavily scrutinized in review, see §12).
- `@capacitor/geolocation` surfaces the native prompt; no custom native code needed.
- Per `docs/compliance.md`, home location is never shown to other users — mobile doesn't change
  that invariant.

## 8. Camera/barcode scanning

Currently manual UPC/SKU/name entry only, explicitly deferred pending "a scanning library ... as a
client component that fills the same search input" (`docs/product-spec.md`).

**What's needed**: a barcode-scan plugin decoding UPC/EAN into text, feeding the *existing* search
input — no new backend logic. A Capacitor barcode plugin wrapping AVFoundation's native metadata
capture covers this without custom Swift. Requires `NSCameraUsageDescription`.

**Compliance boundary check** (`CLAUDE.md` hard boundary #5, no automated checkout): scanning is
strictly an input-method convenience replacing typed UPC entry, populating the same field a human
reviews before submitting. It must never auto-submit a report or auto-query a retailer system.
Keep the scan → fill-input → human-submits flow explicit in the implementation.

## 9. Receipt proof upload

Evidence is currently a placeholder URL field, no real upload or OCR — explicitly deferred per
`CLAUDE.md` and `docs/product-spec.md` Phase 3.

**Stays deferred for the iOS MVP.** Real file upload (photo picker → object storage) is a
reasonable near-term add once hosted storage exists (§6), strengthening the trust/proof loop —
but **OCR is not required for App Store submission**. Keep OCR out of the launch checklist.

## 10. Push notifications

`lib/alerts.ts` currently creates DB rows rendered on `/alerts`, no real delivery — explicitly
deferred per `CLAUDE.md`.

**Stays deferred for first submission.** The in-app inbox is complete and demoable; review doesn't
require push. When justified later (Phase 2):

- Requires an APNs `.p8` key, Push Notifications capability on the App ID, and
  `@capacitor/push-notifications` on the client.
- Server side: a delivery step behind the existing `shouldCreateAlert` gate in `lib/alerts.ts`
  (already the documented swap point).
- Ask permission contextually (e.g. after a user sets a route/alert filter), not on first launch —
  Apple HIG guidance, and it reduces opt-out rates.

## 11. Privacy policy

Required URL in App Store Connect before submission. Must cover:

- **Location**: home location for route planning — state explicitly it's never shown to other
  users.
- **User-submitted content**: reports, prices, store info, and (once §9 ships) photos — visible to
  other users/public feed, retained/moderated per `docs/compliance.md`.
- **Account data**: identifier from Sign in with Apple/email, trust score, role.
- Standard sections: retention, third parties (Apple auth, hosting, push vendor once §10 ships,
  Supabase), user rights including deletion (ties to §12), contact method.

## 12. App Review risks

- **Guideline 1.2 (UGC) / EU DSA**: requires moderation, a reporting/flagging path, and user
  blocking. Admin queue (`app/admin/page.tsx`) and dead-vote suppression are a good starting
  position — but confirm an in-app "report this post/user" affordance exists on the feed/lead
  detail UI, not just an admin-only queue.
- **"Facilitates circumventing retailer systems"**: reviewers may pattern-match penny/clearance
  apps to gray-hat tools. Mitigate in the app description, privacy policy, and an in-app
  disclaimer: PennyForge aggregates only human-observed, in-store info (price tags, receipts,
  shelf tags) and never scrapes, calls private APIs, or automates checkout — a direct restatement
  of `CLAUDE.md`'s hard boundaries #1–5, visible to reviewers, not just enforced server-side.
- **Background location**: only request "When In Use" (§7); Always-location without a background
  feature is a near-automatic rejection.
- **Guideline 5.1.1(v) — account deletion**: must ship alongside real auth (§5), not as a
  follow-up.
- **Guideline 4.2 (Minimum Functionality)**: relevant to the Capacitor path — submit with camera
  scan, location, and ideally push already wired, not a bare WebView.
- **Sign in with Apple requirement**: must be offered if any other third-party login is (§5) —
  common, easy-to-miss rejection reason.
- **Placeholder content**: seed data and placeholder `evidenceUrl` values shouldn't be visible in
  reviewer-facing screens — give reviewers a demo account with realistic data.

## 13. MVP App Store checklist (roughly ordered)

1. [ ] Start Developer Program enrollment now (D-U-N-S lookup if org account — longest lead time).
2. [ ] Add missing GET JSON routes under `app/api/**` for all mobile read paths (§0).
3. [ ] Stand up hosted Postgres/Supabase, migrate `datasource` provider, re-seed (§6).
4. [ ] Deploy the app + API to a real HTTPS host.
5. [ ] Implement Sign in with Apple (+ optional email); swap `lib/currentUser.ts` internals only,
       keep `getCurrentUser()` stable (§5).
6. [ ] Implement self-service account deletion (§5, §12).
7. [ ] Add in-app content-flagging affordance alongside the existing admin queue (§12).
8. [ ] Scaffold Capacitor iOS project; add camera, geolocation, push plugins (§1, §3).
9. [ ] Add `NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription` to `Info.plist` (§7, §8).
10. [ ] Wire barcode scan → existing search input (§8).
11. [ ] Write and host the privacy policy; add its URL to App Store Connect (§11).
12. [ ] Add in-app disclaimer restating "human-observed data only, no scraping/automation" (§12).
13. [ ] Produce app icon set, screenshots, App Store metadata (§4).
14. [ ] Complete App Privacy nutrition label, age rating, export compliance (§4).
15. [ ] Internal TestFlight build to team (§3).
16. [ ] External TestFlight / Beta App Review (§3).
17. [ ] Full App Store submission.

Not required before first submission: real push delivery (§10), receipt OCR (§9), multi-stop
route optimization, bilingual UX — all remain deferred per `docs/product-spec.md`.
