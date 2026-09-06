"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Uploader from "./Uploader";
import DeleteButton from "./DeleteButton";
import { defaultBadgeText, type DiscountType } from "@/lib/campaign";

export type CampaignPick = {
  id: string;
  name: string;
  categoryName: string;
  type: string;
  image: string;
};

export type CampaignItemForm = {
  productId: string;
  /** "" = follow the campaign's discount. */
  discountType: "" | DiscountType;
  discountValue: number;
  badgeText: string;
  showBadge: boolean;
};

export type CampaignForm = {
  id: string;
  name: string;
  slug: string;
  headline: string;
  subhead: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  badgeText: string;
  showBadges: boolean;
  blockCoupons: boolean;
  accent: string;
  bannerType: "image" | "video";
  bannerUrl: string;
  posterUrl: string;
  ctaLabel: string;
  ctaHref: string;
  startsAt: string; // datetime-local value
  endsAt: string;
  active: boolean;
  showOnHome: boolean;
  popupShow: boolean;
  popupImage: string;
  popupTitle: string;
  popupBody: string;
  popupCta: string;
  popupHref: string;
  order: number;
  items: CampaignItemForm[];
};

/**
 * One campaign, end to end: what it says, what it takes off, when it runs,
 * which pieces are in it and whether a poster greets visitors.
 *
 * Everything is edited here and saved in one go, so a half-built campaign can
 * never appear on the site — it only shows once it is switched to Live.
 */
export default function CampaignEditor({
  campaign,
  products,
  siteUrl,
}: {
  campaign: CampaignForm;
  products: CampaignPick[];
  siteUrl: string;
}) {
  const router = useRouter();
  const [f, setF] = useState<CampaignForm>(campaign);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [q, setQ] = useState("");

  const upd = <K extends keyof CampaignForm>(k: K, v: CampaignForm[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const chosen = new Set(f.items.map((i) => i.productId));

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products
      .filter((p) => !chosen.has(p.id))
      .filter(
        (p) =>
          !term ||
          p.name.toLowerCase().includes(term) ||
          p.categoryName.toLowerCase().includes(term)
      )
      .slice(0, 40);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, q, f.items]);

  const addItem = (productId: string) =>
    setF((p) => ({
      ...p,
      items: [
        ...p.items,
        { productId, discountType: "", discountValue: 0, badgeText: "", showBadge: true },
      ],
    }));

  const removeItem = (productId: string) =>
    setF((p) => ({ ...p, items: p.items.filter((i) => i.productId !== productId) }));

  const updItem = (productId: string, patch: Partial<CampaignItemForm>) =>
    setF((p) => ({
      ...p,
      items: p.items.map((i) => (i.productId === productId ? { ...i, ...patch } : i)),
    }));

  const moveItem = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= f.items.length) return;
    const items = [...f.items];
    [items[index], items[j]] = [items[j], items[index]];
    setF((p) => ({ ...p, items }));
  };

  const addAllShown = () => {
    setF((p) => ({
      ...p,
      items: [
        ...p.items,
        ...matches.map((m) => ({
          productId: m.id,
          discountType: "" as const,
          discountValue: 0,
          badgeText: "",
          showBadge: true,
        })),
      ],
    }));
  };

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/campaigns/${f.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.name,
          slug: f.slug,
          headline: f.headline || null,
          subhead: f.subhead || null,
          description: f.description || null,
          discountType: f.discountType,
          discountValue: Math.max(0, Math.round(Number(f.discountValue) || 0)),
          badgeText: f.badgeText || null,
          showBadges: f.showBadges,
          blockCoupons: f.blockCoupons,
          accent: f.accent || null,
          bannerType: f.bannerType,
          bannerUrl: f.bannerUrl || null,
          posterUrl: f.posterUrl || null,
          ctaLabel: f.ctaLabel || null,
          ctaHref: f.ctaHref || null,
          startsAt: f.startsAt || null,
          endsAt: f.endsAt || null,
          active: f.active,
          showOnHome: f.showOnHome,
          popupShow: f.popupShow,
          popupImage: f.popupImage || null,
          popupTitle: f.popupTitle || null,
          popupBody: f.popupBody || null,
          popupCta: f.popupCta || null,
          popupHref: f.popupHref || null,
          order: Number(f.order),
          items: f.items.map((i) => ({
            productId: i.productId,
            discountType: i.discountType || null,
            discountValue: i.discountType ? Math.max(0, Math.round(Number(i.discountValue) || 0)) : null,
            badgeText: i.badgeText || null,
            showBadge: i.showBadge,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Save failed.");
      if (data.slug && data.slug !== f.slug) upd("slug", data.slug);
      setMsg({ ok: true, text: "Saved." });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Save failed." });
    } finally {
      setBusy(false);
    }
  };

  const previewBadge = f.badgeText || defaultBadgeText(f.discountType, Number(f.discountValue) || 0);
  const adLink = `${siteUrl.replace(/\/$/, "")}/campaign/${f.slug}`;

  return (
    <div className="adm-form">
      {/* What it says */}
      <div className="adm-panel">
        <h3>Campaign</h3>
        <div className="adm-form-grid">
          <div className="adm-field">
            <label>Name (internal)</label>
            <input value={f.name} onChange={(e) => upd("name", e.target.value)} />
          </div>
          <div className="adm-field">
            <label>Link</label>
            <input value={f.slug} onChange={(e) => upd("slug", e.target.value)} />
            <span className="adm-hint">
              The ad destination: <code>{adLink}</code>
            </span>
          </div>
          <div className="adm-field wide">
            <label>Headline (shown to customers)</label>
            <input value={f.headline} onChange={(e) => upd("headline", e.target.value)} />
          </div>
          <div className="adm-field wide">
            <label>Sub-heading</label>
            <input value={f.subhead} onChange={(e) => upd("subhead", e.target.value)} />
          </div>
          <div className="adm-field wide">
            <label>Description</label>
            <textarea rows={3} value={f.description} onChange={(e) => upd("description", e.target.value)} />
          </div>
        </div>
      </div>

      {/* The offer */}
      <div className="adm-panel">
        <h3>The Offer</h3>
        <p className="adm-hint">
          The discount every piece in this campaign gets. A piece can be given its own discount
          further down. Prices update on the site the moment the campaign is Live.
        </p>
        <div className="adm-form-grid">
          <div className="adm-field">
            <label>Discount</label>
            <div className="adm-toggle">
              <button type="button" className={f.discountType === "none" ? "on" : ""} onClick={() => upd("discountType", "none")}>None</button>
              <button type="button" className={f.discountType === "percent" ? "on" : ""} onClick={() => upd("discountType", "percent")}>Percent</button>
              <button type="button" className={f.discountType === "fixed" ? "on" : ""} onClick={() => upd("discountType", "fixed")}>Flat Tk</button>
            </div>
          </div>
          {f.discountType !== "none" && (
            <div className="adm-field">
              <label>{f.discountType === "percent" ? "Percent off (%)" : "Amount off (Tk)"}</label>
              <input
                type="number"
                min={0}
                max={f.discountType === "percent" ? 100 : undefined}
                value={f.discountValue}
                onChange={(e) => upd("discountValue", Number(e.target.value))}
              />
            </div>
          )}
          <div className="adm-field">
            <label>Corner Label</label>
            <input
              value={f.badgeText}
              placeholder={previewBadge || "e.g. 20% OFF"}
              onChange={(e) => upd("badgeText", e.target.value)}
            />
            <span className="adm-hint">Blank uses &ldquo;{previewBadge || "no label"}&rdquo;.</span>
          </div>
          <div className="adm-field">
            <label>Labels on Product Photos</label>
            <div className="adm-toggle">
              <button type="button" className={f.showBadges ? "on" : ""} onClick={() => upd("showBadges", true)}>Show</button>
              <button type="button" className={!f.showBadges ? "on" : ""} onClick={() => upd("showBadges", false)}>Hide</button>
            </div>
            <span className="adm-hint">The label sits in the top-right corner of the photo.</span>
          </div>
          <div className="adm-field">
            <label>Coupon Codes on these Pieces</label>
            <div className="adm-toggle">
              <button type="button" className={f.blockCoupons ? "on" : ""} onClick={() => upd("blockCoupons", true)}>Not allowed</button>
              <button type="button" className={!f.blockCoupons ? "on" : ""} onClick={() => upd("blockCoupons", false)}>Allowed</button>
            </div>
            <span className="adm-hint">
              These pieces are already reduced, so a coupon on top would discount them twice. Left on
              &ldquo;Not allowed&rdquo;, a customer entering a code sees
              &ldquo;Voucher not applicable for this product.&rdquo;
            </span>
          </div>
          <div className="adm-field">
            <label>Accent Colour</label>
            <div className="adm-color">
              <input type="color" value={f.accent || "#c9a84c"} onChange={(e) => upd("accent", e.target.value)} />
              <input value={f.accent} placeholder="#c9a84c" onChange={(e) => upd("accent", e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* When it runs */}
      <div className="adm-panel">
        <h3>Schedule &amp; Visibility</h3>
        <div className="adm-form-grid">
          <div className="adm-field">
            <label>Status</label>
            <div className="adm-toggle">
              <button type="button" className={f.active ? "on" : ""} onClick={() => upd("active", true)}>Live</button>
              <button type="button" className={!f.active ? "on" : ""} onClick={() => upd("active", false)}>Off</button>
            </div>
          </div>
          <div className="adm-field">
            <label>On the Homepage</label>
            <div className="adm-toggle">
              <button type="button" className={f.showOnHome ? "on" : ""} onClick={() => upd("showOnHome", true)}>Show</button>
              <button type="button" className={!f.showOnHome ? "on" : ""} onClick={() => upd("showOnHome", false)}>Hide</button>
            </div>
            <span className="adm-hint">Hidden still leaves the campaign page reachable for ads.</span>
          </div>
          <div className="adm-field">
            <label>Starts</label>
            <input type="datetime-local" value={f.startsAt} onChange={(e) => upd("startsAt", e.target.value)} />
            <span className="adm-hint">Blank = starts as soon as it&rsquo;s Live.</span>
          </div>
          <div className="adm-field">
            <label>Ends</label>
            <input type="datetime-local" value={f.endsAt} onChange={(e) => upd("endsAt", e.target.value)} />
            <span className="adm-hint">Blank = runs until switched off.</span>
          </div>
          <div className="adm-field">
            <label>Order</label>
            <input type="number" value={f.order} onChange={(e) => upd("order", Number(e.target.value))} />
          </div>
        </div>
      </div>

      {/* Banner + share image */}
      <div className="adm-panel">
        <h3>Banner</h3>
        <div className="adm-form-grid">
          <div className="adm-field">
            <label>Banner Type</label>
            <div className="adm-toggle">
              <button type="button" className={f.bannerType === "image" ? "on" : ""} onClick={() => upd("bannerType", "image")}>Image</button>
              <button type="button" className={f.bannerType === "video" ? "on" : ""} onClick={() => upd("bannerType", "video")}>Video</button>
            </div>
          </div>
          <div className="adm-field">
            <label>Button Text</label>
            <input value={f.ctaLabel} placeholder="Shop the campaign" onChange={(e) => upd("ctaLabel", e.target.value)} />
          </div>
          <div className="adm-field wide" style={{ flexDirection: "row", alignItems: "flex-end", gap: "0.6rem" }}>
            <div style={{ flex: 1 }}>
              <label>Banner URL ({f.bannerType})</label>
              <input value={f.bannerUrl} onChange={(e) => upd("bannerUrl", e.target.value)} />
            </div>
            <Uploader
              accept={f.bannerType === "video" ? "video/*" : "image/*"}
              label="Upload"
              onUploaded={(url) => upd("bannerUrl", url)}
            />
          </div>
          <div className="adm-field wide" style={{ flexDirection: "row", alignItems: "flex-end", gap: "0.6rem" }}>
            <div style={{ flex: 1 }}>
              <label>Share Image (Facebook / Instagram link preview)</label>
              <input value={f.posterUrl} onChange={(e) => upd("posterUrl", e.target.value)} />
            </div>
            <Uploader accept="image/*" label="Upload" onUploaded={(url) => upd("posterUrl", url)} />
          </div>
          <div className="adm-field wide">
            <label>Button Link</label>
            <input value={f.ctaHref} placeholder="Leave blank to stay on this page" onChange={(e) => upd("ctaHref", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Poster after the intro */}
      <div className="adm-panel">
        <h3>Welcome Poster</h3>
        <p className="adm-hint">
          A poster shown once per visit, right after the opening animation, inviting visitors into
          this campaign. Only one live campaign shows a poster — the first one with this switched on.
        </p>
        <div className="adm-form-grid">
          <div className="adm-field">
            <label>Poster</label>
            <div className="adm-toggle">
              <button type="button" className={f.popupShow ? "on" : ""} onClick={() => upd("popupShow", true)}>Show</button>
              <button type="button" className={!f.popupShow ? "on" : ""} onClick={() => upd("popupShow", false)}>Off</button>
            </div>
          </div>
          <div className="adm-field">
            <label>Button Text</label>
            <input value={f.popupCta} placeholder="View the campaign" onChange={(e) => upd("popupCta", e.target.value)} />
          </div>
          <div className="adm-field wide">
            <label>Title</label>
            <input value={f.popupTitle} placeholder={f.headline || f.name} onChange={(e) => upd("popupTitle", e.target.value)} />
          </div>
          <div className="adm-field wide">
            <label>Message</label>
            <textarea rows={2} value={f.popupBody} onChange={(e) => upd("popupBody", e.target.value)} />
          </div>
          <div className="adm-field wide" style={{ flexDirection: "row", alignItems: "flex-end", gap: "0.6rem" }}>
            <div style={{ flex: 1 }}>
              <label>Poster Image</label>
              <input value={f.popupImage} onChange={(e) => upd("popupImage", e.target.value)} />
            </div>
            <Uploader accept="image/*" label="Upload" onUploaded={(url) => upd("popupImage", url)} />
          </div>
          <div className="adm-field wide">
            <label>Button Link</label>
            <input
              value={f.popupHref}
              placeholder={`/campaign/${f.slug}`}
              onChange={(e) => upd("popupHref", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="adm-panel">
        <h3>Pieces in this Campaign</h3>
        <p className="adm-hint">
          Any product from any collection. Each one can take the campaign&rsquo;s discount or its own,
          and can show or hide its corner label. Drag order is set with the arrows.
        </p>

        {f.items.length === 0 && <p className="adm-hint">No pieces yet — search below to add some.</p>}

        <div className="camp-items">
          {f.items.map((item, i) => {
            const p = byId.get(item.productId);
            if (!p) return null;
            return (
              <div className="camp-item" key={item.productId}>
                <div className="camp-item-move">
                  <button type="button" onClick={() => moveItem(i, -1)} aria-label="Move up">↑</button>
                  <button type="button" onClick={() => moveItem(i, 1)} aria-label="Move down">↓</button>
                </div>
                {p.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={p.image} alt="" className="adm-thumb" loading="lazy" decoding="async" />
                ) : (
                  <div className="adm-thumb" />
                )}
                <div className="camp-item-name">
                  <strong>{p.name}</strong>
                  <small>
                    {p.categoryName} · {p.type === "CUSTOM" ? "Tailor Made" : "Ready Made"}
                  </small>
                </div>
                <div className="camp-item-disc">
                  <select
                    value={item.discountType}
                    onChange={(e) =>
                      updItem(item.productId, {
                        discountType: e.target.value as CampaignItemForm["discountType"],
                      })
                    }
                    aria-label="Discount for this piece"
                  >
                    <option value="">Campaign discount</option>
                    <option value="percent">Percent off</option>
                    <option value="fixed">Flat Tk off</option>
                    <option value="none">No discount</option>
                  </select>
                  {(item.discountType === "percent" || item.discountType === "fixed") && (
                    <input
                      type="number"
                      min={0}
                      value={item.discountValue}
                      onChange={(e) => updItem(item.productId, { discountValue: Number(e.target.value) })}
                      aria-label="Discount value"
                    />
                  )}
                </div>
                <label className="camp-item-badge">
                  <input
                    type="checkbox"
                    checked={item.showBadge}
                    onChange={(e) => updItem(item.productId, { showBadge: e.target.checked })}
                  />
                  <span>Label</span>
                </label>
                <button
                  className="adm-btn sm danger"
                  type="button"
                  onClick={() => removeItem(item.productId)}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        <div className="camp-picker">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products to add…"
            aria-label="Search products"
          />
          {q.trim() && matches.length > 0 && (
            <button className="adm-btn sm" type="button" onClick={addAllShown}>
              + Add all {matches.length}
            </button>
          )}
        </div>
        <div className="camp-pick-list">
          {matches.map((p) => (
            <button key={p.id} type="button" className="camp-pick" onClick={() => addItem(p.id)}>
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
          {matches.length === 0 && <p className="adm-hint">Every matching product is already in.</p>}
        </div>
      </div>

      <div className="adm-actions adm-sticky-save">
        <button className="adm-btn solid" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save Campaign"}
        </button>
        {msg && <span className={`adm-msg ${msg.ok ? "" : "err"}`}>{msg.text}</span>}
        <span style={{ flex: 1 }} />
        <DeleteButton
          endpoint={`/api/admin/campaigns/${f.id}`}
          label="Delete Campaign"
          confirmMsg={`Delete "${f.name}"? The products themselves are not touched.`}
          redirect="/admin/campaigns"
        />
      </div>
    </div>
  );
}
