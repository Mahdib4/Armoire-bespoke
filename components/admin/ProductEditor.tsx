"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Uploader from "./Uploader";
import DeleteButton from "./DeleteButton";

type Spec = { label: string; value: string };
type SizeOpt = { label: string; stock: number };
type ProductForm = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
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
  customizationKinds: string[];
};

export default function ProductEditor({
  product,
  categories,
  groups,
}: {
  product: ProductForm;
  categories: { id: string; name: string }[];
  groups: { kind: string; name: string }[];
}) {
  const router = useRouter();
  const [f, setF] = useState<ProductForm>(product);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const upd = <K extends keyof ProductForm>(k: K, v: ProductForm[K]) => setF((p) => ({ ...p, [k]: v }));

  const isTailor = f.type === "CUSTOM";

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
          customizationKinds: f.customizationKinds,
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
            <select value={f.categoryId} onChange={(e) => upd("categoryId", e.target.value)}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
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
              <label>Tailoring Charge (Tk)</label>
              <input type="number" min={0} value={f.tailoringCharge} onChange={(e) => upd("tailoringCharge", Number(e.target.value))} />
              <span className="adm-hint">
                No base price needed. Final price = tailoring charge + fabric price × yards the garment needs
                (fabric prices are set in the Fabric section).
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
        <p className="adm-hint">Only the options you enable here appear on this product's Tailor-Made configurator.</p>
        <div className="chip-row">
          {groups.map((g) => {
            const on = f.customizationKinds.includes(g.kind);
            return (
              <button
                type="button"
                key={g.kind}
                className={`chip ${on ? "on" : ""}`}
                onClick={() =>
                  upd("customizationKinds", on ? f.customizationKinds.filter((k) => k !== g.kind) : [...f.customizationKinds, g.kind])
                }
              >
                {g.name}
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* Specs */}
      <div className="adm-panel">
        <h3>Specifications</h3>
        {f.specs.map((s, i) => (
          <div className="adm-form-grid" key={i} style={{ marginBottom: "0.6rem" }}>
            <div className="adm-field">
              <input placeholder="Label" value={s.label} onChange={(e) => { const specs = [...f.specs]; specs[i] = { ...specs[i], label: e.target.value }; upd("specs", specs); }} />
            </div>
            <div className="adm-field" style={{ flexDirection: "row", gap: "0.5rem" }}>
              <input placeholder="Value" value={s.value} onChange={(e) => { const specs = [...f.specs]; specs[i] = { ...specs[i], value: e.target.value }; upd("specs", specs); }} />
              <button className="adm-btn sm danger" type="button" onClick={() => upd("specs", f.specs.filter((_, x) => x !== i))}>✕</button>
            </div>
          </div>
        ))}
        <button className="adm-btn sm" type="button" onClick={() => upd("specs", [...f.specs, { label: "", value: "" }])}>+ Add Spec</button>
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
