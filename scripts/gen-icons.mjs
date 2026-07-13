// Generates favicon + app icons + OG image from the brand SVG monogram and logo.
// Run: node scripts/gen-icons.mjs
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const svg = readFileSync(path.join(root, "app", "icon.svg"));

const BG = "#0a0a0a";

// --- Pack one or more raw PNG buffers into a single .ico file ---
function pngToIco(entries) {
  // entries: [{ size, buf }]
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);

  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  const bufs = [];
  entries.forEach((e, i) => {
    const o = i * 16;
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, o + 0); // width
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, o + 1); // height
    dir.writeUInt8(0, o + 2); // palette
    dir.writeUInt8(0, o + 3); // reserved
    dir.writeUInt16LE(1, o + 4); // color planes
    dir.writeUInt16LE(32, o + 6); // bpp
    dir.writeUInt32LE(e.buf.length, o + 8); // size of image data
    dir.writeUInt32LE(offset, o + 12); // offset
    offset += e.buf.length;
    bufs.push(e.buf);
  });
  return Buffer.concat([header, dir, ...bufs]);
}

async function pngAt(size) {
  return sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();
}

async function main() {
  // apple-icon (180) — Apple ignores transparency, so flatten onto brand bg
  await sharp(svg, { density: 384 })
    .resize(180, 180)
    .flatten({ background: BG })
    .png()
    .toFile(path.join(root, "app", "apple-icon.png"));

  // icon.png raster fallback (48)
  await sharp(svg, { density: 384 }).resize(48, 48).png().toFile(path.join(root, "app", "icon.png"));

  // favicon.ico with 16/32/48
  const ico = pngToIco([
    { size: 16, buf: await pngAt(16) },
    { size: 32, buf: await pngAt(32) },
    { size: 48, buf: await pngAt(48) },
  ]);
  writeFileSync(path.join(root, "app", "favicon.ico"), ico);

  // OG image (1200x630): dark card + centered wordmark (dark variant reads on dark) + gold tagline
  const logo = path.join(root, "public", "media", "brand", "logo-dark.png");
  const logoResized = await sharp(readFileSync(logo)).resize({ width: 720, fit: "inside" }).toBuffer();
  const meta = await sharp(logoResized).metadata();
  const logoTop = Math.round((630 - (meta.height || 260)) / 2) - 34;
  const canvas = sharp({
    create: { width: 1200, height: 630, channels: 4, background: "#0b0b0b" },
  });
  const overlay = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
       <rect x="40" y="40" width="1120" height="550" rx="14" fill="none" stroke="#c9a84c" stroke-opacity="0.5" stroke-width="2"/>
       <text x="600" y="470" text-anchor="middle" fill="#c9a84c" font-family="Georgia, 'Times New Roman', serif"
             font-size="30" letter-spacing="14">TAILORED TO DEFINE YOU</text>
     </svg>`
  );
  await canvas
    .composite([
      { input: overlay, top: 0, left: 0 },
      { input: logoResized, top: logoTop, left: Math.round((1200 - (meta.width || 720)) / 2) },
    ])
    .png()
    .toFile(path.join(root, "public", "og-image.png"));

  console.log("Icons generated: app/favicon.ico, app/icon.png, app/apple-icon.png, public/og-image.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
