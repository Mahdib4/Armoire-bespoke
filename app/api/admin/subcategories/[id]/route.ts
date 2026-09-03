import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const Schema = z.object({
  name: z.string().min(1).max(80).optional(),
  order: z.number().int().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await prisma.subCategory.update({ where: { id }, data: parsed.data });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}

/** Delete a sub-category. The products in it are kept — they simply return to
 *  the collection with no sub-category, so nothing can be lost by a mis-click. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.product.updateMany({ where: { subCategoryId: id }, data: { subCategoryId: null } });
  await prisma.subCategory.delete({ where: { id } }).catch(() => null);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
