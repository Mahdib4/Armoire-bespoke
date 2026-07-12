import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";

export const runtime = "nodejs";

const Schema = z.object({
  name: z.string().min(1).max(160),
  categoryId: z.string().min(1),
  type: z.enum(["CUSTOM", "READYMADE"]).default("CUSTOM"),
  priceTk: z.number().int().min(0).default(0),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { name, categoryId, type, priceTk } = parsed.data;

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) return NextResponse.json({ error: "Category not found" }, { status: 400 });

  const slug = await uniqueSlug(name, async (s) => !!(await prisma.product.findUnique({ where: { slug: s } })));
  const max = await prisma.product.aggregate({ where: { categoryId }, _max: { order: true } });

  // Default customization set mirrors the category's siblings, if any.
  const sibling = await prisma.product.findFirst({
    where: { categoryId },
    include: { customizations: true },
  });

  const product = await prisma.product.create({
    data: {
      name,
      slug,
      categoryId,
      type,
      priceTk,
      order: (max._max.order ?? -1) + 1,
      customizations: sibling
        ? { create: sibling.customizations.map((c) => ({ groupId: c.groupId, order: c.order })) }
        : undefined,
    },
  });

  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, id: product.id, slug: product.slug });
}
