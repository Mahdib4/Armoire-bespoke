// Generates the intro-loader layers from the master brand logo.
// The loader animates the REAL logo artwork (no re-typesetting): this script
// color-keys the black-background master into three stacked, pixel-faithful
// transparent layers (ARMOIRE gold wordmark / "Bespoke" white script /
// tagline) plus the combined lockup, and measures the tagline's letter boxes
// so the loader can cascade real glyphs without cutting through them.
//
// Run: node scripts/gen-loader-layers.mjs
import sharp from "sharp";
import { writeFileSync, mkdirSync } from "node:fs";

const SRC = "F:/ArmoireBespoke/LOGO/WhatsApp Image 2025-10-27 at 13.11.31.jpeg";
const OUT = "public/media/brand/loader";
const GEO = "lib/loader-geometry.json";

// Lockup crop (measured from the 1008×1008 master; content bbox + padding).
const CROP = { x0: 250, y0: 455, w: 508, h: 213 };
// White pixels above this absolute y are the script; below, the tagline.
const SPLIT_Y = 622;

const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
const { width: W, channels: C } = info;

const smooth = (lo, hi, v) => Math.max(0, Math.min(1, (v - lo) / (hi - lo)));

const px = (buf, x, y) => (y * CROP.w + x) * 4 + 0 && 0; // placeholder (unused)

function makeLayer(test) {
  const out = Buffer.alloc(CROP.w * CROP.h * 4);
  for (let y = 0; y < CROP.h; y++) {
    for (let x = 0; x < CROP.w; x++) {
      const sx = CROP.x0 + x, sy = CROP.y0 + y;
      const i = (sy * W + sx) * C;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = Math.max(r, g, b);
      const a = Math.round(smooth(35, 95, lum) * 255);
      const o = (y * CROP.w + x) * 4;
      if (a > 0 && test(r, g, b, sy)) {
        out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = a;
      }
    }
  }
  return sharp(out, { raw: { width: CROP.w, height: CROP.h, channels: 4 } }).png();
}

// Luminance-relative hue test: dim antialiased edges of gold glyphs keep a
// gold-ish r−b ratio, so they stay in the ARMOIRE layer instead of leaking
// faint fringes into the white layers.
const isGold = (r, g, b) => r - b > Math.max(18, Math.max(r, g, b) * 0.28);

mkdirSync(OUT, { recursive: true });
await makeLayer((r, g, b) => isGold(r, g, b)).toFile(`${OUT}/armoire.png`);
await makeLayer((r, g, b, sy) => !isGold(r, g, b) && sy < SPLIT_Y).toFile(`${OUT}/bespoke.png`);
await makeLayer((r, g, b, sy) => !isGold(r, g, b) && sy >= SPLIT_Y).toFile(`${OUT}/tagline.png`);
await makeLayer(() => true).toFile(`${OUT}/full.png`);

// ---- Geometry: band boxes (crop-relative) + tagline glyph boxes ----
function bandBox(test) {
  let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
  for (let y = 0; y < CROP.h; y++) for (let x = 0; x < CROP.w; x++) {
    const sx = CROP.x0 + x, sy = CROP.y0 + y;
    const i = (sy * W + sx) * C;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (Math.max(r, g, b) < 60) continue;
    if (!test(r, g, b, sy)) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}
const armoire = bandBox((r, g, b) => isGold(r, g, b));
const bespoke = bandBox((r, g, b, sy) => !isGold(r, g, b) && sy < SPLIT_Y);
const tagline = bandBox((r, g, b, sy) => !isGold(r, g, b) && sy >= SPLIT_Y);

// Tagline glyphs: contiguous lit column runs inside the tagline band.
const litCols = [];
for (let x = tagline.x0; x <= tagline.x1; x++) {
  let lit = false;
  for (let y = tagline.y0; y <= tagline.y1 && !lit; y++) {
    const i = ((CROP.y0 + y) * W + CROP.x0 + x) * C;
    if (Math.max(data[i], data[i + 1], data[i + 2]) >= 60) lit = true;
  }
  litCols.push(lit);
}
const glyphs = [];
let run = null;
litCols.forEach((lit, idx) => {
  const x = tagline.x0 + idx;
  if (lit && !run) run = { x0: x, x1: x };
  else if (lit) run.x1 = x;
  else if (run) { glyphs.push(run); run = null; }
});
if (run) glyphs.push(run);

const geometry = {
  frame: { w: CROP.w, h: CROP.h },
  armoire, bespoke, tagline,
  glyphs: glyphs.map((g) => ({ x: g.x0 - 1, w: g.x1 - g.x0 + 3 })),
};
writeFileSync(GEO, JSON.stringify(geometry, null, 2));
console.log("layers written to", OUT);
console.log("geometry:", JSON.stringify(geometry).slice(0, 400));
console.log("tagline glyphs:", glyphs.length);
