"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export type PosterData = {
  id: string;
  slug: string;
  title: string;
  body: string;
  image: string;
  cta: string;
  href: string;
  accent: string;
};

/**
 * The campaign poster: shown once per visit, after the opening animation has
 * finished, when the admin has switched it on for a live campaign.
 *
 * It waits for the loader's "done" event rather than a fixed delay, so it can
 * never appear over the animation. Dismissing it is remembered for the session
 * (and per campaign, so a new campaign is shown again).
 */
export default function CampaignPoster({ poster }: { poster: PosterData }) {
  const [show, setShow] = useState(false);
  const [closing, setClosing] = useState(false);
  const storageKey = `ab_poster_${poster.id}`;

  useEffect(() => {
    try {
      if (sessionStorage.getItem(storageKey)) return;
    } catch {
      // Private browsing can refuse storage — the poster still shows, once.
    }

    let done = false;
    const open = () => {
      if (done) return;
      done = true;
      setShow(true);
    };

    // The intro animation announces itself when it dissolves. If it has already
    // gone (a return visit within the same session, or reduced motion), the
    // fallback timer opens the poster on its own.
    window.addEventListener("ab:intro-done", open, { once: true });
    const t = setTimeout(open, 7000);
    return () => {
      window.removeEventListener("ab:intro-done", open);
      clearTimeout(t);
    };
  }, [storageKey]);

  const dismiss = () => {
    setClosing(true);
    try {
      sessionStorage.setItem(storageKey, "1");
    } catch {}
    setTimeout(() => setShow(false), 320);
  };

  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  if (!show) return null;

  return (
    <div
      className={`cposter ${closing ? "out" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={poster.title}
    >
      <button className="cposter-scrim" onClick={dismiss} aria-label="Close" />
      <div
        className="cposter-card"
        style={poster.accent ? ({ "--cp-accent": poster.accent } as React.CSSProperties) : undefined}
      >
        <button className="cposter-x" onClick={dismiss} aria-label="Close">
          ✕
        </button>
        {poster.image && (
          <div className="cposter-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={poster.image} alt="" />
          </div>
        )}
        <div className="cposter-body">
          <span className="eyebrow">Now On</span>
          <h2 className="font-display">{poster.title}</h2>
          {poster.body && <p>{poster.body}</p>}
          <Link href={poster.href} className="btn btn-solid" onClick={dismiss}>
            {poster.cta}
          </Link>
          <button className="cposter-later" onClick={dismiss}>
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
