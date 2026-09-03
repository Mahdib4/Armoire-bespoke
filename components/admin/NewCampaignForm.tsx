"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** Start a campaign. It is created switched off, so nothing appears on the site
 *  until it has its pieces and its offer and is set Live. */
export default function NewCampaignForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not create it.");
      router.push(`/admin/campaigns/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create it.");
      setBusy(false);
    }
  };

  return (
    <form className="adm-panel adm-newcamp" onSubmit={submit}>
      <div className="adm-field" style={{ flex: 1 }}>
        <label>New Campaign</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Eid Collection 2026"
        />
      </div>
      <button className="adm-btn solid" disabled={busy || !name.trim()}>
        {busy ? "Creating…" : "Create & Set Up"}
      </button>
      {error && <span className="adm-msg err">{error}</span>}
    </form>
  );
}
