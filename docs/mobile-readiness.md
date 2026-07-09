# Mobile Readiness — Native Capabilities, Privacy, and App Review

What the iOS app needs per capability, what exists in the codebase today, and what App Review
requires. Companion to `docs/ios-deployment.md` and `docs/backend-readiness.md`.

## 1. Location

- **Today:** route planner uses manual home ZIP/lat/lng on the `User` record (`homeZip`,
  `homeLat`, `homeLng` in `prisma/schema.prisma`); `lib/geo.ts` does distance math server-side.
- **iOS plan:** `@capacitor/geolocation` for "use my current location" in the route planner and
  store-distance display. When-in-use permission only — no background location (avoids the
  strictest review scrutiny).
- **Info.plist:** `NSLocationWhenInUseUsageDescription` — e.g. "PennyForge uses your location to
  plan store routes and show nearby deals."

## 2. Camera / barcode scanning

- **Today:** manual UPC/SKU text search (`app/search`); no camera anywhere.
- **iOS plan:** `@capacitor/camera` for photo capture; a barcode plugin
  (e.g. `@capacitor-mlkit/barcode-scanning`) to scan UPCs directly into the existing search flow —
  the search API needs no changes, the scanner just fills the UPC field.
- **Info.plist:** `NSCameraUsageDescription` — e.g. "PennyForge uses the camera to scan product
  barcodes and photograph receipts as deal evidence."
- **Compliance note:** scanning a shelf barcode in-store is a first-hand, in-store report — inside
  the `docs/compliance.md` allowlist. No change to the hard boundaries in `CLAUDE.md`.

## 3. Receipt / photo upload

- **Today:** `Report.evidenceUrl` is a placeholder string; no upload endpoint or storage.
- **iOS plan:** camera/photo-library capture → upload to object storage via a new signed-URL
  endpoint (see `docs/backend-readiness.md` gap #3) → store URL in `evidenceUrl`.
- **Info.plist:** `NSPhotoLibraryUsageDescription` (and `NSPhotoLibraryAddUsageDescription` if we
  ever save back) — e.g. "PennyForge lets you attach receipt photos from your library as deal
  proof."
- Strip EXIF GPS from uploaded photos server-side unless the user opts in to sharing location.

## 4. Push notifications

- **Today:** mock DB-backed alerts (`lib/alerts.ts`) with per-recipient 24h dedupe — the dedupe
  logic ships unchanged; only delivery is added.
- **iOS plan:** `@capacitor/push-notifications` + APNs Auth Key (see
  `docs/credentials-needed.md` §8). Store device tokens on the `User`; a delivery adapter sends a
  push when an `Alert` row is created.
- **Review requirement:** push must be optional — the app must function fully if the user declines
  the permission prompt. Never gate core features on notification opt-in.

## 5. Offline behavior

- **Today:** fully server-rendered; no offline support.
- **v1 stance (acceptable for review):** show a branded "You're offline" screen instead of a raw
  WKWebView error; retry on reconnect. Apps are not required to work offline, but a naked network
  error screen looks like "repackaged website" and hurts the 4.2 minimum-functionality review.
- **Later:** cache the last-loaded feed locally; queue report submissions made offline and replay
  them (the same-day `reportDate` unique constraint already makes replays idempotent per day).

## 6. Privacy labels (App Store Connect "App Privacy")

Declare, based on the current data model:

| Data type | Collected? | Linked to identity | Purpose |
| --- | --- | --- | --- |
| Email address | Yes (`User.email`) | Yes | Account |
| Coarse location (home ZIP) | Yes, user-entered | Yes | App functionality (route planner) |
| Precise location | Only if geolocation feature ships | Yes | App functionality |
| Photos (receipts/evidence) | Yes, when uploads ship | Yes | App functionality |
| User content (reports, votes) | Yes | Yes | App functionality |
| Identifiers/tracking | No | — | No ads, no cross-app tracking ⇒ "Data Not Used to Track You" |

A public **privacy policy URL** is mandatory before submission.

## 7. App Store review requirements (summary)

- **4.2 Minimum functionality:** the main risk for a web-wrap. Mitigate with real native features
  at launch: barcode scanning, camera receipt capture, geolocation, push. See `docs/ios-roadmap.md`.
- **4.8 Sign in with Apple:** required if any third-party sign-in is offered — plan Sign in with
  Apple as the first real auth provider (see `docs/backend-readiness.md` gap #1).
- **5.1.1 Data collection:** permission prompts must appear in context (ask for camera when the
  user taps "scan", not at launch); usage strings must be specific.
- **UGC (1.2):** PennyForge is user-generated content — review requires a way to **report
  objectionable content**, **block users**, and moderation. Admin moderation exists
  (`app/admin`); add in-app "report this deal/user" affordances before submission.
- **Account deletion (5.1.1(v)):** apps with account creation must offer in-app account deletion —
  needs a backend endpoint + UI before submission.
- Demo account credentials for the review team (a seeded reviewer login) in the review notes.
