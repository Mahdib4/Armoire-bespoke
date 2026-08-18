import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const Schema = z.object({
  name: z.string().min(1).max(80).optional(),
  categoryId: z.string().nullable().optional(),
  referenceUrl: z.string().max(500).nullable().optional(),
  order: z.number().int().optional(),
  choices: z.array(z.string().max(120)).optional(),
});

/** Update a bespoke option group and rewrite its choices. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  const existing = await prisma.customizationGroup.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (d.categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: d.categoryId }, select: { id: true } });
    if (!cat) return NextResponse.json({ error: "That collection no longer exists." }, { status: 400 });
  }
  // Keep one fabric group per collection so pricing stays unambiguous.
  if (existing.kind === "fabric" && d.categoryId !== undefined) {
    const target = d.categoryId || null;
    const clash = await prisma.customizationGroup.findFirst({
      where: { kind: "fabric", categoryId: target, id: { not: id } },
    });
    if (clash) {
      return NextResponse.json(
        { error: "That collection already has a fabric group." },
        { status: 409 }
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.customizationGroup.update({
      where: { id },
      data: {
        name: d.name,
        // `null` clears the category scope (group becomes available to all).
        categoryId: d.categoryId === undefined ? undefined : d.categoryId || null,
        referenceUrl: d.referenceUrl === undefined ? undefined : d.referenceUrl || null,
        order: d.order,
      },
    });

    if (d.choices) {
      const labels = d.choices.map((c) => c.trim()).filter(Boolean);
      await tx.customizationChoice.deleteMany({ where: { groupId: id } });
      if (labels.length) {
        await tx.customizationChoice.createMany({
          data: labels.map((label, i) => ({ groupId: id, label, order: i })),
        });
      }
    }
  });

  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Choices and product links cascade from the group.
  await prisma.customizationGroup.delete({ where: { id } }).catch(() => null);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
