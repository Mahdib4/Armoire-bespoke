"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Uploader from "./Uploader";
import { formatTk } from "@/lib/format";

export type FabricRow = {
  name: string;
  image: string;
  images: string[];
  price: number;
  categories: string[]; // category slugs; empty = every collection
  show: boolean;
  active: boolean;
};
type Category = { slug: string; name: string };

export default function FabricsManager({
  fabrics,
  categories,
}: {
  fabrics: FabricRow[];
  categories: Category[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<FabricRow[]>(fabrics);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("");

  const set = (i: number, patch: Partial<FabricRow>) =>
    setRows((list) => list.map((r, x) => (x === i ? { ...r, ...patch } : r)));

  const toggleCat = (i: number, slug: string) => {
    const cur = rows[i].categories;
    set(i, { categories: cur.includes(slug) ? cur.filter((c) => c !== slug) : [...cur, slug] });
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const list = [...rows];
    [list[i], list[j]] = [list[j], list[i]];
    setRows(list);
  };

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const cleaned = rows
        .filter((r) => r.name.trim())
        .map((r) => ({
          name: r.name.trim(),
          image: r.image || "",
          images: r.images.filter(Boolean),
          price: Number(r.price) || 0,
          categories: r.categories,
          show: r.show,
          active: r.active,
        }));
      const res = await fetch("/api/admin/sections/fabric", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: JSON.stringify({ swatches: cleaned }) }),
      });
      if (!res.ok) throw new Error();
      setMsg("Saved. Fabrics are live.");
      router.refresh();
    } catch {
      setMsg("Save failed.");
    } finally {
      setBusy(false);
    }
  };

  // A new cloth starts scoped to whatever collection is being filtered, so
  // "show Shirt fabrics -> Add Fabric" gives a shirt fabric straight away.
  const add = () =>
    setRows((list) => [
      ...list,
      {
        name: "",
        image: "",
        images: [],
        price: 0,
        categories: filter ? [filter] : [],
        show: true,
        active: true,
      },
    ]);

  const visible = rows
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => !filter || r.categories.length === 0 || r.categories.includes(filter));

  const catName = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;

  return (
    <div>
      <div className="adm-panel">
        <h3>Which collection?</h3>
        <p className="adm-hint">
          Tick the collections each cloth is used for — blazer fabrics, shirt fabrics and so on are kept
          separate. A fabric with nothing ticked is offered on every collection. Filter the list below to work
          on one collection at a time.
        </p>
        <div className="chip-row">
          <button type="button" className={`chip ${!filter ? "on" : ""}`} onClick={() => setFilter("")}>
            All fabrics ({rows.length})
          </button>
          {categories.map((c) => {
            const n = rows.filter(
              (r) => r.categories.length === 0 || r.categories.includes(c.slug)
            ).length;
            return (
              <button
                type="button"
                key={c.slug}
                className={`chip ${filter === c.slug ? "on" : ""}`}
                onClick={() => setFilter(c.slug)}
              >
                {c.name} ({n})
              </button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 && (
        <p className="adm-empty">
          No fabrics for this collection yet — click Add Fabric below and it will be scoped here.
        </p>
      )}

      {visible.map(({ r, i }) => (
        <div className="adm-panel" key={i}>
          <div className="adm-form-grid">
            <div className="adm-field">
              <label>Fabric Name</label>
              <input
                value={r.name}
                placeholder="e.g. Egyptian Cotton Poplin"
                onChange={(e) => set(i, { name: e.target.value })}
              />
            </div>
            <div className="adm-field">
              <label>Price per Yard (Tk)</label>
              <input
                type="number"
                min={0}
                value={r.price}
                onChange={(e) => set(i, { price: Number(e.target.value) || 0 })}
              />
              <span className="adm-hint">Sets the garment price: tailoring charge + this × yards.</span>
            </div>
            <div className="adm-field">
              <label>Availability</label>
              <div className="adm-toggle">
                <button type="button" className={r.active ? "on" : ""} onClick={() => set(i, { active: true })}>
                  Live
                </button>
                <button type="button" className={!r.active ? "on" : ""} onClick={() => set(i, { active: false })}>
                  Hidden
                </button>
              </div>
              <span className="adm-hint">Hidden = not offered anywhere.</span>
            </div>
            <div className="adm-field">
              <label>Fabric Collection Section</label>
              <div className="adm-toggle">
                <button type="button" className={r.show ? "on" : ""} onClick={() => set(i, { show: true })}>
                  Show
                </button>
                <button type="button" className={!r.show ? "on" : ""} onClick={() => set(i, { show: false })}>
                  Hide
                </button>
              </div>
              <span className="adm-hint">Whether it appears in the public Fabric Collection and fabric shop.</span>
            </div>

            <div className="adm-field wide">
              <label>Used For</label>
              <div className="chip-row">
                {categories.map((c) => (
                  <button
                    type="button"
                    key={c.slug}
                    className={`chip ${r.categories.includes(c.slug) ? "on" : ""}`}
                    onClick={() => toggleCat(i, c.slug)}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              <span className="adm-hint">
                {r.categories.length === 0
                  ? "Nothing ticked — offered on every collection."
                  : `Offered on: ${r.categories.map(catName).join(", ")}`}
              </span>
            </div>

            <div className="adm-field wide">
              <label>Photos</label>
              <div className="adm-swatch-gallery">
                {r.image && (
                  <span className="adm-swatch-galimg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.image} alt="" />
                    <button type="button" onClick={() => set(i, { image: "" })}>
                      ✕
                    </button>
                  </span>
                )}
                {r.images.map((g, gi) => (
                  <span className="adm-swatch-galimg" key={gi}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g} alt="" />
                    <button
                      type="button"
                      onClick={() => set(i, { images: r.images.filter((_, x) => x !== gi) })}
                    >
                      ✕
                    </button>
                  </span>
                ))}
                <Uploader
                  accept="image/*"
                  label={r.image ? "+ Photo" : "Cover photo"}
                  onUploaded={(url) => (r.image ? set(i, { images: [...r.images, url] }) : set(i, { image: url }))}
                />
              </div>
            </div>
          </div>

          <div className="adm-actions">
            <span className="adm-hint" style={{ margin: 0 }}>
              {r.price > 0 ? `${formatTk(r.price)} / yd` : "no price set"}
            </span>
            <span style={{ flex: 1 }} />
            <button className="adm-btn sm" type="button" onClick={() => move(i, -1)} disabled={i === 0}>
              ↑
            </button>
            <button
              className="adm-btn sm"
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === rows.length - 1}
            >
              ↓
            </button>
            <button
              className="adm-btn sm danger"
              type="button"
              onClick={() => {
                if (!confirm(`Remove "${r.name || "this fabric"}"?`)) return;
                setRows((list) => list.filter((_, x) => x !== i));
              }}
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      <div className="adm-actions adm-sticky-save">
        <button className="adm-btn" type="button" onClick={add}>
          + Add Fabric
        </button>
        <button className="adm-btn solid" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save Fabrics"}
        </button>
        {msg && <span className="adm-msg">{msg}</span>}
      </div>
    </div>
  );
}
