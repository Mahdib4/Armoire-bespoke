import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseJSON } from "@/lib/format";
import ProductEditor from "@/components/admin/ProductEditor";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories, groups] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { order: "asc" } },
        customizations: { include: { group: true } },
      },
    }),
    prisma.category.findMany({ orderBy: { order: "asc" } }),
    prisma.customizationGroup.findMany({ orderBy: { order: "asc" } }),
  ]);
  if (!product) notFound();

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
          type: product.type === "READYMADE" ? "READYMADE" : "CUSTOM",
          priceTk: product.priceTk,
          description: product.description || "",
          fabric: product.fabric || "",
          sizeChartUrl: product.sizeChartUrl || "",
          order: product.order,
          active: product.active,
          featured: product.featured,
          specs: parseJSON<{ label: string; value: string }[]>(product.specs, []),
          images: product.images.map((im) => im.url),
          customizationKinds: product.customizations.map((c) => c.group.kind),
        }}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        groups={groups.map((g) => ({ kind: g.kind, name: g.name }))}
      />
    </div>
  );
}
