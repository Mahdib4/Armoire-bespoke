"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type SubCategoryRow = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  productCount: number;
  /** The pieces currently in it. */
  productIds: string[];
};

/** A product in this collection, offered for assignment. */
export type SubCategoryProduct = { id: string; name: string; image: string };

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
  products,
}: {
  categoryId: string;
  categoryName: string;
  subCategories: SubCategoryRow[];
  /** Every product in this collection — the only ones assignable. */
  products: SubCategoryProduct[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<SubCategoryRow[]>(subCategories);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  /** Which row has its product list open. */
  const [openRow, setOpenRow] = useState<string | null>(null);

  /** A piece can only sit in one sub-category, so anything already claimed
   *  elsewhere is offered with a note rather than silently moved. */
  const ownerOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) for (const id of r.productIds) m.set(id, r.name);
    return m;
  }, [rows]);

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
      setRows((r) => [
        ...r,
        { id: data.id, name, slug: data.slug, active: true, productCount: 0, productIds: [] },
      ]);
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

  /** Add or remove a piece, saving the whole line-up straight away. */
  const setProducts = (rowId: string, productIds: string[]) => {
    setRows((r) =>
      r.map((x) =>
        x.id === rowId ? { ...x, productIds, productCount: productIds.length } : x
      )
    );
    patch(rowId, { productIds });
  };

  const assign = (rowId: string, productId: string) => {
    const row = rows.find((x) => x.id === rowId);
    if (!row || row.productIds.includes(productId)) return;
    // Moving a piece out of another sub-category is reflected here too, so the
    // counts on screen stay honest without a reload.
    setRows((r) =>
      r.map((x) => {
        if (x.id === rowId) {
          const next = [...x.productIds, productId];
          return { ...x, productIds: next, productCount: next.length };
        }
        if (x.productIds.includes(productId)) {
          const next = x.productIds.filter((p) => p !== productId);
          return { ...x, productIds: next, productCount: next.length };
        }
        return x;
      })
    );
    patch(rowId, { productIds: [...row.productIds, productId] });
  };

  return (
    <div className="adm-subs">
      <label className="adm-subs-head">Sub-Categories</label>
      <p className="adm-hint">
        Group this collection&rsquo;s pieces — for example Blazer into Tuxedo, Suit Set and Nehru.
        Press <strong>Products</strong> on a row to choose which pieces belong to it — or set it on
        the product&rsquo;s own screen. Shoppers get them as filters on the collection page.
        Changes here save straight away.
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
          <button
            className="adm-btn sm"
            type="button"
            onClick={() => setOpenRow(openRow === row.id ? null : row.id)}
            aria-expanded={openRow === row.id}
          >
            {openRow === row.id ? "Done" : "Products"}
          </button>
          <button className="adm-btn sm danger" type="button" onClick={() => remove(row)} disabled={busy}>
            ✕
          </button>

          {openRow === row.id && (
            <div className="adm-sub-products">
              <p className="adm-hint" style={{ marginTop: 0 }}>
                Pieces in <strong>{row.name}</strong>. A piece belongs to one sub-category at a time,
                so adding it here takes it out of any other.
              </p>
              <div className="camp-pick-list">
                {products.map((p) => {
                  const mine = row.productIds.includes(p.id);
                  const owner = ownerOf.get(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`camp-pick ${mine ? "on" : ""}`}
                      onClick={() =>
                        mine
                          ? setProducts(row.id, row.productIds.filter((x) => x !== p.id))
                          : assign(row.id, p.id)
                      }
                    >
                      {p.image ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={p.image} alt="" loading="lazy" decoding="async" />
                      ) : (
                        <span className="camp-pick-noimg" />
                      )}
                      <span>
                        <strong>{p.name}</strong>
                        {!mine && owner && <small>in {owner}</small>}
                      </span>
                      <em>{mine ? "✓" : "+"}</em>
                    </button>
                  );
                })}
                {products.length === 0 && (
                  <p className="adm-hint">
                    This collection has no products yet — add one under Products first.
                  </p>
                )}
              </div>
            </div>
          )}
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
