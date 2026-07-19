import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendOrderEmails } from "@/lib/email";
import { sendAdminPush } from "@/lib/push";
import { getFabricPrices } from "@/lib/data";
import { tailorPrice, fabricFromSelections } from "@/lib/pricing";
import { formatTk, orderPublicId } from "@/lib/format";

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
    where: { id: { in: items.filter((i) => !i.fabric).map((i) => i.productId) }, active: true },
    include: { category: { select: { slug: true } } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  // Fabric prices (Fabric Collection section) drive both fabric-by-the-yard lines
  // and Tailor-Made pricing (tailoring charge + chosen fabric × yards).
  const fabricPrices = await getFabricPrices();

  const lineData = items
    .map((it) => {
      // Fabric line: price = price/yard × yards (validated server-side).
      if (it.fabric) {
        const perYard = fabricPrices[it.fabric.name] ?? 0;
        if (perYard <= 0) return null;
        const yards = it.fabric.yards;
        const selections: Record<string, string> = { Yards: `${yards}` };
        if (it.fabric.colorCode) selections["Colour code"] = it.fabric.colorCode;
        return {
          productId: null,
          productName: `${it.fabric.name} — fabric (${yards} yd)`,
          type: "FABRIC",
          priceTk: Math.round(perYard * yards),
          qty: it.qty,
          selections: JSON.stringify(selections),
          measurements: it.fabric.note ? JSON.stringify({ Note: it.fabric.note }) : null,
        };
      }
      const p = byId.get(it.productId);
      if (!p) return null;
      // Ready Made = fixed price. Tailor Made = tailoring charge + the chosen
      // fabric's price × the yards this garment needs (no admin base price).
      let unit: number;
      if (p.type === "READYMADE") {
        unit = p.priceTk;
      } else {
        const fabricName = fabricFromSelections(it.selections, fabricPrices);
        const perYard = fabricName ? fabricPrices[fabricName] : 0;
        unit = tailorPrice(p.tailoringCharge, p.category.slug, perYard);
      }
      return {
        productId: p.id,
        productName: p.name,
        type: p.type,
        priceTk: unit,
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
      appointment: customer.appointment || null,
      note: customer.note || null,
      subtotalTk: subtotal,
      status: "PENDING",
      items: { create: lineData },
    },
  });

  // Decrement Ready-Made inventory by the ordered size. Tailor-Made pieces are
  // made-to-measure and hold no stock, so their orders never touch inventory.
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
      body: `${customer.name} · ${formatTk(subtotal)} · ${lineData.length} item(s)`,
      url: "/admin/orders",
      tag: "order",
    });
  } catch (e) {
    console.error("[orders] push failed:", e);
  }

  return NextResponse.json({ ok: true, publicId: order.publicId, emailed });
}
