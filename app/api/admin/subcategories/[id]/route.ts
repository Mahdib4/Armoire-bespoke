import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const Schema = z.object({
  name: z.string().min(1).max(80).optional(),
  order: z.number().int().optional(),
  active: z.boolean().optional(),
  /** The full line-up of products in this sub-category, replacing what's there. */
  productIds: z.array(z.string()).max(1000).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { productIds, ...fields } = parsed.data;

  const sub = await prisma.subCategory.findUnique({ where: { id } });
  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    if (Object.keys(fields).length > 0) {
      await tx.subCategory.update({ where: { id }, data: fields });
    }

    if (productIds) {
      // Only pieces from this sub-category's own collection may be assigned,
      // so a stale form can never drag a shirt into a blazer sub-category.
      const allowed = await tx.product.findMany({
        where: { id: { in: productIds }, categoryId: sub.categoryId },
        select: { id: true },
      });
      const ids = allowed.map((p) => p.id);

      // Anything dropped from the list goes back to the collection with no
      // sub-category — the product itself is never touched otherwise.
      await tx.product.updateMany({
        where: { subCategoryId: id, id: { notIn: ids.length ? ids : ["__none__"] } },
        data: { subCategoryId: null },
      });
      if (ids.length) {
        await tx.product.updateMany({ where: { id: { in: ids } }, data: { subCategoryId: id } });
      }
    }
  });

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
