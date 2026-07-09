# PennyForge — Founder Strategy Pack

_Agent 13: Founder Strategy pass · 2026-07-09._

This pack pressure-tests whether PennyForge is worth building, from an operator's seat rather
than a builder's. It is grounded in the repo as it actually stands (`docs/status.md`, 2026-07-08:
MVP vertical slice complete and green on `main`; Phase 1 not started; iOS prep already in
flight) and in the competitive/market research already documented in `README.md`'s "The Market"
and "Competitive Landscape" sections. Market claims that could not be independently verified
(e.g., Deal Soldier's reported revenue) are marked as such wherever they're cited. A supplementary
live web-research pass was attempted for this analysis but was cancelled mid-run; nothing below
depends on it, and it was not relaunched.

## Contents

| Doc | What it answers |
|---|---|
| [`founder-memo.md`](./founder-memo.md) | The core analysis: why this works, why it fails, what must be true, what to build/not build, where to launch, what makes it defensible. **Read this first.** |
| [`pre-mortem.md`](./pre-mortem.md) | "It's July 2027 and PennyForge is dead" — ranked failure narratives, early-warning signals, and preventions. |
| [`traction-metrics.md`](./traction-metrics.md) | The MVP traction metrics: definitions, targets at day 30/60/90, and how each is measured against the current schema. |
| [`first-30-days.md`](./first-30-days.md) | Week-by-week launch plan for the first metro. |
| [`first-90-days.md`](./first-90-days.md) | Month-by-month arc ending in the day-90 gate review. |
| [`kill-criteria.md`](./kill-criteria.md) | Falsifiable conditions under which to stop or pivot. |
| [`double-down-criteria.md`](./double-down-criteria.md) | Falsifiable conditions under which to commit and scale — and what doubling down concretely means. |

## The one-sentence conclusion

The demand side is already proven by competitors' pricing power; the entire bet is the supply
side — whether hunters will report rival, fast-decaying finds to strangers — and the next 90
days should be spent answering that one question in one metro as cheaply as possible, with the
kill/double-down gates in this pack decided in advance.

## Constraints honored

Nothing in this pack recommends scraping, private/undocumented endpoints, reverse engineering,
competitor-data ingestion, or automated checkout. Those boundaries (see `CLAUDE.md` and
`lib/compliance.ts`) are treated as fixed constraints of the business, and the strategy is built
around them rather than against them.
