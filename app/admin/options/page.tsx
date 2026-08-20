import { prisma } from "@/lib/prisma";
import OptionsManager from "@/components/admin/OptionsManager";

export const dynamic = "force-dynamic";

export default async function AdminOptions() {
  const [groups, categories] = await Promise.all([
    prisma.customizationGroup.findMany({
      orderBy: [{ categoryId: "asc" }, { order: "asc" }],
      include: {
        choices: { orderBy: { order: "asc" } },
        _count: { select: { products: true } },
      },
    }),
    prisma.category.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <div className="adm-head">
        <div>
          <h1>Bespoke Options</h1>
          <p>
            Style choices a customer can make on a tailor-made piece — add options and their choices freely,
            then enable them per product under Products → Bespoke Options. Fabrics are managed separately.
          </p>
        </div>
      </div>
      <OptionsManager
        groups={groups
          .filter((g) => g.kind !== "fabric") // cloths are managed in Admin → Fabrics
          .map((g) => ({
          id: g.id,
          kind: g.kind,
          name: g.name,
          categoryId: g.categoryId,
          referenceUrl: g.referenceUrl || "",
          order: g.order,
          choices: g.choices.map((c) => c.label),
          productCount: g._count.products,
        }))}
        categories={categories}
      />
    </div>
  );
}
