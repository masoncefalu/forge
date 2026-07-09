# Repo-wide instructions for Copilot (reviews, coding agent, and any AI session)

## Critical context: PRs here arrive OUT OF ORDER — by design

This repo is being built by **many parallel agent sessions at once** (~19 Claude Code sessions,
each spawning sub-agents), each assigned a different stage of the roadmap. Sessions finish at
unpredictable times, so:

- A **late-stage** deliverable (e.g. a final-integration synthesis doc, App Store checklist, or
  Phase 3 planning doc) may land **before** early-stage work has merged.
- An **early-stage** PR may arrive after later-stage PRs are already open or merged.
- **PR numbers, branch dates, and merge times do NOT reflect the build sequence.** Arrival order
  is meaningless; only each PR's declared roadmap stage and dependencies matter.

This is expected and will keep happening. Do not treat it as a mistake, do not get confused by
it, and do not review a PR as if the repo's current state were a linear snapshot of an ordered
build process.

## How to evaluate any PR here

1. **Identify the PR's stage and workstream first.** Read its PR-template header
   (session/agent, workstream, roadmap phase, depends-on, overlaps) and `docs/pr-triage.md`
   before judging content. Workstreams: runtime-code, tooling, context-docs, research-docs,
   synthesis. Roadmap phases 0–4 are defined in `docs/product-spec.md`.
2. **Judge the PR against its own stage's assumptions, not against arrival order.** A Phase 2
   planning doc that references features not yet built is *correct*, not broken. A synthesis doc
   that summarizes sibling PRs still open is *expected*, not premature.
3. **Missing prerequisites are sequencing notes, not defects.** If a PR depends on unmerged work,
   say "hold until PR #N merges" — do not flag it as an error, request its removal, or ask the
   author to inline the dependency's content.
4. **Flag only real conflicts:** two PRs editing the same file/section, two sessions delivering
   the same brief (duplicates have happened: #4/#5/#6, #10/#11/#12), or a PR contradicting a
   hard boundary in `CLAUDE.md`.
5. **Docs describing future phases are not scope creep.** Only flag Phase 1+ **runtime code**
   (real auth, Postgres, push, OCR, native shell) as premature — the roadmap defers those.
6. **Don't demand cross-PR consistency at review time.** Terminology or detail drift between
   parallel docs PRs is reconciled later by the synthesis workstream (`docs/final-integration.md`
   style PRs, which merge last). Note drift briefly; don't block on it.

## Sequencing reference

Canonical merge order (what should merge first, regardless of what *arrived* first):
runtime code → tooling → context-doc updates (one at a time) → independent research docs →
synthesis docs last. Full board with per-PR status: `docs/pr-triage.md`. Live view:
`scripts/pr-dashboard.sh`.

## Other repo rules that always apply

- Hard compliance boundaries are in `CLAUDE.md` (no scraping, no private endpoints, no competitor
  data ingestion, no reverse engineering, no automated checkout, allowlist-only sources,
  first-hand user reports only). Violations are always blocking, regardless of stage.
- Validate code changes with `npm run verify` (lint + typecheck + test + build).
- SQLite schema note: same-day dedupe uses a real `reportDate` column, never a `date(createdAt)`
  expression in unique constraints — do not suggest "simplifying" it.
