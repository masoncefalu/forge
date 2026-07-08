// Demo seed data: 5 users, 4 retailers, 8 stores, 12 products, 10 reports
// with realistic vote/alert patterns (high-confidence, pending, suppressed,
// and stale-decayed leads) so every MVP screen has something to show.

import { PrismaClient } from "@prisma/client";
import { toReportDate } from "../lib/reports";

const prisma = new PrismaClient();

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 3600 * 1000);

async function main() {
  // Wipe in FK-safe order (idempotent reseeding).
  await prisma.alert.deleteMany();
  await prisma.reportVote.deleteMany();
  await prisma.routePlan.deleteMany();
  await prisma.report.deleteMany();
  await prisma.product.deleteMany();
  await prisma.store.deleteMany();
  await prisma.retailer.deleteMany();
  await prisma.user.deleteMany();

  // ---------- users ----------
  const casey = await prisma.user.create({
    data: {
      email: "casey@example.com", handle: "casey_hunts", role: "USER", trustScore: 55,
      homeZip: "30308", homeLat: 33.7815, homeLng: -84.3865, locale: "en",
    },
  });
  const rey = await prisma.user.create({
    data: {
      email: "rey@example.com", handle: "rey_resells", role: "USER", trustScore: 72,
      homeZip: "30035", homeLat: 33.7554, homeLng: -84.2453, locale: "en",
    },
  });
  const lena = await prisma.user.create({
    data: {
      email: "lena@example.com", handle: "lena_finds", role: "USER", trustScore: 40,
      homeZip: "30080", homeLat: 33.8839, homeLng: -84.5144, locale: "es",
    },
  });
  const captain = await prisma.user.create({
    data: {
      email: "captain@example.com", handle: "atl_captain", role: "CAPTAIN", trustScore: 85,
      homeZip: "30060", homeLat: 33.9526, homeLng: -84.5499, locale: "en",
    },
  });
  const admin = await prisma.user.create({
    data: {
      email: "admin@pennyforge.dev", handle: "forge_admin", role: "ADMIN", trustScore: 90,
      homeZip: "30301", homeLat: 33.749, homeLng: -84.388, locale: "en",
    },
  });

  // ---------- retailers ----------
  const hd = await prisma.retailer.create({ data: { name: "Home Depot", slug: "home-depot" } });
  const lowes = await prisma.retailer.create({ data: { name: "Lowe's", slug: "lowes" } });
  const dg = await prisma.retailer.create({ data: { name: "Dollar General", slug: "dollar-general" } });
  const wm = await prisma.retailer.create({ data: { name: "Walmart", slug: "walmart" } });

  // ---------- stores ----------
  const hdMidtown = await prisma.store.create({
    data: { retailerId: hd.id, name: "HD Midtown Atlanta", storeNumber: "0121", address: "650 Ponce De Leon Ave NE", city: "Atlanta", state: "GA", zip: "30308", lat: 33.7726, lng: -84.3663 },
  });
  const hdCumberland = await prisma.store.create({
    data: { retailerId: hd.id, name: "HD Cumberland", storeNumber: "0135", address: "2450 Cumberland Pkwy SE", city: "Smyrna", state: "GA", zip: "30339", lat: 33.8841, lng: -84.4694 },
  });
  const lowesEdgewood = await prisma.store.create({
    data: { retailerId: lowes.id, name: "Lowe's Edgewood", storeNumber: "1082", address: "1280 Caroline St NE", city: "Atlanta", state: "GA", zip: "30307", lat: 33.7566, lng: -84.3441 },
  });
  const dgEastAtl = await prisma.store.create({
    data: { retailerId: dg.id, name: "DG East Atlanta", storeNumber: "07421", address: "1240 Moreland Ave SE", city: "Atlanta", state: "GA", zip: "30316", lat: 33.7205, lng: -84.3494 },
  });
  const dgMarietta = await prisma.store.create({
    data: { retailerId: dg.id, name: "DG Marietta", storeNumber: "09112", address: "1355 Roswell Rd", city: "Marietta", state: "GA", zip: "30062", lat: 33.9629, lng: -84.5182 },
  });
  const wmDecatur = await prisma.store.create({
    data: { retailerId: wm.id, name: "Walmart Supercenter Decatur", storeNumber: "2733", address: "3580 Memorial Dr", city: "Decatur", state: "GA", zip: "30032", lat: 33.7638, lng: -84.2634 },
  });
  const hdJax = await prisma.store.create({
    data: { retailerId: hd.id, name: "HD Jacksonville Southside", storeNumber: "6317", address: "9021 Southside Blvd", city: "Jacksonville", state: "FL", zip: "32256", lat: 30.2436, lng: -81.5561 },
  });
  const lowesDallas = await prisma.store.create({
    data: { retailerId: lowes.id, name: "Lowe's NW Dallas", storeNumber: "0546", address: "11920 Inwood Rd", city: "Dallas", state: "TX", zip: "75244", lat: 32.9095, lng: -96.8256 },
  });

  // ---------- products ----------
  const screwdrivers = await prisma.product.create({
    data: { retailerId: hd.id, name: "Husky 10-Piece Screwdriver Set", upc: "192115000101", sku: "1001-483-392", category: "Tools", msrpCents: 1998 },
  });
  const ledBulbs = await prisma.product.create({
    data: { retailerId: hd.id, name: "EcoSmart LED Bulbs 4-Pack (60W)", upc: "192115000202", sku: "1002-114-556", category: "Lighting", msrpCents: 1297 },
  });
  const drill = await prisma.product.create({
    data: { retailerId: hd.id, name: "DEWALT 20V MAX Drill/Driver Kit", upc: "885911000303", sku: "1003-772-810", category: "Power Tools", msrpCents: 17900 },
  });
  const paint = await prisma.product.create({
    data: { retailerId: hd.id, name: "Behr Premium 1-Gal Interior Paint (mistint)", upc: "192115000404", sku: "1004-220-118", category: "Paint", msrpCents: 3298 },
  });
  const patioSet = await prisma.product.create({
    data: { retailerId: hd.id, name: "Hampton Bay 3-Piece Patio Bistro Set", upc: "192115000505", sku: "1005-663-021", category: "Outdoor", msrpCents: 24900 },
  });
  const smartPlug = await prisma.product.create({
    data: { retailerId: lowes.id, name: "Kasa Smart Wi-Fi Plug 2-Pack", upc: "840030700606", sku: "LW-30425", category: "Smart Home", msrpCents: 2498 },
  });
  const grill = await prisma.product.create({
    data: { retailerId: lowes.id, name: "Char-Broil 4-Burner Gas Grill", upc: "840030700707", sku: "LW-98811", category: "Outdoor", msrpCents: 29900 },
  });
  const candle = await prisma.product.create({
    data: { retailerId: dg.id, name: "trueliving Vanilla Candle 3oz", upc: "071722200808", sku: "DG-55201", category: "Home", msrpCents: 300 },
  });
  const toy = await prisma.product.create({
    data: { retailerId: dg.id, name: "Hot Wheels 5-Pack (seasonal)", upc: "071722200909", sku: "DG-88410", category: "Toys", msrpCents: 599 },
  });
  const holiday = await prisma.product.create({
    data: { retailerId: dg.id, name: "Holiday Gift Wrap 40 sq ft", upc: "071722201010", sku: "DG-11276", category: "Seasonal", msrpCents: 250 },
  });
  const tv = await prisma.product.create({
    data: { retailerId: wm.id, name: "onn. 50\" 4K Roku TV (open box)", upc: "681131301111", sku: "WM-445566", category: "Electronics", msrpCents: 24800 },
  });
  const airFryer = await prisma.product.create({
    data: { retailerId: wm.id, name: "Mainstays 4qt Air Fryer", upc: "681131301212", sku: "WM-778899", category: "Kitchen", msrpCents: 4400 },
  });
  void holiday; void airFryer; // seeded for search/browse; no reports yet

  // ---------- reports ----------
  const mkReport = (data: {
    productId: string; storeId: string; userId: string; priceCents: number;
    dealType: string; evidenceType: string; evidenceUrl?: string; sourceType: string;
    status: string; notes?: string; createdAt: Date;
  }) =>
    prisma.report.create({
      data: { ...data, reportDate: toReportDate(data.createdAt) },
    });

  // 1. High-confidence receipt-verified penny find (rey, 1 day old, 2 confirms)
  const r1 = await mkReport({
    productId: screwdrivers.id, storeId: hdMidtown.id, userId: rey.id,
    priceCents: 1, dealType: "PENNY", evidenceType: "RECEIPT",
    evidenceUrl: "https://placehold.co/receipt-r1.jpg", sourceType: "RECEIPT_PURCHASE",
    status: "APPROVED", notes: "Rang up 1¢ at self-checkout, 4 left on the clearance endcap.",
    createdAt: daysAgo(1),
  });
  // 2. Shelf-tag penny lead (casey, 2 days old, 1 confirm)
  const r2 = await mkReport({
    productId: ledBulbs.id, storeId: hdCumberland.id, userId: casey.id,
    priceCents: 1, dealType: "PENNY", evidenceType: "SHELF_TAG_PHOTO",
    evidenceUrl: "https://placehold.co/shelf-r2.jpg", sourceType: "SHELF_TAG",
    status: "APPROVED", notes: "Yellow tag scanned 1¢ on the app... err, on the aisle price checker.",
    createdAt: daysAgo(2),
  });
  // 3. Hidden clearance drill (captain, 3 days old, 1 confirm)
  const r3 = await mkReport({
    productId: drill.id, storeId: hdMidtown.id, userId: captain.id,
    priceCents: 3700, dealType: "CLEARANCE", evidenceType: "RECEIPT",
    evidenceUrl: "https://placehold.co/receipt-r3.jpg", sourceType: "RECEIPT_PURCHASE",
    status: "APPROVED", notes: "No shelf tag — rang up $37 from $179. Two more in overhead.",
    createdAt: daysAgo(3),
  });
  // 4. Fresh pending photo-only report (lena, today)
  const r4 = await mkReport({
    productId: candle.id, storeId: dgEastAtl.id, userId: lena.id,
    priceCents: 1, dealType: "PENNY", evidenceType: "PRODUCT_PHOTO",
    evidenceUrl: "https://placehold.co/photo-r4.jpg", sourceType: "IN_STORE_OBSERVATION",
    status: "PENDING", notes: "Full shelf of these, matched this week's penny list pattern.",
    createdAt: daysAgo(0),
  });
  // 5. Clearance smart plug (casey, 5 days old)
  const r5 = await mkReport({
    productId: smartPlug.id, storeId: lowesEdgewood.id, userId: casey.id,
    priceCents: 498, dealType: "CLEARANCE", evidenceType: "SHELF_TAG_PHOTO",
    evidenceUrl: "https://placehold.co/shelf-r5.jpg", sourceType: "SHELF_TAG",
    status: "APPROVED", createdAt: daysAgo(5),
  });
  // 6. Dead lead — 2 dead votes, suppressed (text-only, 6 days old)
  const r6 = await mkReport({
    productId: paint.id, storeId: hdMidtown.id, userId: lena.id,
    priceCents: 1, dealType: "PENNY", evidenceType: "TEXT_ONLY",
    sourceType: "IN_STORE_OBSERVATION",
    status: "SUPPRESSED", notes: "Heard mistint gallons were a penny.",
    createdAt: daysAgo(6),
  });
  // 7. Stale but real clearance (20 days old — shows decay)
  const r7 = await mkReport({
    productId: patioSet.id, storeId: hdJax.id, userId: rey.id,
    priceCents: 6200, dealType: "CLEARANCE", evidenceType: "RECEIPT",
    evidenceUrl: "https://placehold.co/receipt-r7.jpg", sourceType: "RECEIPT_PURCHASE",
    status: "APPROVED", createdAt: daysAgo(20),
  });
  // 8. Walmart open-box TV (rey, 1 day old, 1 confirm)
  const r8 = await mkReport({
    productId: tv.id, storeId: wmDecatur.id, userId: rey.id,
    priceCents: 9900, dealType: "CLEARANCE", evidenceType: "PRODUCT_PHOTO",
    evidenceUrl: "https://placehold.co/photo-r8.jpg", sourceType: "IN_STORE_OBSERVATION",
    status: "APPROVED", notes: "Open box, tested at customer service.",
    createdAt: daysAgo(1),
  });
  // 9. DG penny toys (captain, 1 day old)
  const r9 = await mkReport({
    productId: toy.id, storeId: dgMarietta.id, userId: captain.id,
    priceCents: 1, dealType: "PENNY", evidenceType: "SHELF_TAG_PHOTO",
    evidenceUrl: "https://placehold.co/shelf-r9.jpg", sourceType: "SHELF_TAG",
    status: "APPROVED", notes: "Seasonal aisle, manager was fine with it.",
    createdAt: daysAgo(1),
  });
  // 10. Out-of-region pending text lead (TX)
  await mkReport({
    productId: grill.id, storeId: lowesDallas.id, userId: casey.id,
    priceCents: 7500, dealType: "CLEARANCE", evidenceType: "TEXT_ONLY",
    sourceType: "IN_STORE_OBSERVATION",
    status: "PENDING", notes: "Friend spotted these — needs local verification.",
    createdAt: daysAgo(2),
  });

  // ---------- votes ----------
  await prisma.reportVote.createMany({
    data: [
      { reportId: r1.id, userId: casey.id, vote: "CONFIRMED", createdAt: daysAgo(0.5) },
      { reportId: r1.id, userId: captain.id, vote: "CONFIRMED", createdAt: daysAgo(0.2) },
      { reportId: r2.id, userId: rey.id, vote: "CONFIRMED", createdAt: daysAgo(1) },
      { reportId: r3.id, userId: rey.id, vote: "CONFIRMED", createdAt: daysAgo(1.5) },
      { reportId: r6.id, userId: casey.id, vote: "DEAD", createdAt: daysAgo(4) },
      { reportId: r6.id, userId: rey.id, vote: "DEAD", createdAt: daysAgo(3.5) },
      { reportId: r8.id, userId: casey.id, vote: "CONFIRMED", createdAt: daysAgo(0.5) },
    ],
  });

  // ---------- alerts (mock fan-out already materialized) ----------
  await prisma.alert.createMany({
    data: [
      {
        productId: screwdrivers.id, storeId: hdMidtown.id, reportId: r1.id, userId: casey.id,
        score: 90, message: "Penny lead: Husky 10-Piece Screwdriver Set at HD Midtown Atlanta (receipt-verified).",
        createdAt: daysAgo(1),
      },
      {
        productId: screwdrivers.id, storeId: hdMidtown.id, reportId: r1.id, userId: captain.id,
        score: 90, message: "Penny lead: Husky 10-Piece Screwdriver Set at HD Midtown Atlanta (receipt-verified).",
        createdAt: daysAgo(1),
      },
      {
        productId: toy.id, storeId: dgMarietta.id, reportId: r9.id, userId: casey.id,
        score: 72, message: "Penny lead: Hot Wheels 5-Pack at DG Marietta (shelf tag photo).",
        createdAt: daysAgo(1),
      },
    ],
  });

  // ---------- a saved route plan ----------
  await prisma.routePlan.create({
    data: {
      userId: rey.id,
      name: "Saturday Atlanta run",
      stopsJson: JSON.stringify([
        { storeId: hdMidtown.id, storeName: "HD Midtown Atlanta", distanceMiles: 8.2, expectedValue: 148.6, routeScore: 146.1 },
        { storeId: wmDecatur.id, storeName: "Walmart Supercenter Decatur", distanceMiles: 1.4, expectedValue: 168.6, routeScore: 168.2 },
      ]),
      totalScore: 314.3,
    },
  });

  const counts = {
    users: await prisma.user.count(),
    retailers: await prisma.retailer.count(),
    stores: await prisma.store.count(),
    products: await prisma.product.count(),
    reports: await prisma.report.count(),
    votes: await prisma.reportVote.count(),
    alerts: await prisma.alert.count(),
    routePlans: await prisma.routePlan.count(),
  };
  console.log("Seed complete:", counts);
  void admin;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
