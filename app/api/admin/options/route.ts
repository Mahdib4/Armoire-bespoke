import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export const runtime = "nodejs";

const Schema = z.object({
  name: z.string().min(1).max(80),
  kind: z.string().max(60).optional(),
  categoryId: z.string().nullable().optional(),
  referenceUrl: z.string().max(500).nullable().optional(),
  choices: z.array(z.string().max(120)).optional(),
});

/** Create a bespoke option group (e.g. "Breast Style" with Single/Double). */
export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  // `kind` is the stable machine key. A few kinds carry behaviour: "fabric"
  // drives tailor-made pricing, "cuff-style" reveals the sleeve-button picker.
  const categoryId = d.categoryId || null;
  if (categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
    if (!cat) return NextResponse.json({ error: "That collection no longer exists." }, { status: 400 });
  }
  const base = slugify(d.kind || d.name) || "option";

  // Fabric groups are per collection (blazer fabrics ≠ shirt fabrics), so the
  // kind must stay exactly "fabric" — refuse a duplicate rather than silently
  // renaming it to "fabric-2" and losing the pricing behaviour.
  if (base === "fabric") {
    const clash = await prisma.customizationGroup.findFirst({ where: { kind: "fabric", categoryId } });
    if (clash) {
      return NextResponse.json(
        {
          error: categoryId
            ? "This collection already has a fabric group — edit that one instead."
            : "There is already an all-collections fabric group — edit it, or scope this one to a collection.",
        },
        { status: 409 }
      );
    }
  }

  // Otherwise keep the key unique within the same scope by suffixing.
  let kind = base;
  if (base !== "fabric") {
    for (let i = 2; await prisma.customizationGroup.findFirst({ where: { kind, categoryId } }); i++) {
      kind = `${base}-${i}`;
    }
  }

  const last = await prisma.customizationGroup.findFirst({ orderBy: { order: "desc" } });
  const group = await prisma.customizationGroup.create({
    data: {
      kind,
      name: d.name,
      categoryId,
      referenceUrl: d.referenceUrl || null,
      order: (last?.order ?? -1) + 1,
      choices: {
        create: (d.choices ?? [])
          .map((label) => label.trim())
          .filter(Boolean)
          .map((label, i) => ({ label, order: i })),
      },
    },
    include: { choices: true },
  });

  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, id: group.id, kind: group.kind });
}
