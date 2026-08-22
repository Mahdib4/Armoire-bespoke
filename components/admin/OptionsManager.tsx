"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Uploader from "./Uploader";
import { optionMultiKey } from "@/lib/options";

export type OptionGroup = {
  id: string;
  kind: string;
  name: string;
  categoryId: string | null;
  referenceUrl: string;
  order: number;
  choices: string[];
  /** true = the customer may pick several of these choices. */
  multi: boolean;
  productCount: number;
};
type Category = { id: string; name: string };

/** Editor for one option group: its name, the collection it belongs to, and
 *  the choices a customer picks from. */
function GroupCard({ group, categories }: { group: OptionGroup; categories: Category[] }) {
  const router = useRouter();
  const [g, setG] = useState<OptionGroup>(group);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const upd = <K extends keyof OptionGroup>(k: K, v: OptionGroup[K]) => setG((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const [res] = await Promise.all([
        fetch(`/api/admin/options/${g.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: g.name,
            categoryId: g.categoryId,
            referenceUrl: g.referenceUrl || null,
            order: Number(g.order),
            choices: g.choices.map((c) => c.trim()).filter(Boolean),
          }),
        }),
        // Single vs multiple lives in Site Settings so it needs no migration.
        fetch("/api/admin/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            settings: [{ key: optionMultiKey(g.id), value: g.multi ? "1" : "0" }],
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

  return (
    <div className="adm-panel">
      <h3>{g.name}</h3>

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
            Limit this option to one collection, or leave it available to all.
          </span>
        </div>
        <div className="adm-field">
          <label>Display Order</label>
          <input type="number" value={g.order} onChange={(e) => upd("order", Number(e.target.value))} />
        </div>
        <div className="adm-field">
          <label>How Many Can Be Chosen</label>
          <div className="adm-toggle">
            <button type="button" className={!g.multi ? "on" : ""} onClick={() => upd("multi", false)}>
              One only
            </button>
            <button type="button" className={g.multi ? "on" : ""} onClick={() => upd("multi", true)}>
              More than one
            </button>
          </div>
          <span className="adm-hint">
            &ldquo;More than one&rdquo; lets the customer tick several choices — e.g. a Vent Style with two
            selections. They arrive on the order comma separated.
          </span>
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
}: {
  groups: OptionGroup[];
  categories: Category[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
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
          categoryId: categoryId || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not create the option.");
      setName("");
      setCategoryId("");
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
          Scope it to one collection or leave it available to all. Fabrics are not set here: they live in{" "}
          <Link href="/admin/fabrics" className="adm-link">Fabrics</Link>, and every tailor-made piece
          automatically offers its collection&rsquo;s cloths.
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
          <GroupCard group={g} categories={categories} />
        </div>
      ))}
    </div>
  );
}
