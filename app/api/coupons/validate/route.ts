import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkCoupon, normalizeCode, type CouponLine, type CouponRules } from "@/lib/coupon";
import { parseJSON } from "@/lib/format";
import { priceCart } from "@/lib/order-pricing";

export const runtime = "nodejs";

const Schema = z.object({
  code: z.string().min(1).max(40),
  email: z.string().max(200).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.number().int().min(1).max(20),
        selections: z.record(z.string(), z.string()).optional(),
        fabric: z.object({ name: z.string(), yards: z.number() }).optional(),
      })
    )
    .min(1)
    .max(30),
});

/**
 * Checks a code against the customer's actual bag and returns the discount to
 * preview. The order API runs exactly the same rules again when the order is
 * placed, so this endpoint can only ever be a preview — never the authority.
 */
export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const code = normalizeCode(parsed.data.code);
  const coupon = await prisma.coupon.findUnique({ where: { code } }).catch(() => null);
  if (!coupon) return NextResponse.json({ error: "That code isn't recognised." }, { status: 404 });

  // Price the bag server-side — the browser's prices are never trusted.
  const priced = await priceCart(parsed.data.items);
  const subtotal = priced.reduce((n, l) => n + l.priceTk * l.qty, 0);
  if (subtotal <= 0) return NextResponse.json({ error: "Your bag is empty." }, { status: 400 });

  const lines: CouponLine[] = priced.map((l) => ({
    type: l.type,
    categoryId: l.categoryId,
    productId: l.productId,
    priceTk: l.priceTk,
    qty: l.qty,
  }));

  const email = parsed.data.email?.trim().toLowerCase();
  const redeemed =
    email && coupon.perEmailLimit > 0
      ? await prisma.couponRedemption.count({ where: { couponId: coupon.id, email } })
      : 0;

  const rules: CouponRules = {
    ...coupon,
    type: coupon.type === "fixed" ? "fixed" : "percent",
    appliesTo:
      coupon.appliesTo === "READYMADE" || coupon.appliesTo === "CUSTOM" ? coupon.appliesTo : "all",
    categoryIds: parseJSON<string[]>(coupon.categoryIds, []),
    productIds: parseJSON<string[]>(coupon.productIds, []),
  };

  const result = checkCoupon(rules, lines, subtotal, redeemed);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({
    ok: true,
    code,
    discountTk: result.discountTk,
    subtotalTk: subtotal,
    message: result.message,
  });
}
