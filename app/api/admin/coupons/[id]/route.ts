import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeCode } from "@/lib/coupon";

export const runtime = "nodejs";

const Schema = z.object({
  code: z.string().min(2).max(40).optional(),
  description: z.string().max(300).nullable().optional(),
  type: z.enum(["percent", "fixed"]).optional(),
  value: z.number().int().min(0).max(1000000).optional(),
  minSubtotalTk: z.number().int().min(0).max(10000000).optional(),
  maxDiscountTk: z.number().int().min(0).max(10000000).optional(),
  appliesTo: z.enum(["all", "READYMADE", "CUSTOM"]).optional(),
  categoryIds: z.array(z.string()).optional(),
  productIds: z.array(z.string()).max(500).optional(),
  startsAt: z.string().max(40).nullable().optional(),
  expiresAt: z.string().max(40).nullable().optional(),
  usageLimit: z.number().int().min(0).max(1000000).optional(),
  perEmailLimit: z.number().int().min(0).max(10000).optional(),
  active: z.boolean().optional(),
  /** Set the counter back to zero (e.g. re-running a code for a new campaign). */
  resetUsage: z.boolean().optional(),
});

function toDate(v: string | null | undefined): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v.trim() === "") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let code: string | undefined;
  if (d.code !== undefined) {
    const wanted = normalizeCode(d.code);
    if (!/^[A-Z0-9-]+$/.test(wanted)) {
      return NextResponse.json({ error: "Use letters, numbers and dashes only." }, { status: 400 });
    }
    if (wanted !== existing.code) {
      const clash = await prisma.coupon.findUnique({ where: { code: wanted } });
      if (clash) return NextResponse.json({ error: `"${wanted}" already exists.` }, { status: 409 });
      code = wanted;
    }
  }

  if (d.type === "percent" && d.value !== undefined && d.value > 100) {
    return NextResponse.json({ error: "A percentage can't be more than 100." }, { status: 400 });
  }

  await prisma.coupon.update({
    where: { id },
    data: {
      code,
      description: d.description,
      type: d.type,
      value: d.value,
      minSubtotalTk: d.minSubtotalTk,
      maxDiscountTk: d.maxDiscountTk,
      appliesTo: d.appliesTo,
      // Empty list = no restriction, stored as null to keep the meaning clear.
      categoryIds: d.categoryIds ? (d.categoryIds.length ? JSON.stringify(d.categoryIds) : null) : undefined,
      productIds: d.productIds ? (d.productIds.length ? JSON.stringify(d.productIds) : null) : undefined,
      startsAt: toDate(d.startsAt),
      expiresAt: toDate(d.expiresAt),
      usageLimit: d.usageLimit,
      perEmailLimit: d.perEmailLimit,
      active: d.active,
      usedCount: d.resetUsage ? 0 : undefined,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.coupon.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
