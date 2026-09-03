import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export const runtime = "nodejs";

const Schema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1).max(80),
  active: z.boolean().optional(),
});

/** Create a sub-collection inside a category (Blazer → Tuxedo, Suit Set …).
 *  It shows up straight away as a filter on the collection page and as a
 *  choice on every product in that collection. */
export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { categoryId, name, active } = parsed.data;

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) return NextResponse.json({ error: "Collection not found" }, { status: 400 });

  const base = slugify(name);
  if (!base) return NextResponse.json({ error: "Give the sub-category a name." }, { status: 400 });

  // Slugs are unique within their collection, so "Classic" may exist under
  // both Blazer and Shirt.
  let slug = base;
  for (
    let i = 2;
    await prisma.subCategory.findUnique({ where: { categoryId_slug: { categoryId, slug } } });
    i++
  ) {
    slug = `${base}-${i}`;
  }

  const last = await prisma.subCategory.findFirst({
    where: { categoryId },
    orderBy: { order: "desc" },
  });

  const sub = await prisma.subCategory.create({
    data: {
      categoryId,
      name: name.trim(),
      slug,
      order: (last?.order ?? -1) + 1,
      active: active ?? true,
    },
  });

  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, id: sub.id, slug: sub.slug });
}
