# PennyForge iOS Roadmap — TestFlight & App Store Options

## Purpose

PennyForge is a server-rendered Next.js (App Router) web app today: no native mobile shell, no
push notifications, no background workers (see `CLAUDE.md`, `docs/product-spec.md` roadmap
"Phase 4 — native app shell"). This doc compares three concrete paths to get a PennyForge iOS app
into TestFlight and the App Store, **given the existing codebase** — it does not propose a
rewrite-from-scratch unless a path genuinely requires one. No implementation, no Xcode/Capacitor/
Expo scaffolding is included here; this is planning only.

Relevant existing assets referenced below:
- `app/api/{alerts,reports,route-plans,user}/**` — already-existing route handlers a native client
  could call over HTTPS with no server changes.
- `lib/scoring.ts`, `lib/route.ts`, `lib/compliance.ts`, `lib/alerts.ts`, `lib/reports.ts`,
  `lib/geo.ts` — framework-free TypeScript, no Next.js or DOM imports. `lib/currentUser.ts` and
  `lib/db.ts` are the two lib files that import Next/Prisma and are NOT portable as-is.
- Mock auth via `pf_user_id` cookie (`lib/currentUser.ts`) and DB-backed synchronous alerts
  (`lib/alerts.ts`) — both are explicitly-deferred-to-later-phases per `docs/product-spec.md`.

---

## Option 1: Next.js + Capacitor (wrap the existing web app)

**What it is:** Capacitor wraps the built Next.js app in a native WKWebView shell, ships as a real
`.ipa`, and exposes native APIs (camera, geolocation, filesystem, push) to the web layer via JS
bridges. The existing app/pages, Tailwind styles, and API routes are reused almost unchanged.

- **Timeline to TestFlight:** ~1–2 weeks for a first internal build. Add Xcode project + Capacitor
  config, swap client-side navigation calls that assume `window.location`/full page reload for
  Capacitor-friendly client routing where needed, wire `@capacitor/camera` and
  `@capacitor/geolocation` for the report-evidence and store-distance flows, then archive and
  upload via Xcode/Fastlane. Most of this time is Apple Developer account/signing/provisioning
  setup, not app code.
- **Code reuse:** ~90%+. The entire `app/**` tree, `lib/**`, Tailwind, and Prisma-backed API routes
  ship as-is. Server components still render server-side (the app can either point at a hosted
  deployment or, if truly offline-first is required later, be adapted — but for v1 the simplest
  model is "native shell pointed at the hosted Next.js app," identical to how the web app runs
  today).
- **Native feature access:** Camera and geolocation are available via Capacitor plugins (relevant
  now: photo evidence capture for reports, geolocation for the route planner's "distance from
  home" input, both currently manual/placeholder-URL in the MVP per `docs/product-spec.md`).
  Real push notifications become available via `@capacitor/push-notifications` + APNs — notably
  this is the same "swap point" already documented in `lib/alerts.ts` ("Real push/email is a later
  phase"), so Capacitor is a natural fit for eventually completing that deferred phase without
  touching the alert-dedupe logic in `lib/alerts.ts` at all.
- **App Store review risk: this is the main thing to get right.** Apple's App Store Review
  Guidelines (4.2, "Minimum Functionality") explicitly call out that an app "created from a
  commercialized template" or one that is "merely a repackaged website" will be rejected — the
  guideline's own language is "Your app should include features, content, and UI that elevate it
  beyond a repackaged website." PennyForge already clears this bar structurally (it's an
  interactive app with forms, voting, personalized feeds, a route planner — not a static
  marketing site or thin wrapper around read-only content), but the Capacitor build must make that
  obvious to a reviewer:
  - Use native UI chrome where cheap (native tab bar/nav via Capacitor plugins or a thin native
    shell, not just a full-bleed webview with browser-style scrolling).
  - Wire at least one real native capability (camera for evidence photos is the obvious one, since
    it's already a documented near-term roadmap item) rather than shipping a pure read-only
    wrapper — this is the single highest-leverage thing to do to avoid a 4.2 rejection.
  - Avoid any in-app browser chrome (URL bar, "back/forward" browser buttons) that makes it look
    like Safari-in-a-box.
  - Provide the required legal machinery regardless of path: privacy policy URL, App Tracking
    Transparency prompt if any tracking/analytics SDK is added, account deletion flow (Guideline
    5.1.1(v)) since PennyForge has user accounts, non-empty first-run state (an empty local feed on
    first launch reads poorly to reviewers — the seeded GA/FL/TX demo data doubles as a plausible
    "before you add your area" placeholder).
  - This is the path most likely to be revision-requested by App Review at least once, but is
    tractable if the above are addressed before first submission.
- **Offline / receipt-photo / camera implications:** the MVP's evidence field is a placeholder URL
  today (`docs/product-spec.md`: "Receipt OCR ... evidence is a placeholder URL today"). Capacitor
  gives real camera + local file access, but wiring "photo → uploaded evidence URL" requires adding
  actual file upload/storage server-side (S3/Supabase Storage or similar) — this is Phase 1 work
  already on the roadmap ("file upload for evidence"), not new scope invented for iOS. True offline
  mode (queue a report while offline, sync later) is NOT free with Capacitor — the app is still
  fundamentally a webview hitting live API routes, so add a service-worker-style request queue only
  if offline-in-store is prioritized (it's explicitly deferred per product-spec's "offline in-store
  mode").
- **Ongoing maintenance burden:** lowest of the three. One codebase, one API surface. iOS-specific
  surface area is a thin native shell + a handful of Capacitor plugin configs; most bugs are fixed
  once in the Next.js app and ship to web and iOS simultaneously.

## Option 2: React Native / Expo (rewrite the UI layer, keep the business logic)

**What it is:** A genuinely native UI (React Native components, not a webview) built with Expo's
managed workflow, talking to the same Next.js API routes as a backend. This is a real rewrite of
every screen, but NOT a rewrite of the scoring/compliance/routing logic.

- **Timeline to TestFlight:** ~4–8 weeks for feature parity with the current web MVP (local feed,
  search, report submission, confidence breakdown, confirm/dead voting, alerts inbox, route
  planner, leaderboard) — this is a real UI rewrite across ~7 screens plus a component library,
  not a config exercise. Expo's managed workflow (`eas build`, `eas submit`) removes most Xcode/
  provisioning friction, so the TestFlight upload step itself is fast once the app is built;
  the bulk of the timeline is UI work, not tooling.
- **Code reuse: this is the real advantage of this path.** `lib/scoring.ts`, `lib/route.ts`,
  `lib/compliance.ts`, `lib/alerts.ts` (except its `haversineMiles` import from `lib/geo.ts`, which
  is also framework-free and portable), and `lib/reports.ts` are framework-free TypeScript with no
  Next.js, DOM, or Prisma-client imports in the pure-logic functions themselves — this was a
  deliberate design choice per `CLAUDE.md` ("Keep new business logic in this layer rather than
  inline in route handlers or components... so it's directly unit-testable"). These files
  (~370 lines combined of the 663 total in `lib/`) can be copied into or published as a shared
  package and imported unchanged into a React Native app: same confidence scoring, same compliance
  guardrails, same route ROI math, same alert dedupe rules, same existing Vitest test suite
  reused as-is. Only `lib/currentUser.ts` (imports `next/headers`) and `lib/db.ts` (Prisma client
  singleton, server-only) are not portable — but a native client shouldn't import these directly
  anyway; it should call the existing `app/api/**` route handlers over HTTP, exactly as the current
  client components do. Net effect: ~55% of `lib/` logic-by-line is directly reusable, 100% of
  `app/**` UI/route-handler code is rewritten, and the API contract stays identical so the same
  backend serves both web and native clients.
- **Native feature access:** full native camera, geolocation, push notification, and background
  task APIs via Expo SDK modules — strongest native feel of any path that doesn't require Swift.
- **App Store review risk:** low. A React Native app is indistinguishable from "native" to App
  Review; none of the repackaged-website concerns from Option 1 apply. Standard app-store
  requirements still apply (privacy policy, ATT prompt if tracking, account deletion).
- **Ongoing maintenance burden:** two UI codebases (Next.js web + React Native/Expo native), one
  shared business-logic package, one shared backend/API. Every new feature needs UI work twice
  (web screen + native screen), but scoring/compliance/routing changes only need to happen once in
  `lib/` and both clients pick it up. This is a real, permanent cost — reasonable once there's
  product-market signal that a native app is worth the double UI maintenance, premature before
  that.

## Option 3: Native SwiftUI (full rewrite)

**What it is:** A ground-up native iOS app in Swift/SwiftUI, calling the same JSON API routes as a
backend (or a dedicated API layer if the web app's Next.js route handlers are judged insufficient
for native needs).

- **Timeline to TestFlight:** ~10–16+ weeks for MVP parity, dependent on available Swift expertise
  on the team. Every screen, navigation flow, and piece of client-side validation is rebuilt from
  zero, plus the team needs to either have or acquire Swift/SwiftUI/iOS platform expertise
  (Combine/async-await patterns, App Store provisioning, Apple's HIG) that doesn't currently exist
  in this Next.js/TypeScript codebase.
- **Code reuse:** ~0% of UI code. Business logic (`lib/scoring.ts`, `lib/route.ts`,
  `lib/compliance.ts`, `lib/alerts.ts`, `lib/reports.ts`) is not reusable as TypeScript — it would
  need to be reimplemented in Swift (feasible since the logic itself is simple, well-tested, and
  well-documented via `docs/scoring.md`, but it is a second reimplementation to keep in sync, with
  a second test suite, rather than one shared library).
- **Native feature access:** the ceiling — full access to every iOS API, best performance, most
  idiomatic platform feel, easiest path to deep OS integrations (widgets, Live Activities,
  Shortcuts, SharePlay, etc.) if the product ever wants them.
- **App Store review risk:** lowest of the three — a fully native app has no "repackaged website"
  surface area to defend at all.
- **Ongoing maintenance burden:** highest. Two fully independent codebases and two independent
  implementations of the scoring/compliance/routing rules that must be kept behaviorally identical
  by hand, doubling the risk that a rule change (e.g. adjusting `HALF_LIFE_DAYS` or
  `ALERT_RADIUS_MILES`) is applied to one platform and forgotten on the other. Also requires
  maintaining Swift expertise on the team long-term.
- **When this is actually justified:** not for MVP, and not as PennyForge's first native ship. This
  path earns its cost only after there's a native app with real usage AND a specific native-only
  requirement that a webview or React Native can't satisfy well — e.g., a deeply platform-specific
  feature (Live Activities for "you're near a hot lead right now," complex widget/Shortcuts
  integration, heavy on-device compute) where React Native's bridge overhead or Capacitor's webview
  ceiling becomes a real, measured product problem rather than a hypothetical one.

---

## Recommendation

**Ship Option 1 (Next.js + Capacitor) first.** It gets PennyForge into TestFlight in roughly 1–2
weeks by wrapping the app that already exists, reuses effectively the entire codebase (`app/**`,
`lib/**`, the API routes, Tailwind styling), and requires no rewrite of anything CLAUDE.md
describes as already built. The main real risk is App Store Guideline 4.2 ("repackaged website"),
which is manageable and specifically de-risked by doing two things during the Capacitor
integration rather than after: (1) wire real native camera access for report-evidence photos
(this also happens to complete a chunk of the already-planned Phase 1/2 "receipt/photo evidence"
work), and (2) give the shell genuine native chrome (tab bar, no visible browser UI) rather than a
bare webview.

Do NOT jump to Option 2 (React Native/Expo) for v1 — it's the right call only once there's a
concrete reason the webview approach is falling short (e.g., real performance complaints, or a
product decision that native-feeling UI is a differentiator worth a parallel codebase). If that
day comes, the `lib/scoring.ts` / `lib/route.ts` / `lib/compliance.ts` / `lib/alerts.ts` /
`lib/reports.ts` files are already framework-free by design (per CLAUDE.md's coding standards) and
port over unchanged — that decision was effectively already made for us when those files were kept
framework-free, so Option 2 stays cheap to pick up later even if we don't start there.

Do NOT pursue Option 3 (SwiftUI) for MVP under any circumstance discussed here — there is no
current requirement (no Live Activities, no widgets, no heavy on-device compute) that justifies a
second full implementation of the business logic, and the team has no standing Swift expertise
requirement otherwise.

**What "no real push notifications yet" implies for the native path:** none of the three options
require push notifications to ship a v1 native app. Alerts today are DB-backed rows rendered
synchronously on `/alerts` (`lib/alerts.ts`, `app/alerts/page.tsx`), and that same in-app inbox
experience works fine inside a Capacitor-wrapped app or a React Native app with zero changes —
users open the app and see their alert inbox, same as on web today. Real push delivery (APNs) is
strictly additive later: Capacitor (`@capacitor/push-notifications`) and Expo (`expo-notifications`)
both make adding real push straightforward once there's a reason to, and it plugs into the exact
swap point `docs/product-spec.md` already calls out ("Real push notifications / email / SMS... Swap
point: `lib/alerts.ts` + a notification-delivery service behind the same `shouldCreateAlert`
gate") — `shouldCreateAlert`'s dedupe logic doesn't change at all, only the delivery mechanism
downstream of it. Don't build push as a prerequisite to shipping to TestFlight; ship the in-app
inbox first, add push once there's a native app with users to actually notify.
