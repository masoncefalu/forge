// QA simulation harness — exercises the 8 core MVP behaviors end-to-end
// against the real lib/ functions (no DB) and prints expected-vs-actual
// results. Exits non-zero on any failure so it can gate CI.
//
// Run with:  npx tsx scripts/qa-simulation.ts

import {
  confidenceScore,
  scoreBreakdown,
  isSuppressed,
  EVIDENCE_BASE,
  ALERT_THRESHOLD,
} from "../lib/scoring";
import { toReportDate, makeDupKey } from "../lib/reports";
import { shouldCreateAlert, pickNearbyRecipients } from "../lib/alerts";
import { rankStores } from "../lib/route";
import { assertSafeSource, ALLOWED_SOURCE_TYPES, BLOCKED_SOURCE_TYPES } from "../lib/compliance";
import type { EvidenceType } from "../lib/constants";

let failures = 0;

/**
 * Structural equality, independent of object key order (JSON.stringify is
 * order-sensitive and produces false failures for semantically-equal
 * objects). Handles primitives, arrays, and plain objects — sufficient for
 * this script's fixture shapes, no library needed.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }

  const aKeys = Object.keys(a as Record<string, unknown>);
  const bKeys = Object.keys(b as Record<string, unknown>);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(
    (k) =>
      Object.prototype.hasOwnProperty.call(b, k) &&
      deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])
  );
}

function check(name: string, actual: unknown, expected: unknown) {
  const pass = deepEqual(actual, expected);
  if (!pass) failures++;
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}`);
  if (!pass) console.log(`        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function checkTrue(name: string, cond: boolean) {
  check(name, cond, true);
}
function section(title: string) {
  console.log(`\n== ${title} ==`);
}

// 1. Confidence scoring — component math on a canonical lead.
section("1. Confidence scoring");
{
  const b = scoreBreakdown({ evidenceType: "RECEIPT", reporterTrust: 72, confirms: 2, deads: 0, ageDays: 0 });
  check("receipt base = 45", b.base, 45);
  check("trust 72 -> bonus 11 (round(72% of 15))", b.trustBonus, 11);
  check("2 confirms -> +24", b.confirmBonus, 24);
  check("fresh lead decay factor = 1", b.decayFactor, 1);
  check("final = 45+11+24 = 80", b.final, 80);
  // Max achievable fresh score is 45 + 15 + 36 = 96 — the 0..100 clamp is
  // defensive headroom, never reached upward with current constants.
  check("best possible fresh lead scores 96", confidenceScore({ evidenceType: "RECEIPT", reporterTrust: 100, confirms: 10 }), 96);
  check("score floors at 0", confidenceScore({ evidenceType: "TEXT_ONLY", deads: 10 }), 0);
}

// 2. Evidence weighting — receipt > shelf tag > product photo > text-only.
section("2. Evidence weighting");
{
  const at = (e: EvidenceType) => confidenceScore({ evidenceType: e, reporterTrust: 50 });
  const [receipt, shelf, photo, text] = (["RECEIPT", "SHELF_TAG_PHOTO", "PRODUCT_PHOTO", "TEXT_ONLY"] as const).map(at);
  console.log(`  scores: receipt=${receipt} shelfTag=${shelf} productPhoto=${photo} textOnly=${text}`);
  checkTrue("strict ordering receipt > shelfTag > productPhoto > textOnly",
    receipt > shelf && shelf > photo && photo > text);
  // KNOWN PRODUCT GAP: alerts are scored at submission time (0 confirms,
  // 0 age), so the alert score is just base + trustBonus. A RECEIPT report's
  // score is 45 + round(trust/100 * 15); clearing ALERT_THRESHOLD (60) needs
  // trustBonus >= 15, which needs reporterTrust >= 97 (96 rounds the bonus
  // down to 14 -> score 59; 97 rounds it up to 15 -> score 60). No seeded
  // user (max trust 90, forge_admin) can fire an alert on submission.
  // Flagged in docs/qa-packet.md; threshold/base tuning is a product
  // decision.
  checkTrue("receipt at trust 50 (schema @default(50)) does NOT clear alert threshold (documented gap)", receipt < ALERT_THRESHOLD);
  check("receipt at trust 96 scores 59 and does NOT clear alert threshold (boundary, below)",
    confidenceScore({ evidenceType: "RECEIPT", reporterTrust: 96 }), 59);
  check("receipt at trust 97 scores 60 and clears alert threshold (boundary, at)",
    confidenceScore({ evidenceType: "RECEIPT", reporterTrust: 97 }), 60);
  checkTrue("text-only at trust 50 (schema @default(50)) does NOT clear alert threshold", text < ALERT_THRESHOLD);
  check("bases match documented hierarchy", EVIDENCE_BASE, { RECEIPT: 45, SHELF_TAG_PHOTO: 32, PRODUCT_PHOTO: 22, TEXT_ONLY: 10 });
}

// 3. Duplicate same-day report prevention — key stability across a day.
section("3. Duplicate same-day report prevention");
{
  const morning = makeDupKey("p1", "s1", "u1", toReportDate(new Date("2026-07-09T00:00:01Z")));
  const night = makeDupKey("p1", "s1", "u1", toReportDate(new Date("2026-07-09T23:59:59Z")));
  const nextDay = makeDupKey("p1", "s1", "u1", toReportDate(new Date("2026-07-10T00:00:01Z")));
  const otherUser = makeDupKey("p1", "s1", "u2", toReportDate(new Date("2026-07-09T12:00:00Z")));
  check("same user/product/store/day collides (blocked)", morning, night);
  checkTrue("next UTC day is a fresh key (allowed)", morning !== nextDay);
  checkTrue("different user same day is a fresh key (allowed)", morning !== otherUser);
}

// 4. Stale lead decay — half-life curves per deal type.
section("4. Stale lead decay");
{
  const penny = (age: number) => confidenceScore({ evidenceType: "RECEIPT", ageDays: age, dealType: "PENNY" });
  const clearance = (age: number) => confidenceScore({ evidenceType: "RECEIPT", ageDays: age, dealType: "CLEARANCE" });
  console.log(`  penny curve:     d0=${penny(0)} d7=${penny(7)} d14=${penny(14)} d30=${penny(30)}`);
  console.log(`  clearance curve: d0=${clearance(0)} d14=${clearance(14)} d28=${clearance(28)}`);
  checkTrue("penny lead halves by day 7 (±1 rounding)", Math.abs(penny(7) - Math.round(penny(0) / 2)) <= 1);
  checkTrue("penny lead near zero by day 30", penny(30) < 10);
  checkTrue("clearance decays slower than penny at day 14", clearance(14) > penny(14));
  const refreshed = confidenceScore({ evidenceType: "RECEIPT", ageDays: 14, confirms: 1, lastConfirmAgeDays: 1 });
  checkTrue("day-1 confirm rescues a day-14 lead", refreshed > penny(14));
}

// 5. Dead-vote suppression — the vote sequence a lead lives through.
section("5. Dead-vote suppression");
{
  checkTrue("1 dead: penalized but visible", !isSuppressed({ confirms: 0, deads: 1 }));
  checkTrue("2 deads, 0 confirms: suppressed", isSuppressed({ confirms: 0, deads: 2 }));
  checkTrue("2 deads, 2 confirms: visible (tie is not suppression)", !isSuppressed({ confirms: 2, deads: 2 }));
  checkTrue("3 deads, 1 confirm: suppressed", isSuppressed({ confirms: 1, deads: 3 }));
  checkTrue("recovery: a 3rd confirm on 2-dead lead un-suppresses", !isSuppressed({ confirms: 3, deads: 2 }));
  const clean = confidenceScore({ evidenceType: "RECEIPT" });
  const dead1 = confidenceScore({ evidenceType: "RECEIPT", deads: 1 });
  check("one dead vote costs exactly 18 points pre-decay", clean - dead1, 18);
}

// 6. Alert dedupe — one alert per recipient per (product, store) per 24h.
section("6. Alert dedupe");
{
  const t0 = new Date("2026-07-09T08:00:00Z");
  const plus1h = new Date(t0.getTime() + 3600_000);
  const plus25h = new Date(t0.getTime() + 25 * 3600_000);
  checkTrue("below threshold never alerts", !shouldCreateAlert([], { productId: "p", storeId: "s", score: ALERT_THRESHOLD - 1, now: t0 }));
  checkTrue("first qualifying alert fires", shouldCreateAlert([], { productId: "p", storeId: "s", score: 80, now: t0 }));
  const existing = [{ productId: "p", storeId: "s", createdAt: t0 }];
  checkTrue("second report 1h later is deduped", !shouldCreateAlert(existing, { productId: "p", storeId: "s", score: 90, now: plus1h }));
  checkTrue("re-alert allowed after 24h window", shouldCreateAlert(existing, { productId: "p", storeId: "s", score: 90, now: plus25h }));
  checkTrue("different store is NOT deduped", shouldCreateAlert(existing, { productId: "p", storeId: "s2", score: 90, now: plus1h }));
  const store = { lat: 33.7726, lng: -84.3663 };
  const users = [
    { id: "reporter", homeLat: 33.77, homeLng: -84.36 },
    { id: "nearby", homeLat: 33.75, homeLng: -84.39 },
    { id: "faraway", homeLat: 40.71, homeLng: -74.0 },
    { id: "nocoords", homeLat: null, homeLng: null },
  ];
  check("fan-out picks only the nearby non-reporter",
    pickNearbyRecipients(users, "reporter", store).map((u) => u.id), ["nearby"]);
}

// 7. Route ranking — ROI = expected value minus round-trip gas.
section("7. Route ranking");
{
  const ranked = rankStores([
    { storeId: "close-small", storeName: "Close, small haul", distanceMiles: 3, leads: [{ estValue: 40, confidence: 85, suppressed: false }] },
    { storeId: "far-big", storeName: "Far, big haul", distanceMiles: 40, leads: [{ estValue: 300, confidence: 70, suppressed: false }] },
    { storeId: "suppressed-only", storeName: "Only dead leads", distanceMiles: 1, leads: [{ estValue: 500, confidence: 95, suppressed: true }] },
    { storeId: "not-worth-gas", storeName: "Gas exceeds value", distanceMiles: 60, leads: [{ estValue: 10, confidence: 50, suppressed: false }] },
  ]);
  console.log(`  ranking: ${ranked.map((s) => `${s.storeId}(score=${s.routeScore})`).join(" > ")}`);
  check("far store with big expected haul ranks first", ranked[0]?.storeId, "far-big");
  check("only positive-ROI stores survive", ranked.map((s) => s.storeId), ["far-big", "close-small"]);
  check("suppressed-only store contributes zero and is excluded",
    ranked.some((s) => s.storeId === "suppressed-only"), false);
  const far = ranked[0];
  check("far-big math: 300×0.70 − 40×2×0.15 = 198", far?.routeScore, 198);
}

// 8. Unsafe source blocking — allowlist semantics.
section("8. Unsafe source blocking");
{
  const throws = (s: string) => { try { assertSafeSource(s); return false; } catch { return true; } };
  check("all allowed sources pass", ALLOWED_SOURCE_TYPES.filter((s) => throws(s)), []);
  check("all blocked sources throw", BLOCKED_SOURCE_TYPES.filter((s) => !throws(s)), []);
  checkTrue("unknown source rejected by default (allowlist, not denylist)", throws("TIKTOK_SCREENSHOT"));
  checkTrue("empty source rejected", throws(""));
  checkTrue("case-mismatched source rejected", throws("receipt_purchase"));
}

console.log(`\n${failures === 0 ? "✅ all simulations passed" : `❌ ${failures} simulation check(s) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
