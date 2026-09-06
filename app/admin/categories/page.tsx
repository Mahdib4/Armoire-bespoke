import { prisma } from "@/lib/prisma";
import CategoryEditor from "@/components/admin/CategoryEditor";
import NewCategoryForm from "@/components/admin/NewCategoryForm";
import { getSettings } from "@/lib/data";
import { categoryTailoringCharge, garmentYards } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function AdminCategories() {
  const [cats, settings] = await Promise.all([
    prisma.category.findMany({
      orderBy: { order: "asc" },
      include: {
        measurementFields: { orderBy: { order: "asc" } },
        subCategories: {
          orderBy: { order: "asc" },
          include: {
            _count: { select: { products: true } },
            products: { select: { id: true } },
          },
        },
        products: {
          orderBy: { order: "asc" },
          select: { id: true, name: true, images: { orderBy: { order: "asc" }, take: 1 } },
        },
        _count: { select: { products: true } },
      },
    }),
    getSettings(),
  ]);

  return (
    <div>
      <div className="adm-head">
        <div>
          <h1>Categories & Banners</h1>
          <p>
            Add a collection, or edit each one&apos;s banner, tagline, tailoring charge, yards, order,
            sub-categories, measurement fields and visibility.
          </p>
        </div>
      </div>
      <NewCategoryForm />
      {cats.map((c) => (
        <CategoryEditor
          key={c.id}
          category={{
            id: c.id,
            productCount: c._count.products,
            slug: c.slug,
            name: c.name,
            tagline: c.tagline || "",
            description: c.description || "",
            bannerType: c.bannerType === "video" ? "video" : "image",
            bannerUrl: c.bannerUrl || "",
            posterUrl: c.posterUrl || "",
            sizeChartUrl: c.sizeChartUrl || "",
            tailoringCharge: categoryTailoringCharge(settings, c.slug),
            fabricYards: garmentYards(c.slug, settings),
            order: c.order,
            active: c.active,
            measurements: c.measurementFields.map((m) => ({ label: m.label, unit: m.unit, hint: m.hint })),
            subCategories: c.subCategories.map((s) => ({
              id: s.id,
              name: s.name,
              slug: s.slug,
              active: s.active,
              productCount: s._count.products,
              productIds: s.products.map((p) => p.id),
            })),
            products: c.products.map((p) => ({
              id: p.id,
              name: p.name,
              image: p.images[0]?.url ?? "",
            })),
          }}
        />
      ))}
    </div>
  );
}
