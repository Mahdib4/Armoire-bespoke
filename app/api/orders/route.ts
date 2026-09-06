import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendOrderEmails } from "@/lib/email";
import { sendAdminPush } from "@/lib/push";
import { getSettings } from "@/lib/data";
import { priceCart } from "@/lib/order-pricing";
import { deliveryCharge } from "@/lib/pricing";
import { zoneForCity } from "@/lib/delivery";
import { checkCoupon, normalizeCode, type CouponRules } from "@/lib/coupon";
import { formatTk, orderPublicId, parseJSON } from "@/lib/format";

export const runtime = "nodejs";

const ItemSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().min(1).max(20),
  size: z.string().optional(),
  selections: z.record(z.string(), z.string()).optional(),
  measurements: z.record(z.string(), z.string()).optional(),
  fabric: z
    .object({
      name: z.string().min(1).max(160),
      yards: z.number().min(0.25).max(200),
      colorCode: z.string().max(120).optional(),
      note: z.string().max(600).optional(),
    })
    .optional(),
});

const OrderSchema = z.object({
  customer: z.object({
    name: z.string().min(1).max(120),
    email: z.string().email(),
    phone: z.string().min(4).max(40),
    address: z.string().max(300).optional(),
    city: z.string().max(80).optional(),
    appointment: z.string().max(60).optional(),
    note: z.string().max(600).optional(),
  }),
  // No deliveryZone here on purpose: it is derived from the city below.
  couponCode: z.string().max(40).optional(),
  items: z.array(ItemSchema).min(1).max(30),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = OrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order", details: parsed.error.flatten() }, { status: 400 });
  }
  const { customer, items } = parsed.data;

  // Re-price from the database — client prices are never trusted. This is the
  // same routine the coupon preview uses, so the two always agree.
  const [priced, settings] = await Promise.all([priceCart(items), getSettings()]);
  const lineData = priced;

  if (lineData.length === 0) {
    return NextResponse.json({ error: "No valid products in order" }, { status: 400 });
  }

  const subtotal = lineData.reduce((n, l) => n + l.priceTk * l.qty, 0);
  // Delivery follows the customer's city, worked out here rather than taken
  // from the request, so the Dhaka rate can never be paid on an address outside
  // Dhaka. The rate itself comes from Site Settings (Tk 70 / Tk 130 by default).
  const zone = zoneForCity(customer.city);
  const delivery = deliveryCharge(settings, zone);

  // Coupon: every rule is checked again here, against the prices worked out
  // above, so a code can't be stretched by anything the browser sent.
  const email = customer.email.trim().toLowerCase();
  let discount = 0;
  let couponCode: string | null = null;
  let couponId: string | null = null;
  if (parsed.data.couponCode) {
    const code = normalizeCode(parsed.data.couponCode);
    const coupon = await prisma.coupon.findUnique({ where: { code } }).catch(() => null);
    if (coupon) {
      const redeemed =
        coupon.perEmailLimit > 0
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
      const check = checkCoupon(
        rules,
        lineData.map((l) => ({
          type: l.type,
          categoryId: l.categoryId,
          productId: l.productId,
          priceTk: l.priceTk,
          qty: l.qty,
          couponBlocked: l.couponBlocked,
        })),
        subtotal,
        redeemed
      );
      // A code that no longer qualifies is simply dropped: the order still goes
      // through at full price rather than failing at the last step.
      if (check.ok) {
        discount = check.discountTk;
        couponCode = coupon.code;
        couponId = coupon.id;
      }
    }
  }

  const publicId = orderPublicId();

  const order = await prisma.order.create({
    data: {
      publicId,
      customerName: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address || null,
      city: customer.city || null,
      appointment: customer.appointment || null,
      note: customer.note || null,
      subtotalTk: subtotal,
      couponCode,
      discountTk: discount,
      deliveryZone: zone,
      deliveryTk: delivery,
      status: "PENDING",
      // categoryId is only used to apply the coupon rules; it isn't a column.
      items: {
        create: lineData.map((l) => ({
          productId: l.productId,
          productName: l.productName,
          type: l.type,
          priceTk: l.priceTk,
          qty: l.qty,
          selections: l.selections,
          measurements: l.measurements,
        })),
      },
    },
  });

  // Record the redemption so usage and per-customer limits hold.
  if (couponId && couponCode) {
    try {
      await prisma.$transaction([
        prisma.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } }),
        prisma.couponRedemption.create({
          data: { couponId, email, orderId: order.id, amountTk: discount },
        }),
      ]);
    } catch (e) {
      console.error("[orders] coupon redemption failed:", e);
    }
  }

  // Decrement Ready-Made inventory by the ordered size. Tailor-Made pieces are
  // made-to-measure and hold no stock, so their orders never touch inventory.
  const stocked = await prisma.product.findMany({
    where: {
      id: { in: lineData.map((l) => l.productId).filter((id): id is string => !!id) },
      type: "READYMADE",
    },
  });
  const byId = new Map(stocked.map((p) => [p.id, p]));
  for (const it of items) {
    const p = byId.get(it.productId);
    if (!p || p.type !== "READYMADE" || !p.sizeOptions) continue;
    try {
      const sizes: { label: string; stock: number }[] = JSON.parse(p.sizeOptions);
      let changed = false;
      for (const s of sizes) {
        if (it.size && s.label === it.size) {
          s.stock = Math.max(0, (s.stock || 0) - it.qty);
          changed = true;
        }
      }
      if (changed) {
        const allOut = sizes.every((s) => (s.stock || 0) <= 0);
        await prisma.product.update({
          where: { id: p.id },
          data: { sizeOptions: JSON.stringify(sizes), outOfStock: allOut },
        });
      }
    } catch (e) {
      console.error("[orders] stock update failed:", e);
    }
  }

  // Fire confirmation emails (customer + owner). Non-fatal if it fails.
  let emailed = false;
  try {
    const res = await sendOrderEmails({
      publicId,
      customerName: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      note: customer.note,
      subtotalTk: subtotal,
      discountTk: discount,
      couponCode,
      deliveryTk: delivery,
      deliveryZone: zone,
      items: lineData.map((l) => ({
        productName: l.productName,
        type: l.type,
        priceTk: l.priceTk,
        qty: l.qty,
        selections: l.selections ? JSON.parse(l.selections) : null,
        measurements: l.measurements ? JSON.parse(l.measurements) : null,
      })),
    });
    emailed = res.sent;
  } catch (e) {
    console.error("[orders] email failed:", e);
  }

  // Web Push to admin browsers (best-effort).
  try {
    await sendAdminPush({
      title: "New order received",
      body: `${customer.name} · ${formatTk(subtotal - discount + delivery)} · ${lineData.length} item(s)`,
      url: "/admin/orders",
      tag: "order",
    });
  } catch (e) {
    console.error("[orders] push failed:", e);
  }

  return NextResponse.json({ ok: true, publicId: order.publicId, emailed });
}
