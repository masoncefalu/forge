#!/usr/bin/env node
// Playwright driver for PennyForge. Drives the running dev server headlessly
// using the container's pre-installed Chromium — no browser download needed.
//
// Usage (from repo root, dev server already running on :3000):
//   node .claude/skills/run-pennyforge/driver.mjs smoke          # full core-loop flow + screenshots
//   node .claude/skills/run-pennyforge/driver.mjs ss / feed.png  # screenshot one page
//
// Env:
//   PF_BASE_URL   default http://localhost:3000
//   PF_SHOTS_DIR  default /tmp/pennyforge-shots
//   PF_CHROMIUM   default /opt/pw-browsers/chromium (Claude remote-env symlink)

import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.PF_BASE_URL ?? "http://localhost:3000";
const SHOTS = process.env.PF_SHOTS_DIR ?? "/tmp/pennyforge-shots";
const EXE = process.env.PF_CHROMIUM ?? "/opt/pw-browsers/chromium";

async function withPage(fn) {
  mkdirSync(SHOTS, { recursive: true });
  // --no-sandbox: containers run as root; Chromium refuses to sandbox there.
  const browser = await chromium.launch({
    executablePath: EXE,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await fn(page);
  } finally {
    await browser.close();
  }
}

async function shot(page, name) {
  const path = join(SHOTS, name);
  await page.screenshot({ path, fullPage: true });
  console.log(`  📸 ${path}`);
}

async function smoke() {
  let failures = 0;
  const check = (ok, label) => {
    console.log(`${ok ? "✅" : "❌"} ${label}`);
    if (!ok) failures++;
  };

  await withPage(async (page) => {
    // 1. Feed renders with seeded leads
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const leadLinks = page.locator('a[href^="/leads/"]');
    const leadCount = await leadLinks.count();
    check(leadCount > 0, `feed shows ${leadCount} lead cards`);
    await shot(page, "01-feed.png");

    // 2. Switch mock-auth user via the header select (sets pf_user_id cookie)
    const switcher = page.locator("header select");
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/user")),
      switcher.selectOption({ label: "@rey_resells (user)" }),
    ]);
    await page.waitForLoadState("networkidle");
    check(true, "switched acting user to @rey_resells");

    // 3. Vote CONFIRMED on the first lead not authored by us
    //    (the API rejects votes on your own report — skip those cards).
    let voted = false;
    for (let i = 0; i < Math.min(leadCount, 5) && !voted; i++) {
      await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
      const card = page.locator('a[href^="/leads/"]').nth(i);
      if ((await card.innerText()).includes("@rey_resells")) continue;
      await card.click();
      await page.waitForURL("**/leads/**");
      // The page's static copy contains the word "vote", so match on the API
      // response rather than loose text.
      const [resp] = await Promise.all([
        page.waitForResponse((r) => r.url().includes("/vote")),
        page.getByRole("button", { name: "✓ Still there" }).click(),
      ]);
      if (!resp.ok()) continue; // e.g. 403 "can't vote on your own report"
      const msg = page.locator("text=/^Recorded/").first();
      await msg.waitFor({ timeout: 10_000 });
      voted = true;
      check(true, `confirm vote registered: "${await msg.innerText()}"`);
      await shot(page, "02-lead-vote.png");
    }
    check(voted, "vote flow completed");

    // 4. Submit a report for a NEW product (unique name → idempotent reruns;
    //    same-day duplicates on existing products are rejected by design).
    const widget = `Driver Widget ${Date.now()}`;
    await page.goto(`${BASE}/report/new`, { waitUntil: "networkidle" });
    await page.getByText("New product", { exact: true }).click();
    await page.locator('input[name="newName"]').fill(widget);
    await page.locator('textarea[name="notes"]').fill("submitted by driver.mjs smoke");
    await page.getByRole("button", { name: "Submit report" }).click();
    const ok = page.locator("text=Report submitted");
    await ok.waitFor({ timeout: 10_000 });
    check(true, `report accepted: "${await ok.innerText()}"`);
    await shot(page, "03-report-submitted.png");

    // 5. Compliance guardrail: a blocked source type must be rejected
    await page.goto(`${BASE}/report/new`, { waitUntil: "networkidle" });
    await page.getByText("New product", { exact: true }).click();
    await page.locator('input[name="newName"]').fill(`${widget} blocked`);
    await page.locator('select[name="sourceType"]').selectOption("SCRAPED_SITE");
    await page.getByRole("button", { name: "Submit report" }).click();
    const rejected = page.locator('text=Blocked source type');
    await rejected.waitFor({ timeout: 10_000 });
    check(true, "compliance guardrail rejected SCRAPED_SITE source");
    await shot(page, "04-compliance-blocked.png");

    // 6. New report is visible on the feed (PENDING badge)
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    check(await page.locator(`text=${widget}`).first().isVisible(), "new report visible in feed");
    await shot(page, "05-feed-after.png");
  });

  console.log(failures === 0 ? "\nSMOKE PASSED" : `\nSMOKE FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

async function ss(path = "/", name = "page.png") {
  await withPage(async (page) => {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await shot(page, name);
  });
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === "smoke") await smoke();
else if (cmd === "ss") await ss(...rest);
else {
  console.error("usage: driver.mjs smoke | ss <path> [name.png]");
  process.exit(2);
}
