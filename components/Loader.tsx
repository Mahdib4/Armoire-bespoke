"use client";
import { useEffect, useState } from "react";

/**
 * Opening brand animation: "ARMOIRE" reveals first, then "Bespoke" beneath it,
 * then a gold underline — matching the original site intro. Shows once per full
 * page load (the site layout persists across in-app navigation, so it does not
 * replay on client-side route changes).
 */
export default function Loader() {
  const [hide, setHide] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const holdEnd = reduce ? 600 : 2900;
    const t1 = setTimeout(() => setHide(true), holdEnd);
    const t2 = setTimeout(() => setGone(true), holdEnd + 1400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (gone) return null;

  return (
    <div className={`ab-loader ${hide ? "hide" : ""}`} aria-hidden>
      <div className="l-brand">ARMOIRE</div>
      <div className="l-sub">Bespoke</div>
      <div className="l-line" />
    </div>
  );
}
