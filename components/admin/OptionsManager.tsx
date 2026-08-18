"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Uploader from "./Uploader";
import { formatTk } from "@/lib/format";

export type OptionGroup = {
  id: string;
  kind: string;
  name: string;
  categoryId: string | null;
  referenceUrl: string;
  order: number;
  choices: string[];
  productCount: number;
};
type Category = { id: string; name: string };
type Fabric = { name: string; price: number };

/** Editor for one option group. Fabric groups pick their choices from the
 *  priced Fabric Collection so tailor-made pricing stays correct. */
function GroupCard({
  group,
  categories,
  fabrics,
}: {
  group: OptionGroup;
  categories: Category[];
  fabrics: Fabric[];
}) {
  const router = useRouter();
  const [g, setG] = useState<OptionGroup>(group);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const isFabric = g.kind === "fabric";

  const upd = <K extends keyof OptionGroup>(k: K, v: OptionGroup[K]) => setG((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/options/${g.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: g.name,
          categoryId: g.categoryId,
          referenceUrl: g.referenceUrl || null,
          order: Number(g.order),
          choices: g.choices.map((c) => c.trim()).filter(Boolean),
        }),
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

  const del = async () => {
    const warn =
      g.productCount > 0
        ? `Delete "${g.name}"? It is used by ${g.productCount} product(s) and will be removed from them.`
        : `Delete "${g.name}"?`;
    if (!confirm(warn)) return;
    setBusy(true);
    await fetch(`/api/admin/options/${g.id}`, { method: "DELETE" });
    router.refresh();
  };

  const toggleFabric = (name: string) => {
    upd("choices", g.choices.includes(name) ? g.choices.filter((c) => c !== name) : [...g.choices, name]);
  };

  return (
    <div className="adm-panel">
      <h3>
        {g.name}
        {isFabric && <span className="adm-badge custom" style={{ marginLeft: "0.6rem" }}>FABRIC · PRICED</span>}
      </h3>

      <div className="adm-form-grid">
        <div className="adm-field">
          <label>Option Name</label>
          <input value={g.name} onChange={(e) => upd("name", e.target.value)} />
          <span className="adm-hint">Shown as the heading on the product page.</span>
        </div>
        <div className="adm-field">
          <label>Applies To</label>
          <select
            value={g.categoryId ?? ""}
            onChange={(e) => upd("categoryId", e.target.value || null)}
          >
            <option value="">All collections</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <span className="adm-hint">
            {isFabric
              ? "Which collection these fabrics are offered for."
              : "Limit this option to one collection, or leave it available to all."}
          </span>
        </div>
        <div className="adm-field">
          <label>Display Order</label>
          <input type="number" value={g.order} onChange={(e) => upd("order", Number(e.target.value))} />
        </div>
        <div className="adm-field wide" style={{ flexDirection: "row", alignItems: "flex-end", gap: "0.6rem" }}>
          <div style={{ flex: 1 }}>
            <label>Style Reference Image (optional)</label>
            <input value={g.referenceUrl} onChange={(e) => upd("referenceUrl", e.target.value)} />
          </div>
          <Uploader accept="image/*" label="Upload" onUploaded={(url) => upd("referenceUrl", url)} />
        </div>
      </div>

      {/* Choices */}
      <div style={{ marginTop: "1rem" }}>
        <label className="adm-sublabel">Choices</label>
        {isFabric ? (
          <>
            <p className="adm-hint">
              Tick the fabrics this collection is offered in. Prices come from the Fabric section and set the
              garment&rsquo;s price.
            </p>
            {fabrics.length === 0 ? (
              <p className="adm-empty">No fabrics yet — add them in Sections → Fabric Collection.</p>
            ) : (
              <div className="chip-row">
                {fabrics.map((fb) => (
                  <button
                    type="button"
                    key={fb.name}
                    className={`chip ${g.choices.includes(fb.name) ? "on" : ""}`}
                    onClick={() => toggleFabric(fb.name)}
                  >
                    {fb.name}
                    <em style={{ fontStyle: "normal", opacity: 0.7, marginLeft: "0.4rem" }}>
                      {fb.price > 0 ? `${formatTk(fb.price)}/yd` : "no price"}
                    </em>
                  </button>
                ))}
              </div>
            )}
            {g.choices.some((c) => !fabrics.find((fb) => fb.name === c)) && (
              <p className="adm-hint" style={{ color: "var(--gold)" }}>
                Some selected fabrics are no longer in the Fabric section:{" "}
                {g.choices.filter((c) => !fabrics.find((fb) => fb.name === c)).join(", ")}. Untick them to keep
                pricing correct.
              </p>
            )}
          </>
        ) : (
          <>
            <p className="adm-hint">
              e.g. Single-Breasted, Double-Breasted. These appear as buttons the customer picks from.
            </p>
            {g.choices.map((c, i) => (
              <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.45rem" }}>
                <input
                  value={c}
                  placeholder="Choice label"
                  onChange={(e) => {
                    const cs = [...g.choices];
                    cs[i] = e.target.value;
                    upd("choices", cs);
                  }}
                  style={{ maxWidth: 320 }}
                />
                <button
                  className="adm-btn sm"
                  type="button"
                  disabled={i === 0}
                  onClick={() => {
                    const cs = [...g.choices];
                    [cs[i - 1], cs[i]] = [cs[i], cs[i - 1]];
                    upd("choices", cs);
                  }}
                >
                  ↑
                </button>
                <button
                  className="adm-btn sm danger"
                  type="button"
                  onClick={() => upd("choices", g.choices.filter((_, x) => x !== i))}
                >
                  ✕
                </button>
              </div>
            ))}
            <button className="adm-btn sm" type="button" onClick={() => upd("choices", [...g.choices, ""])}>
              + Add Choice
            </button>
          </>
        )}
      </div>

      <div className="adm-actions" style={{ marginTop: "1.2rem" }}>
        <button className="adm-btn solid" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </button>
        {msg && <span className="adm-msg">{msg}</span>}
        <span style={{ flex: 1 }} />
        <span className="adm-hint" style={{ margin: 0 }}>
          Used by {g.productCount} product{g.productCount === 1 ? "" : "s"}
        </span>
        <button className="adm-btn sm danger" onClick={del} disabled={busy}>
          Delete
        </button>
      </div>
    </div>
  );
}

export default function OptionsManager({
  groups,
  categories,
  fabrics,
}: {
  groups: OptionGroup[];
  categories: Category[];
  fabrics: Fabric[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [asFabric, setAsFabric] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          kind: asFabric ? "fabric" : undefined,
          categoryId: categoryId || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not create the option.");
      setName("");
      setCategoryId("");
      setAsFabric(false);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not create the option.");
    } finally {
      setBusy(false);
    }
  };

  const scoped = (g: OptionGroup) =>
    g.categoryId ? categories.find((c) => c.id === g.categoryId)?.name ?? "—" : "All collections";

  return (
    <div>
      {/* Create */}
      <div className="adm-panel">
        <h3>Add an Option</h3>
        <p className="adm-hint">
          Create any specification you like — Breast Style, Lining, Monogram — then add its choices below.
          Scope it to one collection or leave it available to all.
        </p>
        <div className="adm-form-grid">
          <div className="adm-field">
            <label>Option Name</label>
            <input
              value={name}
              placeholder="e.g. Breast Style"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
            />
          </div>
          <div className="adm-field">
            <label>Applies To</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">All collections</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="adm-field">
            <label>Option Type</label>
            <div className="adm-toggle">
              <button type="button" className={!asFabric ? "on" : ""} onClick={() => setAsFabric(false)}>
                Style choices
              </button>
              <button type="button" className={asFabric ? "on" : ""} onClick={() => setAsFabric(true)}>
                Fabric (priced)
              </button>
            </div>
            <span className="adm-hint">
              Fabric options are picked from the Fabric section and set the garment&rsquo;s price. One per collection.
            </span>
          </div>
        </div>
        <div className="adm-actions">
          <button className="adm-btn solid" onClick={create} disabled={busy || !name.trim()}>
            {busy ? "Adding…" : "+ Add Option"}
          </button>
          {err && <span className="adm-msg err">{err}</span>}
        </div>
      </div>

      {groups.length === 0 && <p className="adm-empty">No bespoke options yet.</p>}

      {groups.map((g) => (
        <div key={g.id}>
          <div className="adm-group-scope">{scoped(g)}</div>
          <GroupCard group={g} categories={categories} fabrics={fabrics} />
        </div>
      ))}
    </div>
  );
}
