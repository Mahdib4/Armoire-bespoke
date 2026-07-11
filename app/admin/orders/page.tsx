import { prisma } from "@/lib/prisma";
import { parseJSON } from "@/lib/format";
import OrdersManager from "@/components/admin/OrdersManager";

export const dynamic = "force-dynamic";

export default async function AdminOrders() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div>
      <div className="adm-head">
        <div>
          <h1>Orders</h1>
          <p>{orders.length} orders. Update status or view the full bespoke specification.</p>
        </div>
      </div>
      <OrdersManager
        orders={orders.map((o) => ({
          id: o.id,
          publicId: o.publicId,
          customerName: o.customerName,
          email: o.email,
          phone: o.phone,
          address: o.address,
          city: o.city,
          note: o.note,
          subtotalTk: o.subtotalTk,
          status: o.status,
          createdAt: o.createdAt.toISOString(),
          items: o.items.map((it) => ({
            productName: it.productName,
            type: it.type,
            priceTk: it.priceTk,
            qty: it.qty,
            selections: parseJSON<Record<string, string>>(it.selections, {}),
            measurements: parseJSON<Record<string, string>>(it.measurements, {}),
          })),
        }))}
      />
    </div>
  );
}
