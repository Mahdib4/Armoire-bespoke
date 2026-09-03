import { prisma } from "@/lib/prisma";
import CouponsManager, { type CouponForm } from "@/components/admin/CouponsManager";
import { parseJSON } from "@/lib/format";

export const dynamic = "force-dynamic";

function toLocalInput(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export default async function AdminCoupons() {
  const [coupons, categories, products] = await Promise.all([
    prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }).catch(() => []),
    prisma.category.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true } }),
    prisma.product.findMany({
      orderBy: [{ category: { order: "asc" } }, { order: "asc" }],
      include: {
        category: { select: { name: true } },
        images: { orderBy: { order: "asc" }, take: 1 },
      },
    }),
  ]);

  const forms: CouponForm[] = coupons.map((c) => ({
    id: c.id,
    code: c.code,
    description: c.description || "",
    type: c.type === "fixed" ? "fixed" : "percent",
    value: c.value,
    minSubtotalTk: c.minSubtotalTk,
    maxDiscountTk: c.maxDiscountTk,
    appliesTo:
      c.appliesTo === "READYMADE" || c.appliesTo === "CUSTOM" ? c.appliesTo : "all",
    categoryIds: parseJSON<string[]>(c.categoryIds, []),
    productIds: parseJSON<string[]>(c.productIds, []),
    startsAt: toLocalInput(c.startsAt),
    expiresAt: toLocalInput(c.expiresAt),
    usageLimit: c.usageLimit,
    perEmailLimit: c.perEmailLimit,
    usedCount: c.usedCount,
    active: c.active,
  }));

  return (
    <div>
      <div className="adm-head">
        <div>
          <h1>Coupon Codes</h1>
          <p>
            Codes customers type at checkout. Limit one to whole collections, to individual pieces,
            or leave it open to the whole catalogue. Every rule here is checked again on the server
            when the order is placed, so a code can never be stretched further than you allow.
          </p>
        </div>
      </div>

      <CouponsManager
        coupons={forms}
        categories={categories}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          categoryName: p.category.name,
          image: p.images[0]?.url ?? "",
        }))}
      />
    </div>
  );
}
