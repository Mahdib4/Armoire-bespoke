"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Uploader from "./Uploader";
import { tailoringChargeKey } from "@/lib/pricing";

type Measurement = { label: string; unit: string; hint: string | null };
export type CategoryForm = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  bannerType: "image" | "video";
  bannerUrl: string;
  posterUrl: string;
  sizeChartUrl: string;
  tailoringCharge: number;
  order: number;
  active: boolean;
  measurements: Measurement[];
};

export default function CategoryEditor({ category }: { category: CategoryForm }) {
  const router = useRouter();
  const [f, setF] = useState<CategoryForm>(category);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const upd = <K extends keyof CategoryForm>(k: K, v: CategoryForm[K]) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      // Category fields + the per-category tailoring charge (stored in settings)
      // are saved together.
      const [res] = await Promise.all([
        fetch(`/api/admin/categories/${f.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: f.name,
            tagline: f.tagline || null,
            description: f.description || null,
            bannerType: f.bannerType,
            bannerUrl: f.bannerUrl || null,
            posterUrl: f.posterUrl || null,
            sizeChartUrl: f.sizeChartUrl || null,
            order: Number(f.order),
            active: f.active,
            measurements: f.measurements.filter((m) => m.label.trim()),
          }),
        }),
        fetch("/api/admin/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            settings: [{ key: tailoringChargeKey(f.slug), value: String(Math.max(0, Math.round(Number(f.tailoringCharge) || 0))) }],
          }),
        }),
      ]);
      if (!res.ok) throw new Error();
      setMsg("Saved.");
      router.refresh();
    } catch {
      setMsg("Save failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-panel">
      <h3>{f.name}</h3>
      <div className="adm-form-grid">
        <div className="adm-field">
          <label>Name</label>
          <input value={f.name} onChange={(e) => upd("name", e.target.value)} />
        </div>
        <div className="adm-field">
          <label>Order</label>
          <input type="number" value={f.order} onChange={(e) => upd("order", Number(e.target.value))} />
        </div>
        <div className="adm-field">
          <label>Tailoring Charge (Tk) · Tailor Made</label>
          <input type="number" min={0} value={f.tailoringCharge} onChange={(e) => upd("tailoringCharge", Number(e.target.value))} />
          <span className="adm-hint">Applied to every tailor-made piece in this collection. Final price = this charge + fabric price × yards.</span>
        </div>
        <div className="adm-field wide">
          <label>Tagline</label>
          <input value={f.tagline} onChange={(e) => upd("tagline", e.target.value)} />
        </div>
        <div className="adm-field wide">
          <label>Description</label>
          <textarea rows={2} value={f.description} onChange={(e) => upd("description", e.target.value)} />
        </div>
        <div className="adm-field">
          <label>Banner Type</label>
          <div className="adm-toggle">
            <button type="button" className={f.bannerType === "video" ? "on" : ""} onClick={() => upd("bannerType", "video")}>Video</button>
            <button type="button" className={f.bannerType === "image" ? "on" : ""} onClick={() => upd("bannerType", "image")}>Image</button>
          </div>
        </div>
        <div className="adm-field">
          <label>Visibility</label>
          <div className="adm-toggle">
            <button type="button" className={f.active ? "on" : ""} onClick={() => upd("active", true)}>Live</button>
            <button type="button" className={!f.active ? "on" : ""} onClick={() => upd("active", false)}>Hidden</button>
          </div>
        </div>
        <div className="adm-field wide" style={{ flexDirection: "row", alignItems: "flex-end", gap: "0.6rem" }}>
          <div style={{ flex: 1 }}>
            <label>Banner URL ({f.bannerType})</label>
            <input value={f.bannerUrl} onChange={(e) => upd("bannerUrl", e.target.value)} />
          </div>
          <Uploader accept={f.bannerType === "video" ? "video/*" : "image/*"} label="Upload" onUploaded={(url) => upd("bannerUrl", url)} />
        </div>
        {f.bannerType === "video" && (
          <div className="adm-field wide" style={{ flexDirection: "row", alignItems: "flex-end", gap: "0.6rem" }}>
            <div style={{ flex: 1 }}>
              <label>Poster (fallback image)</label>
              <input value={f.posterUrl} onChange={(e) => upd("posterUrl", e.target.value)} />
            </div>
            <Uploader accept="image/*" label="Upload" onUploaded={(url) => upd("posterUrl", url)} />
          </div>
        )}
        <div className="adm-field wide" style={{ flexDirection: "row", alignItems: "flex-end", gap: "0.6rem" }}>
          <div style={{ flex: 1 }}>
            <label>Size Chart (shown on Ready-Made products)</label>
            <input value={f.sizeChartUrl} onChange={(e) => upd("sizeChartUrl", e.target.value)} />
          </div>
          <Uploader accept="image/*" label="Upload" onUploaded={(url) => upd("sizeChartUrl", url)} />
        </div>
        {f.sizeChartUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={f.sizeChartUrl} alt="Size chart" style={{ maxWidth: 220, border: "1px solid var(--border)" }} />
        )}
      </div>

      <div style={{ marginTop: "1.2rem" }}>
        <label style={{ fontSize: "0.62rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          Measurement Fields
        </label>
        {f.measurements.map((m, i) => (
          <div key={i} style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <input placeholder="Label" value={m.label} onChange={(e) => {
              const ms = [...f.measurements]; ms[i] = { ...ms[i], label: e.target.value }; upd("measurements", ms);
            }} style={{ flex: 2 }} />
            <input placeholder="Unit" value={m.unit} onChange={(e) => {
              const ms = [...f.measurements]; ms[i] = { ...ms[i], unit: e.target.value }; upd("measurements", ms);
            }} style={{ width: 80 }} />
            <button className="adm-btn sm danger" type="button" onClick={() => upd("measurements", f.measurements.filter((_, x) => x !== i))}>✕</button>
          </div>
        ))}
        <button className="adm-btn sm" type="button" style={{ marginTop: "0.6rem" }}
          onClick={() => upd("measurements", [...f.measurements, { label: "", unit: "in", hint: null }])}>
          + Add Measurement
        </button>
      </div>

      <div className="adm-actions" style={{ marginTop: "1.2rem" }}>
        <button className="adm-btn solid" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        {msg && <span className="adm-msg">{msg}</span>}
      </div>
    </div>
  );
}
