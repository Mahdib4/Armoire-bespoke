"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Uploader from "./Uploader";
import DeleteButton from "./DeleteButton";
import SpecsEditor from "./SpecsEditor";
import OptionOrderEditor, { type OptionRow } from "./OptionOrderEditor";
import { FABRIC_BLOCK, optionLayoutKey, serializeOptionLayout } from "@/lib/options";

type Spec = { label: string; value: string };
type SizeOpt = { label: string; stock: number };
type ProductForm = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  /** "" = no sub-category. */
  subCategoryId: string;
  type: "CUSTOM" | "READYMADE";
  priceTk: number;
  tailoringCharge: number;
  description: string;
  fabric: string;
  sizeChartUrl: string;
  order: number;
  active: boolean;
  featured: boolean;
  outOfStock: boolean;
  colors: string[];
  sizeOptions: SizeOpt[];
  specs: Spec[];
  images: string[];
  featuredIndex: number;
  /** Ordered bespoke blocks with their Shown/Hidden state. */
  optionRows: OptionRow[];
};

type OptionGroup = {
  id: string;
  kind: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  choiceCount: number;
};

export default function ProductEditor({
  product,
  categories,
  subCategories,
  groups,
}: {
  product: ProductForm;
  categories: { id: string; name: string }[];
  /** Every collection's sub-categories; the picker shows this one's. */
  subCategories: { id: string; name: string; categoryId: string }[];
  groups: OptionGroup[];
}) {
  const router = useRouter();
  const [f, setF] = useState<ProductForm>(product);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const upd = <K extends keyof ProductForm>(k: K, v: ProductForm[K]) => setF((p) => ({ ...p, [k]: v }));

  const isTailor = f.type === "CUSTOM";

  // Only the sub-categories of the collection this product is in.
  const subs = subCategories.filter((s) => s.categoryId === f.categoryId);

  // Options offered to this product: the ones scoped to its collection plus the
  // all-collection ones. Fabric is built in (its cloths come from Admin →
  // Fabrics) but still takes part in the ordering.
  const available = groups.filter(
    (g) => g.kind !== "fabric" && (g.categoryId === null || g.categoryId === f.categoryId)
  );

  // Keep the saved order, drop anything the collection no longer offers, and
  // append newly available options at the end (hidden until switched on).
  const rows: OptionRow[] = (() => {
    const allowed = new Map(available.map((g) => [g.id, g]));
    const kept = f.optionRows.filter((r) => r.id === FABRIC_BLOCK || allowed.has(r.id));
    const seen = new Set(kept.map((r) => r.id));
    const out: OptionRow[] = kept.map((r) =>
      r.id === FABRIC_BLOCK
        ? { ...r, name: "Fabric", fixed: true }
        : {
            ...r,
            name: allowed.get(r.id)!.name,
            scope: allowed.get(r.id)!.categoryId === null ? "all collections" : undefined,
            choiceCount: allowed.get(r.id)!.choiceCount,
          }
    );
    if (!seen.has(FABRIC_BLOCK)) out.unshift({ id: FABRIC_BLOCK, name: "Fabric", on: true, fixed: true });
    for (const g of available) {
      if (seen.has(g.id)) continue;
      out.push({
        id: g.id,
        name: g.name,
        on: false,
        scope: g.categoryId === null ? "all collections" : undefined,
        choiceCount: g.choiceCount,
      });
    }
    return out;
  })();

  const moveImage = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= f.images.length) return;
    const imgs = [...f.images];
    [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
    let fi = f.featuredIndex;
    if (fi === i) fi = j;
    else if (fi === j) fi = i;
    setF((p) => ({ ...p, images: imgs, featuredIndex: fi }));
  };
  const removeImage = (i: number) => {
    const imgs = f.images.filter((_, x) => x !== i);
    let fi = f.featuredIndex;
    if (i === fi) fi = 0;
    else if (i < fi) fi -= 1;
    setF((p) => ({ ...p, images: imgs, featuredIndex: Math.max(0, Math.min(fi, imgs.length - 1)) }));
  };

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/products/${f.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.name,
          categoryId: f.categoryId,
          subCategoryId: f.subCategoryId || null,
          type: f.type,
          priceTk: Number(f.priceTk),
          tailoringCharge: Number(f.tailoringCharge),
          description: f.description || null,
          fabric: f.fabric || null,
          sizeChartUrl: f.sizeChartUrl || null,
          order: Number(f.order),
          active: f.active,
          featured: f.featured,
          outOfStock: f.outOfStock,
          colors: f.colors.filter((c) => c.trim()),
          sizeOptions: f.sizeOptions.filter((s) => s.label.trim()).map((s) => ({ label: s.label, stock: Number(s.stock) || 0 })),
          specs: f.specs.filter((s) => s.label.trim()),
          images: f.images,
          featuredIndex: f.featuredIndex,
          // Only the shown options are attached, in the order they appear.
          customizationGroupIds: rows
            .filter((r) => r.on && r.id !== FABRIC_BLOCK)
            .map((r) => r.id),
        }),
      });
      // The full layout (including Fabric's position and the hidden rows)
      // lives in settings, so hiding an option keeps its place.
      await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: [
            {
              key: optionLayoutKey(f.id),
              value: serializeOptionLayout(rows.map((r) => ({ id: r.id, on: r.on }))),
            },
          ],
        }),
      });
      if (!res.ok) throw new Error();
      setMsg({ ok: true, text: "Saved." });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: "Save failed." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-form">
      {/* Details */}
      <div className="adm-panel">
        <h3>Details</h3>
        <div className="adm-form-grid">
          <div className="adm-field wide">
            <label>Name</label>
            <input value={f.name} onChange={(e) => upd("name", e.target.value)} />
          </div>
          <div className="adm-field">
            <label>Category</label>
            <select
              value={f.categoryId}
              onChange={(e) => {
                // Sub-categories belong to a collection, so moving the product
                // clears one that no longer applies.
                setF((p) => ({ ...p, categoryId: e.target.value, subCategoryId: "" }));
              }}
            >
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="adm-field">
            <label>Sub-Category</label>
            <select
              value={f.subCategoryId}
              onChange={(e) => upd("subCategoryId", e.target.value)}
              disabled={subs.length === 0}
            >
              <option value="">— None —</option>
              {subs.map((sc) => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
            </select>
            <span className="adm-hint">
              {subs.length === 0
                ? "This collection has no sub-categories yet — add them in Categories & Banners."
                : "Shoppers can filter the collection page by this."}
            </span>
          </div>
          <div className="adm-field">
            <label>Product Type</label>
            <div className="adm-toggle">
              <button type="button" className={f.type === "CUSTOM" ? "on" : ""} onClick={() => upd("type", "CUSTOM")}>Tailor Made</button>
              <button type="button" className={f.type === "READYMADE" ? "on" : ""} onClick={() => upd("type", "READYMADE")}>Ready Made</button>
            </div>
          </div>
          {!isTailor && (
            <div className="adm-field">
              <label>Price (Tk)</label>
              <input type="number" min={0} value={f.priceTk} onChange={(e) => upd("priceTk", Number(e.target.value))} />
            </div>
          )}
          {isTailor && (
            <div className="adm-field wide">
              <label>Pricing</label>
              <span className="adm-hint">
                Tailor-Made price is calculated automatically: the collection&rsquo;s tailoring charge + fabric price ×
                yards the garment needs. Set the tailoring charge per collection in <strong>Categories &amp; Banners</strong>;
                fabric prices and which collection each cloth belongs to in <strong>Fabrics</strong>.
              </span>
            </div>
          )}
          <div className="adm-field wide">
            <label>Description</label>
            <textarea rows={3} value={f.description} onChange={(e) => upd("description", e.target.value)} />
          </div>
          <div className="adm-field">
            <label>Display Order</label>
            <input type="number" value={f.order} onChange={(e) => upd("order", Number(e.target.value))} />
          </div>
          <div className="adm-field">
            <label>Visibility</label>
            <div className="adm-toggle">
              <button type="button" className={f.active ? "on" : ""} onClick={() => upd("active", true)}>Live</button>
              <button type="button" className={!f.active ? "on" : ""} onClick={() => upd("active", false)}>Hidden</button>
            </div>
          </div>
          <div className="adm-field">
            <label>Stock Status</label>
            <div className="adm-toggle">
              <button type="button" className={!f.outOfStock ? "on" : ""} onClick={() => upd("outOfStock", false)}>In Stock</button>
              <button type="button" className={f.outOfStock ? "on" : ""} onClick={() => upd("outOfStock", true)}>Out of Stock</button>
            </div>
          </div>
        </div>
      </div>

      {/* Ready-Made inventory — only for Ready Made products */}
      {!isTailor && (
      <div className="adm-panel">
        <h3>Ready-Made Inventory</h3>
        <div className="adm-form-grid">
          <div className="adm-field wide">
            <label>Colours</label>
            <div className="chip-row" style={{ marginBottom: "0.6rem" }}>
              {f.colors.map((c, i) => (
                <span key={i} className="adm-tag">
                  <input value={c} onChange={(e) => { const cs = [...f.colors]; cs[i] = e.target.value; upd("colors", cs); }} />
                  <button type="button" onClick={() => upd("colors", f.colors.filter((_, x) => x !== i))}>✕</button>
                </span>
              ))}
            </div>
            <button className="adm-btn sm" type="button" onClick={() => upd("colors", [...f.colors, ""])}>+ Add Colour</button>
          </div>
          <div className="adm-field wide">
            <label>Sizes &amp; Stock (38, 40, 42, 44…)</label>
            {f.sizeOptions.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "center" }}>
                <input placeholder="Size" value={s.label} onChange={(e) => { const ss = [...f.sizeOptions]; ss[i] = { ...ss[i], label: e.target.value }; upd("sizeOptions", ss); }} style={{ width: 90 }} />
                <input type="number" min={0} placeholder="Stock" value={s.stock} onChange={(e) => { const ss = [...f.sizeOptions]; ss[i] = { ...ss[i], stock: Number(e.target.value) }; upd("sizeOptions", ss); }} style={{ width: 90 }} />
                <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>{s.stock <= 0 ? "out of stock" : "in stock"}</span>
                <button className="adm-btn sm danger" type="button" onClick={() => upd("sizeOptions", f.sizeOptions.filter((_, x) => x !== i))}>✕</button>
              </div>
            ))}
            <button className="adm-btn sm" type="button" onClick={() => upd("sizeOptions", [...f.sizeOptions, { label: "", stock: 5 }])}>+ Add Size</button>
          </div>
        </div>
      </div>
      )}

      {/* Images */}
      <div className="adm-panel">
        <h3>Images <span style={{ color: "var(--text-muted)", textTransform: "none", letterSpacing: 0 }}>— click the star to set the featured image; uploads are added to the end</span></h3>
        <div className="adm-imgs">
          {f.images.map((url, i) => (
            <div className={`adm-imgchip ${i === f.featuredIndex ? "feat" : ""}`} key={url + i}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" />
              <button className="imgchip-star" title="Set as featured" onClick={() => upd("featuredIndex", i)}>{i === f.featuredIndex ? "★" : "☆"}</button>
              <button className="imgchip-x" title="Remove" onClick={() => removeImage(i)}>✕</button>
              <div className="imgchip-move">
                <button onClick={() => moveImage(i, -1)}>‹</button>
                <button onClick={() => moveImage(i, 1)}>›</button>
              </div>
            </div>
          ))}
        </div>
        <div className="adm-actions">
          <Uploader accept="image/*" label="+ Upload Image" onUploaded={(url) => upd("images", [...f.images, url])} />
        </div>
      </div>

      {/* Size chart */}
      <div className="adm-panel">
        <h3>Size Chart</h3>
        <div className="adm-actions" style={{ alignItems: "flex-end" }}>
          <div className="adm-field" style={{ flex: 1 }}>
            <label>Size Chart Image URL</label>
            <input value={f.sizeChartUrl} onChange={(e) => upd("sizeChartUrl", e.target.value)} />
          </div>
          <Uploader accept="image/*" label="Upload Chart" onUploaded={(url) => upd("sizeChartUrl", url)} />
        </div>
        {f.sizeChartUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={f.sizeChartUrl} alt="Size chart" style={{ maxWidth: 220, marginTop: "0.8rem", border: "1px solid var(--border)" }} />
        )}
      </div>

      {/* Bespoke Options — only for Tailor Made products */}
      {isTailor && (
      <div className="adm-panel">
        <h3>Bespoke Options</h3>
        <p className="adm-hint">
          The choices shown on this product&apos;s page, in this order. Drag a row by its handle to move it, or
          switch it to <strong>Hidden</strong> to take it off the page for now without losing its place. Only
          options belonging to this collection are listed; add or edit them under <strong>Bespoke Options</strong>,
          and the cloths behind Fabric under <strong>Fabrics</strong>.
        </p>
        <OptionOrderEditor rows={rows} onChange={(next) => upd("optionRows", next)} />
      </div>
      )}

      {/* Specs */}
      <div className="adm-panel">
        <h3>Specifications</h3>
        <p className="adm-hint">
          Drag a row by its handle to reorder it — the numbers update themselves, and the product page shows
          them in this exact order. On a touch screen use the arrows instead.
        </p>
        <SpecsEditor specs={f.specs} onChange={(specs) => upd("specs", specs)} />
      </div>

      <div className="adm-actions">
        <button className="adm-btn solid" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save Changes"}</button>
        {msg && <span className={`adm-msg ${msg.ok ? "" : "err"}`}>{msg.text}</span>}
        <span style={{ flex: 1 }} />
        <DeleteButton endpoint={`/api/admin/products/${f.id}`} label="Delete Product" confirmMsg={`Delete "${f.name}"?`} redirect="/admin/products" />
      </div>
    </div>
  );
}
