import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import LazyVideo from "@/components/LazyVideo";
import ProductCard, { type CardProduct } from "@/components/ProductCard";
import {
  getCampaignBySlug,
  getCampaignSlugs,
  getCategoryFabricPrices,
  getSettings,
} from "@/lib/data";
import { cardPrice, categoryTailoringCharge, garmentYards } from "@/lib/pricing";
import {
  defaultBadgeText,
  discountedPrice,
  isCampaignLive,
  isDiscountType,
  resolveDiscount,
} from "@/lib/campaign";

export const revalidate = 120;

// Prerendered so an ad click lands on a page that is already built.
export async function generateStaticParams() {
  const campaigns = await getCampaignSlugs();
  return campaigns.map((c) => ({ slug: c.slug }));
}

/** Rich link preview — this is what Meta and Google show when the ad is shared. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCampaignBySlug(slug);
  if (!c) return { title: "Not found" };
  const title = c.headline || c.name;
  const description = c.subhead || c.description || undefined;
  const image = c.posterUrl || c.popupImage || c.bannerUrl || undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function CampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [campaign, settings] = await Promise.all([getCampaignBySlug(slug), getSettings()]);
  if (!campaign || !isCampaignLive(campaign)) notFound();

  const currency = settings.currency || "Tk";
  const isVideo = campaign.bannerType === "video" && campaign.bannerUrl;

  // Tailor-Made pieces are priced from the cloths their own collection offers.
  const catSlugs = [...new Set(campaign.items.map((i) => i.product.category.slug))];
  const priceMap = new Map(
    await Promise.all(catSlugs.map(async (s) => [s, await getCategoryFabricPrices(s)] as const))
  );

  const products: CardProduct[] = campaign.items
    .filter((i) => i.product.active)
    .map((i) => {
      const p = i.product;
      const catSlug = p.category.slug;
      const base = cardPrice(
        p.type,
        p.priceTk,
        categoryTailoringCharge(settings, catSlug),
        garmentYards(catSlug, settings),
        priceMap.get(catSlug) ?? {}
      );
      // A product may carry its own discount; otherwise it follows the campaign.
      const d = resolveDiscount(campaign, i);
      const now = discountedPrice(base, d);
      return {
        slug: p.slug,
        name: p.name,
        priceTk: now,
        wasTk: now < base ? base : 0,
        badge: d?.showBadge ? d.label : "",
        type: p.type,
        images: p.images.map((im) => ({ url: im.url, alt: im.alt })),
      };
    });

  const offer =
    campaign.badgeText ||
    defaultBadgeText(
      isDiscountType(campaign.discountType) ? campaign.discountType : "none",
      campaign.discountValue,
      currency
    );

  return (
    <div
      className="camp-page"
      style={campaign.accent ? ({ "--camp-accent": campaign.accent } as React.CSSProperties) : undefined}
    >
      <div className="camp-banner">
        {isVideo ? (
          <LazyVideo
            className="cat-banner-media"
            src={campaign.bannerUrl!}
            poster={campaign.posterUrl || undefined}
          />
        ) : (
          campaign.bannerUrl && (
            <Image
              src={campaign.bannerUrl}
              alt={campaign.headline || campaign.name}
              fill
              sizes="100vw"
              className="cat-banner-media"
              priority
            />
          )
        )}
        <div className="cat-banner-ov" />
        <div className="cat-banner-c">
          {offer && <span className="camp-offer">{offer}</span>}
          <h1 className="cat-banner-title">{campaign.headline || campaign.name}</h1>
          {campaign.subhead && <p className="cat-banner-tag">{campaign.subhead}</p>}
          {campaign.ctaHref && (
            <Link href={campaign.ctaHref} className="btn btn-ghost cat-banner-cta">
              {campaign.ctaLabel || "Shop the campaign"}
            </Link>
          )}
        </div>
      </div>

      {campaign.description && (
        <div className="clist-intro">
          <p>{campaign.description}</p>
          <span className="clist-count">
            {products.length} {products.length === 1 ? "piece" : "pieces"}
          </span>
        </div>
      )}

      {products.length > 0 ? (
        <div className="clist-grid camp-grid">
          {products.map((p) => (
            <ProductCard key={p.slug} product={p} currency={currency} />
          ))}
        </div>
      ) : (
        <p className="clist-empty">This campaign&apos;s pieces are on their way — check back shortly.</p>
      )}

      <div className="clist-back">
        <Link href="/" className="btn btn-ghost">
          ← Back to the atelier
        </Link>
      </div>
    </div>
  );
}
