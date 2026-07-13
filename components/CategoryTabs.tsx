"use client";
import { useState } from "react";
import ProductCard, { type CardProduct } from "./ProductCard";

type Tab = "ready" | "tailor";

export default function CategoryTabs({
  readyMade,
  tailorMade,
  currency,
}: {
  readyMade: CardProduct[];
  tailorMade: CardProduct[];
  currency: string;
}) {
  // Default to whichever section actually has pieces (Ready-Made first).
  const [tab, setTab] = useState<Tab>(readyMade.length ? "ready" : "tailor");

  const active = tab === "ready" ? readyMade : tailorMade;
  const blurb =
    tab === "ready"
      ? "Finished pieces, already crafted and ready to wear. Choose your size and colour — available for immediate purchase."
      : "Individually crafted to your measurements and design preferences — fabric, cut and detailing chosen by you, finished at your fitting.";

  return (
    <div className="ctabs">
      <div className="ctabs-switch" role="tablist" aria-label="Product type">
        <button
          role="tab"
          aria-selected={tab === "ready"}
          className={`ctab ${tab === "ready" ? "on" : ""}`}
          onClick={() => setTab("ready")}
        >
          Ready Made
          <em>{readyMade.length}</em>
        </button>
        <button
          role="tab"
          aria-selected={tab === "tailor"}
          className={`ctab ${tab === "tailor" ? "on" : ""}`}
          onClick={() => setTab("tailor")}
        >
          Tailor Made
          <em>{tailorMade.length}</em>
        </button>
      </div>

      <p className="ctabs-blurb">{blurb}</p>

      {active.length > 0 ? (
        <div className="clist-grid">
          {active.map((p) => (
            <ProductCard key={p.slug} currency={currency} product={p} />
          ))}
        </div>
      ) : (
        <p className="clist-empty">
          No {tab === "ready" ? "ready-made" : "tailor-made"} pieces in this collection yet.
        </p>
      )}
    </div>
  );
}
