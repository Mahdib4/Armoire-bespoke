"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SectionEditor({
  section,
}: {
  section: { key: string; title: string; subtitle: string; body: string };
}) {
  const router = useRouter();
  const [f, setF] = useState(section);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/sections/${f.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: f.title || null, subtitle: f.subtitle || null, body: f.body || null }),
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
      <div className="adm-actions">
        <button className="adm-btn solid" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        {msg && <span className="adm-msg">{msg}</span>}
      </div>
    </div>
  );
}
