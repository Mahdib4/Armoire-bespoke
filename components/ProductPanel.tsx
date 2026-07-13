"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { formatTk } from "@/lib/format";

export type SizeOption = { label: string; stock: number };

export type ProductView = {
  id: string;
  slug: string;
  name: string;
  type: "CUSTOM" | "READYMADE";
  priceTk: number;
  tailoringCharge: number;
  currency: string;
  categoryName: string;
  description: string;
  specs: { label: string; value: string }[];
  sizeChartUrl: string | null;
  image: string;
  outOfStock: boolean;
  tailoringNote: string;
  // Tailor Made
  measurements: { label: string; unit: string; hint: string | null }[];
  customizations: { kind: string; name: string; referenceUrl: string | null; choices: string[] }[];
  // Ready Made
  colors: string[];
  sizeOptions: SizeOption[];
};

export default function ProductPanel({ product }: { product: ProductView }) {
  const { add } = useCart();
  const isTailor = product.type === "CUSTOM";

  const availableSizes = product.sizeOptions.filter((s) => s.stock > 0);
  const soldOut = product.outOfStock || (!isTailor && availableSizes.length === 0);

  const [qty, setQty] = useState(1);
  const [color, setColor] = useState(product.colors[0] ?? "");
  const [size, setSize] = useState(availableSizes[0]?.label ?? product.sizeOptions[0]?.label ?? "");
  const [added, setAdded] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const [showMeas, setShowMeas] = useState(false);
  const [refOpen, setRefOpen] = useState<string | null>(null);
  const [sel, setSel] = useState<Record<string, string>>(
    Object.fromEntries(product.customizations.map((c) => [c.name, c.choices[0] ?? ""]))
  );
  const [meas, setMeas] = useState<Record<string, string>>({});

  // Tailor Made line price includes the tailoring charge.
  const unitPrice = isTailor ? product.priceTk + product.tailoringCharge : product.priceTk;

  const addToCart = () => {
    const selections = isTailor
      ? sel
      : { ...(product.colors.length ? { Colour: color } : {}), ...(product.sizeOptions.length ? { Size: size } : {}) };
    // Measurements: required-ish for Tailor Made, optional for Ready Made (minor alterations).
    const filledMeas = Object.fromEntries(Object.entries(meas).filter(([, v]) => v.trim()));
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      type: product.type,
      priceTk: unitPrice,
      qty,
      image: product.image,
      size: isTailor ? undefined : size,
      selections,
      measurements: Object.keys(filledMeas).length ? filledMeas : undefined,
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
        <span className={`ppanel-type ${isTailor ? "tm" : "rm"}`}>
          {isTailor ? "Tailor Made" : "Ready Made"}
        </span>
        {soldOut && <span className="ppanel-oos">Out of Stock</span>}
      </div>

      {/* Tailoring charge + variability note (Tailor Made only) */}
      {isTailor && (
        <div className="ppanel-charge">
          <div className="ppanel-charge-row">
            <span>Tailoring charge</span>
            <span className="tk">{formatTk(product.tailoringCharge, product.currency)}</span>
          </div>
          <div className="ppanel-charge-row total">
            <span>From</span>
            <span className="tk">{formatTk(unitPrice, product.currency)}</span>
          </div>
          <p className="ppanel-note">{product.tailoringNote}</p>
        </div>
      )}

      {product.description && <p className="ppanel-desc">{product.description}</p>}

      {/* ===================== READY MADE: Colour + Size only ===================== */}
      {!isTailor && (
        <>
          {product.colors.length > 0 && (
            <div className="ppanel-block">
              <div className="ppanel-label">Colour</div>
              <div className="chip-row">
                {product.colors.map((c) => (
                  <button key={c} className={`chip ${color === c ? "on" : ""}`} onClick={() => setColor(c)}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
          {product.sizeOptions.length > 0 && (
            <div className="ppanel-block">
              <div className="ppanel-label">
                Size
                {product.sizeChartUrl && (
                  <button className="linkish" onClick={() => setChartOpen(true)}>Size chart</button>
                )}
              </div>
              <div className="chip-row">
                {product.sizeOptions.map((s) => (
                  <button
                    key={s.label}
                    className={`chip ${size === s.label ? "on" : ""} ${s.stock <= 0 ? "disabled" : ""}`}
                    disabled={s.stock <= 0}
                    onClick={() => setSize(s.label)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Optional measurements for Ready Made (e.g. minor kurta alterations) — hidden by default */}
          {product.measurements.length > 0 && (
            <div className="ppanel-block">
              <button
                type="button"
                className="ppanel-optmeas"
                onClick={() => setShowMeas((v) => !v)}
                aria-expanded={showMeas}
              >
                <span className="ppanel-optmeas-sign">{showMeas ? "−" : "+"}</span>
                Add optional measurements <em>for minor alterations</em>
              </button>
              {showMeas && (
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
              )}
            </div>
          )}
        </>
      )}

      {/* ===================== TAILOR MADE: bespoke options ===================== */}
      {isTailor &&
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

      {/* Tailor Made: measurements */}
      {isTailor && product.measurements.length > 0 && (
        <div className="ppanel-block">
          <div className="ppanel-label">
            Measurements <em>(inches)</em>
            <span className="ppanel-hint">optional — confirmed at your fitting</span>
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
        <button className="btn btn-solid ppanel-add" onClick={addToCart} disabled={soldOut}>
          {soldOut ? "Out of Stock" : added ? "Added ✓" : "Add to Cart"}
        </button>
      </div>
      {added && (
        <Link href="/cart" className="ppanel-viewcart">
          View cart &amp; checkout →
        </Link>
      )}

      <p className="ppanel-fitnote">
        {isTailor
          ? "Place your order and our atelier will arrange your measurement & fitting — by home visit, office appointment or virtual consultation."
          : "In stock and ready to ship. Available for pickup at our Dhanmondi atelier."}
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
            <button className="lightbox-x" onClick={() => { setChartOpen(false); setRefOpen(null); }}>✕</button>
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
