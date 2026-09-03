"use client";
import { useMemo, useState } from "react";
import ProductCard, { type CardProduct } from "./ProductCard";
import { SORT_OPTIONS, sortProducts, type SortKey } from "@/lib/search";
import { formatTk } from "@/lib/format";

export type BrowseProduct = CardProduct & {
  /** Sub-collection slug, "" when the piece isn't in one. */
  sub: string;
  order: number;
  createdAt: string;
  inStock: boolean;
};

type Tab = "ready" | "tailor";

/**
 * The collection page's catalogue: Ready-Made / Tailor-Made, the collection's
 * sub-categories, price, availability and sorting — all applied in the browser
 * so the page stays static and every change is instant.
 */
export default function CollectionBrowser({
  readyMade,
  tailorMade,
  subCategories,
  currency,
}: {
  readyMade: BrowseProduct[];
  tailorMade: BrowseProduct[];
  subCategories: { slug: string; name: string }[];
  currency: string;
}) {
  const [tab, setTab] = useState<Tab>(readyMade.length ? "ready" : "tailor");
  const [sub, setSub] = useState("all");
  const [sort, setSort] = useState<SortKey>("featured");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [openFilters, setOpenFilters] = useState(false);

  const pool = tab === "ready" ? readyMade : tailorMade;

  // The price slider spans this tab's actual range, so it always means something.
  const [floor, ceiling] = useMemo(() => {
    if (pool.length === 0) return [0, 0];
    const prices = pool.map((p) => p.priceTk);
    return [Math.min(...prices), Math.max(...prices)];
  }, [pool]);

  // Only offer sub-categories that this tab actually has pieces in.
  const subs = useMemo(() => {
    const present = new Set(pool.map((p) => p.sub).filter(Boolean));
    return subCategories.filter((s) => present.has(s.slug));
  }, [pool, subCategories]);

  const shown = useMemo(() => {
    const cap = maxPrice ?? ceiling;
    const filtered = pool.filter((p) => {
      if (sub !== "all" && p.sub !== sub) return false;
      if (inStockOnly && !p.inStock) return false;
      if (ceiling > floor && p.priceTk > cap) return false;
      return true;
    });
    return sortProducts(filtered, sort);
  }, [pool, sub, sort, inStockOnly, maxPrice, ceiling, floor]);

  // Tailor-Made pieces in a collection all start from the same price (tailoring
  // charge + its cheapest cloth), so there is nothing to narrow by price there.
  // With nothing to offer, the Filters button is left off rather than opening
  // an empty panel.
  const hasPriceRange = ceiling > floor;
  const hasFilters = hasPriceRange || tab === "ready";

  const blurb =
    tab === "ready"
      ? "Finished pieces, already crafted and ready to wear. Choose your size and colour — available for immediate purchase."
      : "Individually crafted to your measurements and design preferences — fabric, cut and detailing chosen by you, finished at your fitting.";

  const activeFilters =
    (sub !== "all" ? 1 : 0) + (inStockOnly ? 1 : 0) + (maxPrice !== null && maxPrice < ceiling ? 1 : 0);

  const reset = () => {
    setSub("all");
    setInStockOnly(false);
    setMaxPrice(null);
    setSort("featured");
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    // The sub-collections and price range belong to the tab being left.
    setSub("all");
    setMaxPrice(null);
  };

  return (
    <div className="ctabs">
      <div className="ctabs-switch" role="tablist" aria-label="Product type">
        <button
          role="tab"
          aria-selected={tab === "ready"}
          className={`ctab ${tab === "ready" ? "on" : ""}`}
          onClick={() => switchTab("ready")}
        >
          Ready Made
          <em>{readyMade.length}</em>
        </button>
        <button
          role="tab"
          aria-selected={tab === "tailor"}
          className={`ctab ${tab === "tailor" ? "on" : ""}`}
          onClick={() => switchTab("tailor")}
        >
          Tailor Made
          <em>{tailorMade.length}</em>
        </button>
      </div>

      <p className="ctabs-blurb">{blurb}</p>

      {subs.length > 0 && (
        <div className="cfil-subs" role="group" aria-label="Sub-collections">
          <button className={`cfil-chip ${sub === "all" ? "on" : ""}`} onClick={() => setSub("all")}>
            All
          </button>
          {subs.map((s) => (
            <button
              key={s.slug}
              className={`cfil-chip ${sub === s.slug ? "on" : ""}`}
              onClick={() => setSub(s.slug)}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <div className="cfil-bar">
        {hasFilters && (
          <button
            className={`cfil-toggle ${openFilters ? "on" : ""}`}
            onClick={() => setOpenFilters((o) => !o)}
            aria-expanded={openFilters}
          >
            Filters
            {activeFilters > 0 && <em>{activeFilters}</em>}
          </button>
        )}
        <span className="cfil-count">
          {shown.length} {shown.length === 1 ? "piece" : "pieces"}
        </span>
        <label className="cfil-sort">
          <span>Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {openFilters && hasFilters && (
        <div className="cfil-panel">
          {hasPriceRange && (
            <div className="cfil-field">
              <label htmlFor="cfil-price">
                Up to <strong className="tk">{formatTk(maxPrice ?? ceiling, currency)}</strong>
              </label>
              <input
                id="cfil-price"
                type="range"
                min={floor}
                max={ceiling}
                step={Math.max(1, Math.round((ceiling - floor) / 40))}
                value={maxPrice ?? ceiling}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
              />
              <div className="cfil-range-ends">
                <span className="tk">{formatTk(floor, currency)}</span>
                <span className="tk">{formatTk(ceiling, currency)}</span>
              </div>
            </div>
          )}
          {tab === "ready" && (
            <label className="cfil-check">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
              />
              <span>In stock only</span>
            </label>
          )}
          {activeFilters > 0 && (
            <button className="cfil-reset" onClick={reset}>
              Clear filters
            </button>
          )}
        </div>
      )}

      {shown.length > 0 ? (
        <div className="clist-grid">
          {shown.map((p) => (
            <ProductCard key={p.slug} currency={currency} product={p} />
          ))}
        </div>
      ) : (
        <p className="clist-empty">
          {pool.length === 0
            ? tab === "ready"
              ? "Currently, there are no Ready Made products available in stock for this category."
              : "No tailor-made pieces in this collection yet."
            : "No pieces match these filters."}
        </p>
      )}
    </div>
  );
}
