import { CartProvider } from "@/lib/cart";
import SmoothScroll from "@/components/SmoothScroll";
import Header, { type NavItem } from "@/components/Header";
import Footer from "@/components/Footer";
import AdminBar from "@/components/AdminBar";
import Loader from "@/components/Loader";
import { getSettings, getNavCategories } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, categories, user] = await Promise.all([
    getSettings(),
    getNavCategories(),
    getSessionUser(),
  ]);

  const items: NavItem[] = [
    { label: "Storytelling", href: "/#storytelling" },
    { label: "Lookbook", href: "/#lookbook" },
    { label: "Fabric Collection", href: "/#fabric" },
    ...categories.map((c) => ({ label: c.name, href: `/c/${c.slug}` })),
  ];

  return (
    <CartProvider>
      <Loader />
      <SmoothScroll>
        <Header
          logo={settings.logoDark || "/media/brand/logo-dark.png"}
          slogan={settings.slogan || "Tailored to define you"}
          brand={settings.brandName || "Armoire Bespoke"}
          items={items}
        />
        <main>{children}</main>
        <Footer settings={settings} categories={categories} />
        {user && <AdminBar />}
      </SmoothScroll>
    </CartProvider>
  );
}
