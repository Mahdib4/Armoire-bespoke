"use client";
import { useRef } from "react";
import ProductCard, { type CardProduct } from "./ProductCard";

export default function ProductRail({
  products,
  currency = "Tk",
}: {
  products: CardProduct[];
  currency?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 640), behavior: "smooth" });
  };

  return (
    <div className="rail-wrap">
      <div className="rail no-scrollbar" ref={ref}>
        {products.map((p) => (
          <ProductCard key={p.slug} product={p} currency={currency} />
        ))}
      </div>
      {products.length > 2 && (
        <div className="rail-ctrls">
          <button aria-label="Previous" onClick={() => scroll(-1)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <button aria-label="Next" onClick={() => scroll(1)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
