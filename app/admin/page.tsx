import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatTk } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const [products, categories, orders, quotes, pending, recent, revenue] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.order.count(),
    prisma.quote.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.order.aggregate({ _sum: { subtotalTk: true } }),
  ]);

  return (
    <div>
      <div className="adm-head">
        <div>
          <h1>Overview</h1>
          <p>Manage every element of the Armoire Bespoke storefront.</p>
        </div>
        <Link href="/admin/products/new" className="adm-btn solid">
          + New Product
        </Link>
      </div>

      <div className="adm-stats">
        <div className="adm-stat"><b>{products}</b><span>Products</span></div>
        <div className="adm-stat"><b>{categories}</b><span>Categories</span></div>
        <div className="adm-stat"><b>{orders}</b><span>Orders</span></div>
        <div className="adm-stat"><b>{pending}</b><span>Pending</span></div>
        <div className="adm-stat"><b>{formatTk(revenue._sum.subtotalTk || 0)}</b><span>Order Value</span></div>
        <div className="adm-stat"><b>{quotes}</b><span>Quotes</span></div>
      </div>

      <div className="adm-panel">
        <h3>Recent Orders</h3>
        {recent.length === 0 ? (
          <p className="adm-empty">No orders yet.</p>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Client</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id}>
                  <td><Link href="/admin/orders" className="adm-link">{o.publicId}</Link></td>
                  <td>{o.customerName}</td>
                  <td className="tk">{formatTk(o.subtotalTk)}</td>
                  <td><span className={`adm-badge ${o.status === "PENDING" ? "off" : "on"}`}>{o.status}</span></td>
                  <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="adm-panel">
        <h3>Manage</h3>
        <div className="adm-quick">
          <Link href="/admin/products" className="adm-btn">Products</Link>
          <Link href="/admin/categories" className="adm-btn">Categories & Banners</Link>
          <Link href="/admin/sections" className="adm-btn">Sections</Link>
          <Link href="/admin/quotes" className="adm-btn">Quotes</Link>
          <Link href="/admin/settings" className="adm-btn">Site Settings</Link>
          <Link href="/admin/media" className="adm-btn">Media Library</Link>
        </div>
      </div>
    </div>
  );
}
