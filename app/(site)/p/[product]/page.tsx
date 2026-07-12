import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProductGallery from "@/components/ProductGallery";
import ProductPanel, { type ProductView } from "@/components/ProductPanel";
import ProductRail from "@/components/ProductRail";
import { getProductBySlug, getSettings } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { parseJSON } from "@/lib/format";

export const revalidate = 120;

export async function generateStaticParams() {
  const products = await prisma.product.findMany({ where: { active: true }, select: { slug: true } });
  return products.map((p) => ({ product: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ product: string }>;
}): Promise<Metadata> {
  const { product: slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Not found — Armoire Bespoke" };
  return {
    title: `${product.name} — Armoire Bespoke`,
    description: product.description || undefined,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ product: string }>;
}) {
  const { product: slug } = await params;
  const [product, settings] = await Promise.all([getProductBySlug(slug), getSettings()]);
  if (!product || !product.active) notFound();

  const currency = settings.currency || "Tk";
  const view: ProductView = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    type: product.type === "READYMADE" ? "READYMADE" : "CUSTOM",
    priceTk: product.priceTk,
    currency,
    categoryName: product.category.name,
    description: product.description || "",
    specs: parseJSON<{ label: string; value: string }[]>(product.specs, []),
    sizeChartUrl: product.sizeChartUrl,
    image: product.images[0]?.url || "/media/brand/logo-dark.png",
    measurements: product.category.measurementFields.map((m) => ({
      label: m.label,
      unit: m.unit,
      hint: m.hint,
    })),
    customizations: product.customizations.map((pc) => ({
      kind: pc.group.kind,
      name: pc.group.name,
      referenceUrl: pc.group.referenceUrl,
      choices: pc.group.choices.map((c) => c.label),
    })),
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
          images={product.images.map((im) => ({ url: im.url, alt: im.alt }))}
          name={product.name}
        />
        <ProductPanel product={view} />
      </div>

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
              priceTk: p.priceTk,
              type: p.type,
              images: p.images.map((im) => ({ url: im.url, alt: im.alt })),
            }))}
            currency={currency}
          />
        </section>
      )}
    </div>
  );
}
