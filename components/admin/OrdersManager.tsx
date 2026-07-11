"use client";
import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { formatTk } from "@/lib/format";

type Item = {
  productName: string;
  type: string;
  priceTk: number;
  qty: number;
  selections: Record<string, string> | null;
  measurements: Record<string, string> | null;
};
type Order = {
  id: string;
  publicId: string;
  customerName: string;
  email: string;
  phone: string;
  address: string | null;
  city: string | null;
  note: string | null;
  subtotalTk: number;
  status: string;
  createdAt: string;
  items: Item[];
};

const STATUSES = ["PENDING", "CONFIRMED", "CANCELLED"];

export default function OrdersManager({ orders }: { orders: Order[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);

  const setStatus = async (id: string, status: string) => {
    await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  };
  const del = async (id: string) => {
    if (!confirm("Delete this order?")) return;
    await fetch(`/api/admin/orders/${id}`, { method: "DELETE" });
    router.refresh();
  };

  if (orders.length === 0) return <p className="adm-empty">No orders yet.</p>;

  return (
    <div className="adm-panel">
      <table className="adm-table">
        <thead>
          <tr>
            <th>Order</th><th>Client</th><th>Contact</th><th>Total</th><th>Status</th><th>Date</th><th></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <Fragment key={o.id}>
              <tr>
                <td><button className="adm-link" style={{ background: "none", border: "none", cursor: "pointer" }} onClick={() => setOpen(open === o.id ? null : o.id)}>{o.publicId}</button></td>
                <td>{o.customerName}</td>
                <td style={{ fontSize: "0.72rem" }}>{o.email}<br />{o.phone}</td>
                <td className="tk">{formatTk(o.subtotalTk)}</td>
                <td>
                  <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)}
                    style={{ background: "#0b0b0b", border: "1px solid var(--border)", color: "var(--ivory)", padding: "0.3rem 0.4rem", fontSize: "0.72rem" }}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td style={{ fontSize: "0.72rem" }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                <td><button className="adm-btn sm danger" onClick={() => del(o.id)}>✕</button></td>
              </tr>
              {open === o.id && (
                <tr>
                  <td colSpan={7} style={{ background: "#0d0d0d" }}>
                    <div style={{ padding: "0.6rem 0" }}>
                      {o.address && <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginBottom: "0.6rem" }}>{o.address}{o.city ? `, ${o.city}` : ""}</p>}
                      {o.note && <p style={{ color: "var(--gold-dim)", fontSize: "0.78rem", marginBottom: "0.6rem" }}>Note: {o.note}</p>}
                      {o.items.map((it, i) => (
                        <div key={i} style={{ padding: "0.5rem 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                          <strong>{it.productName}</strong> × {it.qty} — {formatTk(it.priceTk * it.qty)}{" "}
                          <span className={`adm-badge ${it.type === "CUSTOM" ? "custom" : "ready"}`}>{it.type}</span>
                          {it.selections && <div style={{ color: "var(--text-muted)", fontSize: "0.74rem", marginTop: "0.2rem" }}>{Object.entries(it.selections).map(([k, v]) => `${k}: ${v}`).join(" · ")}</div>}
                          {it.measurements && Object.keys(it.measurements).length > 0 && <div style={{ color: "var(--gold-dim)", fontSize: "0.72rem" }}>Measurements: {Object.entries(it.measurements).map(([k, v]) => `${k} ${v}`).join(", ")}</div>}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
