"use client";
import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { formatTk } from "@/lib/format";

export type FabricView = {
  name: string;
  slug: string;
  image: string;
  price: number;
  currency: string;
};

// How much cloth each garment typically needs (yards) — a guide for the buyer.
const SUGGESTIONS = [
  { label: "Blazer / Jacket", yards: 2.5 },
  { label: "Trousers", yards: 1.5 },
  { label: "Kurta", yards: 2.75 },
  { label: "Shirt", yards: 2.5 },
];

export default function FabricPurchase({ fabric }: { fabric: FabricView }) {
  const { add } = useCart();
  const [yards, setYards] = useState(2.5);
  const [colorCode, setColorCode] = useState("");
  const [note, setNote] = useState("");
  const [added, setAdded] = useState(false);

  const priced = fabric.price > 0;
  const total = Math.round(fabric.price * (yards || 0));

  const addToCart = () => {
    if (!priced || yards <= 0) return;
    add({
      productId: `fabric:${fabric.slug}`,
      slug: `fabric:${fabric.slug}`,
      name: fabric.name,
      type: "FABRIC",
      priceTk: total,
      qty: 1,
      image: fabric.image || "/media/brand/logo-dark.png",
      yards,
      colorCode: colorCode.trim() || undefined,
      note: note.trim() || undefined,
      selections: {
        Yards: `${yards}`,
        ...(colorCode.trim() ? { "Colour code": colorCode.trim() } : {}),
      },
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2600);
  };

  return (
    <div className="ppanel fbpanel">
      <span className="ppanel-eyebrow">Fabric · By the yard</span>
      <h1 className="ppanel-name">{fabric.name}</h1>

      <div className="ppanel-pricerow">
        <span className="ppanel-price tk">
          {priced ? `${formatTk(fabric.price, fabric.currency)} / yard` : "Price on request"}
        </span>
      </div>

      {/* Yardage guide */}
      <div className="ppanel-block">
        <div className="ppanel-label">Fabric needed — a guide</div>
        <div className="chip-row">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              type="button"
              className={`chip ${yards === s.yards ? "on" : ""}`}
              onClick={() => setYards(s.yards)}
            >
              {s.label}: {s.yards} yd
            </button>
          ))}
        </div>
      </div>

      {/* Yards selector */}
      <div className="ppanel-block">
        <div className="ppanel-label">How many yards?</div>
        <div className="fb-yards">
          <button type="button" onClick={() => setYards((y) => Math.max(0.25, +(y - 0.25).toFixed(2)))} aria-label="Less">−</button>
          <input
            type="number"
            min={0.25}
            step={0.25}
            value={yards}
            onChange={(e) => setYards(Math.max(0.25, Number(e.target.value) || 0))}
          />
          <span className="fb-yards-unit">yards</span>
          <button type="button" onClick={() => setYards((y) => +(y + 0.25).toFixed(2))} aria-label="More">+</button>
        </div>
      </div>

      {/* Colour code */}
      <div className="ppanel-block">
        <label className="ppanel-label" htmlFor="fb-color">Colour code / reference <em>(optional)</em></label>
        <input
          id="fb-color"
          className="fb-input"
          placeholder="e.g. Pantone 19-4052 or a shade name"
          value={colorCode}
          onChange={(e) => setColorCode(e.target.value)}
        />
      </div>

      {/* Note */}
      <div className="ppanel-block">
        <label className="ppanel-label" htmlFor="fb-note">Note / special instructions <em>(optional)</em></label>
        <textarea
          id="fb-note"
          className="fb-input"
          rows={3}
          placeholder="Anything we should know about this cloth?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {priced && (
        <div className="ppanel-charge">
          <div className="ppanel-charge-row total">
            <span>{yards} yards × {formatTk(fabric.price, fabric.currency)}</span>
            <span className="tk">{formatTk(total, fabric.currency)}</span>
          </div>
        </div>
      )}

      <div className="ppanel-buy">
        <button className="btn btn-solid ppanel-add" onClick={addToCart} disabled={!priced || yards <= 0}>
          {!priced ? "Enquire for price" : added ? "Added ✓" : "Add to Cart"}
        </button>
      </div>
      {added && (
        <Link href="/cart" className="ppanel-viewcart">
          View cart &amp; checkout →
        </Link>
      )}

      <p className="ppanel-fitnote">
        Fabric is cut and sold by the yard. Add your length and we&apos;ll prepare it for your commission or dispatch.
      </p>
    </div>
  );
}
