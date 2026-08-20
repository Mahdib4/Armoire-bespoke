import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export const runtime = "nodejs";

const Schema = z.object({
  name: z.string().min(1).max(80),
  tagline: z.string().max(200).optional(),
  active: z.boolean().optional(),
  /** Default measurement fields for the new collection. */
  measurements: z.array(z.string().max(60)).optional(),
});

/** Create a collection (Blazer, Waistcoat, Sherwani…). It appears in the menu,
 *  on the homepage and in the fabric/option pickers straight away. */
export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  const base = slugify(d.name);
  if (!base) return NextResponse.json({ error: "Give the collection a name." }, { status: 400 });

  let slug = base;
  for (let i = 2; await prisma.category.findUnique({ where: { slug } }); i++) {
    slug = `${base}-${i}`;
  }

  const last = await prisma.category.findFirst({ orderBy: { order: "desc" } });
  const measurements = (d.measurements ?? []).map((m) => m.trim()).filter(Boolean);

  const category = await prisma.category.create({
    data: {
      slug,
      name: d.name.trim(),
      tagline: d.tagline?.trim() || null,
      order: (last?.order ?? -1) + 1,
      // New collections start hidden unless asked otherwise, so the owner can
      // add products and fabrics before it goes live.
      active: d.active ?? false,
      bannerType: "image",
      measurementFields: {
        create: measurements.map((label, i) => ({ label, unit: "in", order: i })),
      },
    },
  });

  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, id: category.id, slug: category.slug });
}
