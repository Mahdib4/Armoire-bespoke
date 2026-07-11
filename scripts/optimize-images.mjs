// Downscales oversized web images in public/media (catalog photos, style charts,
// size charts) to a crisp web resolution, in place. The full-resolution
// originals remain untouched in the raw F:\ArmoireBespoke source folders.
import sharp from "sharp";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEDIA = path.resolve(__dirname, "..", "public", "media");

const MAX = 2000; // longest side
const QUALITY = 82;
const DIRS = ["catalog", "style-options"]; // subfolders to optimize
const EXTRA = ["sizechart.jpg"]; // single files

async function* walk(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (/\.(jpe?g)$/i.test(e.name)) yield full;
  }
}

async function optimize(file) {
  // Read into memory first so no file handle is held on `file` during write (Windows-safe).
  const input = await fs.readFile(file);
  const before = input.length;
  const meta = await sharp(input).metadata();
  const longest = Math.max(meta.width || 0, meta.height || 0);
  let pipeline = sharp(input).rotate(); // respect EXIF orientation
  if (longest > MAX) {
    pipeline = pipeline.resize({ width: MAX, height: MAX, fit: "inside", withoutEnlargement: true });
  }
  const buf = await pipeline.jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
  // only write if we actually saved space
  if (buf.length < before) await fs.writeFile(file, buf);
  return { before, after: Math.min(buf.length, before) };
}

let count = 0;
let totalBefore = 0;
let totalAfter = 0;

for (const d of DIRS) {
  for await (const f of walk(path.join(MEDIA, d))) {
    const { before, after } = await optimize(f);
    totalBefore += before;
    totalAfter += after;
    count++;
    if (count % 25 === 0) console.log(`  ...${count} images`);
  }
}
for (const f of EXTRA) {
  const p = path.join(MEDIA, f);
  try {
    const { before, after } = await optimize(p);
    totalBefore += before;
    totalAfter += after;
    count++;
  } catch {}
}

const mb = (n) => (n / 1024 / 1024).toFixed(1) + "MB";
console.log(`Optimized ${count} images: ${mb(totalBefore)} → ${mb(totalAfter)}`);
