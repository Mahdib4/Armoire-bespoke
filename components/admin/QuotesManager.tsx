"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Quote = { id: string; slot: string; text: string; attribution: string | null };

function Row({ q }: { q: Quote }) {
  const router = useRouter();
  const [text, setText] = useState(q.text);
  const [attribution, setAttribution] = useState(q.attribution || "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    await fetch(`/api/admin/quotes/${q.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, attribution: attribution || null }),
    });
    setBusy(false);
    router.refresh();
  };
  const del = async () => {
    if (!confirm("Delete this quote?")) return;
    await fetch(`/api/admin/quotes/${q.id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <div className="adm-panel">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.6rem" }}>
        <span className="adm-badge custom">{q.slot}</span>
        <button className="adm-btn sm danger" onClick={del}>Delete</button>
      </div>
      <div className="adm-field wide" style={{ marginBottom: "0.6rem" }}>
        <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <div className="adm-actions">
        <input placeholder="Attribution (optional)" value={attribution} onChange={(e) => setAttribution(e.target.value)}
          style={{ background: "#0b0b0b", border: "1px solid var(--border)", color: "var(--ivory)", padding: "0.5rem 0.7rem", flex: 1 }} />
        <button className="adm-btn solid" onClick={save} disabled={busy}>{busy ? "…" : "Save"}</button>
      </div>
    </div>
  );
}

export default function QuotesManager({ quotes }: { quotes: Quote[] }) {
  const router = useRouter();
  const [slot, setSlot] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const add = async () => {
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/admin/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot, text }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(data?.error || "Failed"); return; }
    setSlot(""); setText("");
    router.refresh();
  };

  return (
    <div>
      {quotes.map((q) => <Row key={q.id} q={q} />)}
      <div className="adm-panel">
        <h3>Add Quote</h3>
        <div className="adm-form-grid">
          <div className="adm-field">
            <label>Slot (e.g. after-blazer)</label>
            <input value={slot} onChange={(e) => setSlot(e.target.value)} />
          </div>
          <div className="adm-field wide">
            <label>Text</label>
            <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} />
          </div>
        </div>
        <div className="adm-actions">
          <button className="adm-btn solid" onClick={add} disabled={busy || !slot || !text}>Add</button>
          {err && <span className="adm-msg err">{err}</span>}
        </div>
      </div>
    </div>
  );
}
