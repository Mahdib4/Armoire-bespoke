"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Uploader from "./Uploader";
import DeleteButton from "./DeleteButton";

type Spec = { label: string; value: string };
type ProductForm = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  type: "CUSTOM" | "READYMADE";
  priceTk: number;
  description: string;
  fabric: string;
  sizeChartUrl: string;
  order: number;
  active: boolean;
  featured: boolean;
  specs: Spec[];
  images: string[];
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

  const upd = <K extends keyof ProductForm>(k: K, v: ProductForm[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  const moveImage = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= f.images.length) return;
    const imgs = [...f.images];
    [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
    upd("images", imgs);
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
          description: f.description || null,
          fabric: f.fabric || null,
          sizeChartUrl: f.sizeChartUrl || null,
          order: Number(f.order),
          active: f.active,
          featured: f.featured,
          specs: f.specs.filter((s) => s.label.trim()),
          images: f.images,
          customizationKinds: f.customizationKinds,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
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
            <label>Price (Tk)</label>
            <input type="number" min={0} value={f.priceTk} onChange={(e) => upd("priceTk", Number(e.target.value))} />
          </div>
          <div className="adm-field">
            <label>Product Type</label>
            <div className="adm-toggle">
              <button type="button" className={f.type === "CUSTOM" ? "on" : ""} onClick={() => upd("type", "CUSTOM")}>Made-to-Measure</button>
              <button type="button" className={f.type === "READYMADE" ? "on" : ""} onClick={() => upd("type", "READYMADE")}>Ready-Made</button>
            </div>
          </div>
          <div className="adm-field">
            <label>Display Order</label>
            <input type="number" value={f.order} onChange={(e) => upd("order", Number(e.target.value))} />
          </div>
          <div className="adm-field wide">
            <label>Description</label>
            <textarea rows={3} value={f.description} onChange={(e) => upd("description", e.target.value)} />
          </div>
          <div className="adm-field">
            <label>Fabric (short)</label>
            <input value={f.fabric} onChange={(e) => upd("fabric", e.target.value)} />
          </div>
          <div className="adm-field">
            <label>Size Chart URL</label>
            <input value={f.sizeChartUrl} onChange={(e) => upd("sizeChartUrl", e.target.value)} />
          </div>
          <div className="adm-field">
            <label>Visibility</label>
            <div className="adm-toggle">
              <button type="button" className={f.active ? "on" : ""} onClick={() => upd("active", true)}>Live</button>
              <button type="button" className={!f.active ? "on" : ""} onClick={() => upd("active", false)}>Hidden</button>
            </div>
          </div>
          <div className="adm-field">
            <label>Featured</label>
            <div className="adm-toggle">
              <button type="button" className={f.featured ? "on" : ""} onClick={() => upd("featured", true)}>Yes</button>
              <button type="button" className={!f.featured ? "on" : ""} onClick={() => upd("featured", false)}>No</button>
            </div>
          </div>
        </div>
      </div>

      {/* Images */}
      <div className="adm-panel">
        <h3>Images</h3>
        <div className="adm-imgs">
          {f.images.map((url, i) => (
            <div className="adm-imgchip" key={url + i}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" />
              <button title="Remove" onClick={() => upd("images", f.images.filter((_, x) => x !== i))}>✕</button>
              <div style={{ position: "absolute", bottom: 2, left: 2, display: "flex", gap: 2 }}>
                <button style={{ position: "static", width: 18, height: 18 }} onClick={() => moveImage(i, -1)}>‹</button>
                <button style={{ position: "static", width: 18, height: 18 }} onClick={() => moveImage(i, 1)}>›</button>
              </div>
            </div>
          ))}
        </div>
        <div className="adm-actions">
          <Uploader accept="image/*" label="+ Upload Image" onUploaded={(url) => upd("images", [...f.images, url])} />
        </div>
      </div>

      {/* Customizations (custom only, but editable anytime) */}
      <div className="adm-panel">
        <h3>Bespoke Options {f.type === "READYMADE" && "(shown when type is Made-to-Measure)"}</h3>
        <div className="chip-row">
          {groups.map((g) => {
            const on = f.customizationKinds.includes(g.kind);
            return (
              <button
                type="button"
                key={g.kind}
                className={`chip ${on ? "on" : ""}`}
                onClick={() =>
                  upd(
                    "customizationKinds",
                    on ? f.customizationKinds.filter((k) => k !== g.kind) : [...f.customizationKinds, g.kind]
                  )
                }
              >
                {g.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Specs */}
      <div className="adm-panel">
        <h3>Specifications</h3>
        {f.specs.map((s, i) => (
          <div className="adm-form-grid" key={i} style={{ marginBottom: "0.6rem" }}>
            <div className="adm-field">
              <input placeholder="Label" value={s.label} onChange={(e) => {
                const specs = [...f.specs]; specs[i] = { ...specs[i], label: e.target.value }; upd("specs", specs);
              }} />
            </div>
            <div className="adm-field" style={{ flexDirection: "row", gap: "0.5rem" }}>
              <input placeholder="Value" value={s.value} onChange={(e) => {
                const specs = [...f.specs]; specs[i] = { ...specs[i], value: e.target.value }; upd("specs", specs);
              }} />
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
