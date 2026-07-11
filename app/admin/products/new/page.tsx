import Link from "next/link";
import { prisma } from "@/lib/prisma";
import NewProductForm from "@/components/admin/NewProductForm";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({ orderBy: { order: "asc" } });
  return (
    <div>
      <div className="adm-head">
        <div>
          <Link href="/admin/products" className="adm-back">← Products</Link>
          <h1>New Product</h1>
        </div>
      </div>
      <div className="adm-panel">
        <NewProductForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
      </div>
    </div>
  );
}
