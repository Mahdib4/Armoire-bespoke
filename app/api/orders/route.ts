import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendOrderEmails } from "@/lib/email";
import { orderPublicId } from "@/lib/format";

export const runtime = "nodejs";

const ItemSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().min(1).max(20),
  size: z.string().optional(),
  selections: z.record(z.string(), z.string()).optional(),
  measurements: z.record(z.string(), z.string()).optional(),
});

const OrderSchema = z.object({
  customer: z.object({
    name: z.string().min(1).max(120),
    email: z.string().email(),
    phone: z.string().min(4).max(40),
    address: z.string().max(300).optional(),
    city: z.string().max(80).optional(),
    note: z.string().max(600).optional(),
  }),
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

  // Re-price from DB (never trust client prices).
  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, active: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lineData = items
    .map((it) => {
      const p = byId.get(it.productId);
      if (!p) return null;
      return {
        productId: p.id,
        productName: p.name,
        type: p.type,
        priceTk: p.priceTk,
        qty: it.qty,
        selections: it.selections ? JSON.stringify(it.selections) : null,
        measurements: it.measurements ? JSON.stringify(it.measurements) : null,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (lineData.length === 0) {
    return NextResponse.json({ error: "No valid products in order" }, { status: 400 });
  }

  const subtotal = lineData.reduce((n, l) => n + l.priceTk * l.qty, 0);
  const publicId = orderPublicId();

  const order = await prisma.order.create({
    data: {
      publicId,
      customerName: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address || null,
      city: customer.city || null,
      note: customer.note || null,
      subtotalTk: subtotal,
      status: "PENDING",
      items: { create: lineData },
    },
  });

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

  return NextResponse.json({ ok: true, publicId: order.publicId, emailed });
}
