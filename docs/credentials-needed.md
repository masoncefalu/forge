# Credentials Needed — iOS Release Path

Everything Mason needs to obtain or generate, grouped by system. Exact GitHub secret names and
encoding steps live in `docs/github-secrets.md`; how each item is used lives in
`docs/ios-deployment.md`.

## 1. Apple Developer

| Item | Where it comes from | Notes |
| --- | --- | --- |
| Apple Developer Program membership | developer.apple.com/programs ($99/yr) | Individual vs Organization decision — see `docs/app-store-checklist.md` §1 |
| **Apple Developer Team ID** | developer.apple.com → Membership details | 10-character ID, e.g. `AB12CD34EF` |
| **Bundle ID** | Certificates, Identifiers & Profiles → Identifiers | Recommended: `com.pennyforge.app`. Enable Push Notifications + Sign in with Apple capabilities at creation |
| Apple ID with 2FA | Existing Apple ID | 2FA is mandatory for program enrollment |

## 2. App Store Connect

| Item | Where it comes from | Notes |
| --- | --- | --- |
| App Store Connect app record | appstoreconnect.apple.com → My Apps → + | Requires the Bundle ID to exist first |
| **App Store Connect app ID (Apple ID of the app)** | App record → App Information → General Information | Numeric ID used by upload tooling |
| **App Store Connect API Key (.p8 file)** | Users and Access → Integrations → App Store Connect API → Generate | Role: App Manager. Download once — Apple never re-shows it |
| **App Store Connect Key ID** | Same page, listed next to the generated key | e.g. `2X9R4HXF34` |
| **App Store Connect Issuer ID** | Same page, top of the Keys section | UUID shared by all keys in the team |

## 3. Xcode / iOS signing

| Item | Where it comes from | Notes |
| --- | --- | --- |
| **Apple Distribution certificate (.p12)** | Xcode → Settings → Accounts → Manage Certificates, or Certificates portal; export from Keychain Access as `.p12` | One per team; export with a password |
| **Certificate password** | Chosen by Mason at export time | Needed by CI to unlock the `.p12` |
| **Provisioning profile (App Store distribution, .mobileprovision)** | Certificates, Identifiers & Profiles → Profiles → + → App Store | Tied to the Bundle ID + distribution certificate |
| Xcode (latest stable) | Mac App Store | Needed locally and provided on GitHub `macos-*` runners |
| APNs Auth Key (.p8) | Certificates, Identifiers & Profiles → Keys → + (Apple Push Notifications service) | Only when push notifications land; note its Key ID |

## 4. GitHub Actions deployment

| Item | Where it comes from | Notes |
| --- | --- | --- |
| GitHub repository secrets | Repo → Settings → Secrets and variables → Actions | Full list of names in `docs/github-secrets.md` |
| Keychain password for CI | Any generated random string | Used to create a throwaway keychain on the macOS runner |
| (Optional) Fastlane Match repo + `MATCH_PASSWORD` | Private Git repo + chosen passphrase | Only if we adopt fastlane match for signing instead of raw secrets |

## 5. Backend / database

| Item | Where it comes from | Notes |
| --- | --- | --- |
| `DATABASE_URL` (production Postgres) | Neon / Supabase / other managed Postgres dashboard | Local MVP keeps `file:./dev.db` |
| Hosting account (recommended: Vercel) | vercel.com | Project linked to this repo; env vars set in project settings |

## 6. Auth

| Item | Where it comes from | Notes |
| --- | --- | --- |
| `AUTH_SECRET` / `NEXTAUTH_SECRET` | `openssl rand -base64 32` | Session signing secret |
| Sign in with Apple Services ID + key (.p8) | Certificates, Identifiers & Profiles → Identifiers (Services IDs) and Keys | Needed for web-side Sign in with Apple; note the Key ID |

## 7. Storage / uploads

| Item | Where it comes from | Notes |
| --- | --- | --- |
| `BLOB_READ_WRITE_TOKEN` (Vercel Blob) **or** S3 access key pair + bucket + region | Vercel dashboard / AWS IAM | For receipt & photo evidence uploads (`Report.evidenceUrl`) |

## 8. Push notifications

| Item | Where it comes from | Notes |
| --- | --- | --- |
| APNs Auth Key (.p8) | Apple Developer → Keys | Reusable across apps in the team |
| APNs Key ID | Shown when the key is created | |
| Apple Developer Team ID | Same as §1 | Used as APNs issuer |
| Bundle ID | Same as §1 | APNs topic |

## Checklist for Mason (blocking items in bold)

- [ ] **Apple Developer Team ID**
- [ ] **Bundle ID** (recommend `com.pennyforge.app`)
- [ ] **App Store Connect Issuer ID**
- [ ] **App Store Connect Key ID**
- [ ] **App Store Connect API key (.p8 file)**
- [ ] **iOS distribution signing certificate (.p12)**
- [ ] **Certificate password**
- [ ] **Provisioning profile (.mobileprovision)**
- [ ] **App Store Connect app ID**
- [ ] Production `DATABASE_URL` (after backend host decision)
- [ ] `AUTH_SECRET` (when real auth lands)
- [ ] Storage token / S3 keys (when uploads land)
- [ ] APNs key + Key ID (when push lands)
