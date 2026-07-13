import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatTk } from "@/lib/format";
import DeleteButton from "@/components/admin/DeleteButton";

export const dynamic = "force-dynamic";

export default async function AdminProducts() {
  const products = await prisma.product.findMany({
    orderBy: [{ category: { order: "asc" } }, { order: "asc" }],
    include: {
      category: true,
      images: { orderBy: { order: "asc" }, take: 1 },
    },
  });

  return (
    <div>
      <div className="adm-head">
        <div>
          <h1>Products</h1>
          <p>{products.length} products across all collections.</p>
        </div>
        <Link href="/admin/products/new" className="adm-btn solid">+ New Product</Link>
      </div>

      <div className="adm-panel">
        <table className="adm-table">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Type</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.images[0] ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={p.images[0].url} alt="" className="adm-thumb" />
                  ) : (
                    <div className="adm-thumb" />
                  )}
                </td>
                <td><Link href={`/admin/products/${p.id}`} className="adm-link">{p.name}</Link></td>
                <td>{p.category.name}</td>
                <td className="tk">{formatTk(p.priceTk)}</td>
                <td><span className={`adm-badge ${p.type === "CUSTOM" ? "custom" : "ready"}`}>{p.type === "CUSTOM" ? "Tailor Made" : "Ready Made"}</span></td>
                <td>
                  <span className={`adm-badge ${p.active ? "on" : "off"}`}>{p.active ? "Live" : "Hidden"}</span>
                  {p.outOfStock && <span className="adm-badge off" style={{ marginLeft: 4 }}>OOS</span>}
                </td>
                <td>
                  <div className="adm-row-actions">
                    <Link href={`/admin/products/${p.id}`} className="adm-btn sm">Edit</Link>
                    <DeleteButton endpoint={`/api/admin/products/${p.id}`} confirmMsg={`Delete "${p.name}"?`} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
