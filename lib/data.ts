import "server-only";
import { cache } from "react";
import { prisma } from "./prisma";

export type Settings = Record<string, string>;

// cache() dedupes identical calls within a single render (e.g. layout + page,
// or generateMetadata + page), cutting DB round-trips roughly in half.
export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await prisma.siteSetting.findMany();
  const out: Settings = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
});

export const getNavCategories = cache(async () => {
  return prisma.category.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    select: { slug: true, name: true },
  });
});

/** Categories with their active products + images, ordered — powers the homepage. */
export async function getHomeCategories() {
  return prisma.category.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    include: {
      products: {
        where: { active: true },
        orderBy: { order: "asc" },
        include: { images: { orderBy: { order: "asc" } } },
      },
    },
  });
}

export async function getQuotes() {
  const rows = await prisma.quote.findMany({ orderBy: { order: "asc" } });
  const bySlot: Record<string, { text: string; attribution: string | null }> = {};
  for (const q of rows) bySlot[q.slot] = { text: q.text, attribution: q.attribution };
  return bySlot;
}

export async function getSections() {
  const rows = await prisma.section.findMany();
  const byKey: Record<string, (typeof rows)[number]> = {};
  for (const s of rows) byKey[s.key] = s;
  return byKey;
}

export const getCategoryBySlug = cache(async (slug: string) => {
  return prisma.category.findUnique({
    where: { slug },
    include: {
      products: {
        where: { active: true },
        orderBy: { order: "asc" },
        include: { images: { orderBy: { order: "asc" }, take: 2 } },
      },
    },
  });
});

export const getProductBySlug = cache(async (slug: string) => {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { order: "asc" } },
      category: { include: { measurementFields: { orderBy: { order: "asc" } } } },
      customizations: {
        orderBy: { order: "asc" },
        include: { group: { include: { choices: { orderBy: { order: "asc" } } } } },
      },
    },
  });
});

export async function getAllProductSlugs() {
  return prisma.product.findMany({ where: { active: true }, select: { slug: true } });
}

/** Curated lookbook: 2–3 images from every category. */
export async function getLookbook() {
  const cats = await prisma.category.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    include: {
      products: {
        where: { active: true },
        orderBy: { order: "asc" },
        include: { images: { orderBy: { order: "asc" }, take: 1 } },
      },
    },
  });
  const looks: { url: string; category: string; product: string; slug: string }[] = [];
  for (const c of cats) {
    const picks = c.products.filter((p) => p.images[0]).slice(0, 3);
    for (const p of picks) {
      looks.push({
        url: p.images[0].url,
        category: c.name,
        product: p.name,
        slug: p.slug,
      });
    }
  }
  return looks;
}

export type HomeCategory = Awaited<ReturnType<typeof getHomeCategories>>[number];
export type ProductFull = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;
export type CategoryFull = NonNullable<Awaited<ReturnType<typeof getCategoryBySlug>>>;
