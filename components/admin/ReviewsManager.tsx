"use client";
import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Uploader from "./Uploader";

export type AdminReview = {
  id: string;
  author: string;
  location: string;
  rating: number;
  text: string;
  photos: string[];
  featured: boolean;
  order: number;
  active: boolean;
};

const inputStyle: React.CSSProperties = {
  background: "var(--charcoal)",
  border: "1px solid rgba(201,168,76,0.3)",
  color: "var(--ivory)",
  padding: "0.5rem 0.7rem",
  width: "100%",
};

function Photos({
  photos,
  onChange,
}: {
  photos: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
      {photos.map((p, i) => (
        <div key={i} style={{ position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p}
            alt=""
            loading="lazy"
            decoding="async"
            style={{ width: 60, height: 60, objectFit: "cover", border: "1px solid var(--border)", display: "block" }}
          />
          <button
            type="button"
            onClick={() => onChange(photos.filter((_, j) => j !== i))}
            aria-label="Remove photo"
            style={{
              position: "absolute",
              top: -8,
              right: -8,
              width: 20,
              height: 20,
              borderRadius: "50%",
              border: "none",
              background: "#7a1f1f",
              color: "#fff",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      ))}
      <Uploader accept="image/*" label="+ Photo" onUploaded={(url) => onChange([...photos, url])} />
    </div>
  );
}

function ReviewRow({ r }: { r: AdminReview }) {
  const router = useRouter();
  const [author, setAuthor] = useState(r.author);
  const [location, setLocation] = useState(r.location);
  const [rating, setRating] = useState(r.rating);
  const [text, setText] = useState(r.text);
  const [photos, setPhotos] = useState<string[]>(r.photos);
  const [order, setOrder] = useState(r.order);
  const [featured, setFeatured] = useState(r.featured);
  const [active, setActive] = useState(r.active);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/reviews/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author, location, rating, text, photos, order, featured, active }),
      });
      if (!res.ok) throw new Error();
      setMsg("Saved.");
      router.refresh();
    } catch {
      setMsg("Save failed.");
    } finally {
      setBusy(false);
    }
  };
  const del = async () => {
    if (!confirm(`Delete review from ${r.author}?`)) return;
    await fetch(`/api/admin/reviews/${r.id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <div className="adm-panel" style={{ opacity: active ? 1 : 0.6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.7rem", gap: "0.6rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Customer name" style={{ ...inputStyle, width: 180 }} />
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (optional)" style={{ ...inputStyle, width: 160 }} />
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))} style={{ ...inputStyle, width: 90 }}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>{n} ★</option>
            ))}
          </select>
        </div>
        <button className="adm-btn sm danger" onClick={del}>Delete</button>
      </div>

      <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Review text" style={{ ...inputStyle, marginBottom: "0.7rem" }} />

      <div style={{ marginBottom: "0.7rem" }}>
        <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Photos (optional)</label>
        <Photos photos={photos} onChange={setPhotos} />
      </div>

      <div className="adm-actions" style={{ gap: "1rem", flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8rem" }}>
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} /> Featured
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8rem" }}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Shown
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8rem" }}>
          Order
          <input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} style={{ ...inputStyle, width: 64 }} />
        </label>
        <button className="adm-btn solid" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        {msg && <span className="adm-msg">{msg}</span>}
      </div>
    </div>
  );
}

export default function ReviewsManager({ reviews, show }: { reviews: AdminReview[]; show: boolean }) {
  const router = useRouter();

  // Add-new state
  const [author, setAuthor] = useState("");
  const [location, setLocation] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [visible, setVisible] = useState(show);
  const [togBusy, setTogBusy] = useState(false);

  const setVisibility = async (v: boolean) => {
    setVisible(v);
    setTogBusy(true);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: [{ key: "reviewsShow", value: v ? "1" : "0" }] }),
    });
    setTogBusy(false);
    router.refresh();
  };

  const add = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author, location, rating, text, photos }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to add");
      setAuthor(""); setLocation(""); setRating(5); setText(""); setPhotos([]);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {/* Section visibility */}
      <div className="adm-panel" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <strong>Section on the website</strong>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: "0.2rem 0 0" }}>
            Show or hide the entire &ldquo;Customer&rsquo;s Words&rdquo; section on the homepage and product pages.
          </p>
        </div>
        <div className="adm-toggle">
          <button type="button" className={visible ? "on" : ""} disabled={togBusy} onClick={() => setVisibility(true)}>Visible</button>
          <button type="button" className={!visible ? "on" : ""} disabled={togBusy} onClick={() => setVisibility(false)}>Hidden</button>
        </div>
      </div>

      {/* Add new */}
      <div className="adm-panel">
        <h3 style={{ marginTop: 0 }}>Add a review</h3>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.7rem" }}>
          <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Customer name" style={{ ...inputStyle, width: 200 }} />
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (optional)" style={{ ...inputStyle, width: 180 }} />
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))} style={{ ...inputStyle, width: 90 }}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
          </select>
        </div>
        <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="What did the customer say?" style={{ ...inputStyle, marginBottom: "0.7rem" }} />
        <div style={{ marginBottom: "0.7rem" }}>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Photos (optional)</label>
          <Photos photos={photos} onChange={setPhotos} />
        </div>
        <div className="adm-actions">
          <button className="adm-btn solid" onClick={add} disabled={busy || !author || !text}>{busy ? "Adding…" : "Add review"}</button>
          {err && <span className="adm-msg err">{err}</span>}
        </div>
      </div>

      {/* Existing */}
      {reviews.length === 0 ? (
        <p className="adm-empty">No reviews yet. Add your first one above.</p>
      ) : (
        reviews.map((r) => <ReviewRow key={r.id} r={r} />)
      )}
    </div>
  );
}
