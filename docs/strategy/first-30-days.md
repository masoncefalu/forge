# First 30 Days

_Agent 13: Founder Strategy. Assumes the MVP on `main` (per `docs/status.md`, green as of
2026-07-08) as the starting point. The goal of days 0–30 is narrow and specific: **get the
reporting loop running for real, with real strangers, in one metro** — not to build new features.
See `founder-memo.md` §6 for why the "what to build first" list is ordered the way it is._

## Week 0 (pre-launch, before day 1)

Not a "week" of the 30-day clock — this is prerequisite setup, timeboxed to ~1 week so it doesn't
eat into the measured window.

- **Confirm the launch metro.** Validate the Louisiana/Gulf South choice from `README.md` against
  real Home Depot store density and candidate-captain availability (`founder-memo.md` §9). Pick
  one metro, not a state — density in a 15–20 mile radius, not a broad region.
- **Ship the "what to build first" list** from `founder-memo.md` §6, items 1–3 specifically:
  real auth + hosted Postgres deploy, real evidence upload, and captain recruiting started in
  parallel (recruiting doesn't block on the deploy being done).
- **Recruit 2–3 regional captains.** Source from local penny-hunting Facebook groups, local
  reseller communities, or creators active in the chosen metro. Pitch: early access, a Founder-
  tier lifetime credit (per `README.md`'s monetization table), and visible recognition (captain
  badge, leaderboard status) in exchange for seeding the first 2–3 weeks of reports personally.
- **Close the UGC report/block gap** (`docs/status.md`) — cheap, and needed before real strangers
  are using the product regardless of App Store timing.
- **Write the etiquette/community guidelines** referenced in `README.md`'s design language section
  — a short, plain-language page (no shelf-sweeping, no confrontation, no "deceive the cashier"
  content). Publish it before day 1, not after a first incident.

## Week 1 (days 1–7): captain-seeded launch

- Captains begin submitting real reports from real in-store visits in the launch metro,
  Home-Depot-only. Target: **≥20 approved reports with real evidence by end of week 1** — enough
  that a first-time visitor's feed isn't empty.
- Founder personally verifies a sample of captain reports in-store where feasible, both to
  quality-check the trust mechanic and to model the reporting behavior captains should coach
  others toward.
- Soft-launch to a small invite list (personal network, captains' immediate contacts) — not a
  public push yet. Goal is to shake out obvious UX friction in report submission before wider
  traffic arrives.
- Instrument the metrics in `traction-metrics.md` from day 1, even manually if the dashboard
  isn't built — reports-per-contributor and evidence % are cheap to compute by hand at this
  volume.

## Week 2 (days 8–14): controlled public opening

- Open sign-up publicly in the launch metro only (geofenced messaging, not a geofenced app —
  the feed itself should already be metro-scoped by the existing state/store filters).
- Begin light organic outreach: post in the metro's existing local hunter/reseller Facebook
  groups (with captains' help, since they're already members) — direct, honest pitch ("a
  receipt-verified alternative to screenshot chaos," not hype copy.
- Watch the contributor-vs-browse-only split (`traction-metrics.md` metric 1 caveat) closely
  starting this week — this is the earliest point real non-captain organic contribution should
  start appearing, and its absence by end of week 2 is worth a direct check-in with captains on
  what's blocking reporting.
- First moderation-queue real-world test: expect at least one bad-faith or low-quality report by
  now; confirm the admin queue (`app/admin`) response time is same-day, not multi-day.

## Week 3 (days 15–21): first retention checkpoint

- Compute week-2 contributor retention for the week-1 cohort (`traction-metrics.md` metric 3) —
  the first real signal on whether people who reported once come back to report again.
- If reports-per-contributor is flat or declining (`traction-metrics.md` metric 1), treat this as
  the priority fire to fight — see `pre-mortem.md` #1–2 for the two most likely causes and
  `founder-memo.md` §4 for the mechanism-design responses (contribution payoff speed, visibility
  of impact, leaderboard/status incentives).
- Begin real alert delivery work (email/web push via Apprise, `founder-memo.md` §6 item 4) only if
  supply-side metrics look healthy by this point — if they don't, this week's engineering time
  goes to fixing the reporting loop instead, per the sequencing logic in `pre-mortem.md`'s closing
  section.

## Week 4 (days 22–30): 30-day gate review

- Compute all metrics in `traction-metrics.md` against the day-30 targets stated there.
- Hold a real go/no-go/adjust review against `kill-criteria.md` and `double-down-criteria.md` —
  this is a hard checkpoint, not a soft check-in. Write down the actual numbers next to the
  targets, not a narrative summary.
- Regardless of the verdict, do **not** start a second metro, native app work, or new major
  features this week — see `founder-memo.md` §7. The day-30 review's job is to decide whether to
  keep running the same experiment for another 60 days (per `first-90-days.md`), not to decide
  what to build next.

## Explicitly out of scope for the first 30 days

- Billing/monetization (Stripe or otherwise) — sequenced into `first-90-days.md` at earliest,
  contingent on supply-side health.
- App Store submission — the PWA hedge covers distribution for this window; iOS prep can proceed
  in parallel on founder time that isn't needed for the launch-metro work, but is not a day-30
  deliverable.
- A second metro, second retailer, or any feature from `README.md`'s "Feature Brainstorm (Beyond
  v1)" list.
- Fraud-detection sophistication beyond the existing dead-vote suppression and admin queue — at
  this volume, a human moderator is faster and cheaper than building tooling.
