# PennyForge — Location Privacy & Fuzzing Plan

> **Not legal advice.** This is a practical risk framework and set of product guardrails, written
> for counsel to review before launch.

This document extends the "Privacy constraints" section of `docs/compliance.md`, which already
commits to location fuzzing before any contributor position is ever shown to another user. Nothing
here weakens that commitment; this file turns it into concrete, implementable requirements.

Data-minimization is the design stance: PennyForge collects the least location data that makes the
product work, uses it for exactly one purpose, and never turns it into a trail.

## Current state (MVP)

| Data | Where it lives | How it's used | Who can see it |
|---|---|---|---|
| Home ZIP | `User.homeZip` | Feed/alert region filtering by user choice | The user themselves only |
| Home coordinates | `User.homeLat` / `User.homeLng` | Server-side route-planner distance math only (`lib/geo.ts#haversineMiles` → `lib/route.ts`) | Never rendered to any other user |
| Store coordinates | `Store.lat` / `Store.lng` | Feed, route planner, store pages | Public — these are public business addresses, not personal data |
| Device GPS | Not collected | — | — |

Key facts about the MVP:

- Home location is **user-entered**, not sensed. There is no device GPS collection, no geolocation
  browser API call, and no background location of any kind in this repo today.
- `User.homeLat`/`homeLng` are consumed exclusively server-side: `lib/geo.ts` computes a one-way
  distance from the user's home point to each candidate store, and `lib/route.ts` folds that
  distance into the route score. The coordinates themselves never leave the server in any response
  rendered to another user.
- `RoutePlan.stopsJson` stores per-store `distanceMiles` derived from the home point. Route plans
  are private to their owning user; treat `distanceMiles` as derived location data (a set of
  distances to known points can trilaterate a home) and never expose another user's route plan.
- Store coordinates are the only location data that appears in shared UI, and they describe
  retail businesses, not people.

## Standing rules (apply now and to every future phase)

| # | Rule |
|---|---|
| 1 | A contributor's home location (`homeZip`, `homeLat`, `homeLng`) is never rendered in any UI visible to another user. No exceptions, including leaderboards, profiles, and moderation views that other non-admin users can reach. |
| 2 | Reports are attributed to a **store**, never to a user's position. The location on a lead is always `Store.lat`/`Store.lng` — a public business address. |
| 3 | No "users near you", "contributors nearby", or any feature that reveals proximity between two users. |
| 4 | No location history or timeline feature, ever. PennyForge stores at most one current home point per user, not a sequence of positions. |
| 5 | Alerts and the feed filter by **user-chosen** state/ZIP, not by tracked or inferred position. |
| 6 | Any new feature that would render a contributor-linked point on a map must implement the fuzzing requirements below before shipping — this is a launch blocker, not a fast-follow. |

## Fuzzing requirements for future features

If a contributor-activity map (or any per-contributor geographic display) ships in a later phase,
it must implement **all** of the following. These are written as requirements a developer can
build against and a reviewer can test against.

| Requirement | Specification |
|---|---|
| Aggregate, don't plot | Aggregate contributor activity to ZIP-centroid or coarser (county, metro). Never render a point derived from `homeLat`/`homeLng` directly. |
| Jitter any per-user point | If a per-user point must render at all, apply random jitter with a 500m–1km radius **before** render, generated server-side, stable per (user, region) so repeated loads don't let a viewer average the jitter away. |
| k-anonymity floor | Never render a region (ZIP, hex cell, cluster) with fewer than **k = 5** distinct contributors. Below the floor, roll the region up into its parent region or omit it. |
| Time-bucketing | Bucket displayed activity to **day** granularity, never real-time. A map must not be able to place a person in a store at a specific moment. |
| Relative freshness in public UI | The report timestamp itself is a location signal — `Report.createdAt` says "user X was at store Y at time T." Public surfaces should display relative freshness ("today", "2d ago") instead of exact timestamps. Exact timestamps stay server-side and in admin/moderation views. |
| Server-side only | All fuzzing happens server-side. Never send raw coordinates to the client and fuzz in the browser — the raw value in the payload is the leak. |

## Device GPS (future phases only)

The MVP collects no device location. If a later phase adds it (e.g. "sort stores by how close I am
right now"), it must ship under these constraints:

- **Opt-in only.** No location permission prompt on first launch; the prompt appears only when the
  user invokes the feature that needs it, with a plain-language explanation of why.
- **Coarse by default.** Request reduced-accuracy location where the platform supports it; precise
  accuracy only if the user explicitly upgrades it.
- **Purpose-limited.** Used for store proximity sorting and nothing else. Not for analytics, not
  for ad targeting, not for inferring home/work.
- **Never stored as a trail.** Use the fix, discard it. At most, a single "last coarse position"
  may be held in memory for the session; no positions are written to the database.
- **Permission strings must match reality.** The OS permission rationale, the privacy-label
  ("nutrition label") declarations, and actual behavior must all say the same thing — see
  `docs/compliance/app-store-risk.md` for the app-store review requirements this feeds into.

## Deletion

Home location (`homeZip`, `homeLat`, `homeLng`) is cleared **immediately** on account deletion —
it does not enter any soft-delete grace period, backup-retention carve-out, or anonymized archive.
Derived values that could reconstruct it (per-store `distanceMiles` inside the user's
`RoutePlan.stopsJson` rows) are deleted with the user's route plans at the same time. Full
retention and deletion timelines for all data classes live in
`docs/compliance/data-retention.md`.
