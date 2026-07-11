// Trims transparent padding around the brand logos so they fill their box
// (the source PNGs are square with large transparent margins).
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BRAND = path.resolve(__dirname, "..", "public", "media", "brand");

const files = ["logo-dark.png", "logo-light.png", "logo-mono.png"];

for (const f of files) {
  const src = path.join(BRAND, f);
  try {
    const buf = await sharp(src).trim({ threshold: 10 }).toBuffer();
    const meta = await sharp(buf).metadata();
    await sharp(buf).toFile(src);
    console.log(`${f} -> trimmed to ${meta.width}x${meta.height}`);
  } catch (e) {
    console.warn(`skip ${f}: ${e.message}`);
  }
}
