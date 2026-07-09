# iOS Deployment — Path to TestFlight and the App Store

The concrete sequence from today's Next.js web app to a reviewed App Store release. Strategy
context is in `docs/ios-roadmap.md` (Capacitor wrap recommended) and
`docs/app-store-checklist.md`; credential details are in `docs/credentials-needed.md` and
`docs/github-secrets.md`.

## Overview

```
Web app (today) → Capacitor iOS shell → local Xcode archive → TestFlight → App Store review → release
                                     └→ CI (GitHub Actions, macos runner) automates archive + upload
```

The web app stays buildable and deployable on its own throughout — the iOS shell points at the
hosted backend (`NEXT_PUBLIC_API_BASE_URL`).

## Phase 0 — prerequisites (Apple Developer setup)

1. Enroll in the Apple Developer Program (Individual vs Organization — see
   `docs/app-store-checklist.md` §1). Note the **Team ID**.
2. Register the **Bundle ID** (recommended `com.pennyforge.app`) with Push Notifications and
   Sign in with Apple capabilities enabled.
3. Create the **App Store Connect app record** using that Bundle ID; note the numeric app ID.
4. Generate an **App Store Connect API key** (Issuer ID + Key ID + `.p8`).
5. Create an **Apple Distribution certificate**, export as `.p12` with a password.
6. Create an **App Store provisioning profile** for the Bundle ID + certificate.
7. Add all of the above to GitHub secrets per `docs/github-secrets.md`.

## Phase 1 — native shell (Capacitor)

1. `npm install @capacitor/core @capacitor/cli @capacitor/ios` and `npx cap init` with the Bundle
   ID; commit `capacitor.config.ts` and the generated `ios/` Xcode project.
2. Point the shell at the hosted app (`server.url` in Capacitor config) for v1 — no static-export
   restructuring of the Next.js app needed.
3. Add native-elevating plugins so the app clears App Review guideline 4.2 (minimum
   functionality): `@capacitor/camera` (report evidence), `@capacitor/geolocation` (route
   planner), `@capacitor/push-notifications` (alerts). See `docs/mobile-readiness.md`.

## Phase 2 — Xcode setup (local, one-time)

1. Open `ios/App/App.xcworkspace` in Xcode.
2. Signing & Capabilities: set the Team, Bundle ID; select the distribution profile for Release.
3. Set app icons, launch screen, display name ("PennyForge"), version (`1.0.0`) and build number.
4. Add `Info.plist` usage strings (see `docs/mobile-readiness.md` for exact keys).
5. Product → Archive → Distribute App → App Store Connect → Upload — verifies the whole signing
   chain once manually before automating it.

## Phase 3 — TestFlight

1. The uploaded build appears in App Store Connect → TestFlight after processing (~15 min).
2. Complete export-compliance question (standard HTTPS ⇒ "exempt").
3. Internal testing: add testers on the team — no review needed, available immediately.
4. External testing: create a group, add up to 10,000 testers — requires a lightweight beta
   review (~1 day).

## Phase 4 — CI/CD deployment

`.github/workflows/ios-release.yml` (added in this repo, `workflow_dispatch`-triggered) runs on a
`macos` runner and, once the `ios/` project exists and secrets are set:

1. Checks all required secrets are present (fails fast with a list of missing names).
2. Installs deps, builds the web bundle, syncs Capacitor (`npx cap sync ios`).
3. Decodes the `.p12` and `.mobileprovision` from base64 secrets into a throwaway keychain.
4. `xcodebuild archive` + `xcodebuild -exportArchive` with App Store method.
5. Uploads the `.ipa` to App Store Connect using the App Store Connect API key — either
   `xcrun altool --upload-app --type ios --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID"` or
   (recommended once Phase 1 lands) **fastlane** (`fastlane pilot upload`), which wraps signing,
   build-number bumping, and upload in one maintained tool.

Until the Capacitor project exists, the workflow runs in "readiness check" mode: it validates
secrets and the web build only.

## Phase 5 — App Store submission

1. In App Store Connect: screenshots (6.9" and 6.5" iPhone), description, keywords, support URL,
   privacy policy URL.
2. Privacy labels (data collection disclosure) — see `docs/mobile-readiness.md`.
3. Age rating questionnaire, pricing (free), availability.
4. Select the TestFlight build → Submit for Review. First reviews typically take 1–3 days.
5. Choose manual or automatic release after approval.

## Release cadence after v1

- Tag-driven: pushing a `v*` tag can trigger the release workflow (currently manual
  `workflow_dispatch` only — flip on when the pipeline is proven).
- Every release needs a monotonically increasing build number; the workflow derives it from
  `github.run_number`.
