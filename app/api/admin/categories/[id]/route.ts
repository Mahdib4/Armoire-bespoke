import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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
  sizeChartUrl: z.string().max(500).nullable().optional(),
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
        sizeChartUrl: d.sizeChartUrl,
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

  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}

/** Delete a collection. Refused while it still holds products, so a mis-click
 *  can never cascade-delete a catalogue — hide it instead. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (category._count.products > 0) {
    return NextResponse.json(
      {
        error: `"${category.name}" still has ${category._count.products} product(s). Move or delete them first, or set the collection to Hidden.`,
      },
      { status: 409 }
    );
  }

  await prisma.category.delete({ where: { id } });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
