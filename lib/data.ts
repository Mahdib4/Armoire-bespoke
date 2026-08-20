import "server-only";
import { cache } from "react";
import { prisma } from "./prisma";
import { slugify } from "./slug";

export type Settings = Record<string, string>;

export type Fabric = {
  name: string;
  slug: string;
  image: string;
  images: string[];
  price: number;
  /** Category slugs this cloth is offered for. Empty = every collection. */
  categories: string[];
  /** Show it in the public Fabric Collection / fabric shop. */
  show: boolean;
  /** Off = not offered anywhere. */
  active: boolean;
};

type RawSwatch = {
  name?: string;
  image?: string;
  images?: string[];
  price?: number | string;
  categories?: string[];
  show?: boolean;
  active?: boolean;
};

/** Every fabric the admin has entered (Admin → Fabrics), including hidden ones.
 *  Fabrics are stored in the "fabric" section's config so no migration is
 *  needed; older entries without the newer fields stay valid. */
export const getFabrics = cache(async (): Promise<Fabric[]> => {
  const section = await prisma.section.findUnique({ where: { key: "fabric" } });
  let raw: unknown[] = [];
  try {
    raw = JSON.parse(section?.config || "{}").swatches ?? [];
  } catch {}
  return raw
    .map((s): Fabric => {
      if (typeof s === "string") {
        return { name: s, slug: slugify(s), image: "", images: [], price: 0, categories: [], show: true, active: true };
      }
      const o = (s ?? {}) as RawSwatch;
      return {
        name: o.name || "",
        slug: slugify(o.name || ""),
        image: o.image || "",
        images: Array.isArray(o.images) ? o.images.filter(Boolean) : [],
        price: Number(o.price) || 0,
        categories: Array.isArray(o.categories) ? o.categories.filter(Boolean) : [],
        // Fabrics added before these fields existed stay visible and available.
        show: o.show !== false,
        active: o.active !== false,
      };
    })
    .filter((f) => f.name);
});

/** Fabrics the customer may actually be offered. */
export const getActiveFabrics = cache(async (): Promise<Fabric[]> => {
  return (await getFabrics()).filter((f) => f.active);
});

/** Fabrics shown in the public Fabric Collection section and fabric shop —
 *  only the ones the admin ticked "show". */
export const getShowcaseFabrics = cache(async (): Promise<Fabric[]> => {
  return (await getActiveFabrics()).filter((f) => f.show);
});

/** Fabrics offered for one collection: blazer cloths differ from shirt cloths.
 *  A fabric with no collections ticked is offered everywhere. */
export const getCategoryFabrics = cache(async (categorySlug: string): Promise<Fabric[]> => {
  return (await getActiveFabrics()).filter(
    (f) => f.categories.length === 0 || f.categories.includes(categorySlug)
  );
});

export const getFabricBySlug = cache(async (slug: string): Promise<Fabric | null> => {
  const fabrics = await getActiveFabrics();
  return fabrics.find((f) => f.slug === slug) ?? null;
});

// cache() dedupes identical calls within a single render (e.g. layout + page,
// or generateMetadata + page), cutting DB round-trips roughly in half.
// Official brand social links — used as defaults so the icons always render,
// even if an admin hasn't set them in Site Settings yet. Admin values override.
const BRAND_DEFAULTS: Settings = {
  facebook: "https://www.facebook.com/profile.php?id=61583944840199",
  instagram: "https://www.instagram.com/armoirebespoke",
};

export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await prisma.siteSetting.findMany();
  const out: Settings = {};
  for (const r of rows) out[r.key] = r.value;
  for (const [key, value] of Object.entries(BRAND_DEFAULTS)) {
    if (!out[key]) out[key] = value;
  }
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

/** Fabric name → price per yard (Tk) across every active fabric. Used to
 *  validate fabric-by-the-yard order lines. */
export const getFabricPrices = cache(async (): Promise<Record<string, number>> => {
  const out: Record<string, number> = {};
  for (const f of await getActiveFabrics()) if (f.price > 0) out[f.name] = f.price;
  return out;
});

/** Fabric name → price per yard for one collection. Single source of truth for
 *  tailor-made pricing: the garment can only be priced from cloths it offers. */
export const getCategoryFabricPrices = cache(
  async (categorySlug: string): Promise<Record<string, number>> => {
    const out: Record<string, number> = {};
    for (const f of await getCategoryFabrics(categorySlug)) if (f.price > 0) out[f.name] = f.price;
    return out;
  }
);

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

export type ReviewView = {
  id: string;
  author: string;
  location: string;
  rating: number;
  text: string;
  photos: string[];
};

/** Active customer testimonials for the "Customer's Words" section.
 *  Defensive: returns [] if the Review table doesn't exist yet (e.g. prod DB
 *  not migrated), so pages never crash at prerender. */
export const getReviews = cache(async (): Promise<ReviewView[]> => {
  try {
    const rows = await prisma.review.findMany({
      where: { active: true },
      orderBy: [{ featured: "desc" }, { order: "asc" }, { createdAt: "desc" }],
    });
    return rows.map((r) => ({
      id: r.id,
      author: r.author,
      location: r.location || "",
      rating: r.rating,
      text: r.text,
      photos: (() => {
        try {
          const arr = JSON.parse(r.photos || "[]");
          return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
        } catch {
          return [];
        }
      })(),
    }));
  } catch {
    return [];
  }
});

export type HomeCategory = Awaited<ReturnType<typeof getHomeCategories>>[number];
export type ProductFull = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;
export type CategoryFull = NonNullable<Awaited<ReturnType<typeof getCategoryBySlug>>>;
