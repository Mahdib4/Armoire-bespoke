"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export type SubCategoryRow = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  productCount: number;
};

/**
 * Sub-collections inside a collection (Blazer → Tuxedo, Suit Set, Nehru).
 *
 * Each row saves on its own as soon as it is changed, so this panel is
 * independent of the collection's own Save button. Deleting one never deletes
 * products: they simply return to the collection with no sub-category.
 */
export default function SubCategoriesEditor({
  categoryId,
  categoryName,
  subCategories,
}: {
  categoryId: string;
  categoryName: string;
  subCategories: SubCategoryRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<SubCategoryRow[]>(subCategories);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const say = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 2600);
  };

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/subcategories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not add it.");
      setRows((r) => [...r, { id: data.id, name, slug: data.slug, active: true, productCount: 0 }]);
      setNewName("");
      say(true, `"${name}" added.`);
      router.refresh();
    } catch (e) {
      say(false, e instanceof Error ? e.message : "Could not add it.");
    } finally {
      setBusy(false);
    }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/subcategories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      say(true, "Saved.");
      router.refresh();
    } catch {
      say(false, "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: SubCategoryRow) => {
    const warning =
      row.productCount > 0
        ? `Delete "${row.name}"? Its ${row.productCount} product(s) stay in ${categoryName} — they just lose this sub-category.`
        : `Delete "${row.name}"?`;
    if (!confirm(warning)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/subcategories/${row.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRows((r) => r.filter((x) => x.id !== row.id));
      say(true, "Deleted.");
      router.refresh();
    } catch {
      say(false, "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  const rename = (id: string, name: string) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, name } : x)));

  return (
    <div className="adm-subs">
      <label className="adm-subs-head">Sub-Categories</label>
      <p className="adm-hint">
        Group this collection&rsquo;s pieces — for example Blazer into Tuxedo, Suit Set and Nehru.
        Shoppers get them as filters on the collection page, and each product picks its
        sub-category on its own screen. Changes here save straight away.
      </p>

      {rows.map((row) => (
        <div className="adm-sub-row" key={row.id}>
          <input
            value={row.name}
            onChange={(e) => rename(row.id, e.target.value)}
            onBlur={(e) => {
              const name = e.target.value.trim();
              if (name && name !== subCategories.find((s) => s.id === row.id)?.name) {
                patch(row.id, { name });
              }
            }}
            aria-label="Sub-category name"
          />
          <span className="adm-sub-count">
            {row.productCount} item{row.productCount === 1 ? "" : "s"}
          </span>
          <div className="adm-toggle sm">
            <button
              type="button"
              className={row.active ? "on" : ""}
              onClick={() => {
                setRows((r) => r.map((x) => (x.id === row.id ? { ...x, active: true } : x)));
                patch(row.id, { active: true });
              }}
            >
              Shown
            </button>
            <button
              type="button"
              className={!row.active ? "on" : ""}
              onClick={() => {
                setRows((r) => r.map((x) => (x.id === row.id ? { ...x, active: false } : x)));
                patch(row.id, { active: false });
              }}
            >
              Hidden
            </button>
          </div>
          <button className="adm-btn sm danger" type="button" onClick={() => remove(row)} disabled={busy}>
            ✕
          </button>
        </div>
      ))}

      <div className="adm-sub-add">
        <input
          value={newName}
          placeholder="New sub-category (e.g. Tuxedo)"
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button className="adm-btn sm" type="button" onClick={add} disabled={busy || !newName.trim()}>
          + Add
        </button>
        {msg && <span className={`adm-msg ${msg.ok ? "" : "err"}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
