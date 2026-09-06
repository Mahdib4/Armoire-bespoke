import Hero from "@/components/Hero";
import QuoteBand from "@/components/QuoteBand";
import CampaignSection from "@/components/CampaignSection";
import CategorySection from "@/components/CategorySection";
import { Storytelling, Lookbook, Fabric } from "@/components/StorySections";
import PriceChart from "@/components/PriceChart";
import InspirationBand from "@/components/InspirationBand";
import CustomerWords from "@/components/CustomerWords";
import AppointmentSection from "@/components/AppointmentSection";
import {
  getSettings,
  getHomeCategories,
  getQuotes,
  getSections,
  getLookbook,
  getReviews,
  getShowcaseFabrics,
  getLiveCampaigns,
  getCategoryFabricPrices,
} from "@/lib/data";
import { cardPrice, categoryTailoringCharge, garmentYards } from "@/lib/pricing";
import { defaultBadgeText, discountedPrice, isDiscountType, resolveDiscount } from "@/lib/campaign";

export const revalidate = 120;

export default async function HomePage() {
  const [settings, categories, quotes, sections, looks, reviews, showcaseFabrics, campaigns] =
    await Promise.all([
      getSettings(),
      getHomeCategories(),
      getQuotes(),
      getSections(),
      getLookbook(),
      getReviews(),
      getShowcaseFabrics(),
      getLiveCampaigns(),
    ]);

  const currency = settings.currency || "Tk";

  // Live campaigns the admin chose to feature on the homepage. Prices are the
  // discounted ones, so the rail shows exactly what the product page will.
  const homeCampaigns = await Promise.all(
    campaigns
      .filter((c) => c.showOnHome && c.items.length > 0)
      .map(async (c) => {
        const slugs = [...new Set(c.items.map((i) => i.product.category.slug))];
        const priceMap = new Map(
          await Promise.all(slugs.map(async (s) => [s, await getCategoryFabricPrices(s)] as const))
        );
        return {
          slug: c.slug,
          headline: c.headline || c.name,
          subhead: c.subhead || "",
          badge: c.badgeText || defaultBadgeText(
            isDiscountType(c.discountType) ? c.discountType : "none",
            c.discountValue
          ),
          accent: c.accent || "",
          ctaLabel: c.ctaLabel || "",
          ctaHref: c.ctaHref || "",
          products: c.items
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
              const d = resolveDiscount(c, i);
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
            }),
        };
      })
  );

  const storyImage =
    categories.find((c) => c.slug === "blazer")?.products[0]?.images[0]?.url ||
    categories[0]?.products[0]?.images[0]?.url;

  const q = (slot: string) => quotes[slot];

  return (
    <>
      <Hero video={settings.heroVideo || "/media/videos/hero.mp4"} poster={settings.heroPoster} />

      {/* Brand quote (manifesto) — brand name only */}
      {q("manifesto") && (
        <QuoteBand
          text={q("manifesto").text}
          attribution={q("manifesto").attribution}
          background="var(--deep)"
        />
      )}

      <Storytelling section={sections["storytelling"]} image={storyImage} />
      {q("after-storytelling") && <QuoteBand text={q("after-storytelling").text} />}

      {homeCampaigns.map((c) => (
        <CampaignSection key={c.slug} campaign={c} currency={currency} />
      ))}

      <Lookbook section={sections["lookbook"]} looks={looks} />
      {q("after-lookbook") && <QuoteBand text={q("after-lookbook").text} background="var(--deep)" />}

      <Fabric section={sections["fabric"]} swatches={showcaseFabrics} />
      {q("after-fabric") && <QuoteBand text={q("after-fabric").text} />}

      {categories.map((cat, i) => (
        <div key={cat.id}>
          <CategorySection category={cat} index={i} />
          {q(`after-${cat.slug}`) && (
            <QuoteBand
              text={q(`after-${cat.slug}`).text}
              background={i % 2 === 0 ? "var(--deep)" : undefined}
            />
          )}
        </div>
      ))}

      <PriceChart src={settings.priceChart || "/media/price-chart.jpeg"} />

      <InspirationBand
        image={settings.inspirationHeroImg}
        video={settings.inspirationHero}
        poster={settings.inspirationHeroPoster}
      />

      <CustomerWords reviews={reviews} show={settings.reviewsShow !== "0"} />

      <AppointmentSection
        message={
          settings.homeServiceMsg ||
          "We provide home service for all our clients. On special request, we also welcome clients to our office, strictly by appointment only."
        }
        contactEmail={settings.contactEmail}
        contactPhone={settings.contactPhone}
        address={settings.address}
        facebook={settings.facebook}
        instagram={settings.instagram}
      />
    </>
  );
}
