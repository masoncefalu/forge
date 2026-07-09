# PennyForge — Receipt & Photo Privacy Rules

> **Not legal advice.** This is a practical risk framework and set of product guardrails, written
> for counsel to review before launch.

In the MVP, evidence is a placeholder URL: `Report.evidenceUrl` is an optional `http`/`https`
string and no files are stored (see `prisma/schema.prisma` and `docs/product-spec.md`). Real file
upload arrives in **Phase 1** and receipt OCR in **Phase 3**. The rules below bind those builds
**before they ship** — they are acceptance criteria for the upload and OCR features, not
retrofits. Data-minimization is the design stance: a receipt proves a price at a store on a date;
everything else on it is someone's personal or financial data and must never become publicly
visible.

Evidence types are the `Report.evidenceType` values: `RECEIPT`, `SHELF_TAG_PHOTO`,
`PRODUCT_PHOTO`, `TEXT_ONLY`.

## Receipt redaction requirements (Phase 1, before any receipt is publicly visible)

A receipt image must pass through redaction before it renders on any page visible to another
user. The following must be masked; the remainder is the evidentiary value and stays visible.

| Element on receipt | Treatment | Why |
|---|---|---|
| Payment card last-4 and **any** card digits | **Mask** | Financial data; combinable with other leaks for fraud. |
| Cardholder name | **Mask** | PII directly linking the receipt to a person. |
| Loyalty / member numbers | **Mask** | Persistent identifier tied to the shopper's retailer account and purchase history. |
| Barcodes / QR codes printed on the receipt | **Mask** | They encode receipt or loyalty IDs usable for returns fraud — a scannable public copy is a real-world abuse vector. |
| Cashier names / register operator IDs | **Mask** | Employee PII; PennyForge policy is to keep store staff out of the product entirely. |
| Any handwritten personal info | **Mask** | Phone numbers, names, notes — unpredictable PII. |
| Store name / address | Visible | Public business information; part of the proof. |
| Transaction date | Visible | Freshness is core to the confidence score. |
| Item line and price | Visible | This *is* the evidence. |

## Photo rules (all evidence types)

- **No identifiable faces** of employees, customers, or bystanders. A photo with an identifiable
  face is rejected in the moderation queue — the contributor is asked to re-shoot, not to rely on
  PennyForge to blur it.
- **No employee name tags**, even without a face.
- Frame the **shelf, tag, or product only**. That is all the evidence requires
  (`SHELF_TAG_PHOTO`, `PRODUCT_PHOTO`).
- Retailer logos, store branding, and trade dress appearing **incidentally** in shelf photos are
  acceptable factual user-generated content — a photo of a shelf tag in a store necessarily shows
  the retailer's marks. See `docs/compliance/trademarks-and-disclaimers.md` for the trademark
  posture this relies on (factual/nominative use, no implied affiliation).

## Technical controls for the Phase 1 upload build

These are build requirements for the file-upload feature, in scope for its initial ship:

1. **Strip EXIF metadata server-side on ingest** — especially GPS. A shelf photo's EXIF places
   the contributor in a specific store at an exact time; that is precise location data the product
   never needs (the report already names the store, and `docs/compliance/location-privacy.md`
   governs how timing signals are displayed). Strip on the server, not the client — client-side
   stripping can be bypassed.
2. **Private bucket for originals.** Uploaded originals go to a private bucket, accessible only
   via signed, expiring URLs. Originals are never directly web-addressable.
3. **Public pages serve only the redacted/processed derivative.** No route, API response, or
   cached asset may hand out the original of a receipt to anyone other than its uploader and
   moderators.
4. **Image hashing hashes post-redaction images.** Duplicate-photo detection via image hashing is
   an explicitly deferred fraud feature (`docs/product-spec.md`, "Fraud/poisoned-submission
   detection"). When it is built, it must hash the redacted derivative, not the original —
   otherwise the hash pipeline becomes a second store of pre-redaction content.

## OCR data-minimization (Phase 3)

When receipt OCR ships, it operates under these constraints:

- **Extract only what verification needs:** price, date, store, and the relevant line item(s).
  Nothing else is parsed into structured storage.
- **Discard raw OCR text** after field extraction. The full text of a receipt is a purchase
  record; PennyForge stores the four fields above, not the receipt's contents.
- **Never build purchase-history profiles** from receipt contents — no per-user aggregation of
  what people buy, across receipts or within one. Receipts verify deals; they are not a data
  asset.
- **No biometric processing of any kind on photos.** If face *detection* is ever used, it may
  function only as a REJECT gate in moderation (flag the photo for rejection because it contains
  a face) — never face recognition, matching, or template storage. Any consideration of face
  technology, including detection, must be flagged to counsel first for BIPA (Illinois Biometric
  Information Privacy Act) and similar state biometric-law exposure before a line of it is built.

## Deletion

When a user deletes a report, or deletes their account, PennyForge purges the **original** upload,
**all derivatives** (redacted copies, thumbnails, cached renditions), and **any OCR extracts**
tied to that evidence. Signed URLs already issued expire on their own; no new ones can be minted
for purged objects. Full timelines and backup handling live in
`docs/compliance/data-retention.md`.

## Moderator handling

Moderators review pre-redaction content in the queue; they must never copy, screenshot, or share
it outside the moderation tools — see `docs/compliance/moderator-safety.md`.
