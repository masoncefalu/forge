# PennyForge UX Packet

MVP user-experience packet for PennyForge's first local vertical slice — screen specs, user
flows, navigation, a component library, and mobile/admin notes. Produced by Agent 6 (UX and
Frontend Flow) as documentation grounded in the actual built codebase (`app/`, `components/`,
`lib/`, `prisma/schema.prisma`) as of this writing, not a speculative redesign.

This is documentation only — no application code changed as part of this packet.

## How to read this packet

Start with **[ux-packet.md](./ux-packet.md)** — the compressed version of everything below,
written for a downstream implementation agent who needs the whole picture without reading eight
full documents. Come back to the individual files for implementation-level detail (exact prop
shapes, field-by-field time budgets, Tailwind classes, error-state tables).

## Contents

| Doc | Deliverable(s) | Covers |
|---|---|---|
| [screen-map-and-flows.md](./screen-map-and-flows.md) | 1, 2, 4 | Full 12(+1)-screen map with build status, 6 core user flows, suggested mobile bottom-tab-bar navigation |
| [screens-discovery.md](./screens-discovery.md) | screen specs | Home/dashboard, local feed, store selector |
| [screens-search-and-lead.md](./screens-search-and-lead.md) | screen specs | UPC/SKU search, lead detail (the score-breakdown trust centerpiece) |
| [screens-reporting-and-voting.md](./screens-reporting-and-voting.md) | screen specs | Submit report (the <30s flow), confirm/dead vote UI |
| [screens-alerts-and-routing.md](./screens-alerts-and-routing.md) | screen specs | Alerts inbox, route planner |
| [screens-admin-and-compliance.md](./screens-admin-and-compliance.md) | screen specs, 6 | Admin moderation queue, compliance/about page, admin UX notes |
| [screens-settings-and-mobile.md](./screens-settings-and-mobile.md) | screen specs, 5 | Settings/profile, mobile-first layout notes (breakpoints, touch targets, offline-ready patterns) |
| [component-library.md](./component-library.md) | 3 | Existing component inventory + proposed shared components + design tokens |
| [ux-packet.md](./ux-packet.md) | 7 | Compressed synthesis of all of the above |

## Screen status at a glance

| # | Screen | Status | Route |
|---|---|---|---|
| 1 | Home / Dashboard | Built (merged with Feed) | `/` |
| 2 | Local feed | Built | `/` |
| 3 | Store selector | Net-new | `/stores` (proposed) |
| 4 | UPC / SKU search | Built | `/search` |
| 5 | Lead detail | Built | `/leads/[id]` |
| 6 | Submit report | Built | `/report/new` |
| 7 | Confirm / dead vote UI | Built, embedded only (no standalone route) | embedded in `/leads/[id]` |
| 8 | Alerts | Built (mock inbox) | `/alerts` |
| 9 | Route planner | Built (single-store) | `/route` |
| 10 | Admin moderation | Built | `/admin` |
| 11 | Compliance / About | Net-new | `/trust` (proposed) |
| 12 | Settings / Profile | Net-new | `/settings` (proposed) |
| 13 | Leaderboard *(bonus, outside the original 12)* | Built | `/leaderboard` |

## Route naming note

The Compliance/About screen's canonical route is **`/trust`** — `screens-admin-and-compliance.md`,
which did the full page design, deliberately picked it over the more legalistic-sounding
`/compliance` or `/about`, reasoning that a positive, non-legalistic URL/nav-label matters for a
page whose whole point is to read as an invitation to verify, not a terms-of-service page. All
route references across the packet use `/trust` consistently.

## Ground rules every doc in this packet follows

- Every screen is explicitly tagged **MVP (built)**, **MVP (net-new, to build)**, or **Future
  (post-MVP)** — nothing here blurs what exists today with what's proposed.
- Every proposal stays inside `CLAUDE.md`'s hard boundaries: no scraping, no private/undocumented
  endpoints, no competitor data ingestion, no reverse engineering, no automated checkout,
  allowlist-not-denylist for sources, first-hand in-store reports only.
- Net-new schema is called out explicitly and kept minimal — e.g. `User.deletedAt` for account
  deletion (`screens-settings-and-mobile.md`) is the only schema addition proposed anywhere in
  this packet.
- No proposal here required editing application code; this packet is pure documentation output.
