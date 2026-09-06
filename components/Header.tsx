"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { animate, stagger } from "animejs";
import { useCart } from "@/lib/cart";
import SocialIcons from "./SocialIcons";
import BrandLockup from "./BrandLockup";
import SearchBox from "./SearchBox";
import Marquee from "./Marquee";
import { marqueeHasContent, type MarqueeConfig } from "@/lib/marquee";

/** Compare paths ignoring a query, hash or trailing slash. */
function samePath(a: string, b: string): boolean {
  const clean = (p: string) => p.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return clean(a) === clean(b);
}

export type NavItem = { label: string; href: string };

export default function Header({
  logo,
  slogan,
  brand,
  items,
  facebook,
  instagram,
  marquee,
}: {
  logo: string;
  slogan: string;
  brand: string;
  items: NavItem[];
  facebook?: string;
  instagram?: string;
  /** The announcement strip, carried inside the fixed header so it stays put. */
  marquee?: MarqueeConfig;
}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  /** The strip's own height, so the slot can open to exactly that. */
  const [stripHeight, setStripHeight] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  // The tallest the header has ever needed to be, so page tops never shift as
  // the strip slides in and the bar shrinks.
  const maxHeightRef = useRef(0);
  const pathname = usePathname();
  const { count } = useCart();

  // The strip is held back over the hero, where a solid band across the video
  // looks wrong, and slides in once the header becomes a solid bar. It is also
  // left off the page it links to: it exists to take you there, and repeating
  // the invitation on the destination is just noise.
  const linksHere = !!marquee?.href && samePath(pathname, marquee.href);
  const showMarquee = !!marquee && marquee.show && marqueeHasContent(marquee) && !linksHere;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  // Publish the header's height so anything that has to clear it can, without
  // hard-coding a guess:
  //   --ab-header-h   what it measures right now (fixed overlays hug this)
  //   --ab-header-max the most it ever needs (page tops reserve this, so they
  //                   don't jump when the strip slides in)
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const root = document.documentElement;
    // The strip keeps its own height while the slot around it is closed, so the
    // open height is known before it has ever been shown.
    const strip = el.querySelector<HTMLElement>(".mq");
    const publish = () => {
      const stripH = strip?.offsetHeight ?? 0;
      setStripHeight(stripH);
      const now = el.offsetHeight;
      root.style.setProperty("--ab-header-h", `${now}px`);
      const full = (barRef.current?.offsetHeight ?? 0) + stripH;
      maxHeightRef.current = Math.max(maxHeightRef.current, now, full);
      root.style.setProperty("--ab-header-max", `${maxHeightRef.current}px`);
    };
    // Measured from the observer rather than inline, so the first paint isn't
    // forced through a second render.
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    if (barRef.current) ro.observe(barRef.current);
    if (strip) ro.observe(strip);
    return () => ro.disconnect();
  }, [showMarquee]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (open && overlayRef.current) {
      animate(overlayRef.current.querySelectorAll(".mlink"), {
        opacity: [0, 1],
        translateY: [28, 0],
        delay: stagger(60, { start: 120 }),
        duration: 700,
        ease: "outExpo",
      });
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        ref={headerRef}
        className={`ab-header ${scrolled ? "scrolled" : ""} ${open ? "over" : ""}`}
      >
        <div className="ab-header-bar" ref={barRef}>
          <Link href="/" className="ab-brand" aria-label={brand}>
            <BrandLockup logo={logo} brand={brand} slogan={slogan} logoClassName="ab-logo" sloganClassName="ab-slogan" />
          </Link>

          <div className="ab-actions">
            <SearchBox />
            <Link href="/cart" className="ab-cart" aria-label="Cart">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
              </svg>
              {count > 0 && <em>{count}</em>}
            </Link>
            <button className="ab-menu-btn" onClick={() => setOpen((o) => !o)} aria-label="Menu">
              <span className={open ? "x" : ""} />
              <span className={open ? "x" : ""} />
            </button>
          </div>
        </div>

        {/* The strip rides with the header, so its messages stay on screen
            however far the customer scrolls. */}
        {showMarquee && (
          <div
            className="ab-mq-slot"
            aria-hidden={!scrolled}
            style={{ height: scrolled ? stripHeight : 0, opacity: scrolled ? 1 : 0 }}
          >
            <Marquee config={marquee} />
          </div>
        )}
      </header>

      <div ref={overlayRef} className={`ab-overlay ${open ? "show" : ""}`}>
        <nav className="ab-nav">
          {items.map((it) => (
            <Link key={it.href} href={it.href} className="mlink" onClick={() => setOpen(false)}>
              {it.label}
            </Link>
          ))}
        </nav>
        <div className="ab-overlay-foot mlink">
          <Link href="/#appointment" onClick={() => setOpen(false)} className="btn btn-ghost">
            Book Consultation
          </Link>
          <SocialIcons facebook={facebook} instagram={instagram} className="ab-overlay-social" />
        </div>
      </div>
    </>
  );
}
