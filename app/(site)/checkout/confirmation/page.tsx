import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatTk, parseJSON } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const order = id
    ? await prisma.order.findUnique({ where: { publicId: id }, include: { items: true } })
    : null;

  return (
    <div className="confirm">
      <div className="confirm-mark">✓</div>
      <span className="eyebrow">Order Received</span>
      <h1 className="font-display confirm-title">Thank you</h1>
      {order ? (
        <>
          <p className="confirm-lead">
            Your order <strong>{order.publicId}</strong> has been received. Our atelier will call{" "}
            {order.phone ? <span>{order.phone}</span> : "you"} shortly to schedule your measurement and fitting.
          </p>
          <div className="confirm-card">
            {order.items.map((it) => {
              const sel = parseJSON<Record<string, string>>(it.selections, {});
              return (
                <div className="confirm-line" key={it.id}>
                  <div>
                    <strong>{it.productName}</strong> <em>× {it.qty}</em>
                    <span className="confirm-type">
                      {it.type === "CUSTOM" ? "Made-to-Measure" : "Ready-Made"}
                    </span>
                    {Object.keys(sel).length > 0 && (
                      <div className="confirm-opts">
                        {Object.entries(sel).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                      </div>
                    )}
                  </div>
                  <span className="tk">{formatTk(it.priceTk * it.qty)}</span>
                </div>
              );
            })}
            <div className="confirm-total">
              <span>Total</span>
              <span className="tk">{formatTk(order.subtotalTk)}</span>
            </div>
          </div>
          <p className="confirm-note">A confirmation has been sent to {order.email}.</p>
        </>
      ) : (
        <p className="confirm-lead">Your order has been received. Thank you for choosing Armoire Bespoke.</p>
      )}
      <Link href="/" className="btn btn-ghost">
        Return Home
      </Link>
    </div>
  );
}
