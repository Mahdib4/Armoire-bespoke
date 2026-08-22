"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { formatTk } from "@/lib/format";
import { tailorFromPrice, tailorPrice } from "@/lib/pricing";
import { joinChoices, splitChoices } from "@/lib/options";

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
  categorySlug: string;
  /** Cloths this collection is offered in (Admin → Fabrics). */
  fabricOptions: { name: string; price: number; image: string }[];
  /** Cloth pre-selected on load (admin-set default, else the first). */
  defaultFabric: string;
  /** Yards of cloth this garment needs (admin-set per collection). */
  yardsNeeded: number;
  description: string;
  specs: { label: string; value: string }[];
  sizeChartUrl: string | null;
  image: string;
  outOfStock: boolean;
  tailoringNote: string;
  // Tailor Made
  measurements: { label: string; unit: string; hint: string | null }[];
  customizations: {
    kind: string;
    name: string;
    referenceUrl: string | null;
    /** true = the customer may pick several of these choices. */
    multi: boolean;
    choices: string[];
  }[];
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
  // Fabric is picked from the collection's cloths; the rest are bespoke options.
  const fabricOptions = product.fabricOptions;
  const [fabric, setFabric] = useState(product.defaultFabric || fabricOptions[0]?.name || "");
  const [sel, setSel] = useState<Record<string, string>>(
    Object.fromEntries(product.customizations.map((c) => [c.name, c.choices[0] ?? ""]))
  );
  const [meas, setMeas] = useState<Record<string, string>>({});
  const [sleeveButtons, setSleeveButtons] = useState("2");

  // A single-choice option holds one label; a multi-choice option holds them
  // comma-separated in the same field, so carts and orders need no changes.
  const isChosen = (name: string, multi: boolean, choice: string) =>
    multi ? splitChoices(sel[name]).includes(choice) : sel[name] === choice;

  const pick = (name: string, multi: boolean, choice: string) =>
    setSel((p) => {
      if (!multi) return { ...p, [name]: choice };
      const cur = splitChoices(p[name]);
      const next = cur.includes(choice) ? cur.filter((x) => x !== choice) : [...cur, choice];
      return { ...p, [name]: joinChoices(next) };
    });

  // Blazer cuff style: when "Sleeve Buttons" is chosen, reveal a 2/3/4/5 count picker.
  const cuffStyle = product.customizations.find((c) => c.kind === "cuff-style");
  const showSleeveCount =
    !!cuffStyle && isChosen(cuffStyle.name, cuffStyle.multi, "Sleeve Buttons");

  // Fabric-driven pricing (Tailor Made): total = tailoring charge + fabric price
  // per yard × the yards this garment needs. The admin sets no base price.
  const yardsNeeded = product.yardsNeeded;
  const selectedFabric = fabric;
  const fabricPrices = Object.fromEntries(fabricOptions.map((f) => [f.name, f.price]));
  const fabricYard = fabricPrices[selectedFabric] ?? 0;
  const showFabricPrice = isTailor && yardsNeeded > 0 && fabricYard > 0;

  // "Starts from" = tailoring + the cheapest fabric × yards this garment needs.
  const fromPrice = tailorFromPrice(product.tailoringCharge, yardsNeeded, fabricPrices);

  // Ready-Made kurtas & shirts show their size chart inline, above Add to Cart.
  const inlineChart =
    !isTailor && ["kurta", "shirt"].includes(product.categorySlug)
      ? product.sizeChartUrl || `/media/sizecharts/${product.categorySlug}.jpg`
      : null;

  // Line price: Tailor Made = tailoring + selected fabric × yards; Ready Made = fixed.
  const unitPrice = isTailor
    ? tailorPrice(product.tailoringCharge, yardsNeeded, fabricYard)
    : product.priceTk;

  const addToCart = () => {
    const selections = isTailor
      ? {
          ...(selectedFabric ? { Fabric: selectedFabric } : {}),
          ...sel,
          ...(showSleeveCount ? { "Sleeve Buttons": sleeveButtons } : {}),
        }
      : { ...(product.colors.length ? { Colour: color } : {}), ...(product.sizeOptions.length ? { Size: size } : {}) };
    // A multi-choice option can end up with nothing selected — don't carry
    // empty values into the cart, emails or the order.
    const filledSel = Object.fromEntries(
      Object.entries(selections).filter(([, v]) => v && v.trim())
    );
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
      selections: filledSel,
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
        <span className="ppanel-price tk">
          {isTailor && <em className="ppanel-from">Starts from</em>}
          {formatTk(isTailor ? fromPrice : product.priceTk, product.currency)}
        </span>
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
          {showFabricPrice ? (
            <>
              {/* Price = tailoring charge + selected fabric × yards this garment needs. */}
              <div className="ppanel-charge-row">
                <span>Fabric{selectedFabric ? ` — ${selectedFabric}` : ""} (per yard)</span>
                <span className="tk">{formatTk(fabricYard, product.currency)}</span>
              </div>
              <div className="ppanel-charge-row">
                <span>Fabric needed</span>
                <span>{yardsNeeded} yards</span>
              </div>
              <div className="ppanel-charge-row">
                <span>Fabric cost</span>
                <span className="tk">{formatTk(Math.round(fabricYard * yardsNeeded), product.currency)}</span>
              </div>
              <div className="ppanel-charge-row total">
                <span>Total</span>
                <span className="tk">{formatTk(unitPrice, product.currency)}</span>
              </div>
              <p className="ppanel-note">
                A {product.categoryName.toLowerCase()} needs about {yardsNeeded} yards of cloth. {product.tailoringNote}
              </p>
            </>
          ) : (
            <>
              <div className="ppanel-charge-row total">
                <span>Starts from</span>
                <span className="tk">{formatTk(fromPrice, product.currency)}</span>
              </div>
              <p className="ppanel-note">Select a fabric below to see the exact price. {product.tailoringNote}</p>
            </>
          )}
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

      {/* Tailor Made: fabric — the cloths this collection is offered in. */}
      {isTailor && fabricOptions.length > 0 && (
        <div className="ppanel-block">
          <div className="ppanel-label">Fabric</div>
          <div className="chip-row">
            {fabricOptions.map((f) => (
              <button
                key={f.name}
                className={`chip ${selectedFabric === f.name ? "on" : ""}`}
                onClick={() => setFabric(f.name)}
              >
                {f.name}
                {f.price > 0 && <em className="chip-price tk">{formatTk(f.price, product.currency)}/yd</em>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===================== TAILOR MADE: bespoke options ===================== */}
      {isTailor &&
        product.customizations.map((c) => (
          <div className="ppanel-block" key={c.name}>
            <div className="ppanel-label">
              {c.name}
              {c.multi && <span className="ppanel-hint">choose one or more</span>}
              {c.referenceUrl &&
                /* Shirts: no style-reference lightbox on cuff & pocket (client request). */
                !(product.categorySlug === "shirt" && (c.kind === "cuff" || c.kind === "pocket")) && (
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
                  className={`chip ${isChosen(c.name, c.multi, ch) ? "on" : ""}`}
                  aria-pressed={isChosen(c.name, c.multi, ch)}
                  onClick={() => pick(c.name, c.multi, ch)}
                >
                  {ch}
                </button>
              ))}
            </div>

            {/* Cuff style → Sleeve Buttons reveals a number-of-buttons picker. */}
            {c.kind === "cuff-style" && isChosen(c.name, c.multi, "Sleeve Buttons") && (
              <div className="ppanel-subopt">
                <div className="ppanel-sublabel">Number of sleeve buttons</div>
                <div className="radio-row">
                  {["2", "3", "4", "5"].map((n) => (
                    <label key={n} className={`radio-chip ${sleeveButtons === n ? "on" : ""}`}>
                      <input
                        type="radio"
                        name="sleeve-buttons"
                        value={n}
                        checked={sleeveButtons === n}
                        onChange={() => setSleeveButtons(n)}
                      />
                      {n}
                    </label>
                  ))}
                </div>
              </div>
            )}
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
              src={(chartOpen ? inlineChart || product.sizeChartUrl : refOpen) as string}
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
