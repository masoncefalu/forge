> Part of the PennyForge business strategy series — see docs/business/README.md.

# Growth Channels

How PennyForge acquires users without crossing a compliance boundary. Every channel below runs on
first-hand data, original content, and official platform features — no scraping, no competitor
feed ingestion, no gray tooling. Every traffic, conversion, and revenue-share number in this
document is labeled as an estimate, assumption, target, or hypothesis; nothing here is a measured
result yet.

## 1. Creator / affiliate strategy

### Why creators are the first paid-attention channel

Penny content already goes viral without us. A TikTok video of a shopper buying ~$4,000 of smoke
detectors for $0.01 drew 14.9M views ([Fast
Company](https://www.fastcompany.com/91552359/tiktok-influencer-has-viral-trick-for-buying-thousand-dollar-home-depot-items-for-just-one-penny-heres-how));
a penny-vanity haul drew 1.8M views on TikTok and 3.1M on Instagram ([Men's
Journal](https://www.mensjournal.com/news/home-depot-tiktok-goes-viral-after-shopper-scores-items-just-penny)).
Hashtags like #pennyitems, #pennyshopping, and #clearancefinds have active trending pages on
TikTok. The demand curve exists; creators are how we attach a product to it.

### Target creator profile

- Penny-shopping and hidden-clearance creators on TikTok, YouTube, and Instagram: penny-haul
  videos, "what I found at Home Depot" walkthroughs, shelf-tag explainers.
- Reseller/clearance-flip creators: "bought for $12, sold for $180" content, sourcing-run vlogs,
  eBay/Amazon flip breakdowns. These map directly to the Reseller tier and are the highest-LTV
  referrers (hypothesis).
- Gulf South location is a strong plus in wave one — Phase 1 is Louisiana-first, Home Depot only,
  and a creator whose audience can actually use the local feed converts better (assumption).

### Tiered outreach — micro first

Start with micro creators at roughly 5k–50k followers (heuristic band, not a studied threshold),
before approaching anyone larger:

| Wave | Follower band (heuristic) | When | Why |
|---|---|---|---|
| 1 | 5k–50k | Phase 1 | Authentic, local, cheap (product + rev-share, no cash), reply to DMs themselves, audiences trust them in-store |
| 2 | 50k–250k | Phase 2 | Approached with wave-1 results in hand: real referral numbers beat a cold pitch |
| 3 | 250k+ | Phase 5 launch push | Coordinated with haul-recap virality and Founder-tier scarcity per the roadmap |

Micro-first reasoning: engagement rates are typically higher at small follower counts and the cost
is near zero (labeled assumption, consistent with common influencer-marketing practice); a
14M-view megahit is a lottery ticket, while ten local creators posting weekly is a pipeline.

### The offer stack

1. **Free Reseller tier** ($19.99/mo hypothesis price) for the duration of the partnership.
2. **Custom referral code** — tracked signups, shown on their own dashboard.
3. **Affiliate rev-share: 30% of first-year subscription revenue from referred paying users**
   (hypothesis, to be validated against margin once Stripe is live). For context, mature SaaS
   affiliate programs commonly pay 15–30%, with 30%-for-12-months a recognizable standard (e.g.,
   HubSpot) and some programs paying up to 50% of year one — see
   [Post Affiliate Pro](https://www.postaffiliatepro.com/blog/saas-affiliate-commission-rates/) and
   [Supademo's program roundup](https://supademo.com/blog/saas-affiliate-programs). At the Pro
   $9.99/mo hypothesis price, 30% ≈ $36/referred subscriber/year if they stay 12 months — rich
   enough to matter to a micro creator, cheap enough to be sane CAC (all figures hypotheses).
4. **Early feature access** — Hunt Mode betas, haul-recap cards before public release.
5. **Co-created content** — we build their real Saturday route in our planner; they film the run.
   Their route, our math.

### Compliant list-building (manual only)

No scraping tools, no follower-export utilities, no automated DMs — the same posture as the data
allowlist. Method: one person, a spreadsheet, and public surfaces:

- Browse public TikTok/IG hashtags (#pennyitems, #pennyshopping, #clearancefinds,
  #homedepotclearance) and YouTube searches ("home depot penny haul", "clearance flipping") by hand.
- Record per creator: handle, platform, approximate followers, region if stated publicly, content
  format, posting cadence, last-post date.
- Qualify on: posted in the last 30 days, in-store footage (not repost accounts), no
  "trick the cashier" content (violates our etiquette rules and App Review posture).

### First wave: 10 creators

Send 10 personalized DMs/emails in Phase 1. Assumption: 20–30% respond to a personalized,
video-specific outreach (labeled assumption — cold DM response rates vary widely), yielding 2–3
active partnerships, which matches the roadmap target of 1–2 local reseller creators plus slack
for churn.

Template DM (short-form; email version adds one paragraph on the rev-share mechanics):

> Hey [name] — your [specific video, e.g., "penny smoke detector haul"] was great, especially
> [specific detail]. I'm building PennyForge: receipt-verified penny and hidden-clearance leads
> with confidence scores and a route planner — think Waze, not a Discord dump. We're launching in
> Louisiana with Home Depot. I'd like to give you our top tier free, a referral code that pays you
> 30% of the first year for anyone who subscribes through it, and early access to features before
> anyone else. No scripts, no obligations — post what you actually find. Interested? Happy to send
> a 2-minute demo.

### Content formats that fit the product

- **Haul videos with the scan verdict on screen** — the Hunt Mode "PENNY · $0.01" reveal is the
  natural money shot; the app appears at the emotional peak of the video.
- **Route-planning walkthroughs** — "here's my Saturday route and why the app ranked these 4
  stores" — the only format competitors structurally can't copy (no one else has a route planner).
- **"Is this a penny?" duets/stitches** — creator reacts to a viewer's shelf tag using the app's
  verdict; cheap, repeatable, invites submissions.
- **Haul-recap share cards** — the auto-generated "$3.41 spent · $212 retail · 98% off" card
  (README virality feature) as the closing frame of every haul video, watermarked with the
  referral code.

### Success metrics (targets, not results)

| Metric | Target (hypothesis) | Window |
|---|---|---|
| Response rate to wave-1 outreach | 20–30% | 2 weeks |
| Active partnerships from wave 1 | 2–3 | 4 weeks |
| Referred signups per active creator | ≥25 | first 60 days |
| Activation of referred users (first report, vote, or scan within 7 days) | ≥40% | rolling |
| Referred free→paid conversion vs. organic baseline | ≥1× organic | Phase 2, once Stripe live |

If a creator's referred users don't activate, the audience is spectators, not hunters — rotate the
slot rather than raising the rev-share.

## 2. SEO / content strategy

### Why education SEO is proven in this niche

PennyCentral (free web list + 120k+ member Facebook group) and Endless (freemium HD markdown
tracker) both built durable traffic on educational content and SEO rather than paid acquisition —
the README calls this "the proven PennyCentral/Endless SEO engine." The niche's search demand is
evergreen ("what are penny items" gets asked by every new hunter) and the incumbent content is
thin, ad-cluttered, and unverifiable.

Our E-E-A-T angle is the one asset the niche's SEO content lacks: **first-hand experience with
proof**. Every guide can embed real receipts, real shelf-tag photos, and community-verified find
counts from our own database. Google's E-E-A-T framework explicitly rewards demonstrated
first-hand experience; a receipt image beats a rewritten listicle (directional claim, not a
ranking guarantee).

### Keyword clusters

| Cluster | Example queries | Page type |
|---|---|---|
| Informational pillar | "what are penny items", "hidden clearance meaning", "clearance price endings explained", "is penny shopping legal" | Long-form pillar guides |
| Retailer-specific | "home depot penny policy", "home depot clearance schedule", "lowe's hidden clearance" | Retailer guides (community-derived, labeled as such — retailers don't publish these policies) |
| Local | "penny items in louisiana", "baton rouge clearance finds" | State/metro pages powered **only** by our own community-verified data summaries — counts, categories, freshness — never scraped prices, never competitor lists |
| Reseller-intent | "clearance flipping profit calculator", "what to flip from home depot clearance" | Tooling pages wrapping the profit calculator and haul P&L |

### Programmatic-SEO guardrail

State/metro pages ship only where verified data density exists — working threshold: ≥25 verified
reports in the trailing 30 days for a state page, ≥10 for a metro page (thresholds are initial
hypotheses, tune later). No thin doorway pages: a "Penny items in Wyoming" page with zero local
data is spam, hurts sitewide quality signals, and contradicts the honest-freshness brand. Pages
below threshold 404 or redirect to the nearest live state page.

### 12-week content calendar (2 posts/week, starts with Phase 2 per roadmap)

| Week | Post A | Post B |
|---|---|---|
| 1 | Pillar: What are penny items? (with real receipts) | Pillar: Hidden clearance, explained |
| 2 | Retailer: How Home Depot's markdown cycle works (community-derived, labeled) | Pillar: Clearance price endings decoded |
| 3 | Retailer: Home Depot penny policy — what's actually documented vs. community lore | Guide: Verify a penny in-aisle in under 30 seconds |
| 4 | Local: Penny items in Louisiana (live verified-find summary from our DB) | Product: How PennyForge confidence scores work |
| 5 | Retailer: Home Depot shelf-tag decoder (community reference) | Pillar: Penny-shopping etiquette — don't be that person |
| 6 | Pillar: Why the shelf tag lies (system price vs. floor price) | Tooling: Route planner — making a Saturday run pay for gas |
| 7 | Retailer: Lowe's clearance cycle (community-derived, labeled) | Pillar: Is penny shopping legal? |
| 8 | Local: Baton Rouge + New Orleans metro pages (ship only if above data threshold) | Guide: Reading a receipt like a hunter |
| 9 | Tooling: Clearance flipping profit calculator | Reseller: What actually sells — using resale comps |
| 10 | Pillar: Receipt verification — why proof beats screenshots | Retailer: Dollar General penny list mechanics (community-derived) |
| 11 | Pillar: When markdown cycles compress ("speed to penny") | Local: second Gulf South state page (MS or TX — data-gated) |
| 12 | Comparison: PennyForge vs. paid Discord communities (nominative use only, no unverified revenue claims) | Guide: From first scan to first penny — getting started |

### Internal-linking plan into signup

- Every pillar links down to its retailer guides and up to one tool page; every tool page links to
  the relevant tier explanation; every page carries one contextual CTA ("See what's verified near
  you — free") into the state feed, which is the signup surface.
- Local pages link to the live filtered feed for that state — the page's freshness *is* the pitch.
- Retailer guides link to the in-aisle verification guide, which ends at the scan/search feature.
- One orphan check per month: no published page more than 2 clicks from signup.

### Measurement (targets, all labeled)

| Metric | Target | By |
|---|---|---|
| Published + indexed pages | 24 published, ≥20 indexed (Search Console) | week 12 |
| Organic clicks/mo (Search Console) | 1,000 (assumption — niche volume supports this; not a forecast) | month 6 from first publish |
| Organic visit → signup conversion | 3–5% (hypothesis, standard content-CVR band) | measured from month 3 |
| Signups attributed to local pages | ≥25% of organic signups (hypothesis — local intent converts best) | month 6 |

## 3. Discord/Telegram distribution without dependency

Deal Soldier's structural weakness is Discord-only UX at $44/mo (revenue reportedly >$200k/mo per
reviewer-cited Whop stats — unverified, never cite as fact). Our inversion: **canonical data,
accounts, reputation, history, and tooling live in the product; chat platforms are outbound
delivery only** — already the architecture rule ("delivery channels, never dependencies", via
Apprise webhooks and a Telegram bot, both official documented platform features).

### The partner-server wedge (hypothesis)

Discord servers and Telegram groups for local deal-hunting already exist. Their owners want fresh
content; we want distribution. Offer: any server owner can add a **free PennyForge local-alert
webhook** — a state-scoped feed of verified leads, delayed 4 hours (identical to the free Scout
tier), each alert branded and deep-linked back into the product ("Confirm · Vote · Route →").
Labeled hypothesis: 10 partner servers in Phase 2, each driving 5–20 signups/mo (assumption, no
data yet).

Why this works as marketing, not charity:

1. **Meets users where they are** — no one has to leave their community to discover us.
2. **Legitimate presence inside other communities** — the server owner installs it voluntarily;
   we never post into servers ourselves, never scrape them, never poach member lists.
3. **Every alert is a functional dead end in chat** — confirming, voting, checking freshness, and
   routing only work in the product. Chat shows the lead; the product is where you act on it.

### Why the free delayed feed doesn't kill Pro (cannibalization defense)

- **Latency**: 4-hour delay on a lead class whose half-life is ~5–7 days with penny leads decaying
  faster — for time-sensitive finds, delay is the product difference.
- **Locality**: partner feeds are state-scoped; Pro alerts are radius- and watchlist-scoped.
- **Tooling gates**: no route planner, no scan verdicts, no watchlists, no confidence breakdowns
  in chat — the workflow that makes a Saturday profitable is behind signup.

### Risks

- **Platform ToS**: webhooks and bots are official features, but Discord/Telegram rules on
  commercial content and spam apply; alerts must be opt-in per server owner, rate-limited, and
  carry no dark-pattern CTAs. Review both platforms' developer terms before Phase 2 launch.
- **Partner-server churn**: owners can remove the webhook anytime; mitigate by making the feed
  genuinely good and by never making partners feel like billboards.
- **Cannibalization drift**: if free-feed latency or scope creeps toward Pro parity, the tier
  wall erodes — the 4h/state-level line is a pricing decision, change it only deliberately.
- **The hard rule**: we never build features that only work inside Discord or Telegram. If a
  feature idea has no product-side home, it's out of scope. Chat is a speaker, not a room.

## 4. Channel prioritization and sequencing

| Channel | Cost | Time-to-impact | Compounding value | Phase focus |
|---|---|---|---|---|
| Local community participation (founder/captains posting their own finds in public groups — as members, never scraping) | Near-zero | Weeks | Low–medium | **Phase 1** |
| Micro-creators + affiliate rev-share | Low (product + rev-share) | 4–8 weeks (assumption) | Medium | **Phase 1** |
| SEO / education engine | Low cash, high time | 3–6 months (typical SEO lag, assumption) | **High** — content ranks for years | **Phase 2** (draft pillars during Phase 1) |
| Partner Discord/Telegram webhooks | Near-zero | 1–2 months | Medium | **Phase 2** |
| Referral program (user-to-user) | Low | Needs an active base first | High once base exists | Phase 2, after ~500 users (threshold hypothesis) |
| Short-form social (own accounts + haul-recap cards) | Low | Spiky/unpredictable | Medium | Phase 2 seeding, Phase 5 push |
| Paid acquisition (search/social ads) | High | Fast | None | **Deferred** |

**Phase 1 focus: local community participation + micro-creators.** Rationale: Phase 1's exit is
100 WAU in one Gulf South metro with ≥60% evidence-carrying leads — a data-density goal, not a
traffic goal. Both channels recruit *contributors*, not spectators, and both are already in the
roadmap (captains, 1–2 local reseller creators). SEO can't help yet (nothing indexes in 4 weeks)
and referrals need someone to refer.

**Phase 2 focus: SEO engine + partner webhooks**, with referrals turned on alongside Stripe.
Rationale: Phase 2's exit is first paying subscribers with alert CTR >25%; SEO delivers intent-
qualified strangers, partner webhooks deliver already-obsessed deal hunters, and both feed the
free tier that Stripe converts.

**Why paid acquisition is deferred** (labeled reasoning): with tier prices still hypotheses and
zero cohort data, LTV is unknown — so any CPA bid is a guess against an unknown ceiling, and paid
traffic's non-compounding nature means every dollar stops working when spending stops. Revisit
only after 2–3 months of Stripe cohorts establish retention and ARPU floors (target: known
3-month retention and a measured free→paid rate before the first ad dollar).

## Sources

- [Fast Company — TikTok penny-item virality, 14.9M-view example](https://www.fastcompany.com/91552359/tiktok-influencer-has-viral-trick-for-buying-thousand-dollar-home-depot-items-for-just-one-penny-heres-how)
- [Men's Journal — penny haul virality example (1.8M TikTok / 3.1M IG)](https://www.mensjournal.com/news/home-depot-tiktok-goes-viral-after-shopper-scores-items-just-penny)
- [Post Affiliate Pro — SaaS affiliate commission norms (5–30%, most 15–25%)](https://www.postaffiliatepro.com/blog/saas-affiliate-commission-rates/)
- [Supademo — SaaS affiliate program examples incl. 30%-recurring structures](https://supademo.com/blog/saas-affiliate-programs)
- Repo grounding: /home/user/forge/README.md (competitive anchors, roadmap, tiers, virality features), /home/user/forge/docs/compliance.md (hard boundaries), /home/user/forge/docs/product-spec.md (personas, loops). Deal Soldier revenue claim remains unverified.
