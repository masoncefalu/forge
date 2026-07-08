# Connectors — GitHub-based automation reference

Practical reference for how GitHub Actions and related GitHub automation can drive PennyForge
going forward: scheduled jobs, event-driven reactions, externally-triggered runs, secret handling,
notification surfaces, and auto-merge. This complements `.github/workflows/ci.yml` (the existing
lint/test/build pipeline) rather than replacing it.

> **Status note:** this doc describes GitHub's documented behavior plus this repo's actual
> `ci.yml`, cross-checked against a live audit of `masoncefalu/forge`'s branch protection and
> repo settings (see "Current repo state" below for the confirmed findings and what remains
> unverifiable from an agent session).

## 1. Scheduled triggers (`on: schedule`)

GitHub Actions can run a workflow on a cron schedule:

```yaml
on:
  schedule:
    - cron: "0 13 * * 1" # 13:00 UTC every Monday
```

Key limitations:

- **Minimum interval is 5 minutes** (`*/5 * * * *`), but GitHub explicitly reserves the right to
  delay or drop runs during periods of high load — **scheduled workflows are best-effort, not
  real-time**. Don't build anything time-sensitive (e.g. "must fire within N minutes") on `on:
  schedule` alone.
- **Only runs on the default branch.** A `schedule` trigger defined in a workflow file on a
  feature branch will not fire — GitHub reads scheduled workflows from whatever is on the
  repository's default branch (currently `main` for this repo, pending confirmation below). Any
  scheduled connector work must be merged to the default branch to actually run.
- If the repository has been inactive for a long stretch, GitHub may auto-disable scheduled
  workflows; re-enabling requires a manual visit to the Actions tab or an API call.
- Cron is UTC only — there is no per-workflow timezone setting.

**Where this fits PennyForge:** CLAUDE.md is explicit that the MVP has "no background workers" and
alerts/routing are "synchronous and DB-backed." A cron workflow is not a background worker in the
app-server sense (it doesn't run inside the Next.js process, and it isn't always-on), but it *is*
still an out-of-band job. Treat any `on: schedule` workflow as strictly for repo/CI hygiene (e.g.
dependency audit, stale-branch cleanup, periodic lint-only run) — not as a way to sneak in the
deferred "real background jobs" phase through the side door.

## 2. Event / webhook triggers (`on: push`, `on: pull_request`, `on: issue_comment`, ...)

Workflows can react to nearly any GitHub webhook event. Relevant ones for this repo:

- `on: push` / `on: pull_request` — already used in `ci.yml` for lint/test/build on every PR and
  push to `main`.
- `on: issue_comment` (with `types: [created]`) — fires when someone comments on an issue *or* a
  PR (GitHub treats PR conversations as issue comments under the hood). A workflow can inspect
  `github.event.comment.body` for a slash-command-style trigger (e.g. a comment containing
  `/rerun` or `/deploy-preview`) and act on it. Because this trigger runs in the context of
  whatever branch the workflow file lives on (usually default branch), **it cannot directly check
  out arbitrary PR head refs from forks without care** — for anything that runs untrusted PR code,
  prefer `pull_request_target` with explicit, minimal checkout, or avoid running code at all and
  only call the GitHub API.
- `on: check_suite` / `on: workflow_run` (`types: [completed]`) — lets a workflow react to another
  workflow's outcome (e.g. "when CI fails, post a comment summarizing the failure" or "when CI
  fails on a PR opened by an automation user, open a follow-up issue").
- `on: pull_request_review` — react to review submission/approval events.

**Security note:** `pull_request` (not `_target`) triggers run with a read-only `GITHUB_TOKEN` by
default for PRs from forks, and do not expose repo secrets to fork-authored workflow changes.
`pull_request_target` runs with write-level token and base-branch secrets even for fork PRs — only
use it when the checkout step pins to a known-safe ref, never the fork's arbitrary HEAD.

## 3. API POST runtime triggers (`workflow_dispatch`, `repository_dispatch`)

Two ways to kick off a workflow from *outside* GitHub's own event stream — e.g. from a Claude Code
session, a script, or any other automation that can make an authenticated HTTPS POST:

### `workflow_dispatch`

Declared in the workflow file itself:

```yaml
on:
  workflow_dispatch:
    inputs:
      target_env:
        description: "Environment to run against"
        required: false
        default: "preview"
```

Triggered via the REST API:

```
POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches
Authorization: Bearer <token>
Content-Type: application/json

{ "ref": "main", "inputs": { "target_env": "preview" } }
```

- Requires a `ref` (branch or tag the workflow file must exist on) and, optionally, `inputs`
  matching the schema declared under `on.workflow_dispatch.inputs`.
- The calling token needs `actions:write` (or `contents:write`) scope on the repo — a fine-grained
  PAT or GitHub App installation token, not a personal token with broader scope than necessary.
- No payload size restrictions worth worrying about at this scale; inputs are strings, booleans,
  choices, or environments only (no arbitrary JSON blobs) — if a POST call needs to pass a richer
  payload, encode it as JSON in a single string input and parse it in the workflow.

### `repository_dispatch`

For "fire a custom event, let any matching workflow decide whether to run" instead of naming one
workflow directly:

```
POST /repos/{owner}/{repo}/dispatches
Authorization: Bearer <token>
Content-Type: application/json

{ "event_type": "connector-sync", "client_payload": { "source": "claude-code", "run_id": "abc123" } }
```

```yaml
on:
  repository_dispatch:
    types: [connector-sync]
```

`client_payload` is a free-form JSON object (up to 10 top-level properties are surfaced cleanly;
keep it small and flat) available in the workflow as `github.event.client_payload.*`.

**When to use which:** `workflow_dispatch` when a specific external caller (a person clicking a
button, or one named integration) needs to run one named workflow, optionally with a couple of
typed inputs. `repository_dispatch` when multiple workflows might listen for the same external
signal, or when the payload is closer to "an event happened" than "run this specific job."

**Workflow calling back out to an external API:** once triggered, a workflow step can call any
external HTTPS endpoint the same way any other CI step would — `curl`, a small script, or an
action. The only PennyForge-specific rule is the same one that governs the product itself: any
step that would pull retailer data via scraping, a private endpoint, or a competitor feed is out
of bounds per CLAUDE.md's hard boundaries, regardless of whether it's product code or a CI step.
Calling *out* to a trusted, documented API (e.g. posting a Slack message via an incoming webhook,
or hitting an internal status endpoint) is fine; the boundaries are about data *sourcing*, not
about workflows making HTTP calls in general.

**Confirmed on this repo:** Actions runners have normal outbound internet access (the proxy
restriction that blocks *agent sessions* from calling certain GitHub REST paths directly does not
apply to workflow runner egress), so a step like `curl -X POST <endpoint> -H "Authorization:
Bearer ${{ secrets.SOME_TOKEN }}"` to trigger an external run (e.g. a Claude Code session) is
mechanically unblocked today. What's missing to actually wire this up: (1) a repo secret holding
the target token, (2) a decided target endpoint, and (3) a trigger on this repo's side
(`issue_comment`, `workflow_dispatch`, `schedule`, etc.) — none of these exist in `ci.yml` yet.
Nothing about this crosses a CLAUDE.md hard boundary; it's CI/tooling plumbing, not product data
sourcing.

## 4. Secrets

- Defined at **repository**, **environment**, or **organization** level (Settings → Secrets and
  variables → Actions). Environment-scoped secrets additionally support required reviewers and
  branch restrictions before a job can read them.
- Referenced in a workflow as `${{ secrets.NAME }}`; never interpolate a secret directly into a
  shell string in a way that could get echoed or logged — pass via `env:` and let the runner mask
  it:

  ```yaml
  steps:
    - name: Call external API
      env:
        API_TOKEN: ${{ secrets.EXTERNAL_API_TOKEN }}
      run: ./scripts/call-api.sh
  ```

- Secrets are **not** available to workflows triggered by a `pull_request` from a fork (by
  design — prevents a malicious fork PR from exfiltrating secrets). If a connector workflow needs
  to run privileged steps in response to fork PRs, split it: an unprivileged `pull_request` job
  that has no secrets, plus a `workflow_run`-triggered follow-up job (running in the base repo's
  context) that does the privileged part after inspecting the completed run.
- **Rotation practice:** treat any token stored as an Actions secret as rotatable on demand —
  store an expiry/rotation reminder wherever the token was provisioned (e.g. the third-party
  dashboard), rotate on a fixed cadence (90 days is a reasonable default for anything without a
  stricter mandate from the provider), and rotate immediately on any suspected exposure (a secret
  that appeared in a log, a public fork, or a screen share).
- **Least privilege:** prefer fine-grained PATs or GitHub App installation tokens scoped to only
  the repo and only the permissions the workflow needs (e.g. `contents:read` + `pull-requests:write`
  for a PR-commenting bot, not a token with org-wide admin). Set `permissions:` explicitly at the
  top of every workflow file rather than relying on the default `GITHUB_TOKEN` scope:

  ```yaml
  permissions:
    contents: read
    pull-requests: write
  ```

**Confirmed on this repo:** `ci.yml` currently references zero `secrets.*` values — the only
env var it sets (`DATABASE_URL`) is a scratch SQLite file path, not a credential. What could
*not* be confirmed from an agent session: the actual contents of Settings → Secrets and
variables → Actions (repo secrets, environment secrets, org secrets), the repo's Actions
permissions (default `GITHUB_TOKEN` scope, whether Actions can approve PRs, the allowed-actions
policy). Every one of those REST paths (`/actions/permissions*`, `/actions/secrets`,
`/actions/variables`) is blocked for agent sessions by this environment's proxy, and the GitHub
MCP server doesn't expose them either. **Do not treat this doc as confirming "zero secrets are
configured"** — it only confirms `ci.yml` doesn't reference any. The repo owner should check
Settings → Actions → General directly to audit the rest.

**Also confirmed:** `list_workflows` shows three GitHub-managed dynamic workflows beyond
`ci.yml` are already active on this repo — Copilot pull-request-reviewer, Copilot cloud agent
(copilot-swe-agent), and Dependabot Updates — even though there's no local
`.github/dependabot.yml`. These run under GitHub's own Copilot/Dependabot integrations, not this
repo's workflow files, so they're outside this doc's `ci.yml`-centric secrets accounting, but
worth Mason confirming the intended scope of at Settings → Copilot and Settings → Code security
and analysis.

## 5. Runtime token storage

- Any token an external runtime needs (a Claude Code session, a cron job, a bot account) belongs
  in **GitHub Actions secrets** — repo-level for anything every workflow may use, **environment**
  secrets for anything scoped to a deploy target (e.g. a `staging` vs `production` API key), never
  in workflow YAML, never in a committed `.env` file, and never passed as a plain `workflow_dispatch`
  input (inputs are not secret — they show up in the run's event payload and logs).
- This repo's own `.env.example` documents local-dev-only values (`DATABASE_URL` as a `file:` URL
  for the SQLite MVP) — that pattern is fine for local dev but **must never be the model for CI**.
  CI's `DATABASE_URL` in `ci.yml` is a scratch SQLite file, not a credential, so it's fine inline;
  any *real* credential (a future Postgres connection string once the Phase 1 migration happens,
  a Slack/webhook URL, a third-party API key) must move to an Actions secret at that point, not
  live in the workflow file or `.env.example`.
- **What NOT to commit, ever:** `.env` (as opposed to `.env.example`), any file containing a live
  API key/token/connection string, service-account JSON, or webhook URLs with embedded secrets.
  If a token needs to be available to a script run *outside* Actions (e.g. a one-off local script
  hitting the same API), keep it in the developer's local, gitignored `.env` — not in any file
  that could be picked up by `git add -A`.

## 6. Notification behavior

Per CLAUDE.md, the MVP explicitly has **no Redis, no background workers, no real push
notifications** — alerts are DB rows rendered synchronously on `/alerts`. That constraint governs
*product* notifications (leads, price alerts) to end users. It does not block GitHub-side
automation notifications, which are a separate, already-appropriate channel for engineering
signals:

- **PR comments** — a workflow can post a comment via the GitHub API (e.g.
  `gh pr comment $PR --body "..."` or the REST `issues/{number}/comments` endpoint) to surface
  results directly where a reviewer is already looking. Best for anything actionable in-review:
  lint/test summaries, a preview link, a compliance-boundary check result.
- **Check runs** — richer than a comment: a check run shows up in the PR's checks list with a
  pass/fail/neutral status, an optional summary, and annotations pointing at specific lines. Use
  for anything that should gate merge readiness visually (even if it isn't a required check).
- **Issues** — appropriate for durable, cross-PR signals that aren't tied to one review (e.g. "CI
  has been red on `main` for 3 runs," or a weekly dependency-audit summary from a scheduled
  workflow). Prefer issues over PR comments when the finding outlives a single PR.
- **Email / Slack / other push channels** — explicitly **out of scope for this repo's automation**
  right now, for the same reason product push notifications are deferred: no notification
  infrastructure exists in the MVP, and adding one (even Slack-webhook-only) is scope creep beyond
  what's been asked for. If a real need arises later (e.g. paging someone when a scheduled
  connector workflow fails), that's a deliberate, separate decision — not a default to reach for
  now. GitHub's own email notifications for workflow failures (sent to the actor/repo watchers by
  default) are already the fallback and require no additional integration work.

**Practical default:** connector workflows in this repo should report results as a PR comment
and/or check run. Nothing should be wired to email or Slack without an explicit ask.

## 7. Auto-merge behavior

- **How it works:** enabling auto-merge on a PR tells GitHub to merge it automatically the moment
  every required condition is satisfied — required status checks passing, required number of
  approving reviews, no unresolved "changes requested," and (if configured) branch being up to
  date with the base branch. Nothing merges early; auto-merge only removes the need for a human to
  click "Merge" the instant the last condition clears.
- **Enabling via UI:** the "Enable auto-merge" button appears on a PR's page whenever the
  repo-level "Allow auto-merge" setting is on — it is **not** gated on branch protection existing.
  Without branch protection, though, there's nothing for it to wait for: as confirmed on this repo
  (see "Current repo state" below), enabling auto-merge with no required checks/reviews configured
  merges the PR as soon as it has no conflicts, checks or no checks. Branch protection is what
  gives auto-merge something meaningful to wait on, not a prerequisite for the button to appear.
- **Enabling via API:** GraphQL mutation `enablePullRequestAutoMerge` (REST equivalent:
  `PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge` is for immediate merge, not auto-merge —
  auto-merge itself is GraphQL-only as of this writing), specifying the merge method
  (`MERGE`/`SQUASH`/`REBASE`). The GitHub MCP tool available in this environment
  (`enable_pr_auto_merge` / `disable_pr_auto_merge`) wraps this for convenience — it fails
  gracefully if the repo doesn't have auto-merge enabled as a feature, or if the PR is already
  cleanly mergeable.
- **Prerequisite:** the repository setting "Allow auto-merge" (Settings → General → Pull Requests)
  must be turned on before any PR can use it — this is a repo-level opt-in independent of branch
  protection.
- **Interaction with branch protection:** auto-merge respects whatever the base branch's
  protection rule requires — it does not bypass required reviews, required checks, or
  "require branches to be up to date." If branch protection requires a check that never runs on a
  given PR (e.g. a check gated by path filters), that PR can get stuck in "waiting" indefinitely;
  auto-merge won't force it through.

## Current repo state

Confirmed via a live audit of `masoncefalu/forge` (branch-protection/Actions audit, cross-checked
against `.github/workflows/ci.yml`):

- **Auto-merge prerequisite: satisfied.** `GET /repos/masoncefalu/forge` →
  `allow_auto_merge: true` at the repo level, so `enable_pr_auto_merge` works mechanically today.
- **Branch protection on `main`: none.** `protected: false`, and `GET /rulesets` → `[]` — zero
  required status checks, zero required reviews, no rulesets at all. Force-push and branch
  deletion on `main` are both currently *allowed* as a direct consequence (nothing restricts
  them). **Practical consequence:** enabling auto-merge on a PR right now does not wait for CI —
  it merges as soon as there are no merge conflicts, regardless of whether `build-and-test` (the
  CI job's literal ID — `ci.yml` gives it no explicit `name:`) has passed. Auto-merge should not
  be treated as safe today; it needs a branch protection rule requiring the `build-and-test`
  check first.
- **CI triggers, confirmed as documented above:** `ci.yml` triggers on `pull_request`→`main`,
  `push`→`main`, and `workflow_dispatch`; single job, no external network calls, no
  `secrets.*` references. All 4 historical runs to date are green.
- **Actions permissions / secrets / variables: not verifiable from an agent session.** The REST
  paths that would confirm this (`/actions/permissions*`, `/actions/secrets`,
  `/actions/variables`) are blocked by this environment's agent proxy with a 403, and the GitHub
  MCP server's Actions tools don't expose them either. This is a genuine blind spot, not a
  "nothing configured" finding — the repo owner (masoncefalu) needs to check Settings → Actions →
  General directly to confirm default `GITHUB_TOKEN` scope, the "Actions can approve PRs" toggle,
  and the allowed-actions policy.
- **Dynamic GitHub-managed workflows already active:** `list_workflows` shows three workflows
  beyond `ci.yml` — Copilot pull-request-reviewer, Copilot cloud agent (copilot-swe-agent), and
  Dependabot Updates — even though no local `.github/dependabot.yml` exists. These run under
  GitHub's own integrations rather than this repo's workflow files. Worth Mason confirming the
  intended scope at Settings → Copilot and Settings → Code security and analysis.
- **Collaborators:** `masoncefalu` is the sole collaborator (admin), no team or other humans.
  This matters for any future branch-protection rule: a naive "require 1 approving review" would
  lock the sole maintainer out of merging their own PRs without either a bypass allowance for
  admins or a second reviewer being added to the repo.

## Recommended defaults for PennyForge

1. **Keep `ci.yml` as the single required check** (lint + unit tests + build) gating merges to
   `main`; don't fragment it into many small required workflows yet — this repo is small enough
   that one job is easier to reason about and keeps CI minutes low.
2. **Use `workflow_dispatch` (not `repository_dispatch`) for Claude-Code-session-triggered runs.**
   A named workflow with typed inputs is easier to audit and rate-limit than a generic dispatch
   event, and this repo doesn't yet have multiple workflows that would need to share one event
   type.
3. **Add `permissions: contents: read` at the top of every workflow**, escalating per-job only
   where a job genuinely needs to comment on a PR (`pull-requests: write`) or push (`contents:
   write`) — don't rely on the default token scope.
4. **Report automation results as PR comments for anything tied to a specific PR, and as an issue
   for anything that spans runs** (e.g. a scheduled dependency-audit workflow). Do not add
   Slack/email notification wiring — it's out of scope until there's an actual operational need
   that justifies the added infrastructure, matching the MVP's no-background-worker,
   no-push-notification stance in CLAUDE.md.
5. **Any external API token this repo's automation needs (Claude Code session tokens, third-party
   API keys) goes in repo-level Actions secrets today**; move to environment-scoped secrets only
   once there's an actual staging/production split worth protecting differently (there isn't one
   yet — this is a single-environment SQLite MVP). Mason should independently confirm at
   Settings → Actions → General what the default `GITHUB_TOKEN` scope and allowed-actions policy
   currently are — that's unverifiable from an agent session (see "Current repo state").
6. **Add branch protection on `main` requiring the `build-and-test` check before relying on
   auto-merge for anything.** Confirmed live: `main` currently has zero branch protection and
   zero rulesets, and the repo-level "Allow auto-merge" setting is already on — so enabling
   auto-merge on a PR *today* merges it as soon as it's conflict-free, without waiting for CI.
   That's not a safe default as-is. Once a protection rule requires the `build-and-test` job (the
   literal job ID from `ci.yml`, which has no explicit `name:`), auto-merge becomes safe to use
   for queuing merges without babysitting CI. While adding that rule, also turn off force-push and
   branch deletion on `main` — both are currently allowed simply because no protection exists to
   restrict them, not because anyone decided they should be.
7. **If adding a required-review count to that branch protection rule, account for there being
   only one collaborator (masoncefalu, admin) on this repo today.** A naive "require 1 approving
   review" would lock the sole maintainer out of merging their own PRs; either scope the rule to
   require only the status check (no review count) until a second collaborator exists, or add an
   explicit admin bypass allowance.
8. **Do not add scheduled (`on: schedule`) workflows for anything product-facing.** Reserve cron
   workflows strictly for repo hygiene (e.g. a monthly `npm audit` or stale-branch report) so this
   doesn't become a backdoor into the deferred "real background workers" phase.
