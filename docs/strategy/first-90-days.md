# First 90 Days

_Agent 13: Founder Strategy. Builds on `first-30-days.md`. Each month is gated by the previous
month's metrics (`traction-metrics.md`), not by the calendar — if day-30 supply-side metrics are
unhealthy, month 2 stays focused on fixing the reporting loop rather than advancing to the next
phase below on schedule. That's a feature of this plan, not a deviation from it._

## Month 1 (days 1–30)

Covered in full in `first-30-days.md`: captain-seeded launch in one metro, one retailer, controlled
public opening, first retention checkpoint, day-30 gate review against `kill-criteria.md` and
`double-down-criteria.md`.

## Month 2 (days 31–60): prove the loop is real, not captain-subsidized

**Precondition to enter this month with confidence:** day-30 supply-side metrics
(`traction-metrics.md` metrics 1–3) show a real signal, positive or fixable — not a dead feed. If
they don't, month 2 is a continuation of month 1's fire-fighting, not a new phase.

- **Isolate organic from captain-seeded volume.** By day 60, captain-authored reports should be a
  shrinking share of total volume (`traction-metrics.md` metric 1's tracking split) — this is the
  month where the training wheels start coming off, deliberately.
- **Ship real evidence upload if not already live**, and real alert delivery
  (`founder-memo.md` §6, items 2 and 4) — these unlock the two metrics (evidence %, alert
  conversion) that can't be honestly measured on the placeholder implementations.
- **Run the first week-4 contributor-retention cohort measurement** (`traction-metrics.md` metric
  3) — the first cohort with enough runway exists by day 60 (week-1 launch cohort, 4 weeks out
  from their first report by day ~35, comfortably measurable by day 60).
- **Start (but don't finish) reseller-specific tooling** — the profit calculator and haul P&L
  (`founder-memo.md` §5, §6) are the biggest gap in the Reseller tier's value proposition;
  starting design/build here means it's ready to test alongside billing in month 3, not blocking
  month 2's core focus.
- **Do not expand to a second metro or retailer this month**, even if month 1 went well — one
  more month of depth in the launch metro is worth more than early breadth; see
  `founder-memo.md` §7 and the "single-metro depth" framing already in `docs/product-spec.md`.

## Month 3 (days 61–90): test monetization and distribution readiness

**Precondition to enter this month with confidence:** month 2 shows organic (non-captain)
contribution sustaining itself, per the metric-1 split — this is the actual "the hard problem is
solved" signal, and it's what makes testing monetization meaningful instead of premature (see
`founder-memo.md` §5's sequencing argument).

- **Ship minimal billing (Stripe, web-only).** First real test of `traction-metrics.md` metric 9
  (free-to-paid conversion) — even a rough Pro-tier checkout is enough to get a real signal;
  polish can come later.
- **Ship contributor credits** if not already live, and start tracking redemption
  (`traction-metrics.md` metric 10) — this is both a retention lever and a monetization-adjacent
  signal (do contributors value the reward enough to use it).
- **Resolve the iOS distribution decision** (`docs/status.md` "Decisions needed" — Capacitor vs.
  Expo vs. native) if it hasn't been resolved already, and begin Capacitor wrap work if the
  metrics support continued investment — this is prep work for Phase 3+ per `docs/product-spec.md`,
  not a day-90 deliverable in itself.
- **Hold the day-90 gate review** — the most consequential checkpoint in this pack. Compute every
  metric in `traction-metrics.md` against its day-90 target, and make an explicit, written
  decision against `kill-criteria.md` and `double-down-criteria.md`. This is not a status update;
  it's a decision point that determines whether months 4–6 are "scale the launch metro's playbook
  to metro #2" or "stop / pivot / extend the test."

## What "done" looks like at day 90

Not "PennyForge is a successful company" — that's premature at this scale. Done means: **a clear,
metric-backed answer to whether compliance-first, receipt-verified community reporting can sustain
itself without captain subsidy, in one real metro, and whether the users who rely on it will pay
for it.** Everything in this 90-day plan is built to produce that answer as cheaply and quickly as
possible — see `founder-memo.md`'s bottom line for why that's the right question to spend the
first 90 days answering, rather than any question about scale, feature breadth, or fundraising.
