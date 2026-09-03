"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProductCard from "./ProductCard";
import { loadSearchIndex } from "@/lib/search-index";
import { searchCatalogue, SORT_OPTIONS, sortProducts, type SearchItem, type SortKey } from "@/lib/search";

/**
 * The full search page: the same instant matching as the header panel, with
 * the results as a grid that can be narrowed by collection and type, and
 * sorted. The query lives in the URL so a search can be shared or bookmarked.
 */
export default function SearchResults({ currency = "Tk" }: { currency?: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const urlQuery = params.get("q") ?? "";

  const [q, setQ] = useState(urlQuery);
  const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery);
  const [docs, setDocs] = useState<SearchItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [cat, setCat] = useState("all");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState<SortKey>("featured");

  useEffect(() => {
    loadSearchIndex()
      .then(setDocs)
      .catch(() => setFailed(true));
  }, []);

  // Follow the URL when the visitor arrives from the header panel or goes back.
  // Adjusting during render (rather than in an effect) avoids a flash of the
  // previous results.
  if (urlQuery !== lastUrlQuery) {
    setLastUrlQuery(urlQuery);
    setQ(urlQuery);
  }

  // Keep the address bar in step without adding a history entry per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : "/search";
      router.replace(next, { scroll: false });
    }, 350);
    return () => clearTimeout(t);
  }, [q, router]);

  const matches = useMemo(() => {
    if (!docs) return [];
    // A blank query lists the whole catalogue rather than nothing.
    return q.trim() ? searchCatalogue(docs, q, 200) : docs;
  }, [docs, q]);

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const m of matches) if (!seen.has(m.categorySlug)) seen.set(m.categorySlug, m.category);
    return [...seen.entries()].map(([slug, name]) => ({ slug, name }));
  }, [matches]);

  const shown = useMemo(() => {
    const filtered = matches.filter((m) => {
      if (cat !== "all" && m.categorySlug !== cat) return false;
      if (type !== "all" && m.type !== type) return false;
      return true;
    });
    // "Featured" keeps the relevance order the match produced.
    return sort === "featured" ? filtered : sortProducts(filtered, sort);
  }, [matches, cat, type, sort]);

  return (
    <div className="srchpage">
      <div className="cart-head">
        <h1 className="font-display">Search</h1>
        <div className="rule" style={{ marginLeft: 0 }} />
      </div>

      <div className="srchpage-bar">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search blazers, shirts, fabrics…"
          aria-label="Search products"
          autoFocus
        />
      </div>

      <div className="cfil-bar srchpage-filters">
        <div className="cfil-subs">
          <button className={`cfil-chip ${cat === "all" ? "on" : ""}`} onClick={() => setCat("all")}>
            All collections
          </button>
          {categories.map((c) => (
            <button
              key={c.slug}
              className={`cfil-chip ${cat === c.slug ? "on" : ""}`}
              onClick={() => setCat(c.slug)}
            >
              {c.name}
            </button>
          ))}
          <button
            className={`cfil-chip ${type === "READYMADE" ? "on" : ""}`}
            onClick={() => setType(type === "READYMADE" ? "all" : "READYMADE")}
          >
            Ready Made
          </button>
          <button
            className={`cfil-chip ${type === "CUSTOM" ? "on" : ""}`}
            onClick={() => setType(type === "CUSTOM" ? "all" : "CUSTOM")}
          >
            Tailor Made
          </button>
        </div>
        <label className="cfil-sort">
          <span>Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="featured">{q.trim() ? "Best Match" : "Featured"}</option>
            {SORT_OPTIONS.filter((o) => o.value !== "featured").map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {failed && <p className="clist-empty">Search is unavailable right now. Please try again shortly.</p>}
      {!failed && !docs && <p className="clist-empty">Loading the catalogue…</p>}

      {docs && !failed && (
        <>
          <p className="srchpage-count">
            {shown.length} {shown.length === 1 ? "piece" : "pieces"}
            {q.trim() ? ` for “${q.trim()}”` : ""}
          </p>
          {shown.length > 0 ? (
            <div className="clist-grid">
              {shown.map((r) => (
                <ProductCard
                  key={r.slug}
                  currency={currency}
                  product={{
                    slug: r.slug,
                    name: r.name,
                    priceTk: r.priceTk,
                    wasTk: r.wasTk,
                    badge: r.badge,
                    type: r.type,
                    images: r.image ? [{ url: r.image, alt: r.name }] : [],
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="clist-empty">
              Nothing matches that yet. Try a collection name, a fabric or a style — or browse the
              collections from the menu.
            </p>
          )}
        </>
      )}
    </div>
  );
}
