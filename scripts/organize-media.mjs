// Organizes the raw Armoire Bespoke asset folders (one level up) into a clean,
// web-friendly structure under public/media, and emits a manifest.json that the
// Prisma seed consumes. Idempotent: safe to re-run.
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.resolve(__dirname, "..", ".."); // F:\ArmoireBespoke
const PUBLIC = path.resolve(__dirname, "..", "public");
const MEDIA = path.join(PUBLIC, "media");

const IMG_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

// Raw folder -> category. Order defines display order of product sections.
const CATEGORIES = [
  { slug: "blazer", name: "Blazer", src: "BLAZERS" },
  { slug: "jacket", name: "Jacket", src: "JACKETS" },
  { slug: "shirt", name: "Shirt", src: "SHIRTS" },
  { slug: "trouser", name: "Trouser", src: "TROUSERS" },
  { slug: "kurta", name: "Kurta", src: "AB Kurta Collection" },
];

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const titleCase = (s) =>
  s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bAnd\b/g, "&")
    .trim();

const isSizeChart = (name) =>
  /(size\s*chart|^sc[-_ ]|^asc$|short\s*size|regular\s*size|pajama\s*size)/i.test(
    name.replace(/\.[^.]+$/, "")
  );

// natural sort: DSC02261-12 < DSC02264-13, and 1 < 2 < 10
const naturalCmp = (a, b) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function copy(src, dest) {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(src, dest);
}

async function listImages(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && IMG_EXT.has(path.extname(e.name).toLowerCase()))
    .map((e) => e.name);
}

async function main() {
  await fs.mkdir(MEDIA, { recursive: true });
  const manifest = { categories: [], generatedAt: new Date().toISOString() };

  // ---- Brand logos ----
  const brandDir = path.join(MEDIA, "brand");
  const logoMap = [
    ["LOGO/WhatsApp_Image_2025-10-27_at_13.11.31-removebg-preview.png", "logo-dark.png"], // gold + white script, for dark hero
    ["LOGO/Capture-removebg-preview (2).png", "logo-light.png"], // for light backgrounds
    ["LOGO/WhatsApp_Image_2025-08-24_at_12.04.38-removebg-preview.png", "logo-mono.png"],
  ];
  for (const [src, dest] of logoMap) {
    const s = path.join(RAW, src);
    if (await exists(s)) await copy(s, path.join(brandDir, dest));
  }

  // ---- Style options (for the custom-made configurator) ----
  const styleSrc = path.join(RAW, "AB type of styles");
  const styleOptions = [];
  if (await exists(styleSrc)) {
    for (const f of await listImages(styleSrc)) {
      const kind = slugify(path.basename(f, path.extname(f))); // collars, cuffs...
      const dest = `media/style-options/${kind}.jpg`;
      await copy(path.join(styleSrc, f), path.join(PUBLIC, dest));
      styleOptions.push({ kind, name: titleCase(kind), url: "/" + dest });
    }
  }
  manifest.styleOptions = styleOptions;

  // ---- Videos (copy existing mp4s; .mov handled by transcode step) ----
  const videoDest = path.join(MEDIA, "videos");
  const copyVideos = [
    ["hero (2).mp4", "hero.mp4"],
    ["mid.mp4", "mid.mp4"],
  ];
  for (const [src, dest] of copyVideos) {
    const s = path.join(RAW, src);
    if (await exists(s)) await copy(s, path.join(videoDest, dest));
  }

  // ---- Size chart (global) ----
  const gsc = path.join(RAW, "sizechart.jpg");
  if (await exists(gsc)) await copy(gsc, path.join(MEDIA, "sizechart.jpg"));

  // ---- Catalog ----
  for (const cat of CATEGORIES) {
    const catRaw = path.join(RAW, cat.src);
    if (!(await exists(catRaw))) continue;
    const productDirs = (await fs.readdir(catRaw, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort(naturalCmp);

    const products = [];
    for (const pDir of productDirs) {
      const rawProd = path.join(catRaw, pDir);
      const files = (await listImages(rawProd)).sort(naturalCmp);
      const gallery = files.filter((f) => !isSizeChart(f));
      const chart = files.find((f) => isSizeChart(f));
      if (gallery.length === 0) continue;

      const pSlug = slugify(pDir);
      const relDir = `media/catalog/${cat.slug}/${pSlug}`;
      const images = [];
      for (let i = 0; i < gallery.length; i++) {
        const ext = path.extname(gallery[i]).toLowerCase();
        const dest = `${relDir}/${String(i + 1).padStart(2, "0")}${ext}`;
        await copy(path.join(rawProd, gallery[i]), path.join(PUBLIC, dest));
        images.push("/" + dest);
      }
      let sizeChart = null;
      if (chart) {
        const ext = path.extname(chart).toLowerCase();
        const dest = `${relDir}/_sizechart${ext}`;
        await copy(path.join(rawProd, chart), path.join(PUBLIC, dest));
        sizeChart = "/" + dest;
      }
      products.push({
        slug: pSlug,
        name: titleCase(pDir),
        images,
        sizeChart,
      });
    }
    manifest.categories.push({ ...cat, products });
  }

  await fs.writeFile(
    path.join(MEDIA, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  const total = manifest.categories.reduce((n, c) => n + c.products.length, 0);
  console.log(
    `Organized ${manifest.categories.length} categories, ${total} products, ` +
      `${styleOptions.length} style options.`
  );
  console.log("Manifest -> public/media/manifest.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
