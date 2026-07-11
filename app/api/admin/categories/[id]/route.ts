import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const Schema = z.object({
  name: z.string().min(1).max(80).optional(),
  tagline: z.string().max(200).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  bannerType: z.enum(["image", "video"]).optional(),
  bannerUrl: z.string().max(500).nullable().optional(),
  posterUrl: z.string().max(500).nullable().optional(),
  order: z.number().int().optional(),
  active: z.boolean().optional(),
  measurements: z
    .array(z.object({ label: z.string().min(1), unit: z.string().default("in"), hint: z.string().nullable().optional() }))
    .optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const d = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.category.update({
      where: { id },
      data: {
        name: d.name,
        tagline: d.tagline,
        description: d.description,
        bannerType: d.bannerType,
        bannerUrl: d.bannerUrl,
        posterUrl: d.posterUrl,
        order: d.order,
        active: d.active,
      },
    });
    if (d.measurements) {
      await tx.measurementField.deleteMany({ where: { categoryId: id } });
      await tx.measurementField.createMany({
        data: d.measurements.map((m, i) => ({
          categoryId: id,
          label: m.label,
          unit: m.unit || "in",
          hint: m.hint || null,
          order: i,
        })),
      });
    }
  });

  return NextResponse.json({ ok: true });
}
