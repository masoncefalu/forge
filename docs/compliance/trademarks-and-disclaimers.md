# PennyForge — Retailer Trademarks & Disclaimer Guidance

> **Not legal advice.** This is a practical risk framework and set of product guardrails, written
> for counsel to review before launch.

PennyForge's data is *about* retailers (Home Depot, Lowe's, Dollar General, Walmart, and any
retailer later added to the `Retailer` table in `prisma/schema.prisma`), but PennyForge is not
affiliated with, endorsed by, or partnered with any of them. That gap — talking about brands
constantly while having no relationship with them — is the entire trademark risk surface. This
document sets the rules for how retailer names may appear in the product and marketing, and
inventories the disclaimers the product must carry.

This document extends `docs/compliance.md` (data-source policy and its "Disclaimers shown to
users" section) and never contradicts it. The hard boundaries in `CLAUDE.md` — no scraping, no
private retailer endpoints, no reverse engineering, no competitor data ingestion, no automated
checkout — apply here in full; nothing in this document licenses an exception.

## Nominative fair use: how retailer names may be used

Retailer names in PennyForge are **factual location identifiers** supplied by users reporting
where they found a deal. That is classic nominative/descriptive use: we use the name because it is
the only practical way to say *where* something happened, not to suggest sponsorship. To stay
inside that safe harbor:

| Rule | What it means in practice |
|---|---|
| Use only as much of the mark as needed | Plain-text retailer name (`Retailer.name`, `Store.name` from `prisma/schema.prisma`). Never the logo, never the stylized wordmark. |
| Use descriptively, not as branding | "Reported at Home Depot #0121, Marietta GA" is fine. "PennyForge for Home Depot" or a Home-Depot-orange section header is not. |
| Never more prominent than PennyForge's own branding | Retailer names render in body text and data fields. PennyForge's own mark (the header in `app/layout.tsx`) is the only brand treated as a brand. No retailer name in a headline larger than PennyForge's own name, in app store screenshot captions styled as titles, or in ad creative as the visual anchor. |
| No implied relationship | Pair descriptive use with the not-affiliated disclaimer (see inventory below) anywhere pricing or retailer names are the focus of the page. |
| Accuracy | Only name a retailer when the underlying user report actually names that retailer's store. Retailer names are user-facing data, not editorial garnish. |

## Never-do list

These are prohibited without a written license from the retailer in question. There is no
"small enough to be fine" exception.

- **No retailer logos, wordmark styling, brand colors, or store-façade imagery** in app chrome,
  app icons, marketing sites, ads, app store screenshots, or social creative. This includes
  "inspired by" treatments (orange-apron color schemes, blue-vest motifs, near-miss fonts).
- **No "official," "partner," "authorized," "verified by [retailer]," or any implied-endorsement
  language** anywhere — UI, listing copy, press, or support replies.
- **No retailer names in PennyForge's own identity**: not in the app name, product name variants,
  domain names, iOS bundle ID / Android application ID (see `docs/app-store-checklist.md` §2 —
  reverse-DNS on a PennyForge-controlled domain only), social handles, or ad keywords bid in a way
  that implies affiliation (bidding on "home depot penny list" as a search term is a counsel
  question; writing ad copy that reads as if Home Depot published the list is a hard no).
- **No lookalike UI**: no screens styled to resemble a retailer's app, website, price tag system,
  or in-store signage. PennyForge screens must always read as PennyForge.
- **No exploit framing**: never describe penny items or hidden clearance as a "glitch," "hidden
  exploit," "loophole," or "hack" in any copy that carries a retailer's name. Penny pricing is a
  store-initiated markdown state, and our language must say so — this matters doubly for app-store
  listing copy and marketing (see `docs/compliance/app-store-risk.md`). Framing a retailer's own
  markdown process as a bug being abused is both inaccurate and the fastest way to convert a
  trademark nuisance into a hostile retailer-legal letter.
- **No content that coaches confrontation or deception**: PennyForge never publishes scripts for
  arguing with, misleading, or pressuring store employees at checkout. The footer's "be kind to
  store employees" line is product policy, not decoration.

## Disclaimer inventory

Draft language below is written for counsel to edit, not to ship verbatim without review. The
footer row quotes what `app/layout.tsx` actually ships today.

| Disclaimer | Draft text | Where it must appear |
|---|---|---|
| Not affiliated (shipping today) | "Community-reported deals. Prices vary by store and change fast — availability is never guaranteed. PennyForge is not affiliated with any retailer. Be kind to store employees." | Global footer on every page (`app/layout.tsx`) — already implemented. Also required in app-store listing copy and the marketing site footer. |
| Price/availability accuracy | "All prices and availability are community-reported. They vary by store, change fast, and can be wrong or already gone. Nothing here is guaranteed." | Every surface that displays a price: feed (`app/page.tsx`), search results (`app/search/page.tsx`), lead detail, alerts (`app/alerts/page.tsx`), route planner (`app/route/page.tsx`). The global footer covers this today; if any pricing surface ever renders without the global footer (embeds, share cards, push notifications in Phase 2), it needs its own copy. |
| Store discretion | "Individual stores may decline to sell penny or clearance-marked items, or may pull them from the floor. That is the store's right and its policy to set. PennyForge reports what shoppers saw; it does not entitle anyone to a price." | Lead detail page and report-submission flow (`app/report/new/page.tsx`). Also in help/FAQ content. Per `docs/compliance.md`, penny/clearance handling varies store-by-store and is not uniformly documented by any retailer — never state a chain-wide "policy" as fact. |
| YMMV | "YMMV — your mileage may vary. This was true for one shopper at one store at one moment. Confidence score and freshness tell you how likely it still is." | Every lead detail page, adjacent to the confidence-score breakdown (`lib/scoring.ts` output). |
| User-content attribution | "Photos and receipts are submitted by community members as proof of their own in-store finds. Any store signage, price tags, or brand names visible in them belong to their owners and appear only as factual evidence of what the shopper saw." | Wherever evidence images render (lead detail), and in the Terms of Service / content policy. Becomes load-bearing when Phase 1 real file upload replaces today's placeholder `Report.evidenceUrl`. |

## User-submitted photos containing retailer marks

Shelf-tag and receipt photos (`Report.evidenceType` = `SHELF_TAG_PHOTO`, `RECEIPT`) will
incidentally contain retailer logos, store signage, and brand trade dress. That is acceptable:
it is factual, user-generated evidence of a real-world observation — the mark appears because it
was physically there, which is the whole point of the proof.

The line PennyForge must not cross: **do not lift that UGC into PennyForge's own voice.**

- Never crop, enhance, or excerpt user photos into marketing materials, app store screenshots, ads,
  social posts, or landing pages such that a retailer's logo or trade dress becomes part of
  PennyForge's promotional imagery.
- In-product display of the full evidence photo, in context, attributed to the reporting user, is
  the intended and acceptable use.
- App-store screenshots should use seeded/realistic data and must not foreground retailer logos —
  this restates the rule already in `docs/app-store-checklist.md` §8.

## Product images (`Product.imageUrl`)

`Product.imageUrl` exists in `prisma/schema.prisma` but nothing enforces where those URLs point.
Before this field is displayed at scale:

- Product imagery must be **licensed stock, PennyForge-created, or user-submitted** — never
  hotlinked or copied from retailer product pages or CDNs. Hotlinking retailer imagery is both a
  copyright problem and a corollary of the no-scraping boundary in `CLAUDE.md`: if we would not
  scrape the page, we do not embed its assets either.
- Recommended guardrail for counsel + engineering: an allowlist of approved image hosts (own
  storage bucket, licensed stock CDN) validated at write time, mirroring the allowlist-not-denylist
  design of `lib/compliance.ts`. Flagged as an open engineering item; not built today.
- Manufacturer product-brand marks (the product's own packaging visible in a photo) are the same
  incidental-factual-use category as shelf-tag photos and are acceptable; retailer-watermarked
  studio imagery is not.

## For counsel

1. **Trademark clearance on "PennyForge" itself** — knockout search plus full clearance (USPTO,
   common-law, app stores, domains) before spending on brand. `docs/app-store-checklist.md` §3
   already flags possible App Store name collisions; this is the legal counterpart.
2. **DMCA designated agent** — register with the Copyright Office before UGC photo upload ships
   (Phase 1 per `docs/product-spec.md`), and stand up a takedown intake path. Required for the
   §512 safe harbor once users upload images.
3. **Terms of Service review** — the disclaimer inventory above needs a ToS home: warranty
   disclaimers, UGC license grant from users to PennyForge (display/moderation only — scoped
   narrowly enough that the "no marketing reuse" photo rule above stays true), and the store-
   discretion / no-entitlement-to-price language.
4. **Ad keyword policy** — whether and how retailer names may be used in paid search keywords
   (nominative bidding vs. affiliation-implying copy) needs a counsel-approved written policy
   before any paid acquisition.
5. **State price-advertising / deceptive-practices review** — PennyForge reports third-party
   observations rather than advertising its own prices, but counsel should confirm the disclaimer
   language is sufficient under FTC and state UDAP standards for a US launch.
