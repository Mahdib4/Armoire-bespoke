import { prisma } from "@/lib/prisma";
import { getFabrics } from "@/lib/data";
import FabricsManager from "@/components/admin/FabricsManager";

export const dynamic = "force-dynamic";

export default async function AdminFabrics() {
  const [fabrics, categories] = await Promise.all([
    getFabrics(),
    prisma.category.findMany({ orderBy: { order: "asc" }, select: { slug: true, name: true } }),
  ]);

  return (
    <div>
      <div className="adm-head">
        <div>
          <h1>Fabrics</h1>
          <p>
            Every cloth you offer, in one place. Set the price per yard, tick which collections it is used for,
            and choose whether it shows in the public Fabric Collection. Tailor-made products automatically
            offer the fabrics of their own collection.
          </p>
        </div>
      </div>
      <FabricsManager
        fabrics={fabrics.map((f) => ({
          name: f.name,
          image: f.image,
          images: f.images,
          price: f.price,
          categories: f.categories,
          show: f.show,
          active: f.active,
          isDefault: f.isDefault,
        }))}
        categories={categories}
      />
    </div>
  );
}
