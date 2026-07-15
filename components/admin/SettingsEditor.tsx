"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Uploader from "./Uploader";

const FIELDS: {
  key: string;
  label: string;
  upload?: "image" | "video";
  textarea?: boolean;
  toggle?: boolean;
}[] = [
  { key: "brandName", label: "Brand Name" },
  { key: "brandShort", label: "Brand Short (wordmark)" },
  { key: "slogan", label: "Slogan" },
  { key: "logoDark", label: "Logo (dark bg)", upload: "image" },
  { key: "logoLight", label: "Logo (light bg)", upload: "image" },
  { key: "heroVideo", label: "Hero Video", upload: "video" },
  { key: "heroPoster", label: "Hero Poster", upload: "image" },
  { key: "midVideo", label: "Mid Video", upload: "video" },
  { key: "priceChart", label: "Price Chart Image", upload: "image" },
  { key: "currency", label: "Currency Symbol" },
  { key: "contactEmail", label: "Contact Email" },
  { key: "contactPhone", label: "Contact Phone" },
  { key: "whatsapp", label: "WhatsApp Number (with country code)" },
  { key: "address", label: "Address" },
  { key: "facebook", label: "Facebook URL" },
  { key: "instagram", label: "Instagram URL" },
  { key: "footerNote", label: "Footer Note", textarea: true },
];

export default function SettingsEditor({ initial }: { initial: Record<string, string> }) {
  const router = useRouter();
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const f of FIELDS) v[f.key] = initial[f.key] ?? "";
    return v;
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const set = (k: string, v: string) => setVals((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: Object.entries(vals).map(([key, value]) => ({ key, value })) }),
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
      <div className="adm-form-grid">
        {FIELDS.map((f) => (
          <div className={`adm-field ${f.textarea ? "wide" : ""}`} key={f.key}>
            <label>{f.label}</label>
            {f.toggle ? (
              <div className="adm-toggle">
                <button type="button" className={vals[f.key] !== "0" ? "on" : ""} onClick={() => set(f.key, "1")}>Visible</button>
                <button type="button" className={vals[f.key] === "0" ? "on" : ""} onClick={() => set(f.key, "0")}>Hidden</button>
              </div>
            ) : f.textarea ? (
              <textarea rows={2} value={vals[f.key]} onChange={(e) => set(f.key, e.target.value)} />
            ) : (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input value={vals[f.key]} onChange={(e) => set(f.key, e.target.value)} />
                {f.upload && (
                  <Uploader accept={`${f.upload}/*`} label="↑" onUploaded={(url) => set(f.key, url)} />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="adm-actions" style={{ marginTop: "1.2rem" }}>
        <button className="adm-btn solid" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save Settings"}</button>
        {msg && <span className="adm-msg">{msg}</span>}
      </div>
    </div>
  );
}
