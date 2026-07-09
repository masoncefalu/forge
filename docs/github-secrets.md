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

### Apple / App Store Connect

| Secret name | Value | Source |
| --- | --- | --- |
| `APPLE_TEAM_ID` | 10-char Team ID | developer.apple.com → Membership |
| `IOS_BUNDLE_ID` | e.g. `com.pennyforge.app` | Certificates, Identifiers & Profiles → Identifiers |
| `ASC_ISSUER_ID` | Issuer UUID | App Store Connect → Users and Access → Integrations → App Store Connect API |
| `ASC_KEY_ID` | Key ID of the API key | Same page, next to the key |
| `ASC_API_KEY_BASE64` | Base64 of the `.p8` API key file | Downloaded once at key creation (see encoding below) |
| `ASC_APP_ID` | Numeric App Store Connect app ID | App record → App Information |

### iOS signing

| Secret name | Value | Source |
| --- | --- | --- |
| `IOS_DIST_CERT_BASE64` | Base64 of the Apple Distribution `.p12` | Exported from Keychain Access |
| `IOS_DIST_CERT_PASSWORD` | Password chosen when exporting the `.p12` | Mason |
| `IOS_PROVISIONING_PROFILE_BASE64` | Base64 of the App Store `.mobileprovision` | Certificates, Identifiers & Profiles → Profiles |
| `IOS_KEYCHAIN_PASSWORD` | Any random string (e.g. `openssl rand -base64 24`) | Generated once; used to create a temp keychain on the macOS runner |

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
# App Store Connect API key
base64 -i AuthKey_XXXXXXXXXX.p8 | pbcopy        # macOS (copies to clipboard)
base64 -w0 AuthKey_XXXXXXXXXX.p8                 # Linux (prints one line)

# Distribution certificate
base64 -i Certificates.p12 | pbcopy

# Provisioning profile
base64 -i PennyForge_AppStore.mobileprovision | pbcopy

# APNs / Sign in with Apple keys
base64 -i AuthKey_YYYYYYYYYY.p8 | pbcopy
```

Paste the single-line output as the secret value. In workflows, decode with:

```bash
echo "$IOS_DIST_CERT_BASE64" | base64 --decode > cert.p12
```

## Notes

- Never commit any of these files or values to the repo (`.gitignore` already excludes `.env*`;
  keep `.p8`/`.p12`/`.mobileprovision` files out of the tree entirely).
- Secrets are not needed for the existing CI build job — `.github/workflows/ci.yml` runs entirely
  against a local SQLite file. Only the future iOS release workflow consumes the Apple secrets.
- The `ios-release.yml` workflow checks for missing secrets and fails fast with a readable list
  instead of a cryptic signing error.
