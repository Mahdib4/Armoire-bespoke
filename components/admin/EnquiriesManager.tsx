"use client";
import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";

type Enquiry = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  subject: string | null;
  message: string | null;
  type: string;
  appointment: string | null;
  read: boolean;
  createdAt: string;
};

export default function EnquiriesManager({ enquiries }: { enquiries: Enquiry[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);

  const toggleRead = async (id: string, read: boolean) => {
    await fetch(`/api/admin/enquiries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read }),
    });
    router.refresh();
  };
  const del = async (id: string) => {
    if (!confirm("Delete this enquiry?")) return;
    await fetch(`/api/admin/enquiries/${id}`, { method: "DELETE" });
    router.refresh();
  };

  if (enquiries.length === 0) return <p className="adm-empty">No enquiries yet.</p>;

  return (
    <div className="adm-panel">
      <table className="adm-table">
        <thead>
          <tr>
            <th></th><th>Name</th><th>Contact</th><th>Type</th><th>Preference</th><th>Date</th><th></th>
          </tr>
        </thead>
        <tbody>
          {enquiries.map((e) => (
            <Fragment key={e.id}>
              <tr style={{ opacity: e.read ? 0.6 : 1 }}>
                <td>{!e.read && <span className="adm-unread-dot" />}</td>
                <td>
                  <button className="adm-link" style={{ background: "none", border: "none", cursor: "pointer" }} onClick={() => setOpen(open === e.id ? null : e.id)}>
                    {e.name}
                  </button>
                </td>
                <td style={{ fontSize: "0.74rem" }}>{e.phone}{e.email ? <><br />{e.email}</> : null}</td>
                <td><span className={`adm-badge ${e.type === "appointment" ? "custom" : ""}`}>{e.type}</span></td>
                <td style={{ fontSize: "0.76rem" }}>{e.appointment || "—"}</td>
                <td style={{ fontSize: "0.74rem" }}>{new Date(e.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="adm-row-actions">
                    <button className="adm-btn sm" onClick={() => toggleRead(e.id, !e.read)}>{e.read ? "Unread" : "Read"}</button>
                    <button className="adm-btn sm danger" onClick={() => del(e.id)}>✕</button>
                  </div>
                </td>
              </tr>
              {open === e.id && (
                <tr>
                  <td colSpan={7} style={{ background: "#0d0d0d" }}>
                    <div style={{ padding: "0.7rem 0", color: "var(--cream)", fontSize: "0.85rem", lineHeight: 1.7 }}>
                      {e.subject && <div style={{ color: "var(--gold)" }}>{e.subject}</div>}
                      {e.message || <em style={{ color: "var(--text-muted)" }}>No message provided.</em>}
                      {e.email && (
                        <div style={{ marginTop: "0.6rem" }}>
                          <a href={`mailto:${e.email}`} className="adm-link">Reply by email</a> ·{" "}
                          <a href={`tel:${e.phone}`} className="adm-link">Call {e.phone}</a>
                        </div>
                      )}
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
