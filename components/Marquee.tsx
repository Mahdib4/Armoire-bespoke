"use client";
import Link from "next/link";
import { MARQUEE_FONTS, marqueeHasContent, type MarqueeConfig } from "@/lib/marquee";

/**
 * The announcement strip — a small "breaking news" band the admin controls
 * from Admin → Marquee: text or a loop of images, with the typeface, colours,
 * speed and spacing all set there.
 *
 * The row is rendered twice and the pair slides by exactly half its width, so
 * the loop never shows a gap or a jump.
 */
export default function Marquee({ config }: { config: MarqueeConfig }) {
  if (!config.show || !marqueeHasContent(config)) return null;

  const isText = config.mode === "text";
  // The separator is its own item, so the spacing either side of it is even.
  const entries: React.ReactNode[] = isText
    ? config.items.flatMap((text, i) => {
        const item = <span className="mq-item" key={`t${i}`}>{text}</span>;
        if (!config.separator) return [item];
        return [
          item,
          <span className="mq-item mq-sep" key={`s${i}`} style={{ color: config.separatorColor }} aria-hidden>
            {config.separator}
          </span>,
        ];
      })
    : config.images.map((im, i) => {
        /* eslint-disable-next-line @next/next/no-img-element */
        const img = <img src={im.url} alt={im.alt} style={{ height: config.imageHeight }} />;
        return (
          <span className="mq-item mq-img" key={`i${i}`}>
            {im.href ? <Link href={im.href}>{img}</Link> : img}
          </span>
        );
      });

  // Duplicated for a seamless loop; the copy is hidden from screen readers.
  const strip = (
    <div className="mq-track" style={{ gap: config.gap, paddingRight: config.gap }}>
      {entries}
    </div>
  );

  const inner = (
    <div
      className={`mq-viewport ${config.pauseOnHover ? "pauses" : ""}`}
      style={
        {
          "--mq-speed": `${config.speed}s`,
          "--mq-dir": config.direction === "right" ? "reverse" : "normal",
        } as React.CSSProperties
      }
    >
      <div className="mq-rail">
        {strip}
        <div className="mq-track" style={{ gap: config.gap, paddingRight: config.gap }} aria-hidden>
          {entries}
        </div>
      </div>
    </div>
  );

  return (
    <aside
      className="mq"
      style={{
        background: config.background,
        borderColor: config.borderColor,
        color: config.color,
        padding: `${config.paddingY}px 0`,
        fontFamily: MARQUEE_FONTS[config.font],
        fontSize: config.fontSize,
        fontWeight: config.weight,
        fontStyle: config.italic ? "italic" : "normal",
        letterSpacing: config.letterSpacing,
        textTransform: config.uppercase ? "uppercase" : "none",
      }}
    >
      {config.href ? (
        <Link href={config.href} className="mq-link">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </aside>
  );
}
