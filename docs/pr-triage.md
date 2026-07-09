# PR Triage Board — multi-session coordination map

_Snapshot taken 2026-07-09. This is the control tower for the ~19 parallel Claude Code sessions
producing PRs against this repo. Regenerate the live "open PRs" view any time with
`scripts/pr-dashboard.sh`; update the merge-order and conflict notes here by hand as PRs land._

## Why this doc exists

Multiple sessions are building different roadmap stages **out of order and in parallel**: late-stage
strategy docs land before early-stage code, several sessions were given overlapping briefs
("Agent 9", "Agent 10", "Agent 11" style prompts), and Copilot reviews each PR without visibility
into the others. This board answers three questions per PR:

1. **What workstream is it?** (code fix / tooling / research doc / synthesis)
2. **What order should it merge in?** (and what it conflicts or overlaps with)
3. **Which session/agent produced it?** (from the branch name and PR body)

## Merge-order rule (default for all open + future PRs)

Merge in this order, top to bottom:

1. **Runtime code and bug fixes** — smallest blast radius per PR, but everything else rebases on
   them.
2. **Repo/agent tooling** (`.claude/`, `scripts/`, CI) — improves every later session.
3. **`CLAUDE.md` / context-doc updates** — merge after code so they describe reality, and merge
   these **one at a time** (they all touch the same files).
4. **Independent research/strategy docs** — order-independent among themselves; merge freely.
5. **Synthesis/integration docs last** — anything that summarizes other PRs' content (e.g. a
   "final integration" doc) merges only after everything it summarizes, then gets a follow-up pass
   to reconcile.

## Open PRs by workstream (as of snapshot)

### 1 — Runtime code (merge first)

| PR | Branch | What | Notes |
|----|--------|------|-------|
| #24 | `claude/code-review-ig18n6` | Vote/moderate race fixes, 400-on-bad-body, P2034→409, iOS pipeline gaps | **Only open PR touching runtime code.** Merge before everything else; other PRs' claims about app behavior assume it. |

### 2 — Tooling & agent ergonomics

| PR | Branch | What | Notes |
|----|--------|------|-------|
| #26 | `claude/pennyforge-architecture-0ovt6r` | `.claude/settings.json` command allowlist | Same `.claude/` tree as #17, different files — no real conflict. |
| #17 | `claude/skill-generator-u1ni8z` | `.claude/skills/run-pennyforge/` Playwright smoke driver | Independent of #26. |
| #25 | `claude/pennyforge-mvp-qa-tests-fy83up` | `scripts/qa-simulation.ts` + QA packet | No product code; safe anytime after #24. |

### 3 — Context-doc updates (merge one at a time)

| PR | Branch | What | Notes |
|----|--------|------|-------|
| #15 | `claude/init-nfcw97` | `CLAUDE.md` refresh (commands, architecture, iOS layer) | ⚠️ Conflicts with any other PR touching `CLAUDE.md` (including the "Multi-session coordination" section added by this triage work). Merge, then rebase the others. |

### 4 — Research / strategy docs (order-independent)

| PR | Branch | What |
|----|--------|------|
| #18 | `claude/pennyforge-oss-scout-bg0alr` | `docs/oss-scout.md` |
| #19 | `claude/pennyforge-business-strategy-nzgj4l` | `docs/business/` series |
| #20 | `claude/pennyforge-brand-strategy-qjheab` | `docs/brand-strategy.md` |
| #22 | `claude/penny-competitor-analysis-6qnbz8` | `docs/competitive-teardown.md` |
| #23 | `claude/pennyforge-compliance-guardrails-hbwbdy` | `docs/compliance/` suite |
| #27 | `claude/pennyforge-founder-strategy-l6xm4p` | `docs/strategy/` founder pack |
| #28 | `claude/pennyforge-mvp-ux-i1lrp7` | `docs/ux/` MVP UX packet |

These write to disjoint paths; merge in any order.

### 5 — Coordination & synthesis (merge last)

| PR | Branch | What | Notes |
|----|--------|------|-------|
| #16 | `claude/pennyforge-agent-coordination-ac4btl` | `docs/agent-coordination.md` coordinator packet | Describes the multi-agent contract; reconcile with this triage board on merge so there's one source of truth for process. |
| #29 | `claude/pennyforge-mvp-plan-9xj4c7` | `docs/build-plan.md` execution plan | Plan for work that's mostly already built — review for staleness before merging. |
| #21 | `claude/pennyforge-final-integration-mmq4t6` | `docs/final-integration.md` "Agent 11" synthesis | **Merge absolutely last.** It summarizes content from #18–#28; anything merged after it makes it stale. |

## Merged / closed ledger (what `main` already contains)

| PR | Outcome | What |
|----|---------|------|
| #1 | merged | Placeholder `CLAUDE.md` bootstrap |
| #2 | merged | Bootstrap PennyForge local MVP (full vertical slice) |
| #3 | merged | MVP bootstrap + CI workflow |
| #4 | **closed unmerged** | Duplicate of #6's work (iOS docs + 2 bug fixes) — superseded |
| #5 | **closed unmerged** | Duplicate of #4/#6 (same head SHA as #4) — superseded |
| #6 | merged | Stabilize MVP, organize repo, iOS/App Store readiness |
| #7 | merged | iOS deployment readiness docs/scripts/CI |
| #8 | merged | Copilot review follow-ups on vote-race/moderation fixes |
| #9 | merged | iOS CI/CD audit + Capacitor/Fastlane scaffolding |
| #10 | **closed unmerged** | Duplicate of #11/#12 (SQL portability fix) — superseded by #11 |
| #11 | merged | Portable CASE clamp instead of SQLite-only MAX/MIN |
| #12 | **closed unmerged** | Duplicate of #10/#11 — superseded |
| #13 | merged | Copilot review findings on iOS CI/CD scaffolding |
| #14 | merged | README replaced with full roadmap/vision doc |

**Pattern to watch:** three duplicate clusters so far (#4/#5/#6, #10/#11/#12) came from parallel
sessions given the same brief. Before opening a PR, sessions must check this board and the open PR
list for an existing PR covering the same brief.

## Branch cleanup candidates

Branches whose PR is merged or closed-unmerged can be deleted (verify nothing new was pushed
after the PR closed): `claude/intelligent-shannon-{4aefcf,8ws7lu,dfz2f5,epub7x,h69vg9,n9eigr,ndmfh6,y6np2i}`,
`claude/pennyforge-ios-parallel-setup-kqodg7`, `claude/vote-race-followup-fixes`,
`claude/vote-portable-clamp-fix`, `claude/mobile-cicd-tooling-8seyq7`,
`claude/remote-control-nm5d97`, `claude/forge-agent-team-ios-readiness`, `pr6-fixes`.

## Roadmap-phase mapping

All runtime code in flight is **Phase 0** (local MVP). Everything in workstreams 4–5 is
phase-agnostic documentation that *plans* Phases 1–4 (see `docs/product-spec.md` → "Roadmap
phases") — it can merge now without implying that later-phase code should be built yet. If a
session opens a PR containing Phase 1+ **code** (real auth, Postgres, push, OCR, native shell),
hold it and flag it: the roadmap says those are deferred.
