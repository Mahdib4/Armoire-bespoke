import { CartProvider } from "@/lib/cart";
import SmoothScroll from "@/components/SmoothScroll";
import Header, { type NavItem } from "@/components/Header";
import Footer from "@/components/Footer";
import AdminBar from "@/components/AdminBar";
import Loader from "@/components/Loader";
import { getSettings, getNavCategories } from "@/lib/data";

// Cache the shell (nav/settings) and regenerate periodically; admin edits also
// trigger on-demand revalidation. No cookie reads here → pages stay cacheable.
export const revalidate = 120;

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, categories] = await Promise.all([getSettings(), getNavCategories()]);

  // Menu shows only the product collections (Blazer, Jacket, Shirt, Trouser, Kurta),
  // in their configured order — no narrative links.
  const items: NavItem[] = categories.map((c) => ({ label: c.name, href: `/c/${c.slug}` }));

  return (
    <CartProvider>
      <Loader />
      <SmoothScroll>
        <Header
          logo={settings.logoDark || "/media/brand/logo-dark.png"}
          slogan={settings.slogan || "Tailored to Define You"}
          brand={settings.brandName || "Armoire Bespoke"}
          items={items}
          facebook={settings.facebook}
          instagram={settings.instagram}
        />
        <main>{children}</main>
        <Footer settings={settings} categories={categories} />
        <AdminBar />
      </SmoothScroll>
    </CartProvider>
  );
}
