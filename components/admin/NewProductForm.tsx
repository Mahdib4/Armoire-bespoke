"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProductForm({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [type, setType] = useState<"CUSTOM" | "READYMADE">("CUSTOM");
  const [priceTk, setPriceTk] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, categoryId, type, priceTk }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      router.push(`/admin/products/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setBusy(false);
    }
  };

  return (
    <form className="adm-form" onSubmit={submit}>
      <div className="adm-form-grid">
        <div className="adm-field wide">
          <label>Product Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div className="adm-field">
          <label>Category</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="adm-field">
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as "CUSTOM" | "READYMADE")}>
            <option value="CUSTOM">Tailor Made</option>
            <option value="READYMADE">Ready Made</option>
          </select>
        </div>
        {type === "READYMADE" ? (
          <div className="adm-field">
            <label>Price (Tk)</label>
            <input type="number" min={0} value={priceTk} onChange={(e) => setPriceTk(Number(e.target.value))} />
          </div>
        ) : (
          <div className="adm-field wide">
            <label>Pricing</label>
            <span className="adm-hint">
              Tailor-Made price is calculated automatically from the tailoring charge + fabric price. You&rsquo;ll
              set the tailoring charge on the next screen.
            </span>
          </div>
        )}
      </div>
      {error && <p className="adm-msg err">{error}</p>}
      <div className="adm-actions">
        <button className="adm-btn solid" disabled={busy}>{busy ? "Creating…" : "Create & Edit"}</button>
      </div>
    </form>
  );
}
