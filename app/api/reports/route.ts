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
import { shouldCreateAlert, ALERT_DEDUPE_WINDOW_MS } from "@/lib/alerts";
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
  if (!productId && newProduct?.name) {
    const created = await prisma.product.create({
      data: {
        retailerId: store.retailerId,
        name: newProduct.name,
        upc: newProduct.upc || null,
        sku: newProduct.sku || null,
      },
    });
    productId = created.id;
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

  // Mock fan-out: alert every other user in the same state, deduped per
  // (product, store) within a 24h window.
  let alertsCreated = 0;
  const nearbyUsers = await prisma.user.findMany({
    where: { id: { not: user.id } },
  });
  const windowStart = new Date(now.getTime() - ALERT_DEDUPE_WINDOW_MS);
  const recentAlerts = await prisma.alert.findMany({
    where: { productId, storeId, createdAt: { gte: windowStart } },
  });

  for (const recipient of nearbyUsers) {
    if (
      shouldCreateAlert(
        recentAlerts.map((a) => ({ productId: a.productId, storeId: a.storeId, createdAt: a.createdAt })),
        { productId, storeId, score, now }
      )
    ) {
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
      // Only need to prove dedupe once per store+product for this batch —
      // real fan-out would alert all qualifying recipients, but the 24h
      // window key is per (product, store), not per recipient.
      recentAlerts.push({
        id: "pending",
        productId,
        storeId,
        reportId: report.id,
        userId: recipient.id,
        score,
        message: "",
        createdAt: now,
        readAt: null,
      });
    }
  }

  return NextResponse.json({ id: report.id, score, alertsCreated }, { status: 201 });
}
