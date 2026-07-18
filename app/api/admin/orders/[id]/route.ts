import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendOrderStatusEmail } from "@/lib/email";

export const runtime = "nodejs";

const Schema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "IN_MAKING", "READY", "DELIVERED", "CANCELLED"]),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const changed = order.status !== parsed.data.status;
  await prisma.order.update({ where: { id }, data: { status: parsed.data.status } });

  // Email the customer their new delivery status (best-effort, non-fatal).
  let emailed = false;
  if (changed) {
    try {
      const res = await sendOrderStatusEmail({
        publicId: order.publicId,
        customerName: order.customerName,
        email: order.email,
        status: parsed.data.status,
      });
      emailed = res.sent;
    } catch (e) {
      console.error("[orders] status email failed:", e);
    }
  }

  return NextResponse.json({ ok: true, emailed });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.order.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
