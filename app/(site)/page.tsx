import Hero from "@/components/Hero";
import QuoteBand from "@/components/QuoteBand";
import CategorySection from "@/components/CategorySection";
import { Storytelling, Lookbook, Fabric } from "@/components/StorySections";
import PriceChart from "@/components/PriceChart";
import AppointmentSection from "@/components/AppointmentSection";
import {
  getSettings,
  getHomeCategories,
  getQuotes,
  getSections,
  getLookbook,
} from "@/lib/data";

export const revalidate = 120;

export default async function HomePage() {
  const [settings, categories, quotes, sections, looks] = await Promise.all([
    getSettings(),
    getHomeCategories(),
    getQuotes(),
    getSections(),
    getLookbook(),
  ]);

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

      <Lookbook section={sections["lookbook"]} looks={looks} />
      {q("after-lookbook") && <QuoteBand text={q("after-lookbook").text} background="var(--deep)" />}

      <Fabric section={sections["fabric"]} />
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

      {settings.priceChart && <PriceChart src={settings.priceChart} />}

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
