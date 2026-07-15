"use client";
import { useEffect, useRef } from "react";

/**
 * Logo wordmark + tagline lockup. The tagline is fitted (font-size + letter-spacing)
 * so it spans exactly the logo's width — from under the first letter to under the
 * last — identically at every size and scroll state. Used in the header and footer.
 */
export default function BrandLockup({
  logo,
  brand,
  slogan,
  logoClassName = "",
  sloganClassName = "",
}: {
  logo: string;
  brand: string;
  slogan: string;
  logoClassName?: string;
  sloganClassName?: string;
}) {
  const logoRef = useRef<HTMLImageElement>(null);
  const sloganRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const logoEl = logoRef.current;
    const sloganEl = sloganRef.current;
    if (!logoEl || !sloganEl) return;

    const fit = () => {
      const w = logoEl.getBoundingClientRect().width;
      const text = sloganEl.textContent || "";
      const n = text.length;
      if (!w || n < 2) return;
      // reset before measuring
      sloganEl.style.letterSpacing = "0px";
      sloganEl.style.width = "auto";
      sloganEl.style.marginRight = "0px";
      // Pass 1: scale the font so the un-spaced text is ~80% of the logo width.
      const refPx = 12;
      sloganEl.style.fontSize = `${refPx}px`;
      const base1 = sloganEl.getBoundingClientRect().width;
      if (!base1) return;
      const fontPx = Math.max(6, (refPx * (w * 0.8)) / base1);
      sloganEl.style.fontSize = `${fontPx}px`;
      // Pass 2: distribute the remaining width as even letter-spacing.
      const base2 = sloganEl.getBoundingClientRect().width;
      const ls = Math.max(0, (w - base2) / (n - 1));
      sloganEl.style.letterSpacing = `${ls}px`;
      sloganEl.style.width = `${w}px`;
      sloganEl.style.marginRight = `-${ls}px`;
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(logoEl);
    window.addEventListener("resize", fit);
    if (!logoEl.complete) logoEl.addEventListener("load", fit);
    document.fonts?.ready.then(fit).catch(() => {});
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
      logoEl.removeEventListener("load", fit);
    };
  }, [slogan, logo]);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={logoRef} src={logo} alt={brand} className={logoClassName} />
      <span ref={sloganRef} className={sloganClassName}>
        {slogan}
      </span>
    </>
  );
}
