"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const EVIDENCE_OPTIONS = [
  { value: "RECEIPT", label: "Receipt (strongest)" },
  { value: "SHELF_TAG_PHOTO", label: "Shelf tag photo" },
  { value: "PRODUCT_PHOTO", label: "Product photo" },
  { value: "TEXT_ONLY", label: "Text only (weakest)" },
];

const SOURCE_OPTIONS = [
  { value: "IN_STORE_OBSERVATION", label: "Saw it in store" },
  { value: "RECEIPT_PURCHASE", label: "Bought it (have receipt)" },
  { value: "SHELF_TAG", label: "Photographed shelf tag" },
  { value: "STORE_FLYER_PUBLIC", label: "Public store flyer/signage" },
];

// Shown to demonstrate the compliance guardrail: the API rejects these.
const BLOCKED_SOURCE_OPTIONS = [
  { value: "SCRAPED_SITE", label: "Scraped website (blocked)" },
  { value: "COMPETITOR_REPOST", label: "Competitor repost (blocked)" },
  { value: "PRIVATE_API", label: "Private retailer API (blocked)" },
];

export default function ReportForm({
  stores,
  products,
}: {
  stores: { id: string; label: string; retailerId: string; retailerName: string }[];
  products: { id: string; label: string; retailerId: string }[];
}) {
  const router = useRouter();
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [productMode, setProductMode] = useState<"existing" | "new">("existing");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const store = stores.find((s) => s.id === storeId);
  const storeProducts = products.filter((p) => p.retailerId === store?.retailerId);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    const fd = new FormData(e.currentTarget);
    const priceDollars = parseFloat(String(fd.get("price") || "0"));
    const body = {
      storeId,
      productId: productMode === "existing" ? String(fd.get("productId") || "") : undefined,
      newProduct:
        productMode === "new"
          ? {
              name: String(fd.get("newName") || ""),
              upc: String(fd.get("newUpc") || "") || undefined,
              sku: String(fd.get("newSku") || "") || undefined,
            }
          : undefined,
      priceCents: Math.round(priceDollars * 100),
      dealType: String(fd.get("dealType")),
      evidenceType: String(fd.get("evidenceType")),
      evidenceUrl: String(fd.get("evidenceUrl") || "") || undefined,
      sourceType: String(fd.get("sourceType")),
      notes: String(fd.get("notes") || "") || undefined,
    };
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setResult({ ok: false, text: data.error ?? `Failed (${res.status})` });
      return;
    }
    setResult({
      ok: true,
      text: `Report submitted — confidence ${data.score}. ${
        data.alertsCreated > 0
          ? `${data.alertsCreated} nearby user(s) alerted.`
          : "No alert fired (below threshold or deduped)."
      }`,
    });
    router.refresh();
  }

  const inputCls = "w-full rounded border border-stone-300 px-3 py-2 text-sm";
  const labelCls = "block text-xs font-medium text-stone-500 mb-1";

  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-4 rounded-lg border border-stone-200 bg-white p-4">
      <div>
        <label className={labelCls}>Store</label>
        <select name="storeId" value={storeId} onChange={(e) => setStoreId(e.target.value)} className={inputCls}>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>Product</label>
        <div className="mb-2 flex gap-3 text-sm">
          <label className="flex items-center gap-1">
            <input type="radio" checked={productMode === "existing"} onChange={() => setProductMode("existing")} />
            Existing
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" checked={productMode === "new"} onChange={() => setProductMode("new")} />
            New product
          </label>
        </div>
        {productMode === "existing" ? (
          <select name="productId" className={inputCls}>
            {storeProducts.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            <input name="newName" placeholder={`Product name (${store?.retailerName ?? ""})`} required className={inputCls + " sm:col-span-3"} />
            <input name="newUpc" placeholder="UPC (optional)" className={inputCls} />
            <input name="newSku" placeholder="SKU (optional)" className={inputCls} />
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Price you saw (USD)</label>
          <input name="price" type="number" step="0.01" min="0.01" defaultValue="0.01" required className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Deal type</label>
          <select name="dealType" className={inputCls}>
            <option value="PENNY">Penny item</option>
            <option value="CLEARANCE">Hidden clearance</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Evidence</label>
          <select name="evidenceType" className={inputCls}>
            {EVIDENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>How did you find this?</label>
          <select name="sourceType" className={inputCls}>
            <optgroup label="Allowed sources">
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </optgroup>
            <optgroup label="Blocked by compliance policy (demo)">
              {BLOCKED_SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Evidence URL (placeholder in MVP — uploads come later)</label>
        <input name="evidenceUrl" type="url" placeholder="https://…" className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Notes</label>
        <textarea name="notes" rows={2} placeholder="Aisle, quantity left, how it rang up…" className={inputCls} />
      </div>

      <button
        disabled={busy}
        className="justify-self-start rounded bg-forge-600 px-4 py-2 text-sm font-semibold text-white hover:bg-forge-500 disabled:opacity-50"
      >
        {busy ? "Submitting…" : "Submit report"}
      </button>

      {result && (
        <p className={`text-sm ${result.ok ? "text-emerald-700" : "text-red-700"}`}>{result.text}</p>
      )}
    </form>
  );
}
