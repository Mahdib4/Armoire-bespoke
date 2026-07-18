"use client";
import { useState } from "react";
import Uploader from "./admin/Uploader";

export default function InspirationForm() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", details: "" });
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name || !form.phone) {
      setError("Please share your name and a contact number.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/inspiration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, photos }),
      });
      if (!res.ok) throw new Error("Could not send your request.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="insp-done">
        <h3>Thank you — your inspiration is on its way.</h3>
        <p>Our atelier will review your photos and get back to you shortly to bring your idea to life.</p>
      </div>
    );
  }

  return (
    <form className="insp-form" onSubmit={submit}>
      <p className="insp-intro">
        Seen a suit, jacket or look you love that isn&apos;t on our site? Share your inspiration and
        we&apos;ll craft it for you. Upload photos, add any details, and send it our way.
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
          <span>Email</span>
          <input type="email" value={form.email} onChange={set("email")} />
        </label>
        <label className="field wide">
          <span>Tell us about your idea</span>
          <textarea
            rows={4}
            value={form.details}
            onChange={set("details")}
            placeholder="Occasion, fabric, colour, fit, reference details…"
          />
        </label>
      </div>

      <div className="insp-photos">
        <div className="insp-photos-head">
          <span>Inspiration photos</span>
          <Uploader
            accept="image/*"
            endpoint="/api/inspiration/upload"
            direct={false}
            label="+ Add Photo"
            onUploaded={(url) => setPhotos((p) => [...p, url])}
          />
        </div>
        {photos.length > 0 && (
          <div className="insp-thumbs">
            {photos.map((p, i) => (
              <div key={i} className="insp-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p} alt={`Inspiration ${i + 1}`} />
                <button type="button" onClick={() => setPhotos((list) => list.filter((_, x) => x !== i))} aria-label="Remove">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="checkout-error">{error}</p>}

      <button className="btn btn-solid insp-submit" disabled={submitting}>
        {submitting ? "Sending…" : "Send Inspiration Request"}
      </button>
    </form>
  );
}
