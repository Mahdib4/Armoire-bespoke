"use client";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/cart";
import { formatTk } from "@/lib/format";

export default function CartPage() {
  const { items, subtotal, setQty, remove, ready } = useCart();

  if (ready && items.length === 0) {
    return (
      <div className="cart-empty">
        <h1 className="font-display">Your cart is empty</h1>
        <p>The atelier awaits. Explore the collections and begin your commission.</p>
        <Link href="/#storytelling" className="btn btn-solid">
          Discover the Collections
        </Link>
      </div>
    );
  }

  return (
    <div className="cartpage">
      <div className="cart-head">
        <h1 className="font-display">Your Selection</h1>
        <div className="rule" style={{ marginLeft: 0 }} />
      </div>

      <div className="cart-grid">
        <div className="cart-items">
          {items.map((it) => (
            <div className="cart-item" key={it.key}>
              <Link href={`/p/${it.slug}`} className="cart-thumb">
                <Image src={it.image} alt={it.name} fill sizes="120px" />
              </Link>
              <div className="cart-meta">
                <div className="cart-item-top">
                  <Link href={`/p/${it.slug}`} className="cart-name">
                    {it.name}
                  </Link>
                  <span className="cart-tag">
                    {it.type === "CUSTOM" ? "Made-to-Measure" : `Ready-Made · ${it.size ?? ""}`}
                  </span>
                </div>
                {it.selections && (
                  <div className="cart-opts">
                    {Object.entries(it.selections).map(([k, v]) => (
                      <span key={k}>
                        {k}: <b>{v}</b>
                      </span>
                    ))}
                  </div>
                )}
                {it.measurements && Object.keys(it.measurements).length > 0 && (
                  <div className="cart-meas">
                    Measurements:{" "}
                    {Object.entries(it.measurements)
                      .map(([k, v]) => `${k} ${v}`)
                      .join(" · ")}
                  </div>
                )}
                <div className="cart-item-bottom">
                  <div className="qty small">
                    <button onClick={() => setQty(it.key, it.qty - 1)} aria-label="Decrease">−</button>
                    <span>{it.qty}</span>
                    <button onClick={() => setQty(it.key, it.qty + 1)} aria-label="Increase">+</button>
                  </div>
                  <span className="cart-price tk">{formatTk(it.priceTk * it.qty)}</span>
                  <button className="cart-remove" onClick={() => remove(it.key)}>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="cart-summary">
          <h3>Summary</h3>
          <div className="cart-sum-row">
            <span>Subtotal</span>
            <span className="tk">{formatTk(subtotal)}</span>
          </div>
          <div className="cart-sum-row muted">
            <span>Fitting &amp; delivery</span>
            <span>Arranged after order</span>
          </div>
          <div className="cart-sum-total">
            <span>Total</span>
            <span className="tk">{formatTk(subtotal)}</span>
          </div>
          <Link href="/checkout" className="btn btn-solid cart-checkout">
            Proceed to Checkout
          </Link>
          <Link href="/#storytelling" className="cart-continue">
            ← Continue browsing
          </Link>
        </aside>
      </div>
    </div>
  );
}
