# PennyForge — iOS CI/CD Options (who runs the build)

Once the Capacitor iOS project exists (`docs/mobile-automation-stack.md`),
something has to run the macOS build, sign it, and upload to TestFlight/App Store.
This doc compares the four realistic runners and explains why **Codemagic** is the
recommended default with **GitHub Actions** as the in-repo fallback. Two config
files are already staged: `codemagic.yaml` and `.github/workflows/ios-release.yml`.

This is the runner-selection companion to `docs/tooling-options.md` (full tool
audit) and `docs/mobile-automation-stack.md` (Capacitor + Fastlane). GitHub
automation fundamentals (secrets, triggers, permissions) are in `docs/connectors.md`.

---

## Comparison

| | **Codemagic** | **GitHub Actions (macOS)** | **Bitrise** | **Xcode Cloud** |
|---|---|---|---|---|
| Model | Managed mobile CI | Your repo's CI | Managed mobile CI | Apple-native |
| Config location | `codemagic.yaml` (git) | `.github/workflows/*.yml` (git) | `bitrise.yml` + web UI | App Store Connect (GUI) |
| Signing | Managed (ASC integration) | You wire Fastlane secrets | Managed (code-signing tab) | Managed by Apple |
| Free tier | 500 macOS min/mo | 2,000 min/mo, **macOS billed ×10** | limited free builds | 25 compute-hrs/mo |
| Builds web layer? | Yes (`npm`/`cap` steps) | Yes | Yes | **No** — needs `ci_post_clone` shim |
| GitHub integration | GitHub App, PR status | Native | GitHub App, PR status | Works, config off-repo |
| Agent-friendly config | High (one YAML) | High (one YAML) | Medium (UI-first) | Low (GUI) |
| Setup effort | Easy–Medium | Medium | Easy | Medium |
| Lock-in | Vendor dashboard | None | Vendor + visual model | Apple-only |

### Why Codemagic (primary)

- **Managed signing** via its App Store Connect integration removes most of the
  Fastlane secret plumbing — you don't hand it a `.p8` per workflow; you authorize
  once in the dashboard.
- **Free macOS minutes** on M-series instances; an IPA build is ~10–20 min, so the
  free tier comfortably covers a solo/MVP release cadence.
- **First-class Capacitor/Ionic support** — `npm ci → npm run build → npx cap sync
  ios → build-ipa` is a well-trodden Codemagic path.
- **Single YAML in git** (`codemagic.yaml`) is a clean surface for Claude/Copilot to
  edit — unlike Bitrise's visual editor or Xcode Cloud's GUI.

### Why GitHub Actions (fallback)

- **Zero new vendor** — everything (source, CI, releases) stays in one place.
- **You already use it** (`ci.yml`), so there's no new dashboard.
- Cost is the catch: **macOS runners bill at ~10× Linux minutes**, so the 2,000
  free minutes evaporate fast on frequent iOS builds. That's why the staged
  `ios-release.yml` is **manual/tag-only** — it never runs on ordinary pushes/PRs.
- You manage signing yourself (the Fastlane secrets in
  `docs/mobile-automation-stack.md`), which is more control but more plumbing.

### Why not Bitrise (documented alternative)

Functionally overlaps Codemagic. Its visual workflow editor is nice for some teams
but is UI-first — less git-native and not something an agent can drive. Only pick it
if you specifically prefer the visual model or need a marketplace step Codemagic
lacks. No config is staged for it; a `bitrise.yml` would mirror `codemagic.yaml`.

### Why Xcode Cloud is a "later" (not "now")

- It **can't exist before the Xcode project does** — Capacitor generates that, so
  it's chronologically after Capacitor anyway.
- It **doesn't build the web layer**: you'd add a `ios/App/ci_scripts/ci_post_clone.sh`
  that runs `npm ci && npm run build && npx cap sync ios` before Xcode builds.
- Config lives in **App Store Connect's GUI**, not the repo — poor for git history
  and agent automation.
- Its real appeal is *simplification once things stabilize* and you're all-in on
  Apple's ecosystem. Revisit then; don't start here.

---

## Staged config: `codemagic.yaml`

Triggers on `ios-v*` tags. Inert until you connect the repo at codemagic.io. Setup:

1. Sign up at codemagic.io, connect GitHub via the **Codemagic GitHub App**, add
   `masoncefalu/forge`.
2. **Teams → Integrations → App Store Connect**: create an integration named
   `pennyforge_asc` (upload the ASC API key once).
3. **App settings → Environment variables**: create the `pennyforge_ios` env group
   with `APP_STORE_APPLE_ID` (the numeric app ID from App Store Connect).
4. Push a tag: `git tag ios-v0.1.0 && git push origin ios-v0.1.0`.

The workflow runs `npm ci → npm run build → npx cap sync ios`, fetches signing
files via `app-store-connect fetch-signing-files`, bumps the build number, builds
the IPA, and publishes to TestFlight. Secrets live in Codemagic, **not** GitHub.

## Staged config: `.github/workflows/ios-release.yml`

Manual-only (`workflow_dispatch` with a `beta`/`release` lane choice) and `ios-v*`
tag-triggered. **Safety properties:**

- Never runs on normal pushes/PRs → **zero macOS minutes** spent by default and
  **cannot affect the required `build-and-test` check**.
- First step guards on `ios/App` existing and no-ops gracefully with a warning if
  the project hasn't been bootstrapped yet.
- `permissions: contents: read` only — releasing uses the ASC API key, not
  `GITHUB_TOKEN` (per `docs/connectors.md` least-privilege guidance).

Setup: add the secrets from `docs/mobile-automation-stack.md` (Part 2) under
Settings → Secrets and variables → Actions, then **Actions → iOS Release → Run
workflow**, or push an `ios-v*` tag.

### Required GitHub Secrets (Actions path only)

`ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8` (base64), `DEVELOPER_TEAM_ID`,
`FASTLANE_APPLE_ID`, `CAPACITOR_SERVER_URL`, and optionally `MATCH_GIT_URL` +
`MATCH_PASSWORD`. If you use Codemagic instead, GitHub needs **none** of these.

---

## Recommendation

1. **Start with Codemagic** for the managed-signing, free-minutes, low-friction
   path. Keep `ios-release.yml` in the repo as a zero-lock-in fallback.
2. **Do the first TestFlight upload manually from Xcode** (`docs/mobile-automation-
   stack.md` Part 3) before wiring *any* runner — prove the signing/provisioning
   works once by hand so CI failures are about CI, not about Apple setup.
3. **Revisit Xcode Cloud only after** `ios/App` is stable and the release cadence
   is known — it may become the simpler choice once the project exists.
4. **Do not make the iOS build a required check on `main`.** It's slow, costs macOS
   minutes, and shouldn't gate web PRs. Keep `build-and-test` (lint/test/build) as
   the only required check per `docs/connectors.md` recommendations.
