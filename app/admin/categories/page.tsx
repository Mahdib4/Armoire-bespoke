import { prisma } from "@/lib/prisma";
import CategoryEditor from "@/components/admin/CategoryEditor";
import { getSettings } from "@/lib/data";
import { categoryTailoringCharge } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function AdminCategories() {
  const [cats, settings] = await Promise.all([
    prisma.category.findMany({
      orderBy: { order: "asc" },
      include: { measurementFields: { orderBy: { order: "asc" } } },
    }),
    getSettings(),
  ]);

  return (
    <div>
      <div className="adm-head">
        <div>
          <h1>Categories & Banners</h1>
          <p>Edit each collection&apos;s banner (video or image), tagline, order and measurement fields.</p>
        </div>
      </div>
      {cats.map((c) => (
        <CategoryEditor
          key={c.id}
          category={{
            id: c.id,
            slug: c.slug,
            name: c.name,
            tagline: c.tagline || "",
            description: c.description || "",
            bannerType: c.bannerType === "video" ? "video" : "image",
            bannerUrl: c.bannerUrl || "",
            posterUrl: c.posterUrl || "",
            sizeChartUrl: c.sizeChartUrl || "",
            tailoringCharge: categoryTailoringCharge(settings, c.slug),
            order: c.order,
            active: c.active,
            measurements: c.measurementFields.map((m) => ({ label: m.label, unit: m.unit, hint: m.hint })),
          }}
        />
      ))}
    </div>
  );
}
