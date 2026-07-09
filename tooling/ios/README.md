# tooling/ios — staged iOS release config

These files are **templates**, not an active build. Nothing here runs until you
activate the Capacitor iOS shell with `npm run ios:bootstrap` (see
`scripts/ios-bootstrap.sh`), which copies them into the generated `ios/App/`
native project.

They live outside `ios/` on purpose: `npx cap add ios` refuses to generate into
a pre-existing `ios/` directory, so the templates are staged here and copied in
after the native project is created.

| File | Copied to | Purpose |
|---|---|---|
| `fastlane/Fastfile` | `ios/App/fastlane/Fastfile` | `beta` (TestFlight) + `release` (App Store) lanes |
| `fastlane/Appfile` | `ios/App/fastlane/Appfile` | App identifier + Apple/team IDs (from env) |
| `fastlane/Matchfile` | `ios/App/fastlane/Matchfile` | `match` code-signing config (optional — see Fastfile) |
| `Gemfile` | `ios/App/Gemfile` | Pins `fastlane` for reproducible CI runs |
| `ExportOptions.plist` | `ios/App/ExportOptions.plist` | App Store export options for `xcodebuild`/`gym` |

## Required environment / secrets

The Fastfile reads everything from the environment so the same lanes run locally
and in CI. See `docs/mobile-automation-stack.md` for the full table and where to
store each value (GitHub Actions secrets, Codemagic env groups, or your shell).

- `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8` — App Store Connect API key (the
  `.p8` contents, base64-encoded). Preferred auth; avoids 2FA in CI.
- `DEVELOPER_TEAM_ID`, `FASTLANE_APPLE_ID` — Apple Developer team + account.
- `MATCH_GIT_URL`, `MATCH_PASSWORD` — only if you use `match` (git-stored certs).
  Leave unset to use Xcode automatic signing instead.

Do not commit real values for any of these — they belong in a secrets store,
never in git (see `docs/connectors.md` §4–5).
