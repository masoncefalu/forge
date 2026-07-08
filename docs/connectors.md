# PennyForge — GitHub Automation & Connector Reference

Reference doc for Mason on how GitHub-driven automation can trigger work on this repo
(`masoncefalu/forge`), what's already wired up, and what's recommended. This is a reference, not
a build plan — nothing here should be read as "do this now." All hard boundaries in the main
`CLAUDE.md` (no scraping, no private/undocumented APIs, no automated checkout, allowlist-only data
sources) apply to any automation described below, including anything a future scheduled job or
webhook-triggered agent might do.

## 1. GitHub Actions schedule triggers (`on: schedule`)

GitHub Actions supports a `schedule` trigger using standard 5-field cron syntax (UTC only):

```yaml
on:
  schedule:
    - cron: "0 6 * * *"   # every day at 06:00 UTC
```

Notes on the mechanism: schedules are best-effort (GitHub may delay firing during high load),
the minimum practical interval is about 5 minutes, and scheduled workflows run against the
default branch (`main`) regardless of what triggered the last push.

**Current state: not needed.** PennyForge's MVP is explicitly synchronous and DB-backed per
`CLAUDE.md` — "no Redis, no background workers... Alerts and route planning are synchronous and
DB-backed. Don't add these prematurely." There is no cron-shaped job in this repo today, and
`.github/workflows/ci.yml` has no `schedule` trigger.

Keeping the mechanism documented for later: a plausible future candidate (only if/when the
product spec calls for it) would be a "stale report cleanup" job — e.g. a nightly workflow that
flags or archives reports past some staleness window. That would still just be a scheduled
Actions run hitting the same synchronous API/DB layer described in `lib/reports.ts`, not a new
background-worker architecture — no new infra required.

## 2. GitHub event triggers

### Already in use — `.github/workflows/ci.yml`

Confirmed by reading the file directly. The `CI` workflow triggers on:

```yaml
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  workflow_dispatch:
```

- `pull_request` (branches: `[main]`) — runs on every PR targeting `main`.
- `push` (branches: `[main]`) — runs on every direct push/merge to `main`.
- `workflow_dispatch` — allows a manual, on-demand run from the Actions tab or `gh workflow run`,
  with no inputs defined.

The job (`build-and-test`) does `checkout` → `setup-node` (Node 20, npm cache) → `npm ci` →
`prisma generate` → `prisma migrate deploy` → `prisma db seed` → `npm run lint` → `npm test` →
`next build`, all against a scratch SQLite DB (`DATABASE_URL=file:./dev.db`). It also sets a
`concurrency` group keyed on workflow+ref with `cancel-in-progress: true`, so superseded runs on
the same branch are cancelled automatically.

### Other event triggers that exist (not currently used here)

These are standard GitHub Actions event triggers relevant to a repo like this if the workflow
surface grows:

- `issue_comment` — fires when a comment is posted on an issue or PR. Common use: a
  slash-command-style bot trigger (e.g. a comment containing `/rerun` or `/deploy-preview`)
  that kicks off a workflow scoped to that PR.
- `pull_request_review` — fires on review submission (approve/request-changes/comment). Useful
  for gating on review state beyond the built-in required-reviews check.
- `pull_request_target` — like `pull_request` but runs with the base repo's permissions/secrets
  even for fork PRs; worth knowing about but requires care since it can expose secrets to
  untrusted fork code if misused.
- `release` — fires on release publish/edit; relevant once PennyForge has a release/tagging
  process (not yet the case for this MVP).
- `workflow_run` — fires when another workflow completes; useful for chaining (e.g. "after CI
  passes, do X") without duplicating CI's own trigger conditions.

For a single-owner MVP repo, the most likely near-term addition (if any) would be `issue_comment`
for a PR-comment-triggered agent flow (e.g. "re-run lint" or "summarize this PR" on comment) —
mechanism only, not something currently configured.

## 3. API/webhook-triggered runtime triggers

Separate from Actions' own trigger system, GitHub can notify external services of repo events via
webhooks (repo Settings > Webhooks, or the equivalent GitHub App event subscription used by
installed integrations). Conceptually: GitHub POSTs an event payload (PR opened, comment posted,
check run completed/failed, etc.) to a subscribed URL, and whatever is listening on the other end
decides what to do with it — anything from posting a Slack message to kicking off an agent.

Claude Code Remote-style sessions can subscribe to activity on a specific PR and receive that
activity (comments, CI failures) as it happens, rather than needing to poll GitHub. This session
is itself an example of that pattern in a general sense — it's a Claude Code session that can
watch a PR for webhook-driven activity and react to it. Beyond that general shape, avoid assuming
specifics of the underlying subscription/webhook API surface here — this doc intentionally stays
conceptual since the exact internal mechanics aren't something to guess at.

## 4. Secrets

Standard practice: repo Settings > Secrets and variables > Actions is where CI/CD secrets
(API keys, tokens, deploy credentials) get stored and referenced in workflows as
`${{ secrets.NAME }}`, scoped to the repo (or org/environment if that's ever needed).

**Current state for this repo: zero secrets required.** `.github/workflows/ci.yml` makes no
external network calls — dependencies come from the npm registry via `npm ci`, and the only
"database" involved is a scratch local SQLite file (`DATABASE_URL: "file:./dev.db"`) created and
seeded in-job. This lines up with `CLAUDE.md`'s MVP constraint of "no external paid services" and
no Postgres/Supabase yet. This is worth calling out explicitly as a **deliberate simplicity win**,
not a gap: there is currently no credential surface for CI to leak, rotate, or misconfigure. That
will change the day a real Postgres/Supabase URL, a paid API key, or a deploy target enters the
picture — at that point this section should be revisited.

## 5. Notifications

GitHub's native notification options apply as normal for this repo: email notifications and the
GitHub UI (notifications inbox, PR/issue mentions, check-run status on the PR page) are the
default way Mason would find out about CI results, review requests, or comments.

Separately, and factually distinct from GitHub's own notifications: a Claude Code Remote session
that is subscribed to a PR's activity can push status updates (e.g. "CI failed on this PR," "a
new comment was posted") back into an ongoing conversation, rather than requiring a human to go
check GitHub. This is a conversational side-channel on top of GitHub's own notification system,
not a replacement for it — GitHub's notifications still fire independently either way.

## 6. Auto-merge behavior

GitHub's repo-level "Allow auto-merge" setting (Settings > General > Pull Requests > "Allow
auto-merge") is a prerequisite switch: until it's enabled, no PR in the repo can use auto-merge at
all, regardless of branch protection or review state. Once enabled, a PR can individually be
flagged for auto-merge (via the PR page or API), and GitHub will merge it automatically as soon as
both conditions are met: all required status checks pass, and all required reviews are satisfied.
It does not bypass either requirement — it just removes the need for a human to click "Merge"
the moment those conditions are already met.

**We could not verify via the API whether this setting is currently enabled on
`masoncefalu/forge`** — repo-level Pull Request settings aren't something this doc-writing pass
checked against the live repo. Recommend Mason check Settings > General > Pull Requests directly
if auto-merge is something he wants to rely on.

## 7. Recommended defaults for this repo

- Keep CI triggers as-is: `pull_request` + `push` to `main`, plus `workflow_dispatch` for manual
  reruns. This already covers the two states that matter (proposed change, landed change) plus a
  manual escape hatch.
- Don't add a `schedule` trigger until there's an actual background-job need (e.g. stale report
  cleanup becomes a real product requirement, not just a hypothetical). Adding cron jobs
  preemptively adds maintenance surface for no current benefit.
- If a PR-comment-triggered flow is ever added (`issue_comment`), scope it narrowly (specific
  command syntax, restricted to repo collaborators) rather than reacting to arbitrary comment
  text.
- Enable auto-merge only for PRs where required CI is green and treat it as "skip the manual
  click," not "skip review" — required status checks and required reviews still need to be
  configured correctly for auto-merge to mean anything.
- Keep GITHUB_TOKEN / Actions workflow permissions minimal — this repo's CI only needs to check
  out code, install deps, and build/test locally, so it doesn't need `contents: write`,
  `pull-requests: write`, or similar beyond what checkout/build already require by default. Don't
  broaden permissions speculatively.
- Don't add secrets to this repo until a real external dependency (paid API, hosted Postgres,
  deploy target) requires one — the current zero-secrets CI setup is worth preserving as long as
  it's accurate.
