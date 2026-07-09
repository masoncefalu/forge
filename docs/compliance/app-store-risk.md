# PennyForge — App Store Review Risk Notes

> **Not legal advice.** This is a practical risk framework and set of product guardrails, written
> for counsel to review before launch.

This document covers **review-risk analysis** for the Apple App Store and Google Play. It
complements `docs/app-store-checklist.md`, which owns submission logistics (enrollment, bundle ID,
screenshots, TestFlight, privacy nutrition labels) — read that first; this document does not
repeat it. The native/wrapped shell is Phase 4 per `docs/product-spec.md`, but two categories of
decisions bind earlier: **listing/marketing copy** (retailer legal and reviewers both read it, and
it shapes the web product's voice today) and **UGC-readiness features** (report/block affordances
take real build time and gate any public submission).

The hard boundaries in `CLAUDE.md` — no scraping, no private retailer endpoints, no reverse
engineering of retailer apps or systems, no credentialed scraping, no competitor data ingestion,
no automated checkout, no rate-limit bypass — are also PennyForge's strongest review asset: they
are the literal answers to the questions reviewers ask about deal apps. Never soften them in
listing copy, review notes, or support responses.

## UGC requirements (Apple Guideline 1.2 / Google Play UGC policy)

Both stores require the same core kit for apps built on user-generated content. Status against
the current MVP:

| Requirement | Apple 1.2 / Play UGC expectation | PennyForge today | Gap / action |
|---|---|---|---|
| Content moderation mechanism | A method to filter and remove objectionable content | **Exists**: admin/captain moderation queue (`/admin`, ADMIN/CAPTAIN roles) plus community dead-vote auto-suppression (2+ dead votes over confirms suppresses a lead — `lib/scoring.ts`, `docs/compliance.md`) | Sufficient in kind; document the moderation SLA (below) so it is a stated commitment, not folklore. |
| Report/flag mechanism | Users can report offensive content **as abuse**, distinct from disputing accuracy | **Partial**: dead vote exists, but it means "deal is gone," not "this content is abusive/spam" | **Gap — pre-submission requirement.** Ship a dedicated "report abuse" control on reports and user profiles, routing into the existing moderation queue. Dead-voting is not a substitute a reviewer will accept. |
| Block/mute users | Users can block abusive users | **Missing** | **Gap — pre-submission requirement.** A block-user capability (at minimum: hide a contributor's reports and prevent their interaction) must exist before either store submission. Also flagged in `docs/app-store-checklist.md` §12. |
| Published content policy + EULA | Publicly linked content rules and terms | **Partial**: `docs/compliance.md` and this compliance suite are the internal source; nothing is user-facing yet | Convert this doc suite into a public content policy + ToS/EULA page linked from the app and both store listings. Counsel review required (see `docs/compliance/trademarks-and-disclaimers.md` "For counsel"). |
| Developer contact + timely response | Published contact info; act on reports within a reasonable time (Apple's UGC guidance references 24 hours for objectionable-content reports) | **Missing** as a stated commitment | Publish a support contact and commit to a 24-hour triage SLA for abuse reports in the content policy. The moderation queue makes this operationally feasible; write it down. |

## Account deletion (Apple 5.1.1(v); Google Play account-deletion policy)

Apple requires in-app account deletion for any app that supports account creation; Google Play
additionally requires a **web-accessible** deletion path linked from the Data safety form. The
mock cookie auth in `lib/currentUser.ts` defers this today, but it becomes binding the moment
Phase 1 real auth lands — **treat account deletion as part of the Phase 1 auth work**, not a
pre-submission scramble. Deletion must actually delete (or irreversibly anonymize) the account
and its data, not just deactivate it.

The deletion cascade across `Report`, `ReportVote`, `Alert`, `RoutePlan`, and evidence images —
what is deleted, what is anonymized to preserve community scoring integrity, and on what timeline
— is specified in `docs/compliance/data-retention.md` (sibling document in this suite). The
in-app control is the storefront requirement; that document is the source of truth for what the
control does.

## Privacy labels and data-safety forms

The Apple App Privacy ("nutrition label") mapping already exists as a living table in
`docs/app-store-checklist.md` §4 — do not duplicate it here; update it there when the schema or
`lib/*.ts` collection surface changes.

**Google Play parity note:** Play's **Data safety** form covers the same facts but asks different
questions — notably whether data is *shared* with third parties, whether data is *encrypted in
transit*, and whether users can *request deletion* (with the web-deletion link noted above).
Answer both forms from the same underlying inventory (checklist §4 table) so they can never
disagree; a mismatch between the two stores' declarations is itself a credibility flag if either
store or a researcher compares them. Play also verifies Data safety claims against observed app
behavior, so the same "declare what the code actually does, not aspirations" rule from checklist
§4 applies.

## Listing-copy risk

Reviewers pattern-match deal apps against scrapers, price-bot tools, and gray-market aggregators
— and retailer legal teams read store listings too. PennyForge's positioning must be **community
deal-sharing with receipt-verified proof**, which has the advantage of being the truth
(`docs/compliance.md`: first-hand, in-store, user-generated evidence only).

Never market PennyForge as a "glitch finder," "exploit," "secret retailer data," "hidden
exploit," "loophole," or "beat the system" tool — in the app name, subtitle, description,
keywords, screenshots, or ads. Penny pricing and hidden clearance are store-initiated markdown
states, not bugs being abused; copy that borrows exploit slang misrepresents the product to
exactly the two audiences (app reviewers, retailer counsel) most likely to act on it. This
restates and hardens `docs/app-store-checklist.md` §12's language guidance.

| Unsafe phrasing (never use) | Safe phrasing (use instead) |
|---|---|
| "Find secret penny glitches before the store catches on" | "See penny and clearance finds that shoppers near you verified with receipts and shelf-tag photos" |
| "Unlock hidden retailer data stores don't want you to see" | "Community-reported hidden clearance, scored for confidence and freshness" |
| "Beat the system with insider markdown intel" | "Plan a route worth the gas: community-confirmed leads ranked by expected value" |

App Review notes draft language (the "is this a scraper?" preemption) already exists in
`docs/app-store-checklist.md` §12 — reuse it; keep it in sync with the boundary list above.

## Location permission

The MVP functions **without device GPS**: users enter a home ZIP (`User.homeZip`) and the route
planner (`lib/routePlanner.ts`) computes distance from stored home coordinates, which `lib/route.ts`
uses to score and rank stores — no runtime location permission is needed at all for a Phase 4
shell wrapping current functionality, and the shell should not request one it does not use
(unused permission requests are themselves a rejection trigger — checklist §5/§6).

If precise device location is requested later (live "near me now" or Phase 2 geofenced alerts):

- Purpose strings must describe the **actual** use, specifically (checklist §5 has the draft
  `NSLocationWhenInUseUsageDescription` copy and the When-In-Use-only rule).
- **Coarse location should be the default** request; store proximity at ZIP/city granularity does
  not need precise GPS. On iOS, design for users toggling Precise Location off; on Android,
  request `ACCESS_COARSE_LOCATION` and add fine location only with a feature that genuinely
  requires it.
- Retention, fuzzing before any cross-user display, and the never-show-contributor-position rule
  are specified in `docs/compliance/location-privacy.md` (sibling document in this suite);
  `docs/compliance.md` already commits to fuzzing before any future location sharing.

## Rejection-risk table

| Risk | Guideline | Likelihood | Pre-empt action |
|---|---|---|---|
| UGC app without user-facing report-abuse + block controls | Apple 1.2; Play UGC policy | **High** (kit is explicitly checked for UGC apps; two of five items are missing) | Build report-abuse and block-user before submission; publish content policy + support contact with a 24h triage commitment. |
| No in-app account deletion once real accounts exist | Apple 5.1.1(v); Play account-deletion policy | **High** if auth ships without it; N/A until then | Bundle deletion into Phase 1 auth work; implement the cascade per `docs/compliance/data-retention.md`; add Play's web deletion link. |
| Under-disclosed data collection (labels/forms vs. actual behavior) | Apple 5.1.1/5.1.2; Play Data safety | **Medium** (inventory exists; drift is the risk as Phase 1–2 features land) | Keep checklist §4 table current on every schema/`lib/*` collection change; answer both stores from that single inventory; add photo-upload rows before the feature ships, not after. |
| Misleading listing copy reads as scraper/exploit tool | Apple 2.3.1 (accurate metadata), 1.2 context; Play Deceptive Behavior / Metadata policy | **Medium** (category pattern-match risk; fully controllable) | Enforce the safe/unsafe phrasing table above; reviewer notes per checklist §12; no exploit slang anywhere in metadata or ads; not-affiliated disclaimer in the description. |
| Minimum functionality — thin webview wrapper | Apple 4.2 (also 2.5.2 web wrapper expectations) | **Medium-High** for a bare WKWebView shell of the site | Phase 4 shell needs native value-add beyond the website: camera barcode scan (Phase 2 feature, natural native hook), push notification delivery, offline in-store mode are the roadmap-aligned candidates (`docs/product-spec.md`). Decide before building the shell, not at review time. Google Play is more permissive here, but a bare wrapper still risks low-quality flags. |
| Age rating misaligned with audience | Apple age-rating questionnaire; Play content ratings (IARC) | **Low** (no objectionable content categories apply) | **For counsel**: choose 13+ vs 17+ deliberately. UGC with moderation typically supports a 13+ class rating (Apple's questionnaire computes it; "unrestricted web access" only applies if the shell embeds a general browser — avoid that). Under-13 is out: no COPPA posture exists and none is planned; state the 13+ floor in the ToS. |
| Purchase/checkout automation suspicion | Apple 2.3.1 honesty; retailer complaints post-launch | **Low** (feature does not exist and never will per `CLAUDE.md`) | Keep "no automated checkout" in reviewer notes and public policy; reject any future feature request that automates purchasing rather than working around the boundary. |

## Sequencing summary

1. **Now (web MVP, pre-native):** adopt the listing-copy language rules everywhere copy is
   written; publish the user-facing content policy + ToS once counsel reviews this suite.
2. **Phase 1 (real auth + file upload):** in-app account deletion + web deletion path; DMCA agent
   registered before photo upload ships (see `docs/compliance/trademarks-and-disclaimers.md`);
   report-abuse and block-user controls built.
3. **Pre-submission (Phase 4 shell):** verify the UGC table above is all "exists"; both privacy
   forms answered from checklist §4; native value-add decided for Apple 4.2; reviewer notes and
   demo account per checklist §12.
