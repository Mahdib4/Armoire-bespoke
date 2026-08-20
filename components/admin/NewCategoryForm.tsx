"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** Create a new collection (Waistcoat, Sherwani, Overcoat…). It starts hidden
 *  so the owner can add products, fabrics and options before it goes live. */
export default function NewCategoryForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [measurements, setMeasurements] = useState("Chest, Waist, Length, Shoulder, Sleeve");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          tagline: tagline.trim() || undefined,
          measurements: measurements
            .split(",")
            .map((m) => m.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not create the collection.");
      setName("");
      setTagline("");
      setMsg({ ok: true, text: "Created — it is Hidden until you set it Live below." });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not create the collection." });
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div className="adm-actions" style={{ marginBottom: "1.2rem" }}>
        <button className="adm-btn solid" onClick={() => setOpen(true)}>
          + Add a Collection
        </button>
        {msg && <span className={`adm-msg ${msg.ok ? "" : "err"}`}>{msg.text}</span>}
      </div>
    );
  }

  return (
    <div className="adm-panel">
      <h3>New Collection</h3>
      <p className="adm-hint">
        Adds a collection to the menu, the homepage and the collection pages. After creating it, set its
        tailoring charge and yards below, tick its fabrics under <strong>Fabrics</strong>, and add any bespoke
        options under <strong>Bespoke Options</strong>. It stays hidden until you set it Live.
      </p>
      <div className="adm-form-grid">
        <div className="adm-field">
          <label>Collection Name</label>
          <input
            value={name}
            placeholder="e.g. Waistcoat"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
        </div>
        <div className="adm-field">
          <label>Tagline</label>
          <input value={tagline} placeholder="e.g. Quiet structure" onChange={(e) => setTagline(e.target.value)} />
        </div>
        <div className="adm-field wide">
          <label>Measurement Fields</label>
          <input value={measurements} onChange={(e) => setMeasurements(e.target.value)} />
          <span className="adm-hint">Comma separated. You can edit these per collection afterwards.</span>
        </div>
      </div>
      <div className="adm-actions">
        <button className="adm-btn solid" onClick={create} disabled={busy || !name.trim()}>
          {busy ? "Creating…" : "Create Collection"}
        </button>
        <button className="adm-btn" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </button>
        {msg && <span className={`adm-msg ${msg.ok ? "" : "err"}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
