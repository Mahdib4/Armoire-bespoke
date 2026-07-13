"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Uploader from "./Uploader";

type Swatch = { name: string; image: string };

function parseSwatches(config: string): Swatch[] {
  try {
    const raw = JSON.parse(config || "{}").swatches;
    if (!Array.isArray(raw)) return [];
    return raw.map((s: unknown) =>
      typeof s === "string"
        ? { name: s, image: "" }
        : { name: (s as Swatch).name || "", image: (s as Swatch).image || "" }
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
        const cleaned = swatches.filter((s) => s.name.trim());
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
          <p className="adm-hint">Add a name and (optionally) a photo for each fabric. Photos replace the plain colour tile.</p>
          <div className="adm-swatches">
            {swatches.map((s, i) => (
              <div key={i} className="adm-swatch">
                <div className="adm-swatch-thumb">
                  {s.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={s.image} alt={s.name} />
                  ) : (
                    <span>No photo</span>
                  )}
                </div>
                <input
                  className="adm-swatch-name"
                  placeholder="Fabric name"
                  value={s.name}
                  onChange={(e) => setSwatch(i, { name: e.target.value })}
                />
                <div className="adm-swatch-actions">
                  <Uploader accept="image/*" label={s.image ? "Replace" : "Add photo"} onUploaded={(url) => setSwatch(i, { image: url })} />
                  {s.image && (
                    <button className="adm-btn sm" type="button" onClick={() => setSwatch(i, { image: "" })}>
                      Remove photo
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
            ))}
          </div>
          <button
            className="adm-btn sm"
            type="button"
            style={{ marginTop: "0.7rem" }}
            onClick={() => setSwatches((list) => [...list, { name: "", image: "" }])}
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
