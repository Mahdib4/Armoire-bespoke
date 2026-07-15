"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { animate, stagger } from "animejs";
import { useCart } from "@/lib/cart";
import SocialIcons from "./SocialIcons";
import BrandLockup from "./BrandLockup";

export type NavItem = { label: string; href: string };

export default function Header({
  logo,
  slogan,
  brand,
  items,
  facebook,
  instagram,
}: {
  logo: string;
  slogan: string;
  brand: string;
  items: NavItem[];
  facebook?: string;
  instagram?: string;
}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { count } = useCart();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

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
        className={`ab-header ${scrolled ? "scrolled" : ""} ${open ? "over" : ""}`}
      >
        <Link href="/" className="ab-brand" aria-label={brand}>
          <BrandLockup logo={logo} brand={brand} slogan={slogan} logoClassName="ab-logo" sloganClassName="ab-slogan" />
        </Link>

        <div className="ab-actions">
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
