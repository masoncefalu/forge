# Double-Down Criteria

_Agent 13: Founder Strategy. The mirror image of `kill-criteria.md` — pre-committed, falsifiable
conditions under which the right move is to commit more (time, money, scope), plus what "doubling
down" concretely means at each stage, so a good day-90 result converts into a specific next plan
instead of vague enthusiasm._

## How to use this document

Same discipline as `kill-criteria.md`: check these against actual `traction-metrics.md` numbers
at the day-30 and day-90 gate reviews, not against a narrative sense that "things feel good."
Requiring **all** criteria in a tier (not just one) before advancing to that tier's scope increase
is the point — this document is a brake against premature scaling as much as it's permission to
scale when warranted.

## Tier 1: Continue past day 30 into month 2 as planned

All of the following, per `traction-metrics.md`'s day-30 targets:

- Reports-per-active-contributor-per-week ≥2.0/week sustained for 2 consecutive weeks (captain-
  inclusive is fine at this stage — see `first-30-days.md` week 1–2 framing).
- ≥20 approved reports carrying real evidence live in the feed by end of week 1, ≥60% evidence
  rate sustained through day 30.
- 100 WAU in the launch metro.
- No hard-kill criterion from `kill-criteria.md` triggered.

**What doubling down means at this tier:** nothing new — proceed into month 2 exactly as scoped
in `first-90-days.md`. The "double down" here is discipline (stay in one metro, keep captain
subsidy visible, keep instrumenting), not scope expansion. Resist any temptation to add a second
metro or new feature just because day 30 looked good — day 30 numbers reflect a founder/captain-
subsidized feed, not yet an organic one (see `kill-criteria.md` #1's caveat).

## Tier 2: Commit to a second metro (earliest: after day 90)

All of the following, per `traction-metrics.md`'s day-90 targets and the month-2/3 gates in
`first-90-days.md`:

- Non-captain reports-per-active-contributor-per-week ≥1.5/week, with captain-authored share of
  total volume visibly shrinking month-over-month (the organic-takeover signal from
  `first-90-days.md` month 2).
- Week-4 contributor retention ≥15% on the week-1 launch cohort.
- Dead-vote rate on approved reports <20%, stable or improving.
- No hard-kill or unresolved yellow-flag condition from `kill-criteria.md` outstanding.

**What doubling down means at this tier:** replicate the exact captain-recruitment and seeding
playbook from `first-30-days.md` in a second, deliberately *different-profile* metro (different
region, ideally testing whether the launch metro's success generalizes or was locally lucky —
per `pre-mortem.md`'s note on metro-specific causes). Do not add a second retailer or expand
feature scope at this tier; the test is "does the playbook replicate," not "does more breadth
help." Budget for this the same way as month 1: mostly founder/captain time, not paid acquisition.

## Tier 3: Commit to monetization infrastructure investment beyond minimal billing

All of the following:

- Free-to-paid conversion (`traction-metrics.md` metric 9) ≥3% within 60 days of minimal billing
  going live (the target already stated in `traction-metrics.md`).
- Reseller-tier signups specifically show engagement with the profit-calculator/haul-P&L features
  once shipped (`founder-memo.md` §5) — not just Pro-tier conversion, since Reseller is the
  higher-price tier this pack treats as the real monetization upside.
- Alert-to-visit conversion (`traction-metrics.md` metric 8) ≥20%, validating that the paid
  alert-delivery value proposition is real, not just theoretical.

**What doubling down means at this tier:** move from minimal Stripe billing to the full
entitlement-service architecture described in `README.md` (server-side entitlements resolving
both Stripe and future StoreKit purchases to one record) — worth building once there's a real
paying cohort to serve, not before. Also: greenlight the reseller-suite build-out
(`README.md`'s "beyond v1" reseller features) as a first-class roadmap item rather than a
month-2 side project.

## Tier 4: Commit to native iOS distribution

All of the following:

- Tier 2 criteria met in at least 2 metros (i.e., the playbook has replicated, not just worked
  once).
- PWA-based WAU growth shows the product benefiting from, and being constrained by, missing native
  capabilities specifically (push notification reach, App Store discovery) — not just "growth
  would be nice," but a specific, named constraint the PWA can't solve.
- The UGC moderation gap (Guideline 1.2) has been closed and battle-tested against real moderation
  volume across the metros already live, not just built and unused.

**What doubling down means at this tier:** proceed with the Capacitor wrap path already
recommended in `docs/status.md`'s iOS roadmap doc, on the timeline in `docs/product-spec.md`'s
Phase 3, with the Apple Developer enrollment and App Store Connect decisions in
`docs/status.md`'s "Decisions needed" section resolved ahead of time so they don't block the
submission once engineering is ready.

## What this document deliberately does not authorize

Meeting a lower tier's criteria does not authorize skipping ahead to a higher tier's scope — e.g.,
strong day-30 numbers do not authorize starting native iOS work or a second metro early. Each
tier's investment is sized to what's actually been proven at that point, matching the "what not
to build" discipline in `founder-memo.md` §7. The purpose of pre-committing to these tiers is to
make scaling decisions boring and evidence-driven rather than momentum-driven — enthusiasm after a
good month is exactly when overinvestment risk is highest, which is why this document exists
before that month happens, not after.
