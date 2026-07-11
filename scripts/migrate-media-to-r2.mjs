// One-time migration: upload everything under public/media/** to Cloudflare R2,
// then rewrite all "/media/..." URLs stored in the database to absolute R2 URLs.
// Run AFTER provisioning R2 and filling R2_* in .env, and after the DB is seeded:
//   node --env-file=.env scripts/migrate-media-to-r2.mjs
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEDIA_DIR = path.resolve(__dirname, "..", "public", "media");

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_URL,
} = process.env;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) {
  console.error("Missing R2_* env vars. Fill them in .env and run with: node --env-file=.env scripts/migrate-media-to-r2.mjs");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const CT = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
  ".gif": "image/gif", ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
  ".json": "application/json",
};

async function* walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else yield full;
  }
}

async function uploadAll() {
  let n = 0;
  for await (const file of walk(MEDIA_DIR)) {
    const rel = path.relative(MEDIA_DIR, file).split(path.sep).join("/");
    const key = `media/${rel}`;
    const ext = path.extname(file).toLowerCase();
    const body = await fs.readFile(file);
    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: CT[ext] || "application/octet-stream",
      })
    );
    n++;
    if (n % 25 === 0) console.log(`  uploaded ${n} files...`);
  }
  console.log(`Uploaded ${n} files to R2 bucket "${R2_BUCKET}".`);
}

async function rewriteDb() {
  const prisma = new PrismaClient();
  const base = R2_PUBLIC_URL.replace(/\/+$/, "");
  const fix = (u) => (u && u.startsWith("/media/") ? base + u : u);
  let changed = 0;

  const imgs = await prisma.productImage.findMany({ where: { url: { startsWith: "/media/" } } });
  for (const im of imgs) { await prisma.productImage.update({ where: { id: im.id }, data: { url: fix(im.url) } }); changed++; }

  const cats = await prisma.category.findMany();
  for (const c of cats) {
    const data = {};
    if (c.bannerUrl?.startsWith("/media/")) data.bannerUrl = fix(c.bannerUrl);
    if (c.posterUrl?.startsWith("/media/")) data.posterUrl = fix(c.posterUrl);
    if (Object.keys(data).length) { await prisma.category.update({ where: { id: c.id }, data }); changed++; }
  }

  const prods = await prisma.product.findMany({ where: { sizeChartUrl: { startsWith: "/media/" } } });
  for (const p of prods) { await prisma.product.update({ where: { id: p.id }, data: { sizeChartUrl: fix(p.sizeChartUrl) } }); changed++; }

  const groups = await prisma.customizationGroup.findMany({ where: { referenceUrl: { startsWith: "/media/" } } });
  for (const g of groups) { await prisma.customizationGroup.update({ where: { id: g.id }, data: { referenceUrl: fix(g.referenceUrl) } }); changed++; }

  const settings = await prisma.siteSetting.findMany();
  for (const s of settings) if (s.value.startsWith("/media/")) { await prisma.siteSetting.update({ where: { key: s.key }, data: { value: fix(s.value) } }); changed++; }

  const media = await prisma.media.findMany({ where: { url: { startsWith: "/media/" } } });
  for (const m of media) { await prisma.media.update({ where: { id: m.id }, data: { url: fix(m.url) } }); changed++; }

  await prisma.$disconnect();
  console.log(`Rewrote ${changed} database URLs to ${base}/media/...`);
}

console.log("→ Uploading public/media to R2...");
await uploadAll();
console.log("→ Rewriting database URLs...");
await rewriteDb();
console.log("Done. All media now served from Cloudflare R2.");
