"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { formatTk } from "@/lib/format";

export type ProductView = {
  id: string;
  slug: string;
  name: string;
  type: "CUSTOM" | "READYMADE";
  priceTk: number;
  currency: string;
  categoryName: string;
  description: string;
  specs: { label: string; value: string }[];
  sizeChartUrl: string | null;
  image: string;
  measurements: { label: string; unit: string; hint: string | null }[];
  customizations: { kind: string; name: string; referenceUrl: string | null; choices: string[] }[];
};

const READY_SIZES = ["S", "M", "L", "XL", "XXL"];

export default function ProductPanel({ product }: { product: ProductView }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [size, setSize] = useState("M");
  const [added, setAdded] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const [sel, setSel] = useState<Record<string, string>>(
    Object.fromEntries(product.customizations.map((c) => [c.name, c.choices[0] ?? ""]))
  );
  const [meas, setMeas] = useState<Record<string, string>>({});
  const [refOpen, setRefOpen] = useState<string | null>(null);

  const isCustom = product.type === "CUSTOM";

  const addToCart = () => {
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      type: product.type,
      priceTk: product.priceTk,
      qty,
      image: product.image,
      size: isCustom ? undefined : size,
      selections: isCustom ? sel : undefined,
      measurements: isCustom
        ? Object.fromEntries(Object.entries(meas).filter(([, v]) => v.trim()))
        : undefined,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2600);
  };

  return (
    <div className="ppanel">
      <span className="ppanel-eyebrow">{product.categoryName}</span>
      <h1 className="ppanel-name">{product.name}</h1>
      <div className="ppanel-pricerow">
        <span className="ppanel-price tk">{formatTk(product.priceTk, product.currency)}</span>
        <span className="ppanel-type">
          {isCustom ? "Made-to-Measure" : "Ready-Made"}
        </span>
      </div>

      {product.description && <p className="ppanel-desc">{product.description}</p>}

      {/* Ready-made: sizes */}
      {!isCustom && (
        <div className="ppanel-block">
          <div className="ppanel-label">
            Size
            {product.sizeChartUrl && (
              <button className="linkish" onClick={() => setChartOpen(true)}>
                Size chart
              </button>
            )}
          </div>
          <div className="chip-row">
            {READY_SIZES.map((s) => (
              <button
                key={s}
                className={`chip ${size === s ? "on" : ""}`}
                onClick={() => setSize(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom: bespoke options */}
      {isCustom &&
        product.customizations.map((c) => (
          <div className="ppanel-block" key={c.name}>
            <div className="ppanel-label">
              {c.name}
              {c.referenceUrl && (
                <button
                  className="linkish"
                  onClick={() => setRefOpen(refOpen === c.name ? null : c.referenceUrl)}
                >
                  View styles
                </button>
              )}
            </div>
            <div className="chip-row">
              {c.choices.map((ch) => (
                <button
                  key={ch}
                  className={`chip ${sel[c.name] === ch ? "on" : ""}`}
                  onClick={() => setSel((p) => ({ ...p, [c.name]: ch }))}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>
        ))}

      {/* Custom: measurements */}
      {isCustom && product.measurements.length > 0 && (
        <div className="ppanel-block">
          <div className="ppanel-label">
            Your Measurements
            <span className="ppanel-hint">optional — we confirm these at your fitting</span>
          </div>
          <div className="meas-grid">
            {product.measurements.map((m) => (
              <label key={m.label} className="meas-field">
                <span>
                  {m.label} <em>({m.unit})</em>
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="—"
                  value={meas[m.label] || ""}
                  onChange={(e) => setMeas((p) => ({ ...p, [m.label]: e.target.value }))}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Quantity + add */}
      <div className="ppanel-buy">
        <div className="qty">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
          <span>{qty}</span>
          <button onClick={() => setQty((q) => q + 1)} aria-label="Increase">+</button>
        </div>
        <button className="btn btn-solid ppanel-add" onClick={addToCart}>
          {added ? "Added ✓" : "Add to Cart"}
        </button>
      </div>
      {added && (
        <Link href="/cart" className="ppanel-viewcart">
          View cart & checkout →
        </Link>
      )}

      <p className="ppanel-fitnote">
        {isCustom
          ? "Place your order and our atelier will call to schedule your measurement and fitting appointment."
          : "Available for pickup at our Dhanmondi atelier, usually within 24 hours."}
      </p>

      {/* Specs */}
      {product.specs.length > 0 && (
        <div className="ppanel-specs">
          {product.specs.map((s) => (
            <div className="spec-row" key={s.label}>
              <span>{s.label}</span>
              <span>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Reference / size-chart lightbox */}
      {(chartOpen || refOpen) && (
        <div className="lightbox" onClick={() => { setChartOpen(false); setRefOpen(null); }}>
          <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-x" onClick={() => { setChartOpen(false); setRefOpen(null); }}>
              ✕
            </button>
            <Image
              src={(chartOpen ? product.sizeChartUrl : refOpen) as string}
              alt="Reference"
              width={900}
              height={1200}
              className="lightbox-img"
            />
          </div>
        </div>
      )}
    </div>
  );
}
