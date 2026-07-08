# PennyForge — App Store Submission Checklist

Working checklist for taking PennyForge from the current Next.js/SQLite MVP to an iOS App Store
submission. This is a planning document, not a record of completed enrollment/config — nothing
here has been executed (no Apple Developer account created, no App Store Connect record made).
Treat every unchecked item as an open task.

See `CLAUDE.md` (Hard boundaries, Stack) and `docs/compliance.md` before touching anything below —
the App Review risk section leans on both.

## 1. Apple Developer account

- [ ] Decide **Individual** vs **Organization** enrollment.
  - Individual: cheapest/fastest path, app is listed under the founder's personal name on the
    store page (no "PennyForge LLC" as seller unless you enroll as an org). Fine for a solo-founder
    MVP launch but harder to transfer later.
  - Organization: requires a D-U-N-S number (free from Dun & Bradstreet, but can take 5 business
    days–2 weeks to issue/verify if PennyForge doesn't already have one), legal entity paperwork,
    and a Legal Entity Name that must match public records. Recommended if PennyForge is
    incorporated (LLC/C-corp) and monetization or a team of contributors is planned — the App
    Store listing then shows the company name, not a person.
- [ ] Cost: **$99/year**, renews annually, non-refundable if the app is later rejected or pulled.
- [ ] Timeline: individual approval is often near-instant to ~48h; organization approval commonly
  takes **1–3 weeks** once the D-U-N-S number is in hand (D-U-N-S lookup/issuance is the long pole
  — start that first if org enrollment is likely).
- [ ] Two-factor authentication must be enabled on the Apple ID used for enrollment (required by
  Apple, not optional).
- **Action item**: decide entity type now, since D-U-N-S lookup is the schedule-critical path if
  org enrollment is chosen.

## 2. Bundle ID

- [ ] Register a bundle ID in the Apple Developer portal (Certificates, Identifiers & Profiles →
  Identifiers) before creating the App Store Connect record — App Store Connect requires an
  existing bundle ID.
- [ ] Naming convention: reverse-DNS based on a domain PennyForge controls, e.g.:
  - `com.pennyforge.app` (if `pennyforge.com`/similar is owned) — preferred, simplest.
  - `com.pennyforge.ios` if a separate identifier per platform is wanted later (Android, web
    wrapper) for clarity in analytics/crash tooling.
  - Avoid `com.pennyforge.mvp` or anything implying a temporary/test build — bundle IDs are
    effectively permanent once an app ships under them.
- [ ] Confirm no existing bundle ID collision (Apple bundle IDs are globally unique, first-come).
- [ ] If push notifications or Sign in with Apple are added later (both currently out of MVP scope
  per `docs/product-spec.md`), enable those capabilities on the bundle ID before generating
  provisioning profiles — retrofitting is extra friction, not a blocker, but cheaper to do once.

## 3. App Store Connect

- [ ] Create the app record in App Store Connect (My Apps → +) using the registered bundle ID.
- [ ] Fill in: app name (must be globally unique on the App Store — check availability early;
  "PennyForge" may collide with something, have 2–3 backups), primary language, SKU (internal,
  not shown to users), primary category (likely **Shopping**, possibly secondary **Lifestyle**).
- [ ] **Agreements, Tax, and Banking** — only required once monetization exists (paid app, IAP,
  subscriptions). The MVP per `CLAUDE.md`/`docs/product-spec.md` has no paid tier yet (paid tier
  is Phase 4). If launching free with no IAP, this section can stay unconfigured at first
  submission, but:
  - [ ] Still accept the **Apple Developer Program License Agreement** (required regardless of
    monetization — App Store Connect blocks submission without it).
  - [ ] If/when a paid tier ships (Phase 4 per product-spec), banking + tax interviews (W-9/W-8BEN
    or equivalent) must be completed *before* that build can go live with IAP — start that
    paperwork a few weeks ahead of the monetization launch, not the day of.
- [ ] Set up **App Privacy** (section 4 below), age rating questionnaire, and content rights
  declaration (PennyForge should answer "no" to using third-party content requiring licensing,
  consistent with the first-hand-user-generated-content model).

## 4. Privacy labels ("nutrition labels")

Map current + near-term data collection to Apple's App Privacy questionnaire categories. Base this
on what the schema and product spec actually do, not aspirational future state — under-disclosing
is an App Review rejection risk and a policy violation if caught post-launch.

| Data type | Collected? | Apple category | Linked to identity? | Used for tracking? | Notes |
|---|---|---|---|---|---|
| Precise/coarse location | Yes (home lat/lng for route planner) | **Location** | Yes (tied to user account) | No | `docs/compliance.md`: home location used only for route-planner distance calc, never shown to other users. Declare as "used for App Functionality," not "used for tracking." |
| Photos (receipt/evidence images, once real upload ships) | Not yet in MVP (evidence is a placeholder URL today) — **will be** once Phase 1 file upload lands | **Photos or Videos** (User Content) | Yes | No | Must add this row to the privacy label *before* shipping the file-upload feature, not retroactively — App Review can re-review at any update. |
| User-submitted reports (price, product, store, notes) | Yes | **User Content** | Yes | No | Core product data; tie to account, not "tracking." |
| Vote/report history (confirm/dead votes, trust score) | Yes | **User Content** / **Identifiers** (User ID) | Yes | No | Feeds `lib/scoring.ts`; internal only, not shared externally. |
| Account identifiers (mock `pf_user_id` today; real auth in Phase 1) | Yes | **Identifiers** (User ID) | Yes | No | When real auth (`lib/currentUser.ts` swap point) lands, revisit — email/OAuth identity may add an **Contact Info** row. |
| Email/handle (per `docs/compliance.md`: "no PII beyond email/handle") | Yes | **Contact Info** | Yes | No | |
| Usage data / diagnostics (if analytics or crash reporting added) | Not in MVP | **Usage Data** / **Diagnostics** | Depends on tool | Depends | Flag for whoever adds analytics later — revisit this doc then. |

- [ ] Answer "Data Not Linked to You" only where genuinely true — location and reports here are
  linked to an account, so mark them "Linked to Your Identity."
- [ ] Answer **"Data Used to Track You"** as **No** across the board unless a third-party ad
  network or cross-app tracking SDK is ever added (none exists in this MVP) — this also determines
  whether an App Tracking Transparency (ATT) prompt is required (not required if the "No" holds).
- [ ] Revisit this table every time a new `lib/*.ts` module or Prisma model starts collecting a new
  field — this is a living checklist item tied to schema changes, not a one-time form.

## 5. Location permission language

Add to `Info.plist` (or the native shell's equivalent once the iOS wrapper exists — no native
project currently exists in this repo per `docs/product-spec.md`'s "native mobile app: later
phase" note):

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>PennyForge uses your location to show you nearby stores with clearance and penny-item
leads, and to plan efficient shopping routes. Your location is never shown to other users.</string>
```

- [ ] Use **"When In Use"** only — the MVP has no background location use case (no live
  geofencing, no background alerts requiring continuous location per `docs/product-spec.md`'s
  deferred features). Do not request `NSLocationAlwaysAndWhenInUseUsageDescription` unless a real
  background-alert feature ships; requesting broader permission than the feature set uses is a
  common App Review rejection reason.
- [ ] Copy should be specific about *why* (store proximity / routing), which is what Apple review
  guidelines (5.1.1) expect — vague copy like "this app needs your location" gets rejected.

## 6. Camera / photo permission language

Two related but distinct permissions depending on which future feature is live at submission time
(neither exists as *real* functionality yet — see `docs/product-spec.md`: barcode scanning and
receipt OCR/upload are both explicitly deferred, camera copy below is prepared ahead of that work):

```xml
<key>NSCameraUsageDescription</key>
<string>PennyForge uses your camera to photograph receipts and shelf tags as proof for your
clearance and penny-item reports, and to scan barcodes for quick product lookup.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>PennyForge lets you attach a photo from your library as proof (receipt or shelf tag) for a
report.</string>
```

- [ ] If barcode scanning ships before receipt photo upload (or vice versa), split into two more
  precise strings rather than one combined one — combined copy is acceptable but precise, feature-
  scoped copy reduces review friction and reads better to users at the permission prompt.
- [ ] Do **not** submit a build requesting `NSCameraUsageDescription` if the app has zero camera
  use anywhere yet (current MVP: evidence is a placeholder URL, no real capture) — an unused
  permission declaration with no corresponding UI flow is a rejection reason (Guideline 5.1.1) and
  also fails privacy-label consistency checks (Apple cross-checks declared permissions against
  binary behavior).

## 7. Receipt proof upload — App Store implications

Once Phase 1's real file upload for evidence photos ships, receipts are user-uploaded images that
can contain: full or partial card numbers, loyalty account numbers, home address (some receipts
print store address, not customer's, but some print loyalty-linked info), purchase history
patterns. Treat this as sensitive user content even though it's not classic PII like SSN.

- [ ] **Redaction guidance to users**: report submission UI should prompt "crop out or blur card
  numbers" before upload — doesn't need to be automated in MVP, but the *ask* should exist in the
  UI copy once upload ships.
- [ ] **Retention policy**: define and document how long receipt images are retained and who can
  view them (currently: nobody, because no real upload exists yet). When it ships, App Review and
  the App Privacy label both expect a stated retention/deletion policy — this should live in a
  future revision of `docs/compliance.md`, not just this checklist.
- [ ] **Deletion path**: users should be able to delete their own submitted evidence images (and
  ideally the underlying report) — App Store Review Guideline 5.1.1(v) requires an in-app account
  deletion path for apps that support account creation, which extends in practice to user-
  generated content deletion. Confirm this exists before submission once accounts are real (Phase
  1 swaps `lib/currentUser.ts` for real auth).
- [ ] **Storage security**: once file upload is real, images should not be stored in a way that's
  publicly enumerable/guessable (signed URLs or auth-gated storage, not a public bucket with
  sequential IDs) — this is a security expectation reviewers don't explicitly test but that shows
  up in privacy complaints/press if violated.
- [ ] This entire section is blocked on Phase 1 file upload landing — flag as **not required for
  a v1 submission that ships before real upload exists**, but required before *any* build that
  claims receipt-photo evidence in its App Store description or screenshots.

## 8. Screenshots

- [ ] Required device sizes (per current Apple guidelines — verify against App Store Connect at
  submission time since Apple periodically retires/adds required sizes as new hardware ships):
  - **6.9" / 6.7" display** (e.g. iPhone 16 Pro Max / 15 Pro Max class) — currently the largest
    required iPhone size class.
  - **6.5" display** (iPhone 11 Pro Max/XS Max class) — commonly still required or auto-derivable.
  - **5.5" display** (iPhone 8 Plus class) — required only if supporting older devices; confirm
    current requirement, Apple has been relaxing this over time.
  - iPad screenshots (12.9" / 11") **only if the app supports iPad** — if PennyForge ships
    iPhone-only at first (reasonable for an MVP), mark iPad as out of scope and set the app to
    iPhone-only in App Store Connect to skip this requirement entirely.
- [ ] Showcase screens (map to the "First vertical slice" in `CLAUDE.md`):
  1. **Local feed** (`app/page.tsx`) — the core "browse nearby leads" screen, should be screenshot
     #1 since it's the primary value prop.
  2. **Search** (`app/search/page.tsx`) — manual UPC/SKU/name lookup, shows "verify a specific
     product" use case.
  3. **Report submission** (`app/report/new/page.tsx`) — shows the compliance-guarded, evidence-
     based submission flow; good place to visually reinforce "verified, not scraped."
  4. **Route planner** (`app/route/page.tsx`) — the ROI/expected-value ranking, PennyForge's most
     differentiated screen vs. Discord-chaos competitors; strong candidate for screenshot #2 given
     it's the retention loop, not just the acquisition loop.
  5. Optional 5th/6th: lead detail page (confidence score breakdown — reinforces "why this lead
     scores X" trust story) and/or leaderboard (community trust angle).
- [ ] Use realistic seeded data for screenshots (GA/FL/TX stores across Home Depot, Lowe's, Dollar
  General, Walmart per the seed data) — do not screenshot obviously fake placeholder text.
- [ ] Do not include retailer logos/trademarks prominently in a way that implies partnership or
  endorsement — PennyForge is not affiliated with any retailer (per the `app/layout.tsx` footer
  disclaimer); screenshots should read as user-generated reports about stores, not branded retailer
  content.

## 9. Icon

- [ ] **1024×1024px**, PNG, **no alpha channel** (no transparency) — Apple's asset validator
  rejects icons with an alpha channel outright.
- [ ] No rounded corners baked into the source image — Apple applies the corner mask
  automatically; a pre-rounded icon shows double-masking artifacts.
- [ ] sRGB or P3 color space, flattened (no layers).
- [ ] Also need the full icon set for the Xcode asset catalog (multiple sizes for home screen,
  Spotlight, Settings, notification icons across iPhone/iPad) once a native/wrapper project
  exists — Xcode can generate these from the 1024×1024 master via the asset catalog, so only the
  master needs hand-crafting.
- [ ] No text baked into the icon that assumes English-only (fine for MVP given no i18n per
  product-spec, but note if bilingual UX ships later per Phase 3).

## 10. TestFlight

- [ ] **Internal testing**: up to 100 testers, added via App Store Connect Users and Access (must
  be team members on the Apple Developer account/org). No App Review required — builds are
  available within minutes of processing. Use this first for the founding team / early
  contributors to dogfood before any external review.
- [ ] **External testing**: up to 10,000 testers via public or email-invite links. **Requires a
  Beta App Review** (a lighter-weight review than full App Store review, but still a real Apple
  review with its own rejection risk) before the first external build goes out; subsequent builds
  on external groups need review too unless they qualify for an expedited/auto-approved path for
  minor updates.
- [ ] Builds **expire 90 days** after upload — plan a re-upload/refresh cadence if a long external
  beta is planned (don't let a beta cohort sit on an expiring build).
- [ ] Each new build requires a compliance question (export compliance / encryption) answered in
  App Store Connect before it's distributable — standard HTTPS-only apps typically qualify for the
  standard exemption, but confirm this per build.
- [ ] Use external TestFlight as the dry run for App Review risk language (section 12) — beta
  testers and beta reviewers are a cheap way to catch "this reads like a scraping tool" feedback
  before the real submission.

## 11. Backend requirements — dependency flag

**Current state per `CLAUDE.md`**: local SQLite (`file:` DATABASE_URL) via Prisma, no hosted
database, no auth beyond a mock cookie, synchronous DB-backed alerts (no push, no background
workers).

- [ ] **A submitted App Store build cannot ship pointing at local SQLite.** Every install needs a
  shared, always-on hosted backend (all users need to see the same feed/reports/votes) — this is a
  hard requirement, not a nice-to-have, and it's the single biggest blocker to submission as of
  this checklist.
- [ ] `CLAUDE.md` states the Postgres/Supabase migration is meant to be "a schema-compatible swap
  of the `datasource` block" — confirm this is still true at the time of iOS build prep by actually
  running the swap against a real Postgres instance (staging), not just assuming schema
  compatibility holds. `docs/product-spec.md` also flags the `reportDate` unique-constraint
  workaround as SQLite-motivated; verify it still behaves correctly under Postgres (Postgres does
  allow expression indexes, but there's no need to change working code — just confirm no
  regression).
- [ ] Real auth (swap point `lib/currentUser.ts`) needs to land before a public App Store build
  ships — a mock `pf_user_id` cookie user-switcher is fine for internal dogfooding/TestFlight
  internal testers, but is not acceptable for a public listing (no real account security, trust
  score gaming risk, moderation identity risk).
- [ ] Hosted API needs to be reachable over HTTPS from a mobile client network context (App
  Transport Security requires HTTPS by default; any hosted backend must serve valid TLS).
- **This is explicitly a cross-cutting dependency**: whatever the `connectors`/`ios-roadmap`
  teammates conclude about the Postgres/Supabase migration path and native/wrapper architecture
  determines the real timeline here. This checklist does not resolve that migration — it only
  flags that **no App Store submission should be attempted until a hosted backend + real auth
  exist**, and defers the specific migration plan to those workstreams.

## 12. App Review risks — compliance-boundary framing

PennyForge's whole pitch ("Waze for hidden clearance," competing with "Discord-chaos communities
and gray-data lookup tools") sits close to categories Apple reviewers are trained to scrutinize:
deal-aggregator apps that scrape, price-tracking apps that hit undocumented retailer APIs, and
"contact info aggregator"/gray-market apps. The hard boundaries in `CLAUDE.md` and
`docs/compliance.md` are the actual answer to this risk — the job here is to make sure App Review
*sees* that framing instead of guessing.

- [ ] **Preempt the "is this a scraper?" question directly in App Review notes** (App Store
  Connect → version → "Notes for Review" — this text is seen by the human reviewer, not published
  publicly). Draft language, adapt as needed:

  > PennyForge is a community reporting app, not a scraper or price-tracking bot. All product/price
  > data comes from first-hand, in-store user reports (photos of shelf tags/clearance stickers,
  > receipts, or direct in-store observation) — see the enforced allowlist in the app's compliance
  > module. PennyForge never scrapes retailer or competitor websites, never calls undocumented or
  > private retailer APIs, never ingests competitor paid data feeds, and has no automated checkout
  > or purchase-bot functionality of any kind. A community voting system (confirm/dead vote) keeps
  > data fresh and automatically suppresses stale or disputed reports.

- [ ] **Explicitly disclose no retailer affiliation** in both the app's own UI (already present per
  `app/layout.tsx` footer, per `docs/compliance.md`) and in the App Store description/marketing
  copy — do not use retailer names/logos in a way that could look like an official retailer app or
  a sanctioned partner app. Use retailer names only descriptively ("reports at Home Depot, Lowe's,
  Dollar General, Walmart locations"), not as branding elements.
- [ ] **Avoid "coupon/gray-market" adjacent language** in the App Store listing itself — words like
  "hack," "exploit," "glitch," or "loophole" (common in penny-hunting community slang) read
  differently to a reviewer than to the target community; keep public-facing copy focused on
  "verified reports," "community-confirmed," and "in-store finds."
  - Internally/product-wise this is just accurate language anyway — nothing here is actually a
    glitch or exploit, since penny pricing and hidden clearance are store-initiated markdowns, not
    a bug being abused. Make sure the App Store copy reflects that accuracy rather than reaching
    for community slang.
- [ ] **User-generated content moderation** — Apple requires apps with UGC to have: a mechanism to
  filter objectionable content, a reporting/flagging mechanism, a blocking mechanism, and published
  contact info for the developer (Guideline 1.2). PennyForge has admin/moderator approval and
  confirm/dead voting (`app/admin`, `lib/scoring.ts`) — confirm before submission that:
  - [ ] There's a user-facing "report this listing/report this user" affordance, not just backend
    moderator tooling.
  - [ ] There's a way for a user to block/mute another contributor if harassment occurs (not
    currently in the MVP feature list per `docs/product-spec.md` — flag as a possible gap to close
    before public launch, distinct from the admin-only moderation queue).
- [ ] **Physical safety / store-conduct disclaimer** — keep and possibly strengthen the existing
  "be kind to store employees" footer language (`docs/compliance.md` references this) both in-app
  and in App Review notes, since deal-hunting apps have a history of reviewer concern about
  incentivizing disruptive in-store behavior (crowding, arguing with staff over pricing). Framing
  PennyForge as informational/community-verified rather than "go demand this price" reduces this
  risk.
- [ ] **Guideline 5.1.1 (data collection) and 5.1.2 (location)** — make sure the App Review notes
  also mention that home location is never shown to other users (per `docs/compliance.md`) and is
  used only for route-planner math — this preempts a reviewer flagging location use as
  under-explained.
- [ ] **If a reviewer test account is needed** (likely, since reports/voting require login), provide
  a working demo login in App Review notes with pre-seeded data so the reviewer can see the full
  loop (feed → search → submit report → confidence score → vote → route planner) without having to
  create their own account or find real in-store evidence.

## Summary of hard blockers before submission

1. **Hosted backend + real auth required** — current SQLite/mock-auth MVP cannot ship publicly
   (section 11). This is the single largest blocker and depends on the Postgres/Supabase migration
   and auth work tracked elsewhere (`connectors`/`ios-roadmap` workstreams).
2. **No native/wrapper iOS project exists yet** in this repo — this checklist assumes one will be
   created (native shell or wrapped PWA per `docs/product-spec.md` Phase 4 framing, or pulled
   earlier if iOS readiness is prioritized ahead of that roadmap phase). Bundle ID, entitlements,
   and Info.plist entries above assume that project exists.
3. **UGC moderation gaps** (user-facing report/block affordances) should be closed before public
   submission per Guideline 1.2 — currently only admin-side moderation exists.
4. Camera/photo-upload permission strings and privacy-label rows in this doc are **written ahead of
   the underlying features** (receipt upload, barcode scan) per `docs/product-spec.md`'s deferred
   list — do not ship the permission declarations before the corresponding feature exists, and do
   revisit this doc when those features land.
