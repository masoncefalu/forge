> Part of the PennyForge business strategy series — see docs/business/README.md.

# Community & Contributors

PennyForge's data moat is entirely supply-side: every lead in the product is a first-hand,
in-store report from a community member (see `docs/compliance.md`). Deal communities follow the
90-9-1 pattern — roughly 1% of members create most content, ~9% react to it, ~90% only consume
(industry rule of thumb, treated here as a working assumption, not a measured fact about our
users). That means the entire business rests on keeping a small contributor core motivated,
rewarded, and unexploited. This doc covers why contributors post, the concrete reward ladder, the
captain program, the retention loops, and why the resulting community compounds into a moat.

All ratios, thresholds, and targets below are **launch hypotheses to tune with real cohort data**,
not commitments.

## 1. Why contributors post

### What drives contribution

- **Status and recognition.** Deal hunters treat this as a craft. A confirmed penny find is a
  skill demonstration, and the leaderboard, trust badges, and the Verification Seal on their
  reports make skill legible. In Discord communities the equivalent is a pinned screenshot that
  scrolls away in an hour; here it accrues to a permanent, visible record.
- **Reciprocity.** "I share mine, you share yours" is the social contract of every functioning
  deal community. Contributors post because they benefit from others posting; the contract holds
  only while they can see it holding — a live local feed of other people's verified finds is
  itself a contribution incentive.
- **The thrill of the find wants an audience.** A 98%-off haul is a story. Haul recaps, confirm
  votes, and "your report got 5 confirmations" notifications give the story a room to land in.
  This is the emotional payload; credits are the rational one.
- **Practical rewards.** Pro-time credits (Section 2) convert contribution directly into product
  value: the best data producers ride free. This is the only reward that scales past the
  intrinsically motivated core.

### What kills contribution

- **Paywalling a contributor's own data back to them.** The fastest way to lose the supply side
  is to make a poster hit a paywall on the feed their own reports power. Rule: an active
  contributor (any credited report in the last 30 days — threshold is a hypothesis) never sees
  the 4-hour Scout delay on their home state's feed. Their credits usually cover Pro anyway; this
  rule is the backstop for the month they don't post enough.
- **Leech asymmetry.** Consumers will outnumber posters by an order of magnitude, and posters
  feel it. Mitigations: make consumption visibly reciprocal (confirm votes are a contribution and
  are counted as one), show reporters the downstream impact of their report ("your report alerted
  14 hunters, 3 confirmed"), and never let raw view counts dwarf visible appreciation.
- **Stale-feed discouragement.** Nothing tells a would-be poster "nobody's home" like a feed of
  8-day-old dead leads. Aggressive decay, dead-vote suppression, and bounty missions that pay to
  refresh stale high-value leads keep the feed looking alive because it is.
- **Fear of burning a spot.** This is the honest tension in the whole category: reporting a find
  summons competitors to the same shelf, and more hunters means less inventory for the finder.
  We do not pretend this away. Design responses, all **explicitly hypotheses to A/B in Phase 2**:
  - **Reporter-first head start:** the reporter's alert fan-out is delayed 60–120 minutes on
    penny leads (reporter opt-in), so the finder finishes their haul before the crowd arrives.
  - **Locality delay tiers:** the free feed already runs 4 hours delayed; instant alerts go only
    to nearby Pro users, which caps the crowd size per find.
  - **Quantity honesty:** a "roughly how many left" field lets a reporter share a find they've
    already partially bought without guilt, and lets readers self-select out of 1-unit leads.
  - The etiquette system cuts the same direction: "take what you need, report the rest" is the
    norm we promote, and shelf-sweeping is explicitly discouraged (see `docs/compliance.md`).

## 2. Contributor reward plan

### What counts as a verified contribution

Credits are earned only by reports that are **evidence-backed AND community-confirmed** — never
by raw submissions, or the economy gets flooded with typing:

- Evidence type is `RECEIPT` or `SHELF_TAG_PHOTO` (the two tiers that verify price, per
  `lib/scoring.ts`).
- At least 1 confirm vote from an independent user lands within 7 days.
- The report is not suppressed (2+ dead votes outnumbering confirms) and not moderator-rejected.

Credit accrues when the confirm lands, not at submission.

### The ladder (all values are launch hypotheses)

| Action | Credit | Cap |
|---|---|---|
| Receipt-verified, confirmed report | 3 Pro-days | shared 30 Pro-day/mo cap |
| Shelf-tag-verified, confirmed report | 2 Pro-days | shared 30 Pro-day/mo cap |
| Bounty: re-verify a stale high-value lead with evidence | +2 Pro-days on top of standard credit | 5 bounties/mo |
| Bounty: evidenced dead-confirmation of a stale high-value lead | 1 Pro-day | 5 bounties/mo |
| Referral: referred user's first report gets verified | 7 Pro-days | 3 referrals/mo |
| Confirm votes given (that survive, i.e. lead not later suppressed) | 10 confirms = 1 Pro-day | 3 Pro-days/mo |

A global ceiling of 45 Pro-days/month across all channels combined (hypothesis) applies on top
of the per-channel caps.

At these rates, ~10 receipt-verified reports/month = a free Pro month. At $9.99/mo Pro, one
Pro-day is roughly $0.33 of forgone revenue (estimate; marginal cost is near zero, and forgone
revenue only exists where the contributor would otherwise have paid). The global cap bounds the
maximum subsidy at ~1.5 free Pro months (~$15/mo, estimate) per contributor, so even a
worst-case top-contributor cohort costs us subscription revenue we were unlikely to collect from
them anyway — these are exactly the users the flywheel needs retained.

### Badge tiers (tied to trust score, `lib/scoring.ts` 0–100 scale)

| Badge | Trust score | Plus | Grants |
|---|---|---|---|
| Probation | any, first 14 days or first 5 reports | — | reports enter review lane; credits held |
| Scout | 0–59 (new users start at 50) | — | standard feed access |
| Finder | 60–74 | ≥5 credited reports | badge on reports, credit earning at full rate |
| Trusted Hunter | 75+ | ≥20 credited reports | badge, bounty priority, streak multiplier eligibility |
| Captain-eligible | ≥85 | Section 3 criteria (overlay on Trusted Hunter, not a separate tier) | invitation lane to the captain program |

Thresholds are hypotheses; trust moves +2 per confirm received and −3 per dead vote received
(shipped values in `lib/scoring.ts`), so Finder requires roughly 5 net-positive confirmed reports
above the starting 50 — reachable in a good first month, not a first weekend.

### Rules that protect the economy

1. **No credit for raw submissions.** Evidence-backed and confirmed, or nothing (above).
2. **Monthly caps** on every earning channel (table above) so no single account can mint
   unbounded Pro-time.
3. **Velocity and geo-plausibility checks.** Reports or confirms from one account across
   implausible distances (e.g. 3 states in an hour — the README's canonical example) freeze
   credit accrual pending review.
4. **Probation lane.** New accounts earn no spendable credits for the first 14 days or first 5
   reports (whichever is longer); credits accrue in escrow and release on graduation. This makes
   throwaway-account farming slow and boring.
5. **Image integrity.** Perceptual hashing against recycled evidence photos and EXIF plausibility
   checks (Phase 2 fraud tooling) gate credit on the evidence actually being novel.
6. **Clawback.** Fraud-flagged reports reverse their credits, reset earned trust from those
   reports, and can retroactively revoke Pro-time already applied. Repeat fraud is a ban, not a
   warning.
7. **Confirm-vote credit only vests if the lead survives** — a confirm on a lead that gets
   suppressed within 7 days earns nothing, so confirm-farming rings have to be right to get paid.

### Why Pro-time, not cash, at launch

- **No Apple entanglement.** Credits are applied server-side to entitlements, outside IAP (see
  README, Monetization). Cash payouts would add money-transmission, tax-form (1099), and
  App Review complexity we don't need at launch.
- **Fraud economics.** Pro-time is only valuable to someone who actually uses PennyForge; cash is
  valuable to anyone, which turns every fraud vector into a direct income scheme. Fake-receipt
  marketplaces exist; we should not be the buyer of last resort.
- **Alignment.** Paying in product keeps rewards inside the flywheel: the reward for producing
  data is better access to the data.
- **Cash bounties are a later experiment**, plausible for high-value verified finds once receipt
  OCR, image hashing, and manual-review capacity are mature (Phase 3+). The fraud surface —
  collusion rings, purchased receipts, split identities — must be priced in before the first
  dollar moves. Not a launch commitment.

## 3. Captain / moderator program

Captains are the trust anchors of a metro: high-reputation locals who moderate their area's queue
and set the community tone. The MVP already gates the moderation queue to ADMIN/CAPTAIN roles.

### Who qualifies (hypothesis thresholds)

- Trust score ≥ 85, sustained for 30+ days.
- ≥ 60 days account tenure and ≥ 25 credited reports, majority in the metro they'd captain.
- Zero fraud flags, zero etiquette strikes.
- Application plus a founder conversation while the program is small (Phase 1–2: hand-picked,
  2–3 captains in one Gulf South metro per the roadmap).

### What captains get

- **Free Reseller tier** ($19.99/mo value, hypothesis pricing) for as long as they serve.
- Moderation tools: their metro's report queue, evidence review, probation-lane approvals.
- Naming and recognition: captain badge, named on their metro's feed page, credited in launch
  and event communications.
- Early access to features and a direct channel to the founders — captains are the first users
  of every Phase 2 trust tool.

### What captains owe

- **Moderation SLA** on their metro's queue: median time-to-decision under 12 hours, 95% under
  24 hours (targets, tuned to real queue volume).
- Etiquette enforcement: acting on shelf-sweeping reports, employee-confrontation content, and
  "deceive the cashier" content (banned outright per compliance policy).
- A monthly captain sync while the program is under ~10 metros.

### Density, succession, removal

- **2–3 captains per metro** — enough for coverage and vacation redundancy, few enough that the
  role stays scarce and meaningful.
- 30 days of inactivity triggers a check-in; two consecutive months of missed SLA rotates the
  seat. Fraud or etiquette breach is immediate removal.
- Captains nominate successors from the Trusted Hunter tier; the bench is the badge ladder.

### Revenue share: a later experiment, not a launch commitment

A captain revenue-share (e.g. a cut of subscription revenue attributable to their metro) is a
plausible Phase 4+ experiment for the captain program at scale. It is explicitly **not**
promised at launch: it converts volunteers into contractors (tax and employment-law review
required), changes moderation incentives in ways we haven't observed yet, and should only be
tested after per-metro revenue attribution actually exists.

## 4. Retention loops

| Loop | Trigger | Action | Reward | Metric to watch (targets are hypotheses) |
|---|---|---|---|---|
| Contribution | In-store find, or a bounty ping on a stale lead | Sub-30-second evidence-backed report | Confirms (+2 trust each), credits, badge progress, "your report alerted N hunters" | ≥10% of WAU post ≥1 report/mo; ≥60% of surfaced leads evidence-backed (Phase 1 exit criterion) |
| Consumption | Deduped high-confidence alert (score ≥ 60, one per product+store per 24h) | Drive to store, scan in aisle, verify | The find itself; confirm vote refreshes the lead's decay clock for everyone | Alert CTR > 25% (Phase 2 exit); % of alert-driven visits producing a vote within 48h (target 30%) |
| Habit | Saved stores, watchlists, weekly digest, report streaks | Weekly check-in ritual even between hunts | Streak recognition, digest of "what moved near you" | D30 retention: contributor cohort ≥ 2× consumer cohort; digest open rate ≥ 40% |
| Seasonal | Regional "Penny Season" leaderboard events | Compete on verified finds within a state/metro window | Event badges, leaderboard placement, captain shout-outs | Event-week verified-report volume ≥ +40% vs. trailing 4-week baseline |

The loops interlock deliberately: the consumption loop's confirm votes are the input to the
contribution loop's trust and credit rewards, and both feed the scoring engine that makes the
alerts in the consumption loop worth clicking. A user who only consumes still strengthens the
data every time they vote — which is the answer to leech asymmetry that doesn't involve guilt.

## 5. Community moat

**The moat is the verification history, not the price list.** A competitor who copies today's
feed gets an asset with a 7–14 day half-life (penny/clearance decay, `lib/scoring.ts`) and none
of the machinery that keeps it alive: which reporters get confirmed, how often, by whom, in which
stores. That trust graph never appears in any payload — it exists only as accumulated
relationship history between accounts, evidence, and votes. It cannot be scraped because it is
not published; it can only be re-earned, report by report, over years.

**Switching costs compound per user.** Trust score, badge tier, credit balance, report and scan
history, leaderboard standing, and standing with local captains all live here and none of it is
portable. A Trusted Hunter who leaves starts over at 50 trust somewhere that probably doesn't
measure trust at all.

**Etiquette culture is brand defense and an App Review asset.** The content rules (no
shelf-sweeping advocacy, no employee confrontation, "deceive the cashier" content banned) keep
the community presentable to retailers, press, and Apple's UGC guidelines (1.2). Communities
that celebrate sweeping shelves eventually make the news for it; ours is structurally pointed
the other way, and the moderation infrastructure to enforce it is already built.

**Compliance means no rug-pull.** Gray-data competitors live one C&D or endpoint rotation from a
dead product — and their communities know it, which caps how much identity anyone invests there.
PennyForge's allowlist-only data policy means the years a contributor spends building reputation
here are safe from a retailer legal team, because there is nothing for a legal team to shut off.
That safety is itself a contributor acquisition pitch.

**Discord communities lack the retention primitives.** Deal Soldier charges $44/mo for a Discord
via Whop (its reported revenue is an unverified, reviewer-cited figure — never treat it as fact);
PennyCentral runs a 120k+ member Facebook group. Both demonstrate demand, and both are built on
platforms with no structured deal history (screenshots scroll away), no per-user reputation that
means anything outside one server, no local scoping (one firehose channel per region at best),
and no way for a great contributor to earn anything but emoji. Every one of those gaps is a
PennyForge primitive: scored history, portable-within-platform trust, ZIP-level feeds, and
Pro-time credits. Discord stays exactly what the architecture says it is — an outbound delivery
channel, never the home.
