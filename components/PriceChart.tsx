"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import GoldDust from "./GoldDust";

/**
 * Cinematic "tailoring charges" reveal: a Three.js gold-dust backdrop with a
 * GSAP ScrollTrigger opening scene — the chart unveils with a clip wipe, a
 * settle-in scale and a de-blur, while a gold spotlight blooms behind it.
 */
export default function PriceChart({
  src,
  title = "Tailoring Charges",
  subtitle = "Honest, transparent pricing",
}: {
  src: string;
  title?: string;
  subtitle?: string;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const media = mediaRef.current;
    if (!root || !media) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(media, { opacity: 1, clipPath: "inset(0% 0% 0% 0%)" });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: root, start: "top 72%", once: true },
      });
      tl.from(root.querySelectorAll(".pc-word"), {
        yPercent: 120,
        opacity: 0,
        duration: 0.9,
        stagger: 0.08,
        ease: "power4.out",
      })
        .from(root.querySelector(".pc-rule"), { scaleX: 0, duration: 0.7, ease: "power2.out" }, "-=0.5")
        .fromTo(
          media,
          { clipPath: "inset(100% 0% 0% 0%)", scale: 1.14, filter: "brightness(0.35) blur(8px)" },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            scale: 1,
            filter: "brightness(1) blur(0px)",
            duration: 1.7,
            ease: "power3.out",
          },
          "-=0.35"
        )
        .from(root.querySelector(".pc-glow"), { opacity: 0, scale: 0.7, duration: 1.2 }, "-=1.3");
    }, root);

    return () => ctx.revert();
  }, [src]);

  return (
    <section ref={rootRef} className="sec price-sec" id="pricing">
      <GoldDust className="price-dust" density={70} />
      <div className="sec-head">
        <div className="sec-title pc-title">
          {title.split(" ").map((w, i) => (
            <span key={i} className="pc-word">
              {w}
            </span>
          ))}
        </div>
        <div className="sec-sub pc-word">{subtitle}</div>
        <div className="rule pc-rule" />
      </div>
      <div ref={mediaRef} className="pc-media">
        <div className="pc-glow" />
        <Image
          src={src}
          alt="Armoire Bespoke — tailoring charges"
          width={1200}
          height={1200}
          sizes="(max-width:760px) 92vw, 620px"
          className="pc-img"
        />
      </div>
    </section>
  );
}
