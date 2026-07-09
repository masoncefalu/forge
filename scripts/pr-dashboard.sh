#!/usr/bin/env bash
# PR dashboard for the multi-session Claude Code workflow.
#
# Prints all open PRs grouped by workstream (inferred from branch name / title keywords),
# plus remote branches that have no open PR. Requires the GitHub CLI (`gh`) authenticated
# against this repo, and `jq`. Read-only; safe to run anytime.
#
# Usage: scripts/pr-dashboard.sh
#
# The static merge-order and conflict analysis lives in docs/pr-triage.md — this script is the
# live view, that doc is the annotated map.

set -euo pipefail

command -v gh >/dev/null || { echo "error: gh CLI not found" >&2; exit 1; }
command -v jq >/dev/null || { echo "error: jq not found" >&2; exit 1; }

prs_json="$(gh pr list --state open --limit 200 \
  --json number,title,headRefName,createdAt,isDraft,reviewDecision)"

# Workstream inference: keyword match on branch + title. Keep in sync with the workstream
# names in .github/pull_request_template.md and docs/pr-triage.md.
classify='
  def bucket:
    (.headRefName + " " + (.title | ascii_downcase)) as $t
    | if   ($t | test("fix|bug|race|crash|error|security"))                 then "1-runtime-code"
      elif ($t | test("skill|settings|tooling|ci|qa|test|script|harness"))  then "2-tooling"
      elif ($t | test("claude-?md|claude\\.md|init-"))                      then "3-context-docs"
      elif ($t | test("integration|coordinat|build-plan|synthes"))          then "5-synthesis"
      else "4-research-docs"
      end;
'

echo "=================================================================="
echo " Open PRs by workstream (suggested merge order: 1 -> 5)"
echo "=================================================================="
echo "$prs_json" | jq -r "$classify"'
  map(. + {bucket: bucket})
  | group_by(.bucket) | .[]
  | "\n## " + .[0].bucket + "\n"
    + (map("  #\(.number)\t\(if .isDraft then "[draft] " else "" end)\(.title)\n\t\tbranch: \(.headRefName)  opened: \(.createdAt[0:10])  review: \(.reviewDecision // "none")")
       | join("\n"))
'

echo
echo "=================================================================="
echo " Remote branches with NO open PR (merged leftovers / WIP / stale)"
echo "=================================================================="
pr_branches="$(echo "$prs_json" | jq -r '.[].headRefName')"
gh api "repos/{owner}/{repo}/branches" --paginate --jq '.[].name' \
  | grep -vxF "main" \
  | while read -r b; do
      if ! grep -qxF "$b" <<<"$pr_branches"; then
        echo "  $b"
      fi
    done

echo
echo "Details, conflicts, and merge-order rationale: docs/pr-triage.md"
