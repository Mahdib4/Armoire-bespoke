import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CategoryTabs from "@/components/CategoryTabs";
import LazyVideo from "@/components/LazyVideo";
import { getCategoryBySlug, getSettings, getNavCategories, getFabricPrices } from "@/lib/data";
import { cardPrice } from "@/lib/pricing";

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
  const [cat, settings, fabricPrices] = await Promise.all([
    getCategoryBySlug(slug),
    getSettings(),
    getFabricPrices(),
  ]);
  if (!cat || !cat.active) notFound();
  const currency = settings.currency || "Tk";
  const isVideo = cat.bannerType === "video" && cat.bannerUrl;

  const toCard = (p: (typeof cat.products)[number]) => ({
    slug: p.slug,
    name: p.name,
    // Tailor-Made shows a fabric-derived "starts from"; Ready-Made its fixed price.
    priceTk: cardPrice(p.type, p.priceTk, p.tailoringCharge, slug, fabricPrices),
    type: p.type,
    images: p.images.map((im) => ({ url: im.url, alt: im.alt })),
  });
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
        <CategoryTabs readyMade={readyMade} tailorMade={tailorMade} currency={currency} />
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
