import { CartProvider } from "@/lib/cart";
import SmoothScroll from "@/components/SmoothScroll";
import Header, { type NavItem } from "@/components/Header";
import Footer from "@/components/Footer";
import AdminBar from "@/components/AdminBar";
import Loader from "@/components/Loader";
import CampaignPoster from "@/components/CampaignPoster";
import { getSettings, getNavCategories, getPopupCampaign, getMarquee } from "@/lib/data";

// Cache the shell (nav/settings) and regenerate periodically; admin edits also
// trigger on-demand revalidation. No cookie reads here → pages stay cacheable.
export const revalidate = 120;

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, categories, poster, marquee] = await Promise.all([
    getSettings(),
    getNavCategories(),
    getPopupCampaign(),
    getMarquee(),
  ]);

  // Menu: the product collections, then Fabrics (after Kurta) and Share Your Inspiration.
  const items: NavItem[] = categories.map((c) => ({ label: c.name, href: `/c/${c.slug}` }));
  const kurtaIdx = categories.findIndex((c) => c.slug === "kurta");
  items.splice(kurtaIdx >= 0 ? kurtaIdx + 1 : items.length, 0, { label: "Fabrics", href: "/fabrics" });
  items.push({ label: "Share Your Inspiration", href: "/inspiration" });

  return (
    <CartProvider>
      <Loader />
      {/* Campaign poster — shown once per visit, after the opening animation. */}
      {poster && <CampaignPoster poster={poster} />}
      <SmoothScroll>
        <Header
          logo={settings.logoDark || "/media/brand/logo-dark.png"}
          slogan={settings.slogan || "Tailored to Define You"}
          brand={settings.brandName || "Armoire Bespoke"}
          items={items}
          facebook={settings.facebook}
          instagram={settings.instagram}
          marquee={marquee}
        />
        <main>{children}</main>
        <Footer settings={settings} categories={categories} />
        <AdminBar />
      </SmoothScroll>
    </CartProvider>
  );
}
