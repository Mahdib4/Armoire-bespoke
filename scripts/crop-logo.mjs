// Regenerates logo-dark.png from the raw logo: trims transparent padding, then
// crops off the bottom "tailored to define you" slogan band (kept only as the
// gold text slogan in the header), then re-trims.
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.resolve(
  __dirname,
  "..",
  "..",
  "LOGO",
  "WhatsApp_Image_2025-10-27_at_13.11.31-removebg-preview.png"
);
const OUT = path.resolve(__dirname, "..", "public", "media", "brand", "logo-dark.png");

const KEEP = Number(process.env.KEEP || 0.78); // fraction of height to keep (drops bottom slogan)

const trimmed = await sharp(RAW).trim({ threshold: 10 }).toBuffer();
const meta = await sharp(trimmed).metadata();
const keepH = Math.round(meta.height * KEEP);

const cropped = await sharp(trimmed)
  .extract({ left: 0, top: 0, width: meta.width, height: keepH })
  .trim({ threshold: 10 })
  .toBuffer();

const outMeta = await sharp(cropped).metadata();
await sharp(cropped).toFile(OUT);
console.log(`logo-dark.png -> ${outMeta.width}x${outMeta.height} (kept ${Math.round(KEEP * 100)}% of ${meta.width}x${meta.height})`);
