import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseJSON } from "@/lib/format";
import ProductEditor from "@/components/admin/ProductEditor";
import { getSettings } from "@/lib/data";
import { FABRIC_BLOCK, optionLayoutKey, parseOptionLayout } from "@/lib/options";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories, subCategories, groups, settings] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { order: "asc" } },
        customizations: { orderBy: { order: "asc" } },
      },
    }),
    prisma.category.findMany({ orderBy: { order: "asc" } }),
    prisma.subCategory.findMany({ orderBy: { order: "asc" } }),
    prisma.customizationGroup.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { choices: true } }, category: { select: { name: true } } },
    }),
    getSettings(),
  ]);
  if (!product) notFound();

  // The saved block order (Fabric included) with each block's Shown/Hidden
  // state. Products saved before this existed fall back to their attached
  // options in order, with Fabric first — exactly how they render today.
  const saved = parseOptionLayout(settings[optionLayoutKey(product.id)]);
  const optionRows =
    saved.length > 0
      ? saved.map((r) => ({ id: r.id, name: "", on: r.on }))
      : [
          { id: FABRIC_BLOCK, name: "Fabric", on: true },
          ...product.customizations.map((c) => ({ id: c.groupId, name: "", on: true })),
        ];

  return (
    <div>
      <div className="adm-head">
        <div>
          <Link href="/admin/products" className="adm-back">← Products</Link>
          <h1>{product.name}</h1>
          <p>
            <Link href={`/p/${product.slug}`} target="_blank" className="adm-link">View on site ↗</Link>
          </p>
        </div>
      </div>
      <ProductEditor
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          categoryId: product.categoryId,
          subCategoryId: product.subCategoryId || "",
          type: product.type === "READYMADE" ? "READYMADE" : "CUSTOM",
          priceTk: product.priceTk,
          tailoringCharge: product.tailoringCharge,
          description: product.description || "",
          fabric: product.fabric || "",
          sizeChartUrl: product.sizeChartUrl || "",
          order: product.order,
          active: product.active,
          featured: product.featured,
          outOfStock: product.outOfStock,
          colors: parseJSON<string[]>(product.colors, []),
          sizeOptions: parseJSON<{ label: string; stock: number }[]>(product.sizeOptions, []),
          specs: parseJSON<{ label: string; value: string }[]>(product.specs, []),
          images: product.images.map((im) => im.url),
          featuredIndex: Math.max(0, product.images.findIndex((im) => im.featured)),
          optionRows,
        }}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        subCategories={subCategories.map((sc) => ({
          id: sc.id,
          name: sc.name,
          categoryId: sc.categoryId,
        }))}
        groups={groups.map((g) => ({
          id: g.id,
          kind: g.kind,
          name: g.name,
          categoryId: g.categoryId,
          categoryName: g.category?.name ?? null,
          choiceCount: g._count.choices,
        }))}
      />
    </div>
  );
}
