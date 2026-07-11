"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/cart";
import { formatTk } from "@/lib/format";

export default function CheckoutPage() {
  const { items, subtotal, clear, ready } = useCart();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    note: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name || !form.email || !form.phone) {
      setError("Please provide your name, email and phone.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: form,
          items: items.map((i) => ({
            productId: i.productId,
            qty: i.qty,
            size: i.size,
            selections: i.selections,
            measurements: i.measurements,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Order failed");
      clear();
      router.push(`/checkout/confirmation?id=${encodeURIComponent(data.publicId)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  };

  if (ready && items.length === 0) {
    return (
      <div className="cart-empty">
        <h1 className="font-display">Nothing to check out</h1>
        <Link href="/#storytelling" className="btn btn-solid">
          Explore the Collections
        </Link>
      </div>
    );
  }

  return (
    <div className="checkout">
      <div className="cart-head">
        <h1 className="font-display">Checkout</h1>
        <div className="rule" style={{ marginLeft: 0 }} />
      </div>

      <div className="checkout-grid">
        <form className="checkout-form" onSubmit={submit}>
          <p className="checkout-intro">
            Place your order and our atelier will call you to schedule your measurement and fitting.
            No payment is taken online.
          </p>

          <div className="field-grid">
            <label className="field">
              <span>Full Name *</span>
              <input value={form.name} onChange={set("name")} required />
            </label>
            <label className="field">
              <span>Phone *</span>
              <input value={form.phone} onChange={set("phone")} required inputMode="tel" />
            </label>
            <label className="field wide">
              <span>Email *</span>
              <input type="email" value={form.email} onChange={set("email")} required />
            </label>
            <label className="field wide">
              <span>Address</span>
              <input value={form.address} onChange={set("address")} />
            </label>
            <label className="field">
              <span>City</span>
              <input value={form.city} onChange={set("city")} />
            </label>
            <label className="field wide">
              <span>Note to the atelier</span>
              <textarea rows={3} value={form.note} onChange={set("note")} />
            </label>
          </div>

          {error && <p className="checkout-error">{error}</p>}

          <button className="btn btn-solid checkout-submit" disabled={submitting}>
            {submitting ? "Placing order…" : "Confirm Order"}
          </button>
        </form>

        <aside className="checkout-summary">
          <h3>Order Summary</h3>
          {items.map((it) => (
            <div className="cosum-item" key={it.key}>
              <div className="cosum-thumb">
                <Image src={it.image} alt={it.name} fill sizes="56px" />
                <em>{it.qty}</em>
              </div>
              <div className="cosum-info">
                <span>{it.name}</span>
                <small>{it.type === "CUSTOM" ? "Made-to-Measure" : `Ready-Made · ${it.size ?? ""}`}</small>
              </div>
              <span className="tk">{formatTk(it.priceTk * it.qty)}</span>
            </div>
          ))}
          <div className="cart-sum-total">
            <span>Total</span>
            <span className="tk">{formatTk(subtotal)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
