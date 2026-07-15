"use client";
import { useState } from "react";
import SocialIcons from "./SocialIcons";

const METHODS = [
  { key: "Home Visit", desc: "Our master tailor comes to you for measurement and fitting — anywhere in the city." },
  { key: "Office Appointment", desc: "Visit our Dhanmondi atelier for a private consultation, strictly by appointment." },
  { key: "Virtual Consultation", desc: "Guided fabric selection and fitting over a video call, wherever you are." },
];

export default function AppointmentSection({
  message,
  contactEmail,
  contactPhone,
  address,
  facebook,
  instagram,
}: {
  message: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  facebook?: string;
  instagram?: string;
}) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [pref, setPref] = useState(METHODS[0].key);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) return;
    setState("sending");
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, type: "appointment", appointment: pref }),
      });
      if (!res.ok) throw new Error();
      setState("done");
      setForm({ name: "", phone: "", email: "", message: "" });
    } catch {
      setState("error");
    }
  };

  return (
    <section id="appointment" className="sec appt-sec">
      <div className="sec-head">
        <div className="sec-title rv">Consultation &amp; Home Service</div>
        <div className="sec-sub rv rv-1">Bespoke, at your convenience</div>
        <div className="rule" />
      </div>

      <p className="appt-message rv">{message}</p>

      <div className="appt-methods rv">
        {METHODS.map((m, i) => (
          <button
            key={m.key}
            type="button"
            className={`appt-method ${pref === m.key ? "on" : ""}`}
            onClick={() => setPref(m.key)}
          >
            <span className="appt-method-idx">{String(i + 1).padStart(2, "0")}</span>
            <strong>{m.key}</strong>
            <span className="appt-method-desc">{m.desc}</span>
          </button>
        ))}
      </div>

      <div className="appt-body">
        <form className="appt-form rv" onSubmit={submit}>
          <h3>Request a consultation</h3>
          <div className="appt-fields">
            <input placeholder="Full name *" value={form.name} onChange={set("name")} required />
            <input placeholder="Contact number *" value={form.phone} onChange={set("phone")} required inputMode="tel" />
            <input placeholder="Email (optional)" type="email" value={form.email} onChange={set("email")} />
            <select value={pref} onChange={(e) => setPref(e.target.value)}>
              {METHODS.map((m) => (
                <option key={m.key} value={m.key}>{m.key}</option>
              ))}
            </select>
            <textarea placeholder="Anything we should know? (occasion, timeline, address…)" rows={3} value={form.message} onChange={set("message")} />
          </div>
          <button className="btn btn-solid" disabled={state === "sending"}>
            {state === "sending" ? "Sending…" : state === "done" ? "Request received ✓" : "Request Consultation"}
          </button>
          {state === "done" && <p className="appt-ok">Thank you — our atelier will call you shortly to arrange your {pref.toLowerCase()}.</p>}
          {state === "error" && <p className="appt-err">Something went wrong. Please call us directly.</p>}
        </form>

        <aside className="appt-contact rv rv-1">
          <h4>Reach the atelier</h4>
          {address && <p>{address}</p>}
          {contactPhone && <a href={`tel:${contactPhone}`}>{contactPhone}</a>}
          {contactEmail && <a href={`mailto:${contactEmail}`}>{contactEmail}</a>}
          <SocialIcons facebook={facebook} instagram={instagram} className="appt-social" />
        </aside>
      </div>
    </section>
  );
}
