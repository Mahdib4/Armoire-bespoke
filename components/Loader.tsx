"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { animate as animeAnimate, stagger as animeStagger, svg as animeSvg } from "animejs";
import geo from "@/lib/loader-geometry.json";

/**
 * Cinematic opening sequence built from the REAL brand lockup — the master
 * logo is color-split into pixel-faithful layers (scripts/gen-loader-layers.mjs),
 * so every frame preserves the approved artwork exactly; only masks and light
 * move. Choreography: a tailor's light-blade sweeps ARMOIRE into view →
 * a golden reflection crosses it → the "Bespoke" signature hand-writes itself
 * (stroke-mask draw + travelling pen glow) → the tagline's real glyphs cascade
 * up (slices cut at true letter gaps) → a champagne sweep crowns the lockup →
 * gold dust settles → blur-dissolve into the homepage.
 * Anime.js drives the signature draw, pen path and glyph cascade; GSAP runs the
 * master timeline, light sweeps, particles and exit. Shows once per full load.
 */

const ASSET = {
  armoire: "/media/brand/loader/armoire.png",
  bespoke: "/media/brand/loader/bespoke.png",
  tagline: "/media/brand/loader/tagline.png",
  full: "/media/brand/loader/full.png",
};

const { w: FW, h: FH } = geo.frame;
// Tagline slice band (a touch of padding around the measured glyph rows).
const TAG_Y = geo.tagline.y0 - 4;
const TAG_H = geo.tagline.y1 - geo.tagline.y0 + 9;
// Pen route across the "Bespoke" script — the mask stroke follows the cursive
// flow left→right so the reveal reads as live handwriting.
const PEN_PATH =
  "M 276 122 C 294 88, 314 146, 334 116 C 350 94, 366 142, 386 118 C 402 100, 418 142, 438 114 C 452 96, 470 132, 494 108";

const DUST = 12;

export default function Loader() {
  const [gone, setGone] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const streakRef = useRef<HTMLDivElement>(null);
  const shineARef = useRef<HTMLDivElement>(null);
  const shineFRef = useRef<HTMLDivElement>(null);
  const dustRef = useRef<HTMLDivElement>(null);
  const wipeRef = useRef<SVGRectElement>(null);
  const penMaskRef = useRef<SVGPathElement>(null);
  const penDotRef = useRef<SVGCircleElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let alive = true;
    const finish = () => alive && setGone(true);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      // Accessible path: present the finished lockup calmly, then dissolve.
      const stage = stageRef.current!;
      stage.style.opacity = "0";
      stage.querySelectorAll<SVGGElement>(".ldr-glyph").forEach((g) => (g.style.opacity = "1"));
      if (wipeRef.current) wipeRef.current.setAttribute("x", "0");
      if (penMaskRef.current) penMaskRef.current.style.strokeDasharray = "none";
      const t0 = setTimeout(() => {
        stage.style.transition = "opacity 0.5s ease";
        stage.style.opacity = "1";
      }, 80);
      const t1 = setTimeout(() => {
        root.style.transition = "opacity 0.7s ease";
        root.style.opacity = "0";
      }, 1500);
      const t2 = setTimeout(finish, 2300);
      return () => {
        clearTimeout(t0); clearTimeout(t1); clearTimeout(t2);
        alive = false;
      };
    }

    let tl: gsap.core.Timeline | null = null;

    // Decode every layer first so the reveal starts from a truly blank canvas
    // (no half-loaded artwork); a timeout keeps slow networks from stalling.
    const preload = Promise.all(
      Object.values(ASSET).map(
        (src) =>
          new Promise<void>((res) => {
            const im = new Image();
            im.onload = () => { const d = im.decode?.(); (d ? d.catch(() => {}) : Promise.resolve()).then(() => res()); };
            im.onerror = () => res();
            im.src = src;
          })
      )
    );
    const ready = Promise.race([preload, new Promise((r) => setTimeout(r, 2500))]);

    ready.then(() => {
      if (!alive || !rootRef.current) return;
      const stage = stageRef.current!;
      const glyphs = Array.from(stage.querySelectorAll<SVGGElement>(".ldr-glyph"));
      const dust = Array.from(dustRef.current?.children ?? []) as HTMLElement[];

      stage.style.opacity = "1";
      tl = gsap.timeline({ defaults: { ease: "power2.inOut" } });

      // — ambience breathes in
      tl.fromTo(glowRef.current, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.7, ease: "sine.out" }, 0);

      // — the light-blade sweeps; ARMOIRE is revealed in its wake
      tl.fromTo(streakRef.current, { xPercent: -160, opacity: 0 },
        { xPercent: 480, opacity: 1, duration: 1.1, ease: "power2.inOut" }, 0.3);
      tl.to(streakRef.current, { opacity: 0, duration: 0.25, ease: "sine.out" }, 1.28);
      tl.to(wipeRef.current, { attr: { x: 0 }, duration: 1.08, ease: "power2.inOut" }, 0.34);

      // — golden reflection crosses the finished wordmark
      tl.fromTo(shineARef.current, { backgroundPosition: "130% 0" },
        { backgroundPosition: "-60% 0", duration: 0.75, ease: "power1.inOut" }, 1.42);

      // — the signature writes itself (anime.js: stroke draw + pen glow on the same route)
      tl.call(() => {
        try {
          const drawable = animeSvg.createDrawable(penMaskRef.current!);
          animeAnimate(drawable, { draw: "0 1", duration: 1150, ease: "inOutSine" });
          const dot = penDotRef.current!;
          const { translateX, translateY } = animeSvg.createMotionPath(PEN_PATH);
          animeAnimate(dot, { translateX, translateY, duration: 1150, ease: "inOutSine" });
          animeAnimate(dot, { opacity: [{ to: 0.85, duration: 140 }, { to: 0.85, duration: 830 }, { to: 0, duration: 180 }], ease: "linear" });
        } catch {
          // If anime's SVG helpers ever fail, show the signature outright.
          if (penMaskRef.current) penMaskRef.current.style.strokeDasharray = "none";
        }
      }, [], 1.5);

      // — tagline: real glyph slices rise into place (typography choreography)
      tl.call(() => {
        animeAnimate(glyphs, {
          opacity: [0, 1],
          translateY: [12, 0],
          duration: 460,
          ease: "outExpo",
          delay: animeStagger(40),
        });
      }, [], 2.75);

      // — champagne sweep across the complete lockup
      tl.fromTo(shineFRef.current, { backgroundPosition: "140% 0" },
        { backgroundPosition: "-70% 0", duration: 0.95, ease: "power1.inOut" }, 3.75);

      // — a few motes of gold dust drift and die away
      dust.forEach((d) => {
        const dur = 1.5 + Math.random();
        tl!.fromTo(d,
          { opacity: 0, y: 0, x: 0 },
          { opacity: 0.16 + Math.random() * 0.34, y: -(24 + Math.random() * 44), x: (Math.random() - 0.5) * 26,
            duration: dur, ease: "sine.out" }, 2.95 + Math.random() * 1.1);
        tl!.to(d, { opacity: 0, duration: 0.55, ease: "sine.in" }, ">-0.35");
      });

      // — hold the finished mark, then dissolve into the house
      tl.to(root, { autoAlpha: 0, filter: "blur(12px)", scale: 1.025, duration: 0.95, ease: "power2.inOut" }, 4.85);
      tl.call(finish, [], 5.85);
    });

    return () => {
      alive = false;
      tl?.kill();
    };
  }, []);

  if (gone) return null;

  const penLen = 600; // longer than the route; drawable setup normalises it

  return (
    <div ref={rootRef} className="ldr" aria-hidden>
      <div className="ldr-vignette" />
      <div ref={glowRef} className="ldr-glow" />
      <div ref={stageRef} className="ldr-stage">
        <svg ref={svgRef} className="ldr-svg" viewBox={`0 0 ${FW} ${FH}`} width="100%" role="img" aria-label="Armoire Bespoke">
          <defs>
            <linearGradient id="ldr-wipe-g" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0.8" stopColor="#fff" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <mask id="ldr-mA" maskUnits="userSpaceOnUse" x="0" y="0" width={FW} height={FH}>
              <rect ref={wipeRef} x={-(FW + 130)} y="0" width={FW + 130} height={FH} fill="url(#ldr-wipe-g)" />
            </mask>
            <mask id="ldr-mB" maskUnits="userSpaceOnUse" x="0" y="0" width={FW} height={FH}>
              <path
                ref={penMaskRef}
                d={PEN_PATH}
                fill="none"
                stroke="#fff"
                strokeWidth="104"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={penLen}
                strokeDashoffset={penLen}
              />
            </mask>
            <filter id="ldr-dotblur" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
          </defs>

          {/* ARMOIRE — revealed by the light-blade wipe */}
          <image href={ASSET.armoire} width={FW} height={FH} mask="url(#ldr-mA)" />

          {/* Bespoke — hand-written by the travelling stroke mask */}
          <g mask="url(#ldr-mB)">
            <image href={ASSET.bespoke} width={FW} height={FH} />
          </g>

          {/* Tagline — real glyph slices (cut at true letter gaps) cascade up */}
          {geo.glyphs.map((g, i) => (
            <g key={i} className="ldr-glyph" opacity="0">
              <svg x={g.x} y={TAG_Y} width={g.w} height={TAG_H} viewBox={`${g.x} ${TAG_Y} ${g.w} ${TAG_H}`}>
                <image href={ASSET.tagline} width={FW} height={FH} />
              </svg>
            </g>
          ))}

          {/* pen glow that rides the signature route */}
          <circle ref={penDotRef} r="7" fill="#fff" opacity="0" filter="url(#ldr-dotblur)" />
        </svg>

        {/* light-blade + masked metallic sweeps (HTML overlays aligned to the stage) */}
        <div ref={streakRef} className="ldr-streak" />
        <div
          ref={shineARef}
          className="ldr-shine"
          style={{ WebkitMaskImage: `url(${ASSET.armoire})`, maskImage: `url(${ASSET.armoire})` }}
        />
        <div
          ref={shineFRef}
          className="ldr-shine"
          style={{ WebkitMaskImage: `url(${ASSET.full})`, maskImage: `url(${ASSET.full})` }}
        />
        <div ref={dustRef} className="ldr-dust">
          {Array.from({ length: DUST }).map((_, i) => {
            // Deterministic scatter (golden-angle hash) — identical on server
            // and client, so hydration stays clean.
            const fx = ((i * 61.8) % 88) + 6;
            const fy = ((i * 38.2 + 13) % 72) + 18;
            const fs = 2 + ((i * 2.6) % 3);
            return (
              <span
                key={i}
                style={{ left: `${fx}%`, top: `${fy}%`, width: `${fs}px`, height: `${fs}px` }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
