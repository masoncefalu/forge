// POST /api/reports — submit a find.
//
// Order of operations matters for correctness:
// 1. Compliance guardrail (source type, price sanity, evidence URL) — reject
//    unsafe submissions before touching the DB at all.
// 2. Resolve/create the product (existing or user-typed new product).
// 3. Insert the report with reportDate = UTC midnight of now. The DB's
//    composite unique (productId, storeId, userId, reportDate) is the source
//    of truth for same-day duplicate prevention; P2002 is caught and turned
//    into a friendly 409.
// 4. Score the fresh report and fan out mock alerts (deduped) if it clears
//    the threshold.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/currentUser";
import { validateReportInput, ComplianceError } from "@/lib/compliance";
import { toReportDate, isUniqueViolation } from "@/lib/reports";
import { confidenceScore } from "@/lib/scoring";
import { shouldCreateAlert, pickNearbyRecipients, ALERT_DEDUPE_WINDOW_MS } from "@/lib/alerts";
import { DEAL_TYPES, EVIDENCE_TYPES } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No current user" }, { status: 401 });

  const body = await req.json();
  const {
    storeId,
    productId: existingProductId,
    newProduct,
    priceCents,
    dealType,
    evidenceType,
    evidenceUrl,
    sourceType,
    notes,
  } = body;

  if (!storeId) return NextResponse.json({ error: "storeId is required" }, { status: 400 });
  if (!DEAL_TYPES.includes(dealType)) {
    return NextResponse.json({ error: `dealType must be one of ${DEAL_TYPES.join(", ")}` }, { status: 400 });
  }
  if (!EVIDENCE_TYPES.includes(evidenceType)) {
    return NextResponse.json({ error: `evidenceType must be one of ${EVIDENCE_TYPES.join(", ")}` }, { status: 400 });
  }

  try {
    validateReportInput({ priceCents, sourceType, evidenceUrl });
  } catch (err) {
    if (err instanceof ComplianceError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return NextResponse.json({ error: "Unknown store" }, { status: 404 });

  let productId = existingProductId as string | undefined;
  if (productId) {
    // Trust boundary: the client supplies a raw productId, so it must be
    // verified to exist and to belong to the same retailer as the chosen
    // store — otherwise a forged request can create a report referencing a
    // mismatched or nonexistent product, corrupting search/feed/alerts.
    const existing = await prisma.product.findUnique({ where: { id: productId } });
    if (!existing) {
      return NextResponse.json({ error: "Unknown product" }, { status: 404 });
    }
    if (existing.retailerId !== store.retailerId) {
      return NextResponse.json(
        { error: "Product does not belong to this store's retailer" },
        { status: 400 }
      );
    }
  } else if (newProduct?.name) {
    const name = String(newProduct.name).trim();
    const upc = newProduct.upc ? String(newProduct.upc).trim() : null;
    const sku = newProduct.sku ? String(newProduct.sku).trim() : null;

    // Resolve to an existing product for this retailer before creating a
    // new row. Same-day duplicate prevention is keyed by productId, so
    // always minting a fresh Product for "new product" would let the same
    // real-world item (matched by UPC, SKU, or name) bypass that guard and
    // spam duplicate leads/alerts.
    const existingMatch = await prisma.product.findFirst({
      where: {
        retailerId: store.retailerId,
        OR: [...(upc ? [{ upc }] : []), ...(sku ? [{ sku }] : []), { name }],
      },
    });

    productId = existingMatch
      ? existingMatch.id
      : (await prisma.product.create({ data: { retailerId: store.retailerId, name, upc, sku } })).id;
  }
  if (!productId) {
    return NextResponse.json({ error: "productId or newProduct.name is required" }, { status: 400 });
  }

  const now = new Date();
  const reportDate = toReportDate(now);

  let report;
  try {
    report = await prisma.report.create({
      data: {
        productId,
        storeId,
        userId: user.id,
        priceCents,
        dealType,
        evidenceType,
        evidenceUrl: evidenceUrl || null,
        sourceType,
        notes: notes || null,
        reportDate,
        status: "PENDING",
      },
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: "You already reported this product at this store today. Confirm the existing lead instead." },
        { status: 409 }
      );
    }
    throw err;
  }

  const score = confidenceScore({
    evidenceType,
    reporterTrust: user.trustScore,
    confirms: 0,
    deads: 0,
    ageDays: 0,
    dealType,
  });

  // Mock fan-out: alert users within ALERT_RADIUS_MILES of the store
  // (excluding the reporter, and skipping anyone without known home
  // coordinates). Dedupe is per RECIPIENT: each user gets at most one alert
  // for this (product, store) pair per 24h window, regardless of how many
  // reports land on it — but every qualifying recipient still gets alerted.
  let alertsCreated = 0;
  const allUsers = await prisma.user.findMany();
  const recipients = pickNearbyRecipients(allUsers, user.id, store);

  const windowStart = new Date(now.getTime() - ALERT_DEDUPE_WINDOW_MS);
  const recentAlerts = await prisma.alert.findMany({
    where: { productId, storeId, createdAt: { gte: windowStart } },
  });

  for (const recipient of recipients) {
    const recipientAlerts = recentAlerts
      .filter((a) => a.userId === recipient.id)
      .map((a) => ({ productId: a.productId, storeId: a.storeId, createdAt: a.createdAt }));

    if (shouldCreateAlert(recipientAlerts, { productId, storeId, score, now })) {
      await prisma.alert.create({
        data: {
          productId,
          storeId,
          reportId: report.id,
          userId: recipient.id,
          score,
          message: `New lead: ${newProduct?.name ?? "a product"} at ${store.name} scored ${score}.`,
        },
      });
      alertsCreated++;
    }
  }

  return NextResponse.json({ id: report.id, score, alertsCreated }, { status: 201 });
}
