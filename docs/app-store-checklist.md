# PennyForge — App Store Submission Checklist

Tactical, step-by-step checklist for getting PennyForge onto TestFlight and then live on the
App Store. For strategic decisions (build path, auth rework, backend rewrite rationale) see
`docs/ios-roadmap.md`. This doc assumes those decisions are made and tracks the concrete
submission mechanics.

## 1. Apple Developer account

- [ ] Decide account type: **Organization** (not Individual) — PennyForge is a commercial
      product, and an org account is required to use the "PennyForge" name/brand rather than a
      personal name in the App Store listing.
- [ ] Obtain a **D-U-N-S number** for the organization (free, but can take 5–10 business days;
      required before Apple will approve an org enrollment) — apply early, this is the most
      common enrollment delay.
- [ ] Confirm legal entity name/address matches D-U-N-S records exactly (mismatches cause
      enrollment rejection).
- [ ] Enroll at developer.apple.com — **$99/year** fee.
- [ ] Assign App Store Connect roles (Account Holder, Admin, Developer) to whoever will manage
      builds/releases.

## 2. Bundle ID & App Store Connect setup

- [ ] Choose reverse-DNS bundle ID, e.g. `com.pennyforge.app` (must be globally unique, cannot be
      changed after first build upload).
- [ ] Register the bundle ID in the Apple Developer portal (Certificates, Identifiers & Profiles).
- [ ] Create the app record in App Store Connect (name, primary language, bundle ID, SKU).
- [ ] Reserve the App Store display name ("PennyForge" or close variant if taken).
- [ ] Set up App Store Connect app-specific agreements (Paid Apps agreement not needed unless
      monetizing at launch; Free app still requires the base Apple Developer Program License
      Agreement to be active).

## 3. Privacy labels ("App Privacy" nutrition label)

- [ ] Declare **Location** (Precise or Coarse) — used by the route planner to rank nearby stores;
      map to "used to provide app functionality," not tracking, unless ad-targeting is added.
- [ ] Declare **User Content** (photos) if/when receipt-photo proof is added — currently deferred
      per `docs/product-spec.md`, so this label is a placeholder until that ships.
- [ ] Declare **Contact Info / Identifiers** for account data (email or whatever real auth
      replaces the current `pf_user_id` mock cookie — see `lib/currentUser.ts`).
- [ ] Declare **User-generated content** (deal reports, votes) tied to account.
- [ ] For each data type, confirm whether it is linked to identity and whether it's used for
      tracking (it should not be, per current product scope) — inaccurate labels are a rejection
      and post-release enforcement risk, not just a review-time risk.
- [ ] Re-run this declaration any time a new data type is collected (e.g. camera/photo access) —
      it is not a one-time checklist item.

## 4. Screenshots & app icon

- [ ] Cannot be produced until there is an actual iOS build (native or Capacitor/wrapped) — this
      item is blocked on the build-path decision in `docs/ios-roadmap.md`, not on design work.
- [ ] App icon: 1024×1024 px, no alpha channel, no rounded corners (Apple applies the mask).
- [ ] Screenshots required per device class actually supported:
  - [ ] 6.7" (iPhone 15/16 Pro Max class) — required
  - [ ] 6.5" (iPhone 11 Pro Max / XS Max class) — required if supporting older devices
  - [ ] iPad 12.9" — only required if the app supports iPad
- [ ] At least one screenshot set showing real app content (feed, product detail, route planner) —
      no lorem-ipsum or placeholder data (App Review checks for this).
- [ ] Optional: App Preview video (15–30s) — not required for first submission, skip for MVP.

## 5. TestFlight steps

- [ ] Archive and upload build via Xcode Organizer, or export `.ipa` and upload via Transporter.
- [ ] Build appears in App Store Connect → TestFlight tab after processing (can take 15 min–hours;
      automated compliance/export-compliance check runs here).
- [ ] Answer export compliance questions (standard HTTPS/TLS use — select "no" for proprietary
      encryption) each build.
- [ ] Create an **Internal Testing** group (up to 100 testers, must be App Store Connect users
      on the team) — no App Review required, fastest feedback loop.
- [ ] Create an **External Testing** group (up to 10,000 testers via public/email link) — this
      **does require a lightweight Apple Beta Review** (usually <24h, checks for crashes/obvious
      policy violations, not full App Review).
- [ ] Fill in "What to Test" notes per build for testers.
- [ ] Confirm build doesn't expire (TestFlight builds expire 90 days after upload — plan re-upload
      cadence if beta period runs long).

## 6. Production backend requirements (hard prerequisite, not polish)

- [ ] **Blocking:** the current MVP architecture (Next.js server components reading Prisma
      directly against a local SQLite `file:` DB, per `CLAUDE.md`) cannot serve a mobile client —
      there is no deployed API surface for a phone to call, and SQLite is a single local file, not
      a network-reachable database.
- [ ] Stand up a hosted Postgres/Supabase instance using the schema-compatible `datasource` swap
      already documented in `CLAUDE.md` (this was designed in from the start — confirm no
      SQLite-only features crept into `prisma/schema.prisma`, e.g. re-check the `reportDate`
      column approach still works unchanged under Postgres).
- [ ] Deploy the Next.js app (route handlers under `app/api/**`) to a real host reachable over
      HTTPS from a mobile client (Vercel or equivalent) — this becomes the API backend regardless
      of whether the client ships as native Swift, React Native, or a Capacitor wrapper.
- [ ] Replace/extend the mock `pf_user_id` cookie auth (`lib/currentUser.ts`) with a real,
      mobile-compatible auth flow before any external TestFlight distribution — cookie-based mock
      auth does not survive a native app context cleanly.
- [ ] Do **not** attempt a TestFlight upload against the local SQLite dev setup — this checklist
      item must be fully closed first.

## 7. Legal/compliance notes

- [ ] Publish a **privacy policy URL** — required field in App Store Connect, must be live before
      submission (not just before launch).
- [ ] Publish **Terms of Use** (App Store's standard EULA is acceptable, or link a custom one from
      the App Store Connect app description).
- [ ] Implement **in-app account deletion** — Apple Guideline 5.1.1(v) requires a self-service
      delete-account flow reachable from within the app itself; "contact support to delete your
      account" alone is a rejection reason.
- [ ] Confirm account deletion actually removes/anonymizes user-submitted reports and votes per
      whatever data-retention policy the privacy policy commits to (don't let the policy promise
      more than `lib/*` deletion logic actually does).
- [ ] Write the App Store description carefully around **Guideline 5.2.3 (anti-fraud / illegal
      activity facilitation)** — frame PennyForge explicitly as first-hand, in-store,
      user-submitted deal reporting (per `CLAUDE.md`'s hard boundaries: no scraping, no
      private/undocumented retailer APIs, no competitor data ingestion, no automated checkout).
      A reviewer skimming "hidden clearance" + "routing" language could misread this as
      arbitrage-automation tooling — the description and any onboarding copy should pre-empt that
      reading rather than leave it to reviewer discretion.
- [ ] One-line reminder for whoever writes App Review notes/demo account: reiterate the no-scrape
      / no-private-API / no-checkout-bot boundaries explicitly in the reviewer notes field, since
      those boundaries are also PennyForge's actual product commitment, not just review theater.
