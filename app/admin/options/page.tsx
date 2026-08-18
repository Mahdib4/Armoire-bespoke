import { prisma } from "@/lib/prisma";
import { getFabrics } from "@/lib/data";
import OptionsManager from "@/components/admin/OptionsManager";

export const dynamic = "force-dynamic";

export default async function AdminOptions() {
  const [groups, categories, fabrics] = await Promise.all([
    prisma.customizationGroup.findMany({
      orderBy: [{ categoryId: "asc" }, { order: "asc" }],
      include: {
        choices: { orderBy: { order: "asc" } },
        _count: { select: { products: true } },
      },
    }),
    prisma.category.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true } }),
    getFabrics(),
  ]);

  return (
    <div>
      <div className="adm-head">
        <div>
          <h1>Bespoke Options</h1>
          <p>
            Everything a customer can choose on a tailor-made piece. Add options and choices freely, and set which
            fabrics each collection is offered in. Enable them per product under Products → Bespoke Options.
          </p>
        </div>
      </div>
      <OptionsManager
        groups={groups.map((g) => ({
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
        fabrics={fabrics.map((f) => ({ name: f.name, price: f.price }))}
      />
    </div>
  );
}
