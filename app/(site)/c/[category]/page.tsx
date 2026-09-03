import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CollectionBrowser, { type BrowseProduct } from "@/components/CollectionBrowser";
import LazyVideo from "@/components/LazyVideo";
import {
  getCategoryBySlug,
  getSettings,
  getNavCategories,
  getCategoryFabricPrices,
  getProductDiscounts,
} from "@/lib/data";
import { cardPrice, categoryTailoringCharge, garmentYards } from "@/lib/pricing";
import { discountedPrice } from "@/lib/campaign";

export const revalidate = 120;

// Prerender each collection at build so clicks are instant (static/CDN).
export async function generateStaticParams() {
  const cats = await getNavCategories();
  return cats.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const cat = await getCategoryBySlug(slug);
  if (!cat) return { title: "Not found" };
  return { title: cat.name, description: cat.description || undefined };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const [cat, settings, prices, discounts] = await Promise.all([
    getCategoryBySlug(slug),
    getSettings(),
    getCategoryFabricPrices(slug),
    getProductDiscounts(),
  ]);
  if (!cat || !cat.active) notFound();
  const currency = settings.currency || "Tk";
  const isVideo = cat.bannerType === "video" && cat.bannerUrl;

  const tailoringCharge = categoryTailoringCharge(settings, slug);
  // Cards price off the fabrics this collection actually offers.
  const yards = garmentYards(slug, settings);
  // Sub-collections give the filter chips their names.
  const subById = new Map(cat.subCategories.map((s) => [s.id, s.slug]));
  const toCard = (p: (typeof cat.products)[number]): BrowseProduct => {
    // Tailor-Made shows a fabric-derived "starts from"; Ready-Made its fixed price.
    const base = cardPrice(p.type, p.priceTk, tailoringCharge, yards, prices);
    const d = discounts.get(p.id);
    const now = discountedPrice(base, d);
    return {
      slug: p.slug,
      name: p.name,
      priceTk: now,
      wasTk: now < base ? base : 0,
      badge: d?.showBadge ? d.label : "",
      type: p.type,
      images: p.images.map((im) => ({ url: im.url, alt: im.alt })),
      sub: (p.subCategoryId && subById.get(p.subCategoryId)) || "",
      order: p.order,
      createdAt: p.createdAt.toISOString(),
      inStock: !p.outOfStock,
    };
  };
  const readyMade = cat.products.filter((p) => p.type === "READYMADE").map(toCard);
  const tailorMade = cat.products.filter((p) => p.type !== "READYMADE").map(toCard);

  return (
    <div className="clist">
      <div className="clist-banner">
        {isVideo ? (
          <LazyVideo className="cat-banner-media" src={cat.bannerUrl!} poster={cat.posterUrl || undefined} />
        ) : (
          cat.bannerUrl && (
            <Image src={cat.bannerUrl} alt={cat.name} fill sizes="100vw" className="cat-banner-media" priority />
          )
        )}
        <div className="cat-banner-ov" />
        <div className="cat-banner-c">
          <span className="eyebrow">The Collection</span>
          <h1 className="cat-banner-title">{cat.name}</h1>
          <p className="cat-banner-tag">{cat.tagline}</p>
        </div>
      </div>

      <div className="clist-intro">
        <p>{cat.description}</p>
        <span className="clist-count">{cat.products.length} pieces</span>
      </div>

      {cat.products.length > 0 ? (
        <CollectionBrowser
          readyMade={readyMade}
          tailorMade={tailorMade}
          subCategories={cat.subCategories.map((s) => ({ slug: s.slug, name: s.name }))}
          currency={currency}
        />
      ) : (
        <p className="clist-empty">
          New collections are on their way — check back soon for seasonal pieces, special events and
          exclusive launches.
        </p>
      )}

      <div className="clist-back">
        <Link href="/#lookbook" className="btn btn-ghost">
          ← Back to collections
        </Link>
      </div>
    </div>
  );
}
