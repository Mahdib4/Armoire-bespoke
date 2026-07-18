"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Uploader from "./Uploader";

type Swatch = { name: string; image: string; images: string[]; price: number };

function parseSwatches(config: string): Swatch[] {
  try {
    const raw = JSON.parse(config || "{}").swatches;
    if (!Array.isArray(raw)) return [];
    return raw.map((s: unknown) =>
      typeof s === "string"
        ? { name: s, image: "", images: [], price: 0 }
        : {
            name: (s as Swatch).name || "",
            image: (s as Swatch).image || "",
            images: Array.isArray((s as Swatch).images) ? (s as Swatch).images.filter(Boolean) : [],
            price: Number((s as Swatch).price) || 0,
          }
    );
  } catch {
    return [];
  }
}

export default function SectionEditor({
  section,
}: {
  section: { key: string; title: string; subtitle: string; body: string; config: string };
}) {
  const router = useRouter();
  const isFabric = section.key === "fabric";
  const [f, setF] = useState(section);
  const [swatches, setSwatches] = useState<Swatch[]>(() => parseSwatches(section.config));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const setSwatch = (i: number, patch: Partial<Swatch>) =>
    setSwatches((list) => list.map((s, x) => (x === i ? { ...s, ...patch } : s)));

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const body: Record<string, unknown> = {
        title: f.title || null,
        subtitle: f.subtitle || null,
        body: f.body || null,
      };
      if (isFabric) {
        const cleaned = swatches
          .filter((s) => s.name.trim())
          .map((s) => ({
            name: s.name.trim(),
            image: s.image,
            images: s.images.filter(Boolean),
            price: Number(s.price) || 0,
          }));
        body.config = JSON.stringify({ swatches: cleaned });
      }
      const res = await fetch(`/api/admin/sections/${f.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
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
      <h3>{f.key}</h3>
      <div className="adm-form-grid">
        <div className="adm-field">
          <label>Title</label>
          <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </div>
        <div className="adm-field">
          <label>Subtitle</label>
          <input value={f.subtitle} onChange={(e) => setF({ ...f, subtitle: e.target.value })} />
        </div>
        <div className="adm-field wide">
          <label>Body</label>
          <textarea rows={4} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
        </div>
      </div>

      {isFabric && (
        <div className="adm-field wide" style={{ marginTop: "1rem" }}>
          <label>Fabric Swatches</label>
          <p className="adm-hint">Add a name, price/yard, a cover photo and extra photos for each fabric. Fabrics get their own page (photos + buy by the yard).</p>
          <div className="adm-swatches">
            {swatches.map((s, i) => (
              <div key={i} className="adm-swatch adm-swatch-col">
                <div className="adm-swatch-row">
                  <div className="adm-swatch-thumb">
                    {s.image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={s.image} alt={s.name} />
                    ) : (
                      <span>Cover</span>
                    )}
                  </div>
                  <input
                    className="adm-swatch-name"
                    placeholder="Fabric name"
                    value={s.name}
                    onChange={(e) => setSwatch(i, { name: e.target.value })}
                  />
                  <input
                    className="adm-swatch-price"
                    type="number"
                    min={0}
                    placeholder="Price / yard (Tk)"
                    value={s.price || ""}
                    onChange={(e) => setSwatch(i, { price: Number(e.target.value) || 0 })}
                  />
                  <div className="adm-swatch-actions">
                    <Uploader accept="image/*" label={s.image ? "Replace cover" : "Cover photo"} onUploaded={(url) => setSwatch(i, { image: url })} />
                    {s.image && (
                      <button className="adm-btn sm" type="button" onClick={() => setSwatch(i, { image: "" })}>
                        Remove
                      </button>
                    )}
                    <button
                      className="adm-btn sm danger"
                      type="button"
                      onClick={() => setSwatches((list) => list.filter((_, x) => x !== i))}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="adm-swatch-gallery">
                  <span className="adm-hint" style={{ margin: 0 }}>Extra photos ({s.images.length}):</span>
                  {s.images.map((img, gi) => (
                    <span key={gi} className="adm-swatch-galimg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" />
                      <button type="button" onClick={() => setSwatch(i, { images: s.images.filter((_, x) => x !== gi) })}>✕</button>
                    </span>
                  ))}
                  <Uploader accept="image/*" label="+ Photo" onUploaded={(url) => setSwatch(i, { images: [...s.images, url] })} />
                </div>
              </div>
            ))}
          </div>
          <button
            className="adm-btn sm"
            type="button"
            style={{ marginTop: "0.7rem" }}
            onClick={() => setSwatches((list) => [...list, { name: "", image: "", images: [], price: 0 }])}
          >
            + Add Fabric
          </button>
        </div>
      )}

      <div className="adm-actions">
        <button className="adm-btn solid" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        {msg && <span className="adm-msg">{msg}</span>}
      </div>
    </div>
  );
}
