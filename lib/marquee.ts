// The announcement marquee
// ---------------------------------------------------------------------------
// A small scrolling strip on the homepage (the "breaking news" band). The admin
// chooses text or a loop of images and controls every style detail from
// Admin → Marquee.
//
// Stored as JSON in the Section row keyed "marquee", so it needs no database
// migration and no deploy to change.

export type MarqueeMode = "text" | "images";

export type MarqueeImage = { url: string; href: string; alt: string };

export type MarqueeConfig = {
  show: boolean;
  mode: MarqueeMode;
  /** Text mode: each entry is one message; they repeat around the loop. */
  items: string[];
  images: MarqueeImage[];
  /** Seconds for one full pass — bigger is slower. */
  speed: number;
  direction: "left" | "right";
  /** Space between items, in px. */
  gap: number;
  pauseOnHover: boolean;
  /** Whole-strip link (blank = not clickable). */
  href: string;
  // Text styling
  font: "display" | "serif" | "sans";
  fontSize: number; // px
  weight: number;
  letterSpacing: number; // px
  uppercase: boolean;
  italic: boolean;
  color: string;
  separator: string; // drawn between messages
  separatorColor: string;
  // Strip styling
  background: string;
  borderColor: string;
  paddingY: number; // px
  imageHeight: number; // px, image mode
};

export const MARQUEE_SECTION_KEY = "marquee";

export const MARQUEE_DEFAULTS: MarqueeConfig = {
  show: false,
  mode: "text",
  items: ["Bespoke tailoring, measured at your door", "Free home measurement across Dhaka"],
  images: [],
  speed: 26,
  direction: "left",
  gap: 64,
  pauseOnHover: true,
  href: "",
  font: "sans",
  fontSize: 13,
  weight: 400,
  letterSpacing: 2,
  uppercase: true,
  italic: false,
  color: "#e8dfd0",
  separator: "◆",
  separatorColor: "#c8a24a",
  background: "#12100e",
  borderColor: "#2a251d",
  paddingY: 10,
  imageHeight: 34,
};

/** The font stacks offered in the admin panel, matching the site's own faces. */
export const MARQUEE_FONTS: Record<MarqueeConfig["font"], string> = {
  display: "var(--font-cinzel), Georgia, serif",
  serif: "var(--font-cormorant), Georgia, serif",
  sans: "var(--font-montserrat), system-ui, sans-serif",
};

const clamp = (n: unknown, min: number, max: number, fallback: number): number => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
};

const str = (v: unknown, fallback: string): string => (typeof v === "string" ? v : fallback);

/** Tolerant parse: anything missing or malformed falls back to the default, so
 *  a half-filled config can never break the homepage. */
export function parseMarquee(config: string | null | undefined): MarqueeConfig {
  let raw: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(config || "{}");
    if (parsed && typeof parsed === "object") raw = parsed as Record<string, unknown>;
  } catch {}
  const d = MARQUEE_DEFAULTS;

  return {
    show: raw.show === true,
    mode: raw.mode === "images" ? "images" : "text",
    items: Array.isArray(raw.items)
      ? raw.items.filter((i): i is string => typeof i === "string" && i.trim() !== "")
      : d.items,
    images: Array.isArray(raw.images)
      ? raw.images
          .map((i) => {
            const o = (i ?? {}) as Record<string, unknown>;
            return { url: str(o.url, ""), href: str(o.href, ""), alt: str(o.alt, "") };
          })
          .filter((i) => i.url)
      : [],
    speed: clamp(raw.speed, 4, 240, d.speed),
    direction: raw.direction === "right" ? "right" : "left",
    gap: clamp(raw.gap, 0, 400, d.gap),
    pauseOnHover: raw.pauseOnHover !== false,
    href: str(raw.href, ""),
    font: raw.font === "display" || raw.font === "serif" ? raw.font : "sans",
    fontSize: clamp(raw.fontSize, 8, 64, d.fontSize),
    weight: clamp(raw.weight, 100, 900, d.weight),
    letterSpacing: clamp(raw.letterSpacing, -5, 20, d.letterSpacing),
    uppercase: raw.uppercase !== false,
    italic: raw.italic === true,
    color: str(raw.color, d.color),
    separator: str(raw.separator, d.separator),
    separatorColor: str(raw.separatorColor, d.separatorColor),
    background: str(raw.background, d.background),
    borderColor: str(raw.borderColor, d.borderColor),
    paddingY: clamp(raw.paddingY, 0, 60, d.paddingY),
    imageHeight: clamp(raw.imageHeight, 12, 200, d.imageHeight),
  };
}

export function serializeMarquee(cfg: MarqueeConfig): string {
  return JSON.stringify(cfg);
}

/** Does the strip have anything to show? */
export function marqueeHasContent(cfg: MarqueeConfig): boolean {
  return cfg.mode === "images" ? cfg.images.length > 0 : cfg.items.length > 0;
}
