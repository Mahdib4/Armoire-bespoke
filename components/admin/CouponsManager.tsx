"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { describeCoupon } from "@/lib/coupon";

export type CouponForm = {
  id: string;
  code: string;
  description: string;
  type: "percent" | "fixed";
  value: number;
  minSubtotalTk: number;
  maxDiscountTk: number;
  appliesTo: "all" | "READYMADE" | "CUSTOM";
  categoryIds: string[];
  productIds: string[];
  startsAt: string;
  expiresAt: string;
  usageLimit: number;
  perEmailLimit: number;
  usedCount: number;
  active: boolean;
};

/** A readable code that is hard to mistype: no O/0 or I/1 confusion. */
function generateCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  let out = "";
  for (let i = 0; i < 4; i++) out += letters[Math.floor(Math.random() * letters.length)];
  for (let i = 0; i < 3; i++) out += digits[Math.floor(Math.random() * digits.length)];
  return out;
}

export type CouponProduct = { id: string; name: string; categoryName: string; image: string };

export default function CouponsManager({
  coupons,
  categories,
  products,
}: {
  coupons: CouponForm[];
  categories: { id: string; name: string }[];
  products: CouponProduct[];
}) {
  const router = useRouter();
  const [newCode, setNewCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = newCode.trim();
    if (!code) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not create it.");
      setNewCode("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create it.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <form className="adm-panel adm-newcamp" onSubmit={create}>
        <div className="adm-field" style={{ flex: 1 }}>
          <label>New Code</label>
          <input
            value={newCode}
            onChange={(e) => setNewCode(e.target.value.toUpperCase())}
            placeholder="e.g. EID25"
          />
        </div>
        <button className="adm-btn" type="button" onClick={() => setNewCode(generateCode())}>
          Generate
        </button>
        <button className="adm-btn solid" disabled={creating || !newCode.trim()}>
          {creating ? "Creating…" : "Create Code"}
        </button>
        {error && <span className="adm-msg err">{error}</span>}
      </form>

      {coupons.length === 0 ? (
        <div className="adm-panel">
          <p className="adm-hint" style={{ margin: 0 }}>
            No codes yet. Create one above, then set what it takes off, when it expires and how many
            times it may be used.
          </p>
        </div>
      ) : (
        coupons.map((c) => (
          <CouponCard key={c.id} coupon={c} categories={categories} products={products} />
        ))
      )}
    </>
  );
}

function CouponCard({
  coupon,
  categories,
  products,
}: {
  coupon: CouponForm;
  categories: { id: string; name: string }[];
  products: CouponProduct[];
}) {
  const router = useRouter();
  const [f, setF] = useState<CouponForm>(coupon);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [q, setQ] = useState("");
  const upd = <K extends keyof CouponForm>(k: K, v: CouponForm[K]) => setF((p) => ({ ...p, [k]: v }));

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return products
      .filter((p) => !f.productIds.includes(p.id))
      .filter(
        (p) => p.name.toLowerCase().includes(term) || p.categoryName.toLowerCase().includes(term)
      )
      .slice(0, 20);
  }, [products, q, f.productIds]);

  const addProduct = (id: string) => {
    setF((p) => ({ ...p, productIds: [...p.productIds, id] }));
    setQ("");
  };
  const removeProduct = (id: string) =>
    setF((p) => ({ ...p, productIds: p.productIds.filter((x) => x !== id) }));

  const toggleCategory = (id: string) =>
    setF((p) => ({
      ...p,
      categoryIds: p.categoryIds.includes(id)
        ? p.categoryIds.filter((x) => x !== id)
        : [...p.categoryIds, id],
    }));

  const save = async (extra: Record<string, unknown> = {}) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/coupons/${f.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: f.code,
          description: f.description || null,
          type: f.type,
          value: Math.max(0, Math.round(Number(f.value) || 0)),
          minSubtotalTk: Math.max(0, Math.round(Number(f.minSubtotalTk) || 0)),
          maxDiscountTk: Math.max(0, Math.round(Number(f.maxDiscountTk) || 0)),
          appliesTo: f.appliesTo,
          categoryIds: f.categoryIds,
          productIds: f.productIds,
          startsAt: f.startsAt || null,
          expiresAt: f.expiresAt || null,
          usageLimit: Math.max(0, Math.round(Number(f.usageLimit) || 0)),
          perEmailLimit: Math.max(0, Math.round(Number(f.perEmailLimit) || 0)),
          active: f.active,
          ...extra,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Save failed.");
      setMsg({ ok: true, text: "Saved." });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Save failed." });
    } finally {
      setBusy(false);
    }
  };

  const usageLeft =
    f.usageLimit > 0 ? `${f.usedCount} of ${f.usageLimit} used` : `${f.usedCount} used`;

  return (
    <div className="adm-panel">
      <h3>
        {f.code}
        <span className="adm-coupon-sum">
          {describeCoupon(f)} · {usageLeft}
        </span>
      </h3>

      <div className="adm-form-grid">
        <div className="adm-field">
          <label>Code</label>
          <input value={f.code} onChange={(e) => upd("code", e.target.value.toUpperCase())} />
        </div>
        <div className="adm-field">
          <label>Status</label>
          <div className="adm-toggle">
            <button type="button" className={f.active ? "on" : ""} onClick={() => upd("active", true)}>
              Active
            </button>
            <button type="button" className={!f.active ? "on" : ""} onClick={() => upd("active", false)}>
              Off
            </button>
          </div>
        </div>
        <div className="adm-field">
          <label>Discount Type</label>
          <div className="adm-toggle">
            <button type="button" className={f.type === "percent" ? "on" : ""} onClick={() => upd("type", "percent")}>
              Percent
            </button>
            <button type="button" className={f.type === "fixed" ? "on" : ""} onClick={() => upd("type", "fixed")}>
              Flat Tk
            </button>
          </div>
        </div>
        <div className="adm-field">
          <label>{f.type === "percent" ? "Percent off (%)" : "Amount off (Tk)"}</label>
          <input
            type="number"
            min={0}
            max={f.type === "percent" ? 100 : undefined}
            value={f.value}
            onChange={(e) => upd("value", Number(e.target.value))}
          />
        </div>
        <div className="adm-field">
          <label>Minimum Order (Tk)</label>
          <input
            type="number"
            min={0}
            value={f.minSubtotalTk}
            onChange={(e) => upd("minSubtotalTk", Number(e.target.value))}
          />
          <span className="adm-hint">0 = no minimum.</span>
        </div>
        {f.type === "percent" && (
          <div className="adm-field">
            <label>Maximum Discount (Tk)</label>
            <input
              type="number"
              min={0}
              value={f.maxDiscountTk}
              onChange={(e) => upd("maxDiscountTk", Number(e.target.value))}
            />
            <span className="adm-hint">Caps a percentage code. 0 = no cap.</span>
          </div>
        )}
        <div className="adm-field">
          <label>Total Uses</label>
          <input
            type="number"
            min={0}
            value={f.usageLimit}
            onChange={(e) => upd("usageLimit", Number(e.target.value))}
          />
          <span className="adm-hint">How many orders may use it. 0 = unlimited.</span>
        </div>
        <div className="adm-field">
          <label>Uses per Customer</label>
          <input
            type="number"
            min={0}
            value={f.perEmailLimit}
            onChange={(e) => upd("perEmailLimit", Number(e.target.value))}
          />
          <span className="adm-hint">Counted by email address. 0 = unlimited.</span>
        </div>
        <div className="adm-field">
          <label>Starts</label>
          <input
            type="datetime-local"
            value={f.startsAt}
            onChange={(e) => upd("startsAt", e.target.value)}
          />
          <span className="adm-hint">Blank = works straight away.</span>
        </div>
        <div className="adm-field">
          <label>Expires</label>
          <input
            type="datetime-local"
            value={f.expiresAt}
            onChange={(e) => upd("expiresAt", e.target.value)}
          />
          <span className="adm-hint">Blank = never expires.</span>
        </div>
        <div className="adm-field">
          <label>Applies To</label>
          <select
            value={f.appliesTo}
            onChange={(e) => upd("appliesTo", e.target.value as CouponForm["appliesTo"])}
          >
            <option value="all">Everything</option>
            <option value="READYMADE">Ready-Made only</option>
            <option value="CUSTOM">Tailor-Made only</option>
          </select>
        </div>
        <div className="adm-field wide">
          <label>Note (for your own reference)</label>
          <input value={f.description} onChange={(e) => upd("description", e.target.value)} />
        </div>
        <div className="adm-field wide">
          <label>Limit to Collections</label>
          <div className="chip-row">
            <button
              type="button"
              className={`chip ${f.categoryIds.length === 0 ? "on" : ""}`}
              onClick={() => upd("categoryIds", [])}
            >
              Every collection
            </button>
            {categories.map((c) => (
              <button
                type="button"
                key={c.id}
                className={`chip ${f.categoryIds.includes(c.id) ? "on" : ""}`}
                onClick={() => toggleCategory(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
          <span className="adm-hint">
            With nothing ticked here or chosen below, the code works across the whole catalogue.
            Fabric sold by the yard is never discounted.
          </span>
        </div>

        <div className="adm-field wide">
          <label>Limit to Individual Pieces</label>
          {f.productIds.length > 0 && (
            <div className="camp-items" style={{ marginBottom: "0.7rem" }}>
              {f.productIds.map((id) => {
                const p = byId.get(id);
                if (!p) return null;
                return (
                  <div className="camp-item" key={id}>
                    {p.image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={p.image} alt="" className="adm-thumb" loading="lazy" decoding="async" />
                    ) : (
                      <div className="adm-thumb" />
                    )}
                    <div className="camp-item-name">
                      <strong>{p.name}</strong>
                      <small>{p.categoryName}</small>
                    </div>
                    <button
                      className="adm-btn sm danger"
                      type="button"
                      onClick={() => removeProduct(id)}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <div className="camp-picker">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search a product to add…"
              aria-label="Search products"
            />
          </div>
          {matches.length > 0 && (
            <div className="camp-pick-list">
              {matches.map((p) => (
                <button key={p.id} type="button" className="camp-pick" onClick={() => addProduct(p.id)}>
                  {p.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={p.image} alt="" loading="lazy" decoding="async" />
                  ) : (
                    <span className="camp-pick-noimg" />
                  )}
                  <span>
                    <strong>{p.name}</strong>
                    <small>{p.categoryName}</small>
                  </span>
                  <em>+</em>
                </button>
              ))}
            </div>
          )}
          <span className="adm-hint">
            Use this for a code that only discounts one piece, or a handful. Collections and pieces
            add together: tick <strong>Blazer</strong> and add one shirt, and the code covers every
            blazer plus that shirt.
          </span>
        </div>
      </div>

      <div className="adm-actions">
        <button className="adm-btn solid" onClick={() => save()} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </button>
        {msg && <span className={`adm-msg ${msg.ok ? "" : "err"}`}>{msg.text}</span>}
        <span style={{ flex: 1 }} />
        {f.usedCount > 0 && (
          <button
            className="adm-btn sm"
            onClick={() => {
              if (confirm(`Reset "${f.code}" back to 0 uses?`)) {
                setF((p) => ({ ...p, usedCount: 0 }));
                save({ resetUsage: true });
              }
            }}
            disabled={busy}
          >
            Reset uses
          </button>
        )}
        <button
          className="adm-btn sm danger"
          onClick={async () => {
            if (!confirm(`Delete the code "${f.code}"?`)) return;
            setBusy(true);
            await fetch(`/api/admin/coupons/${f.id}`, { method: "DELETE" });
            router.refresh();
          }}
          disabled={busy}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
