"use client";
import { useEffect, useRef, useState } from "react";
import type { ReviewView } from "@/lib/data";

function Stars({ rating }: { rating: number }) {
  const r = Math.max(0, Math.min(5, rating));
  if (!r) return null;
  return (
    <div className="cw-stars" aria-label={`${r} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < r ? "on" : ""}>
          ★
        </span>
      ))}
    </div>
  );
}

export default function CustomerWords({
  reviews,
  show = true,
  title = "Customer's Words",
  subtitle = "The experience, in their own words.",
}: {
  reviews: ReviewView[];
  show?: boolean;
  title?: string;
  subtitle?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLightbox(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  if (!show || reviews.length === 0) return null;

  return (
    <section ref={ref} className={`cw${visible ? " cw-in" : ""}`}>
      <div className="sec-head">
        <div className="sec-title">{title}</div>
        <div className="rule" />
      </div>
      {subtitle && <p className="cw-sub">{subtitle}</p>}

      <div className="cw-grid">
        {reviews.map((r, i) => (
          <figure key={r.id} className="cw-card" style={{ transitionDelay: `${Math.min(i, 6) * 70}ms` }}>
            <Stars rating={r.rating} />
            <blockquote className="cw-text">{r.text}</blockquote>
            {r.photos.length > 0 && (
              <div className="cw-photos">
                {r.photos.map((p, j) => (
                  <button
                    key={j}
                    type="button"
                    className="cw-photo"
                    onClick={() => setLightbox(p)}
                    aria-label={`View photo from ${r.author}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p} alt="" loading="lazy" decoding="async" />
                  </button>
                ))}
              </div>
            )}
            <figcaption className="cw-by">
              <span className="cw-name">{r.author}</span>
              {r.location && <span className="cw-loc">{r.location}</span>}
            </figcaption>
          </figure>
        ))}
      </div>

      {lightbox && (
        <div className="cw-lightbox" onClick={() => setLightbox(null)} role="dialog" aria-modal="true">
          <button className="cw-lightbox-close" aria-label="Close">×</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </section>
  );
}
