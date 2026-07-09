# GitHub Secrets — Names, Sources, and Setup

The exact secret names the project uses (and that `.github/workflows/ios-release.yml` expects),
where each value comes from, and how to add them.

## Where to add secrets

GitHub → `masoncefalu/forge` → **Settings → Secrets and variables → Actions → New repository
secret**, i.e.:

```
https://github.com/masoncefalu/forge/settings/secrets/actions
```

## Secret names

### Apple / App Store Connect (read by `.github/workflows/ios-release.yml`)

These names match the workflow's `env:` block and the Fastlane templates in
`tooling/ios/` exactly — the release run reads them verbatim.

| Secret name | Value | Source |
| --- | --- | --- |
| `ASC_ISSUER_ID` | Issuer UUID | App Store Connect → Users and Access → Integrations → App Store Connect API |
| `ASC_KEY_ID` | Key ID of the API key | Same page, next to the key |
| `ASC_KEY_P8` | Base64 of the `.p8` API key file | Downloaded once at key creation (see encoding below) |
| `DEVELOPER_TEAM_ID` | 10-char Apple Developer team ID | developer.apple.com → Membership |
| `FASTLANE_APPLE_ID` | Apple ID email (Apple-ID auth fallback only) | Your Apple Developer account |
| `CAPACITOR_SERVER_URL` | Hosted URL the iOS shell points at, e.g. `https://pennyforge.vercel.app` | Your deployment |

### iOS signing (only if using fastlane `match`)

The Fastfile uses `match` when `MATCH_GIT_URL` is set, otherwise Xcode
automatic signing — no raw `.p12`/`.mobileprovision` secrets are needed.

| Secret name | Value | Source |
| --- | --- | --- |
| `MATCH_GIT_URL` | Private git repo URL holding match-managed certs/profiles | Created once (must be private) |
| `MATCH_PASSWORD` | Passphrase encrypting the match repo contents | Generated once (e.g. `openssl rand -base64 24`) |

### Backend / auth / storage / push (added when each feature lands)

| Secret name | Value | Source |
| --- | --- | --- |
| `DATABASE_URL` | Production Postgres connection string | Neon/Supabase dashboard |
| `AUTH_SECRET` | `openssl rand -base64 32` output | Generated once |
| `APPLE_SIGNIN_KEY_BASE64` | Base64 of the Sign in with Apple `.p8` key | Apple Developer → Keys |
| `APPLE_SIGNIN_KEY_ID` | Key ID of that key | Same page |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token (or use `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY`/`S3_BUCKET`/`S3_REGION`) | Vercel dashboard / AWS IAM |
| `APNS_KEY_BASE64` | Base64 of the APNs Auth Key `.p8` | Apple Developer → Keys |
| `APNS_KEY_ID` | APNs Key ID | Same page |

## Base64 encoding steps

Binary/PEM files can't be pasted into a secret directly — base64-encode them first (macOS/Linux):

```bash
# App Store Connect API key (paste as ASC_KEY_P8)
base64 -i AuthKey_XXXXXXXXXX.p8 | pbcopy        # macOS (copies to clipboard)
base64 -w0 AuthKey_XXXXXXXXXX.p8                 # Linux (prints one line)

# APNs / Sign in with Apple keys (future features)
base64 -i AuthKey_YYYYYYYYYY.p8 | pbcopy
```

Paste the single-line output as the secret value. The Fastfile decodes
`ASC_KEY_P8` itself (`is_key_content_base64: true`).

## Notes

- Never commit any of these files or values to the repo (`.gitignore` already excludes `.env*`;
  keep `.p8`/`.p12`/`.mobileprovision` files out of the tree entirely).
- Secrets are not needed for the existing CI build job — `.github/workflows/ci.yml` runs entirely
  against a local SQLite file. Only the future iOS release workflow consumes the Apple secrets.
- The `ios-release.yml` workflow checks for missing secrets and fails fast with a readable list
  instead of a cryptic signing error.
