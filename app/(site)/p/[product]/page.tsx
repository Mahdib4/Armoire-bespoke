import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProductGallery from "@/components/ProductGallery";
import ProductPanel, { type ProductView } from "@/components/ProductPanel";
import ProductRail from "@/components/ProductRail";
import CustomerWords from "@/components/CustomerWords";
import { getProductBySlug, getSettings, getAllProductSlugs, getFabricPrices, getReviews } from "@/lib/data";
import { cardPrice, categoryTailoringCharge } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { parseJSON } from "@/lib/format";

export const revalidate = 120;

// Prerender every product at build so clicks are instant (static HTML from the
// CDN). The resilient Prisma pool + cache() dedupe keep the build within Neon's
// connection limits.
export async function generateStaticParams() {
  const products = await getAllProductSlugs();
  return products.map((p) => ({ product: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ product: string }>;
}): Promise<Metadata> {
  const { product: slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Not found" };
  return {
    title: product.name,
    description: product.description || undefined,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ product: string }>;
}) {
  const { product: slug } = await params;
  const [product, settings, fabricPrices, reviews] = await Promise.all([
    getProductBySlug(slug),
    getSettings(),
    getFabricPrices(),
    getReviews(),
  ]);
  if (!product || !product.active) notFound();

  const currency = settings.currency || "Tk";
  const isReady = product.type === "READYMADE";
  // Ready-Made only: a size chart shown full-width below the gallery. Prefer the
  // category's chart (admin-uploaded), then the product's, then a bundled fallback.
  const knownChart = ["shirt", "kurta"].includes(product.category.slug)
    ? `/media/sizecharts/${product.category.slug}.jpg`
    : null;
  const sizeChart = isReady ? product.category.sizeChartUrl || product.sizeChartUrl || knownChart : null;
  // Featured image first, then the rest in order.
  const gallery = [...product.images].sort(
    (a, b) => Number(b.featured) - Number(a.featured) || a.order - b.order
  );
  const view: ProductView = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    type: product.type === "READYMADE" ? "READYMADE" : "CUSTOM",
    priceTk: product.priceTk,
    // Tailoring charge is set per category in the admin panel.
    tailoringCharge: categoryTailoringCharge(settings, product.category.slug),
    currency,
    categoryName: product.category.name,
    categorySlug: product.category.slug,
    fabricPrices,
    description: product.description || "",
    specs: parseJSON<{ label: string; value: string }[]>(product.specs, []),
    sizeChartUrl: product.sizeChartUrl,
    image: gallery[0]?.url || "/media/brand/logo-dark.png",
    outOfStock: product.outOfStock,
    tailoringNote:
      settings.tailoringNote ||
      "Final price may vary depending on the selected fabric and customization options.",
    // Separation: Tailor-Made never carries colour/size; Ready-Made never carries
    // bespoke options. Measurements are passed for both — Tailor-Made shows them
    // inline; Ready-Made keeps them behind an optional, collapsed toggle (for minor
    // alterations, e.g. a ready-made kurta).
    measurements: product.category.measurementFields.map((m) => ({ label: m.label, unit: m.unit, hint: m.hint })),
    customizations: isReady
      ? []
      : product.customizations.map((pc) => ({
          kind: pc.group.kind,
          name: pc.group.name,
          referenceUrl: pc.group.referenceUrl,
          choices: pc.group.choices.map((c) => c.label),
        })),
    colors: isReady ? parseJSON<string[]>(product.colors, []) : [],
    sizeOptions: isReady ? parseJSON<{ label: string; stock: number }[]>(product.sizeOptions, []) : [],
  };

  const related = await prisma.product.findMany({
    where: { categoryId: product.categoryId, active: true, id: { not: product.id } },
    orderBy: { order: "asc" },
    take: 8,
    include: { images: { orderBy: { order: "asc" }, take: 2 } },
  });

  return (
    <div className="pdp">
      <nav className="pdp-crumb">
        <Link href="/">Home</Link>
        <span>·</span>
        <Link href={`/c/${product.category.slug}`}>{product.category.name}</Link>
        <span>·</span>
        <em>{product.name}</em>
      </nav>

      <div className="pdp-grid">
        <ProductGallery
          images={gallery.map((im) => ({ url: im.url, alt: im.alt }))}
          name={product.name}
        />
        <ProductPanel product={view} />
      </div>

      {/* Ready-Made: size chart shown automatically, centred (full width). */}
      {sizeChart && (
        <section className="pdp-sizechart">
          <div className="sec-head">
            <div className="sec-title">Size Chart</div>
            <div className="rule" />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sizeChart} alt={`${product.category.name} size chart`} className="pdp-sizechart-img" />
        </section>
      )}

      {related.length > 0 && (
        <section className="pdp-related">
          <div className="sec-head">
            <div className="sec-title">More from {product.category.name}</div>
            <div className="rule" />
          </div>
          <ProductRail
            products={related.map((p) => ({
              slug: p.slug,
              name: p.name,
              // Related items share this product's category — same slug + tailoring charge.
              priceTk: cardPrice(
                p.type,
                p.priceTk,
                categoryTailoringCharge(settings, product.category.slug),
                product.category.slug,
                fabricPrices
              ),
              type: p.type,
              images: p.images.map((im) => ({ url: im.url, alt: im.alt })),
            }))}
            currency={currency}
          />
        </section>
      )}

      {/* Customer's Words — shown on every product page, just above the footer. */}
      <CustomerWords reviews={reviews} show={settings.reviewsShow !== "0"} />
    </div>
  );
}
