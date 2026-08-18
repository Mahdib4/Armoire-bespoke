"use client";
import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { formatTk } from "@/lib/format";
import { deliveryZoneLabel } from "@/lib/pricing";
import { waLink } from "@/lib/whatsapp";

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
  deliveryTk: number;
  deliveryZone: string | null;
  status: string;
  createdAt: string;
  items: Item[];
};

const STATUSES: { value: string; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "IN_MAKING", label: "In Making" },
  { value: "READY", label: "Ready for Delivery" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

const statusLabel = (v: string) => STATUSES.find((s) => s.value === v)?.label ?? v;

// PENDING has no customer email template — saying "and notify" there would lie.
const NOTIFIABLE = new Set(["CONFIRMED", "IN_MAKING", "READY", "DELIVERED", "CANCELLED"]);

export default function OrdersManager({ orders }: { orders: Order[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  // Status changes are staged here until the admin saves them, so a mis-click
  // never emails the customer. Keyed by order id.
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [notify, setNotify] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});

  const stage = (id: string, status: string) => {
    setDraft((p) => ({ ...p, [id]: status }));
    setMsg((p) => ({ ...p, [id]: "" }));
  };
  const discard = (id: string) => {
    setDraft((p) => {
      const n = { ...p };
      delete n[id];
      return n;
    });
    setMsg((p) => ({ ...p, [id]: "" }));
  };

  const save = async (o: Order) => {
    const status = draft[o.id];
    if (!status || status === o.status) return discard(o.id);
    const willNotify = notify[o.id] !== false && NOTIFIABLE.has(status);
    const confirmText = willNotify
      ? `Change ${o.publicId} to "${statusLabel(status)}" and email ${o.email}?`
      : `Change ${o.publicId} to "${statusLabel(status)}" without emailing the customer?`;
    if (!confirm(confirmText)) return;

    setBusy(o.id);
    try {
      const res = await fetch(`/api/admin/orders/${o.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notify: willNotify }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json().catch(() => ({}));
      discard(o.id);
      setMsg((p) => ({
        ...p,
        [o.id]: data?.emailed ? "Saved · customer emailed" : "Saved",
      }));
      router.refresh();
    } catch {
      setMsg((p) => ({ ...p, [o.id]: "Save failed" }));
    } finally {
      setBusy(null);
    }
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
          {orders.map((o) => {
            const pending = draft[o.id] !== undefined && draft[o.id] !== o.status;
            const shown = draft[o.id] ?? o.status;
            const willNotify = notify[o.id] !== false && NOTIFIABLE.has(shown);
            return (
            <Fragment key={o.id}>
              <tr>
                <td><button className="adm-link" style={{ background: "none", border: "none", cursor: "pointer" }} onClick={() => setOpen(open === o.id ? null : o.id)}>{o.publicId}</button></td>
                <td>{o.customerName}</td>
                <td style={{ fontSize: "0.72rem" }}>{o.email}<br />{o.phone}</td>
                <td className="tk">{formatTk(o.subtotalTk + o.deliveryTk)}</td>
                <td>
                  <select value={shown} onChange={(e) => stage(o.id, e.target.value)}
                    style={{ background: "#0b0b0b", border: `1px solid ${pending ? "var(--gold)" : "var(--border)"}`, color: "var(--ivory)", padding: "0.3rem 0.4rem", fontSize: "0.72rem" }}>
                    {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  {pending && (
                    <div className="adm-status-save">
                      <label className="adm-notify">
                        <input
                          type="checkbox"
                          checked={willNotify}
                          disabled={!NOTIFIABLE.has(shown)}
                          onChange={(e) => setNotify((p) => ({ ...p, [o.id]: e.target.checked }))}
                        />
                        Email customer
                      </label>
                      <div className="adm-status-btns">
                        <button className="adm-btn sm solid" disabled={busy === o.id} onClick={() => save(o)}>
                          {busy === o.id ? "Saving…" : "Save"}
                        </button>
                        <button className="adm-btn sm" disabled={busy === o.id} onClick={() => discard(o.id)}>
                          Cancel
                        </button>
                      </div>
                      <span className="adm-status-hint">
                        Not saved yet — nothing has been sent to the customer.
                      </span>
                    </div>
                  )}
                  {!pending && msg[o.id] && <span className="adm-status-done">{msg[o.id]}</span>}
                </td>
                <td style={{ fontSize: "0.72rem" }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                <td><button className="adm-btn sm danger" onClick={() => del(o.id)}>✕</button></td>
              </tr>
              {open === o.id && (
                <tr>
                  <td colSpan={7} style={{ background: "#0d0d0d" }}>
                    <div style={{ padding: "0.6rem 0" }}>
                      <div style={{ marginBottom: "0.6rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                        <a
                          href={waLink(o.phone, `Hello ${o.customerName}, regarding your Armoire Bespoke order ${o.publicId}…`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="adm-link adm-wa"
                        >
                          ✆ Message on WhatsApp
                        </a>
                        <a href={`tel:${o.phone}`} className="adm-link">Call {o.phone}</a>
                        <a href={`mailto:${o.email}`} className="adm-link">Email</a>
                      </div>
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
                      {/* Totals — delivery is charged by the customer's area. */}
                      <div className="adm-order-totals">
                        <div><span>Subtotal</span><span className="tk">{formatTk(o.subtotalTk)}</span></div>
                        <div>
                          <span>Delivery{o.deliveryZone ? ` · ${deliveryZoneLabel(o.deliveryZone)}` : ""}</span>
                          <span className="tk">{formatTk(o.deliveryTk)}</span>
                        </div>
                        <div className="tot"><span>Total</span><span className="tk">{formatTk(o.subtotalTk + o.deliveryTk)}</span></div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
