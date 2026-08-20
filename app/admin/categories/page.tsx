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
            measurement fields and visibility.
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
          }}
        />
      ))}
    </div>
  );
}
