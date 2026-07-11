import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const Schema = z.object({
  name: z.string().min(1).max(160).optional(),
  categoryId: z.string().optional(),
  type: z.enum(["CUSTOM", "READYMADE"]).optional(),
  priceTk: z.number().int().min(0).optional(),
  description: z.string().max(2000).nullable().optional(),
  fabric: z.string().max(200).nullable().optional(),
  sizeChartUrl: z.string().max(500).nullable().optional(),
  order: z.number().int().optional(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
  specs: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  images: z.array(z.string().min(1)).optional(),
  customizationKinds: z.array(z.string()).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        name: d.name,
        categoryId: d.categoryId,
        type: d.type,
        priceTk: d.priceTk,
        description: d.description,
        fabric: d.fabric,
        sizeChartUrl: d.sizeChartUrl,
        order: d.order,
        active: d.active,
        featured: d.featured,
        specs: d.specs ? JSON.stringify(d.specs) : undefined,
      },
    });

    if (d.images) {
      await tx.productImage.deleteMany({ where: { productId: id } });
      await tx.productImage.createMany({
        data: d.images.map((url, i) => ({ productId: id, url, order: i })),
      });
    }

    if (d.customizationKinds) {
      const groups = await tx.customizationGroup.findMany({
        where: { kind: { in: d.customizationKinds } },
      });
      const byKind = new Map(groups.map((g) => [g.kind, g.id]));
      await tx.productCustomization.deleteMany({ where: { productId: id } });
      const rows = d.customizationKinds
        .map((k, i) => ({ productId: id, groupId: byKind.get(k), order: i }))
        .filter((r): r is { productId: string; groupId: string; order: number } => !!r.groupId);
      if (rows.length) await tx.productCustomization.createMany({ data: rows });
    }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.product.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
